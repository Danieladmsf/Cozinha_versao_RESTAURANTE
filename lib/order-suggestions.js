/**
 * Sistema de Gestão de Sugestões de Pedidos
 * 
 * Este sistema analisa pedidos históricos e fornece sugestões inteligentes
 * para preenchimento automático dos campos de quantidade baseado em padrões
 * de consumo anteriores.
 * 
 * Funcionalidades:
 * - Análise de pedidos históricos por cliente
 * - Cálculo de média de consumo por receita
 * - Sugestões baseadas em refeições esperadas
 * - Priorização por recência dos pedidos
 * - Suporte para diferentes tipos de categoria (especialmente categoria carne)
 */

import { Order, Recipe, VrSalesSync } from '@/app/api/entities';
import { CategoryLogic } from '@/components/utils/categoryLogic';
import { parseQuantity } from '@/components/utils/orderUtils';


export class OrderSuggestionManager {

  // ===== AJUSTES POR RUPTURA/QUEBRA =====

  /**
   * Calcula multiplicador de ruptura
   * Se produto acabou antes do previsto, aumentar proporcionalmente
   * @param {number} expectedDays - Dias que o produto DEVERIA durar
   * @param {number} actualDays - Dias que o produto REALMENTE durou
   * @returns {number} Multiplicador (ex: 2.0 se durou metade do tempo)
   */
  static calculateRuptureMultiplier(expectedDays, actualDays) {
    if (!expectedDays || expectedDays <= 0 || !actualDays || actualDays <= 0) {
      return 1.0; // Sem ajuste
    }
    // Limitar multiplicador entre 1.0 e 3.0 para evitar sugestões absurdas
    const multiplier = expectedDays / actualDays;
    return Math.min(Math.max(multiplier, 1.0), 3.0);
  }

  /**
   * Calcula fator de redução por quebra
   * Se produto sobrou/estragou, reduzir proporcionalmente
   * @param {number} orderedQuantity - Quantidade pedida
   * @param {number} wastedQuantity - Quantidade quebrada/estragada
   * @returns {number} Fator de redução (ex: 0.67 se 33% foi desperdiçado)
   */
  static calculateWasteMultiplier(orderedQuantity, wastedQuantity) {
    if (!orderedQuantity || orderedQuantity <= 0 || !wastedQuantity || wastedQuantity < 0) {
      return 1.0; // Sem ajuste
    }
    // Limitar fator entre 0.5 e 1.0 (não reduzir mais que 50%)
    const factor = (orderedQuantity - wastedQuantity) / orderedQuantity;
    return Math.min(Math.max(factor, 0.5), 1.0);
  }

  /**
   * Carrega ajustes salvos para receitas
   * @param {Array<string>} recipeIds - IDs das receitas
   * @returns {Promise<Object>} Mapa de recipeId -> { rupture_multiplier, waste_multiplier }
   */
  static async loadRecipeAdjustments(recipeIds) {
    const adjustments = {};

    try {
      // Carregar receitas em paralelo
      const recipePromises = recipeIds.map(id => Recipe.getById(id).catch(() => null));
      const recipes = await Promise.all(recipePromises);

      recipes.forEach((recipe, index) => {
        const recipeId = recipeIds[index];
        if (recipe && recipe.suggestion_adjustment) {
          adjustments[recipeId] = {
            rupture_multiplier: recipe.suggestion_adjustment.rupture_multiplier || 1.0,
            waste_multiplier: recipe.suggestion_adjustment.waste_multiplier || 1.0,
            last_updated: recipe.suggestion_adjustment.last_updated
          };
        } else {
          adjustments[recipeId] = { rupture_multiplier: 1.0, waste_multiplier: 1.0 };
        }
      });
    } catch (error) {
      console.error('❌ [loadRecipeAdjustments] Erro ao carregar ajustes:', error);
    }

    return adjustments;
  }

  /**
   * Salva ajuste de ruptura/quebra para uma receita
   * @param {string} recipeId - ID da receita
   * @param {string} adjustmentType - 'rupture' ou 'waste'
   * @param {number} multiplier - Valor do multiplicador
   */
  static async updateRecipeAdjustment(recipeId, adjustmentType, multiplier) {
    try {
      const recipe = await Recipe.getById(recipeId);
      if (!recipe) {
        console.warn(`⚠️ [updateRecipeAdjustment] Receita não encontrada: ${recipeId}`);
        return false;
      }

      const currentAdjustment = recipe.suggestion_adjustment || {};
      const updatedAdjustment = {
        ...currentAdjustment,
        [adjustmentType === 'rupture' ? 'rupture_multiplier' : 'waste_multiplier']: multiplier,
        last_updated: new Date().toISOString()
      };

      await Recipe.update(recipeId, { suggestion_adjustment: updatedAdjustment });
      console.log(`✅ [updateRecipeAdjustment] Ajuste salvo para receita ${recipeId}:`, updatedAdjustment);
      return true;
    } catch (error) {
      console.error('❌ [updateRecipeAdjustment] Erro:', error);
      return false;
    }
  }

  /**
   * Carrega histórico de pedidos para análise
   * @param {string} customerId - ID do cliente
   * @param {number} lookbackWeeks - Quantas semanas analisar (padrão: 8)
   * @param {number} dayOfWeek - Dia da semana (1=Segunda, 2=Terça, ..., 5=Sexta) - OPCIONAL
   * @returns {Promise<Array>} Array de pedidos históricos
   */
  static async loadHistoricalOrders(customerId, lookbackWeeks = 8, dayOfWeek = null) {
    try {
      // Calcular período de análise
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentWeek = this.getWeekNumber(currentDate);

      const orders = [];

      // Buscar pedidos das últimas N semanas
      for (let weeksAgo = 1; weeksAgo <= lookbackWeeks; weeksAgo++) {
        let targetYear = currentYear;
        let targetWeek = currentWeek - weeksAgo;

        // Ajustar para ano anterior se necessário
        if (targetWeek <= 0) {
          targetYear--;
          targetWeek = 52 + targetWeek; // Assumindo 52 semanas por ano
        }

        // ✅ FILTRO POR DIA DA SEMANA
        // Construir array de filtros base
        const queryFilters = [
          { field: 'customer_id', operator: '==', value: customerId },
          { field: 'week_number', operator: '==', value: targetWeek },
          { field: 'year', operator: '==', value: targetYear }
        ];

        // Adicionar filtro de dia se fornecido
        if (dayOfWeek !== null && dayOfWeek !== undefined) {
          queryFilters.push({ field: 'day_of_week', operator: '==', value: dayOfWeek });
        }

        const weekOrders = await Order.query(queryFilters);

        orders.push(...weekOrders);
      }

      return orders;
    } catch (error) {
      return [];
    }
  }

  /**
   * Analisa padrões de consumo baseado no histórico
   * @param {Array} historicalOrders - Pedidos históricos
   * @returns {Object} Mapa de análises por receita
   */
  static analyzeConsumptionPatterns(historicalOrders) {
    const recipeAnalysis = {};

    historicalOrders.forEach(order => {
      const mealsExpected = order.total_meals_expected || 0;

      if (mealsExpected === 0) return; // Pular pedidos sem refeições informadas

      order.items?.forEach(item => {
        const recipeId = item.recipe_id;
        const baseQuantity = parseQuantity(item.base_quantity) || 0;
        const adjustmentPercentage = parseQuantity(item.adjustment_percentage) || 0;
        const quantity = parseQuantity(item.quantity) || 0;

        if (!recipeAnalysis[recipeId]) {
          recipeAnalysis[recipeId] = {
            recipe_id: recipeId,
            recipe_name: item.recipe_name,
            category: item.category,
            unit_type: item.unit_type,
            samples: [],
            statistics: null
          };
        }

        // Adicionar amostra com contexto
        recipeAnalysis[recipeId].samples.push({
          base_quantity: baseQuantity,
          adjustment_percentage: adjustmentPercentage,
          final_quantity: quantity,
          meals_expected: mealsExpected,
          // ✅ CORREÇÃO: Usar quantity (quantidade final) ao invés de base_quantity
          // Isso garante que ajustes de porcionamento sejam considerados
          ratio_per_meal: quantity / mealsExpected, // Ratio da quantidade FINAL por refeição
          date: order.date,
          week_number: order.week_number,
          year: order.year,
          day_of_week: order.day_of_week
        });
      });
    });

    // Calcular estatísticas para cada receita
    Object.keys(recipeAnalysis).forEach(recipeId => {
      const analysis = recipeAnalysis[recipeId];
      analysis.statistics = this.calculateRecipeStatistics(analysis.samples);
    });

    return recipeAnalysis;
  }

  /**
   * Calcula estatísticas para uma receita específica
   * @param {Array} samples - Amostras de pedidos para a receita
   * @returns {Object} Estatísticas calculadas
   */
  static calculateRecipeStatistics(samples) {
    if (samples.length === 0) {
      return {
        median_base_quantity: 0,
        median_adjustment_percentage: 0,
        median_ratio_per_meal: 0,
        avg_base_quantity: 0,
        confidence: 0,
        total_samples: 0,
        recent_samples: 0
      };
    }

    // Ordenar por data (mais recentes primeiro)
    const sortedSamples = samples.sort((a, b) => {
      const dateA = new Date(a.date || '1970-01-01');
      const dateB = new Date(b.date || '1970-01-01');
      return dateB - dateA;
    });

    // Usar até 8 amostras recentes para basear a sugestão
    const recentSamples = sortedSamples.slice(0, Math.min(8, samples.length));

    // ✅ MUDANÇA: Usar mediana para ser robusto a outliers.
    const targetSamples = recentSamples.length > 0 ? recentSamples : sortedSamples;

    const medianBaseQuantity = this.median(targetSamples.map(s => s.base_quantity));
    const medianAdjustmentPercentage = this.median(targetSamples.map(s => s.adjustment_percentage));
    const medianRatioPerMeal = this.median(targetSamples.map(s => s.ratio_per_meal));

    // ✅ ATUALIZADO: Usar Média Robusta (sem outliers) em vez de Média Simples
    const robustAvgBaseQuantity = this.calculateRobustAverage(samples.map(s => s.base_quantity));

    // Calcular nível de confiança baseado no número de amostras e consistência
    let confidence = Math.min(samples.length / 4, 1);

    // Penalizar confiança se muito antigo (se só tiver samples antigos)
    if (recentSamples.length === 0) confidence *= 0.5;

    return {
      median_base_quantity: Math.round(medianBaseQuantity * 100) / 100,
      median_adjustment_percentage: Math.round(medianAdjustmentPercentage * 100) / 100,
      median_ratio_per_meal: Math.round(medianRatioPerMeal * 10000) / 10000,
      avg_base_quantity: Math.round(robustAvgBaseQuantity * 100) / 100, // Agora é Robusta!
      confidence: Math.round(confidence * 100) / 100,
      total_samples: samples.length,
      recent_samples: recentSamples.length,
      source: 'portal_history_robust'
    };
  }

  /**
   * Calcula média inteligente baseada em dados diários
   * @param {Object} dailySales - Mapa de data -> quantidade
   * @param {number} targetDayOfWeek - Dia da semana alvo (0-6) ou null
   * @param {number} totalDays - Janela total de dias (ex: 60)
   * @param {Date} [referenceDate] - Data de referência (hoje). Opcional, para testes.
   * @returns {Object} Estatísticas { average, confidence, method, samples_count }
   */
  static calculateSmartAverage(dailySales, targetDayOfWeek, totalDays = 60, referenceDate = new Date()) {
    const dates = Object.keys(dailySales);
    if (dates.length === 0) {
      return { average: 0, confidence: 0, method: 'no_data', samples_count: 0, explain: 'Sem dados' };
    }

    const samples = [];
    const weekdaySamples = [];
    const weekdayPeriodSamples = []; // Same Weekday AND Same Period (Exact Match)

    // Determine Current Period
    const currentDayOfMonth = referenceDate.getDate();
    let currentPeriod = 'late';
    if (currentDayOfMonth <= 10) currentPeriod = 'early'; // Payday/Beginning
    else if (currentDayOfMonth <= 20) currentPeriod = 'mid'; // Middle

    // console.log(`[SmartAvg] Date: ${referenceDate.toISOString().slice(0,10)}, Period: ${currentPeriod}, TargetDay: ${targetDayOfWeek}`);

    dates.forEach(dateStr => {
      const qty = parseFloat(dailySales[dateStr]);
      if (qty > 0) { // Active Days Only
        samples.push(qty);

        // Date parsing (T12:00:00 to avoid timezone issues)
        const dateObj = new Date(dateStr + 'T12:00:00');
        const day = dateObj.getDay();
        const dayOfMonth = dateObj.getDate();

        // Determine Sample Period
        let samplePeriod = 'late';
        if (dayOfMonth <= 10) samplePeriod = 'early';
        else if (dayOfMonth <= 20) samplePeriod = 'mid';

        if (targetDayOfWeek !== null && targetDayOfWeek !== undefined) {
          if (day === targetDayOfWeek) {
            weekdaySamples.push(qty);

            // Check Intersection (Same Weekday + Same Period)
            if (samplePeriod === currentPeriod) {
              weekdayPeriodSamples.push(qty);
            }
          }
        }
      }
    });

    // 1. GOLD: Intersection (Weekday + Period)
    // E.g. "Fridays in the 1st-10th of the month"
    // With 60 days, we expect 2 or 3 samples max. 
    // If we have >= 2 samples, it's worth using because it's highly specific.
    if (weekdayPeriodSamples.length >= 2) {
      const avg = this.average(weekdayPeriodSamples);
      const median = this.median(weekdayPeriodSamples);
      const finalVal = weekdayPeriodSamples.length >= 4 ? median : avg;

      return {
        average: finalVal,
        confidence: 0.95,
        method: 'weekday_period_average',
        samples_count: weekdayPeriodSamples.length,
        explain: `Média de ${weekdayPeriodSamples.length} ${this.getDayName(targetDayOfWeek)}s (Período ${currentPeriod})`
      };
    }

    // 2. SILVER: Weekday Only (Prioritize Weekday over generic Period)
    if (weekdaySamples.length >= 3) {
      const avg = this.average(weekdaySamples);
      const median = this.median(weekdaySamples);
      const finalVal = weekdaySamples.length >= 5 ? median : avg;

      return {
        average: finalVal,
        confidence: 0.9,
        method: 'weekday_average',
        samples_count: weekdaySamples.length,
        explain: `Média de ${weekdaySamples.length} c/${this.getDayName(targetDayOfWeek)}`
      };
    }

    // 3. BRONZE: Active Days Fallback
    if (samples.length > 0) {
      const avgParams = this.calculateRobustAverage(samples);
      return {
        average: avgParams,
        confidence: 0.7,
        method: 'active_days_average',
        samples_count: samples.length,
        explain: `Média de ${samples.length} dias ativos`
      };
    }

    return { average: 0, confidence: 0, method: 'no_active_sales', samples_count: 0 };
  }

  /**
   * NOVA MATEMÁTICA: Calcula a Sugestão Cruzando Validade (Shelf Life) com a Janela do Dia (Sales Window)
   * A lógica descobre todos os lotes históricos no dia da semana pedido, soma os `N` dias sequentes
   * que correspondem ao período de validade do Item, mas corta a venda limite no último dia usando
   * a janela horária.
   * Ex: Terça-Feira com ShelfLife=3, Janela=14:00. Puxa vendas de Terça(All), Quarta(All) e Quinta(Até 14h).
   */
  static calculateShelfLifeAverage(eventsByDate, targetDayOfWeek, shelfLife, salesWindow) {
    if (!eventsByDate) return { average: 0, confidence: 0, method: 'no_data', samples_count: 0 };

    const allDates = Object.keys(eventsByDate).sort();
    if (allDates.length === 0) return { average: 0, confidence: 0, method: 'no_data', samples_count: 0 };

    const samples = [];
    const jsTargetDay = targetDayOfWeek % 7; // Sunday can be 0 or 7

    // Itera todas as datas verificando se é a "Data Raiz" do lote (ex: as sextas-feiras)
    allDates.forEach(anchorDateStr => {
      const anchorDate = new Date(anchorDateStr + 'T12:00:00'); // T12:00 protege contra timezone quirks

      if (anchorDate.getDay() === jsTargetDay) {
        let batchTotal = 0;
        let itemsSoldInBatch = 0; // para validar se existiu comercio no lote

        // Loop pra frente baseado no Shelf Life (Ex: 3 dias)
        for (let i = 0; i < shelfLife; i++) {
          const currentDate = new Date(anchorDate);
          currentDate.setDate(anchorDate.getDate() + i);
          const currentDateStr = currentDate.toISOString().split('T')[0];

          const dayEvents = eventsByDate[currentDateStr];
          if (dayEvents) {
            itemsSoldInBatch++;
            // Se for o ULTIMO dia de vida desse Produto E tiver 'Janela Limite' ativa (Ex: Vende o resto até as 14:00, ou de 08:00 às 13:00)
            if (i === shelfLife - 1 && salesWindow && salesWindow !== 'all_day') {
              let startHour = 0;
              let endHour = 24;

              if (salesWindow.includes('-')) {
                const parts = salesWindow.split('-');
                startHour = parseInt(parts[0].split(':')[0], 10) || 0;
                endHour = parseInt(parts[1].split(':')[0], 10) || 24;
              } else {
                endHour = parseInt(salesWindow.split(':')[0], 10);
              }

              if (!isNaN(endHour)) {
                Object.keys(dayEvents).forEach(hourStr => {
                  const hour = parseInt(hourStr, 10);
                  if (hour >= startHour && hour <= endHour) {
                    batchTotal += dayEvents[hourStr];
                  }
                });
                continue; // Vai para próximo for-loop para não somar abaixo
              }
            }

            // Se não caiu na restrição do último dia, soma TODAS as quantidades vendidas nesse dia do Lote
            Object.values(dayEvents).forEach(qty => {
              batchTotal += qty;
            });
          }
        }

        // Salva esse Lote nos nossos blocos amostrais
        if (itemsSoldInBatch > 0) {
          samples.push(batchTotal);
        }
      }
    });

    if (samples.length === 0) {
      return { average: 0, confidence: 0, method: 'no_matching_days', samples_count: 0 };
    }

    // Usar uma média Robusta para ignorar os Lotes muito loucos e picos fora da curva
    const sorted = [...samples].sort((a, b) => a - b);
    const trimCount = Math.floor(samples.length * 0.1);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

    let avg = trimmed.length > 0 ? this.average(trimmed) : this.average(samples);

    // Trava de "Gordura de Quebra": Removida a trava fixa de +3 itens
    // Como reclamado pelos usuários, ela mascarava a redução correta da Janela de Tempo
    // fazendo as sugestões parecerem maiores que The 'All Day'.

    return {
      average: avg,
      confidence: samples.length >= 3 ? 0.9 : 0.6,
      method: 'shelf_life_window',
      samples_count: samples.length,
      explain: `Tamanho do lote: ${shelfLife}d. Soma filtrada até ${salesWindow} na conta de ${samples.length} blocos passados`
    };
  }

  /**
   * Calcula média robusta removendo outliers extremos
   */
  static calculateRobustAverage(values) {
    if (values.length === 0) return 0;
    if (values.length <= 4) return this.average(values);

    // Ordenar
    const sorted = [...values].sort((a, b) => a - b);

    // Remover top 10% e bottom 10% se tiver dados suficientes (trimming)
    const trimCount = Math.floor(values.length * 0.1);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

    return this.average(trimmed);
  }

  /**
   * Helper para nome do dia
   */
  static getDayName(dayIdx) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[dayIdx] || 'Dia';
  }

  /**
   * Gera sugestões de quantidade para um conjunto de itens
   * @param {Array} orderItems - Itens do pedido atual
   * @param {number} mealsExpected - Número de refeições esperadas
   * @param {Object} consumptionPatterns - Padrões de consumo analisados
   * @param {Object} adjustments - Ajustes salvos por recipeId { rupture_multiplier, waste_multiplier }
   * @returns {Array} Itens com sugestões aplicadas
   */
  static generateSuggestions(orderItems, mealsExpected, consumptionPatterns, adjustments = {}, options = {}) {
    // NOTA: mealsExpected é ignorado na nova lógica a pedido do usuário,
    // mas mantido na assinatura para compatibilidade.

    return orderItems.map(item => {
      const recipeAnalysis = consumptionPatterns[item.recipe_id];

      // Se não há dados históricos, manter item original
      if (!recipeAnalysis || recipeAnalysis.statistics.confidence < 0.25) {
        return {
          ...item,
          suggestion: {
            has_suggestion: false,
            reason: recipeAnalysis ? 'baixa_confianca' : 'sem_historico',
            confidence: recipeAnalysis?.statistics?.confidence || 0
          }
        };
      }

      const stats = recipeAnalysis.statistics;
      const isCarneCategory = CategoryLogic.isCarneCategory(item.category);

      // ✅ ESTRATÉGIA SIMPLIFICADA: Usar Mediana ou Média Inteligente (Smart Average)
      let suggestedBaseQuantity = stats.median_base_quantity;
      let source = stats.source || 'median_quantity_direct';

      // Validação de segurança mínima
      if (suggestedBaseQuantity < 0.125) {
        // Se for muito baixo, garantir 0 ou um mínimo técnico se houver confiança
        if (stats.confidence > 0.8 && stats.median_base_quantity > 0) {
          suggestedBaseQuantity = 0.25;
          source = 'min_quantity_fix';
        }
      }

      // ✅ NOVO: Aplicar ajustes de Ruptura/Quebra
      const recipeAdjustment = adjustments[item.recipe_id] || { rupture_multiplier: 1.0, waste_multiplier: 1.0 };
      const combinedMultiplier = recipeAdjustment.rupture_multiplier * recipeAdjustment.waste_multiplier;

      if (combinedMultiplier !== 1.0) {
        suggestedBaseQuantity *= combinedMultiplier;
        source = `${source}+adjusted(${combinedMultiplier.toFixed(2)}x)`;
        console.log(`📊 [generateSuggestions] ${item.recipe_name}: aplicando ajuste ${combinedMultiplier.toFixed(2)}x (ruptura: ${recipeAdjustment.rupture_multiplier}, quebra: ${recipeAdjustment.waste_multiplier})`);
      }

      // Arredondar para valores práticos (se não for solicitado valor bruto)
      if (!options.rawValues) {
        suggestedBaseQuantity = this.roundToPracticalValue(suggestedBaseQuantity, item.unit_type);
      }

      const suggestedAdjustmentPercentage = isCarneCategory ?
        Math.round(stats.median_adjustment_percentage) : 0;

      // Aplicar lógica de categoria para calcular quantidade final
      // Nota: Passamos mealsExpected apenas para logs, cálculo não deve depender dele vitalmente se não usado pro ratio
      const suggestedItem = CategoryLogic.calculateItemValues(
        { ...item, base_quantity: suggestedBaseQuantity, adjustment_percentage: suggestedAdjustmentPercentage },
        'base_quantity',
        suggestedBaseQuantity,
        mealsExpected || 0
      );

      return {
        ...suggestedItem,
        suggestion: {
          has_suggestion: true,
          confidence: stats.confidence,
          based_on_samples: stats.total_samples,
          recent_samples: stats.recent_samples,
          suggested_base_quantity: suggestedBaseQuantity,
          suggested_adjustment_percentage: suggestedAdjustmentPercentage,
          meals_expected: mealsExpected,
          source: source,
          adjustment_applied: combinedMultiplier !== 1.0 ? combinedMultiplier : null
        }
      };
    });
  }

  /**
   * Aplica sugestões em um pedido, mantendo valores já preenchidos
   * Esta é uma versão "soft" que só preenche campos vazios
   * @param {Array} orderItems - Itens do pedido
   * @param {Array} suggestedItems - Itens com sugestões
   * @param {number} currentMealsExpected - Refeições esperadas atuais
   * @returns {Array} Itens com sugestões aplicadas apenas em campos vazios
   */
  static applySuggestionsToEmptyFields(orderItems, suggestedItems, currentMealsExpected = null) {
    return orderItems.map((originalItem, index) => {
      const suggestedItem = suggestedItems[index];

      if (!suggestedItem?.suggestion?.has_suggestion) {
        return originalItem;
      }

      const suggestionMealsExpected = suggestedItem.suggestion.meals_expected || 0;
      const targetMealsExpected = currentMealsExpected || suggestionMealsExpected;
      const updatedItem = { ...originalItem };

      // ✅ CONDIÇÃO 1: Aplicar apenas se campo estiver vazio ou zero
      const currentBaseQuantity = parseQuantity(originalItem.base_quantity) || 0;
      const currentAdjustmentPercentage = parseQuantity(originalItem.adjustment_percentage) || 0;

      if (currentBaseQuantity === 0) {
        // ✅ SIMPLIFICAÇÃO: Usar valor sugerido diretamente (sem scale)
        const scaledBaseQuantity = suggestedItem.suggestion.suggested_base_quantity;

        updatedItem.base_quantity = this.roundToPracticalValue(scaledBaseQuantity, originalItem.unit_type);
      }

      if (CategoryLogic.isCarneCategory(originalItem.category) && currentAdjustmentPercentage === 0) {
        updatedItem.adjustment_percentage = suggestedItem.suggestion.suggested_adjustment_percentage;
      }

      // ✅ CONDIÇÃO 2: Recalcular valores dependentes usando CategoryLogic  
      const recalculatedItem = CategoryLogic.calculateItemValues(
        updatedItem,
        'base_quantity',
        updatedItem.base_quantity,
        targetMealsExpected
      );

      // Preservar informações da sugestão para feedback ao usuário
      recalculatedItem.suggestion = {
        ...suggestedItem.suggestion,
        meals_expected: targetMealsExpected,
        scaled_from: suggestionMealsExpected !== targetMealsExpected ? suggestionMealsExpected : null,
        scaling_ratio: suggestionMealsExpected !== targetMealsExpected ? (targetMealsExpected / suggestionMealsExpected) : null
      };

      return recalculatedItem;
    });
  }

  /**
   * Versão "hard" que substitui todos os valores com sugestões
   * @param {Array} orderItems - Itens do pedido  
   * @param {Array} suggestedItems - Itens com sugestões
   * @param {number} currentMealsExpected - Refeições esperadas atuais
   * @returns {Array} Itens com todas as sugestões aplicadas
   */
  static applyAllSuggestions(orderItems, suggestedItems, currentMealsExpected = null) {
    return suggestedItems.map((suggestedItem, index) => {
      const originalItem = orderItems[index];

      if (!suggestedItem.suggestion?.has_suggestion) {
        return originalItem; // Manter item original se não há sugestão
      }

      const suggestionMealsExpected = suggestedItem.suggestion.meals_expected || 0;
      const targetMealsExpected = currentMealsExpected || suggestionMealsExpected;

      // ✅ CALCULAR PROPORÇÃO SE DIFERENTES
      let scaledBaseQuantity = suggestedItem.suggestion.suggested_base_quantity;

      if (suggestionMealsExpected > 0 && targetMealsExpected !== suggestionMealsExpected) {
        const scalingRatio = targetMealsExpected / suggestionMealsExpected;
        scaledBaseQuantity = suggestedItem.suggestion.suggested_base_quantity * scalingRatio;
        scaledBaseQuantity = this.roundToPracticalValue(scaledBaseQuantity, originalItem.unit_type);
      }

      // Aplicar os valores sugeridos (já escalados se necessário)
      const updatedItem = {
        ...originalItem,
        base_quantity: scaledBaseQuantity,
        adjustment_percentage: suggestedItem.suggestion.suggested_adjustment_percentage || 0
      };

      // Recalcular valores dependentes usando CategoryLogic
      const recalculatedItem = CategoryLogic.calculateItemValues(
        updatedItem,
        'base_quantity',
        updatedItem.base_quantity,
        targetMealsExpected
      );

      // Preservar informações da sugestão (atualizadas)
      recalculatedItem.suggestion = {
        ...suggestedItem.suggestion,
        meals_expected: targetMealsExpected,
        scaled_from: suggestionMealsExpected !== targetMealsExpected ? suggestionMealsExpected : null,
        scaling_ratio: suggestionMealsExpected !== targetMealsExpected ? (targetMealsExpected / suggestionMealsExpected) : null
      };

      return recalculatedItem;
    });
  }

  /**
   * Pipeline completo de sugestões
   * @param {string} customerId - ID do cliente
   * @param {Array} currentOrderItems - Itens do pedido atual
   * @param {number} mealsExpected - Refeições esperadas
   * @param {Object} options - Opções de configuração
   * @returns {Promise<Object>} Resultado com itens sugeridos e metadados
   */
  static async generateOrderSuggestions(customerId, currentOrderItems, mealsExpected, options = {}) {
    const {
      lookbackWeeks = 12,
      applyToEmptyOnly = true,
      minConfidence = 0.25,
      dayOfWeek = null, // ✅ NOVO: Dia da semana para filtrar histórico
      useVrSales = false, // ✅ NOVO: Flag para usar API de Vendas
      fullRecipes = [], // ✅ NOVO: Lista completa de receitas para buscar códigos
      rawValues = false, // ✅ NOVO: Usar valores brutos sem arredondamento
      storeId = null // ✅ NOVO: ID da loja para filtrar vendas
    } = options;

    try {
      let consumptionPatterns = {};
      let sourceInfo = 'history';
      let historicalOrdersCount = 0;

      // === ESTRATÉGIA 1: USAR HISTÓRICO DE VENDAS NATIVO (sales_history) ===
      if (useVrSales) {
        console.log(`🔍 [Suggestion] Buscando Histórico de Vendas Nativo (sales_history)...`);
        try {
          const { SalesHistory } = await import('@/app/api/entities');
          const productCodes = [];
          const recipeMap = {}; // map code -> [recipeId]

          // 1. Extrair os códigos de VR dos itens que a cozinha pode sugerir
          const recipesToScan = fullRecipes.length > 0 ? fullRecipes : currentOrderItems;
          recipesToScan.forEach(r => {
            const code = r.code || r.product_code || r.external_code || r.vr_product_code;
            if (code) {
              const codeInt = parseInt(code, 10);
              if (!isNaN(codeInt)) {
                productCodes.push(codeInt);
                if (!recipeMap[codeInt]) recipeMap[codeInt] = [];
                const rId = r.recipe_id || r.id;
                if (!recipeMap[codeInt].includes(rId)) recipeMap[codeInt].push(rId);
              }
            }
          });

          // 2. Optimization V3: Consultar os batches da nuvem. O Firestore SDK local lida com cache.
          // Formato novo da PK: storeId_productId_data. Precisamos de 'where in' do productId.
          // Com a nova modelagem de granularidade, passamos a usar o storeId no IN se ele existir
          // Mas como mantivemos a busca in batch por productId, adicionamos filtro de storeId

          const codeStrings = productCodes.map(String);
          let rawSales = [];

          const inBatches = [];
          for (let i = 0; i < codeStrings.length; i += 10) {
            inBatches.push(codeStrings.slice(i, i + 10));
          }

          console.log(`📦 [Suggestion] Baixando ${inBatches.length} lotes de histórico de vendas (Loja ${storeId || 'Todas'})...`);
          for (const batchCodes of inBatches) {
            const queryConditions = [
              { field: 'productId', operator: 'in', value: batchCodes }
            ];

            if (storeId) {
              queryConditions.push({ field: 'storeId', operator: '==', value: parseInt(storeId, 10) });
            }

            const batchResults = await SalesHistory.query(queryConditions);
            rawSales = rawSales.concat(batchResults);
          }

          if (rawSales.length > 0) {
            let cacheHits = 0;
            // 3. Montar o Map por produto agrupando os arrays events horários
            const mappedSales = {};

            rawSales.forEach(doc => {
              if (!mappedSales[doc.productId]) { mappedSales[doc.productId] = { events: {} }; }

              const hourlyQty = {};
              if (Array.isArray(doc.events)) {
                doc.events.forEach(e => {
                  if (e && e.hour !== undefined && e.qty !== undefined) {
                    hourlyQty[String(e.hour)] = e.qty;
                  }
                });
              } else if (doc.total_quantity !== undefined) {
                hourlyQty["12"] = doc.total_quantity; // Fallback se não houver events
              }
              mappedSales[doc.productId].events[doc.date] = hourlyQty;
            });

            // 4. Executar Matemática Nova: Validade (Shelf Life) x Janelas Horárias (Sales Window)
            currentOrderItems.forEach(item => {
              const codeInt = parseInt(item.code || item.product_code || item.external_code || item.vr_product_code, 10);
              if (isNaN(codeInt)) return;

              const codeInfo = mappedSales[codeInt];
              if (codeInfo && Object.keys(codeInfo.events).length > 0) {
                // Puxa as regras diretas do item (Persistente do Cardápio / DB da Receita)
                let shelfLife = parseInt(item.shelf_life || 1, 10);
                const salesWindow = item.sales_window || 'all_day';

                // ✅ OVERRIDE EMERGENCIAL: Se a Categoria for de ALMOÇO, travar validade em 1 dia
                if (item.category && item.category.toUpperCase().includes('(ALMOÇO)')) {
                  shelfLife = 1;
                }

                // Calcula varrendo os X Dias p/ Frente cortando a HORA só no ultimo dia
                const smartStats = this.calculateShelfLifeAverage(codeInfo.events, dayOfWeek, shelfLife, salesWindow);

                const rId = item.recipe_id || item.id;

                consumptionPatterns[rId] = {
                  recipe_id: rId,
                  statistics: {
                    median_base_quantity: smartStats.average,
                    avg_base_quantity: smartStats.average,
                    confidence: smartStats.confidence,
                    total_samples: smartStats.samples_count,
                    recent_samples: smartStats.samples_count,
                    source: `vr_native_${smartStats.method}`
                  },
                  debug_info: smartStats
                };
                cacheHits++;
              }
            });

            if (cacheHits > 0) {
              console.log(`✅ [Suggestion] Firebase Nativo: ${cacheHits} itens processados (Smart Avg).`);
              sourceInfo = 'vr_real_sales_native';
              historicalOrdersCount = cacheHits;
            }
          } else {
            console.warn('⚠️ [Suggestion] Nenhuma venda localizada para os itens da requisição.');
          }

        } catch (err) {
          console.error('❌ [Suggestion] Falha ao processar nativo:', err);
        }
      }

      // === ESTRATÉGIA 2: HISTÓRICO DO PORTAL (FALLBACK) ===
      // Só usa histórico MANUAL se NÃO estivermos usando VR Sales (a pedido do usuário: ignorar digitados)
      if (Object.keys(consumptionPatterns).length === 0 && !useVrSales) {
        // 1. Carregar histórico (COM FILTRO DE DIA DA SEMANA)
        const historicalOrders = await this.loadHistoricalOrders(customerId, lookbackWeeks, dayOfWeek);
        historicalOrdersCount = historicalOrders.length;

        if (historicalOrders.length > 0) {
          // 2. Analisar padrões
          consumptionPatterns = this.analyzeConsumptionPatterns(historicalOrders);
          sourceInfo = 'portal_history';
        }
      }

      // Se ainda vazio, retorna falha/vazio
      if (Object.keys(consumptionPatterns).length === 0 && historicalOrdersCount === 0) {
        return {
          success: true,
          items: currentOrderItems.map(item => ({ ...item, suggestion: null })),
          metadata: {
            historical_orders: 0,
            suggestions_applied: 0,
            day_of_week: dayOfWeek,
            message: 'Nenhum histórico ou dados de venda encontrados'
          }
        };
      }

      // 2.5 ✅ NOVO: Carregar ajustes de ruptura/quebra salvos nas receitas
      const recipeIds = currentOrderItems.map(item => item.recipe_id).filter(Boolean);
      const adjustments = await this.loadRecipeAdjustments(recipeIds);

      // 3. Gerar sugestões (com ajustes aplicados)
      const suggestedItems = this.generateSuggestions(currentOrderItems, mealsExpected,
        consumptionPatterns,
        adjustments,
        { rawValues } // Passar opção para não arredondar
      );

      // 4. Aplicar sugestões conforme configuração
      const finalItems = applyToEmptyOnly
        ? this.applySuggestionsToEmptyFields(currentOrderItems, suggestedItems, mealsExpected)
        : this.applyAllSuggestions(currentOrderItems, suggestedItems, mealsExpected);

      // 5. Calcular estatísticas
      const suggestionsApplied = finalItems.filter(item => item.suggestion?.has_suggestion).length;
      const highConfidenceSuggestions = finalItems.filter(item =>
        item.suggestion?.has_suggestion && item.suggestion.confidence >= 0.7
      ).length;

      let msg = '';
      if (sourceInfo === 'vr_real_sales') {
        msg = `${suggestionsApplied} sugestões baseadas em VENDAS REAIS (VR) das últimas 4 semanas`;
      } else if (sourceInfo === 'vr_real_sales_native') {
        msg = `${suggestionsApplied} sugestões baseadas no Histórico Nativo (90d)`;
      } else {
        msg = dayOfWeek
          ? `${suggestionsApplied} sugestões aplicadas baseadas em ${historicalOrdersCount} pedidos de ${this.getDayName(dayOfWeek)}`
          : `${suggestionsApplied} sugestões aplicadas baseadas em ${historicalOrdersCount} pedidos históricos`;
      }

      return {
        success: true,
        items: finalItems,
        metadata: {
          historical_orders: historicalOrdersCount,
          suggestions_applied: suggestionsApplied,
          high_confidence_suggestions: highConfidenceSuggestions,
          lookback_weeks: lookbackWeeks,
          day_of_week: dayOfWeek,
          recipes_analyzed: Object.keys(consumptionPatterns).length,
          source: sourceInfo,
          message: msg
        }
      };

    } catch (error) {
      return {
        success: false,
        items: currentOrderItems,
        error: error.message,
        metadata: {
          historical_orders: 0,
          suggestions_applied: 0,
          day_of_week: dayOfWeek,
          message: 'Erro ao gerar sugestões'
        }
      };
    }
  }

  // ===== MÉTODOS UTILITÁRIOS =====

  /**
   * Calcula média de um array de números
   * @param {Array<number>} numbers - Array de números
   * @returns {number} Média calculada
   */
  /**
   * Calcula mediana de um array de números
   * @param {Array<number>} numbers - Array de números
   * @returns {number} Mediana calculada
   */
  static median(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    const validNumbers = numbers.filter(n => typeof n === 'number' && !isNaN(n)).sort((a, b) => a - b);
    if (validNumbers.length === 0) return 0;

    const mid = Math.floor(validNumbers.length / 2);
    if (validNumbers.length % 2 !== 0) {
      return validNumbers[mid];
    } else {
      return (validNumbers[mid - 1] + validNumbers[mid]) / 2;
    }
  }

  /**
   * Calcula média de um array de números
   * @param {Array<number>} numbers - Array de números
   * @returns {number} Média calculada
   */
  static average(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    const validNumbers = numbers.filter(n => typeof n === 'number' && !isNaN(n));
    if (validNumbers.length === 0) return 0;
    return validNumbers.reduce((sum, n) => sum + n, 0) / validNumbers.length;
  }

  /**
   * Arredonda valores para números práticos baseado no tipo de unidade
   *
   * IMPORTANTE: Esta função é APENAS para sugestões automáticas
   * - Sugestões: arredonda para múltiplos de 0,25 (0,25 / 0,5 / 0,75 / 1,0 / 1,25 / 1,5 / 1,75 / 2,0...)
   *   - 0,25 = 0,5 cuba P (meia cuba pequena)
   *   - 0,5 = 1 cuba P
   *   - 0,75 = 1,5 cuba P
   *   - 1,0 = 1 cuba G
   * - Digitação manual: aceita qualquer valor (inclusive 0,1 / 0,2 / 0,3 / 0,4 potes)
   * - A lógica de potes (0,1 increments) só é usada quando o cliente digita manualmente
   *
   * @param {number} value - Valor a ser arredondado
   * @param {string} unitType - Tipo da unidade
   * @returns {number} Valor arredondado para múltiplos de 0,25
   */
  static roundToPracticalValue(value, unitType) {
    if (value === 0) return 0;

    const unit = (unitType || '').toLowerCase();

    if (unit.includes('kg')) {
      // Para kg: arredondar para 2 casas decimais
      const result = Math.round(value * 100) / 100;
      return result;
    } else if (unit.includes('cuba') || unit.includes('unid')) {
      // ✅ NOVA LÓGICA: Arredondar APENAS para múltiplos de 0,25
      // Exemplos:
      // - 0.1 → 0.25
      // - 0.2 → 0.25
      // - 0.3 → 0.25
      // - 0.4 → 0.5
      // - 0.6 → 0.5
      // - 0.7 → 0.75
      // - 0.8 → 0.75
      // - 1.1 → 1.0
      // - 1.4 → 1.5
      // - 1.6 → 1.5
      // - 1.65 → 1.75
      // - 2.3 → 2.25

      if (value < 0.05) {
        // Valores muito pequenos (< 0.05) arredondam para 0 (não sugerir quantidades insignificantes)
        return 0;
      } else {
        // Para valores >= 0.125: arredondar para o 0.25 mais próximo
        // Math.round(value * 4) / 4 arredonda para múltiplos de 0.25
        return Math.round(value * 4) / 4;
      }
    } else {
      // ✅ ALTERAÇÃO: Tratando tudo como "Unidade" (padrão 0.25)
      // O usuário solicitou que "tudo é unidade", então evitamos decimais como 0.2 ou 0.3
      // Forçamos a lógica de 0.25, 0.5, 0.75, 1.0...

      if (value < 0.05) {
        return 0;
      }
      return Math.round(value * 4) / 4;
    }
  }

  /**
   * Calcula número da semana no ano
   * @param {Date} date - Data para calcular
   * @returns {number} Número da semana
   */
  static getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * Converte número do dia da semana para nome
   * @param {number} dayOfWeek - Dia da semana (1=Segunda, 2=Terça, ..., 5=Sexta)
   * @returns {string} Nome do dia
   */
  static getDayName(dayOfWeek) {
    const dayNames = {
      1: 'Segunda-feira',
      2: 'Terça-feira',
      3: 'Quarta-feira',
      4: 'Quinta-feira',
      5: 'Sexta-feira'
    };
    return dayNames[dayOfWeek] || `Dia ${dayOfWeek}`;
  }

  /**
   * Gera relatório de sugestões para debug/análise
   * @param {Object} result - Resultado do pipeline de sugestões
   * @returns {string} Relatório formatado
   */
  static generateSuggestionReport(result) {
    if (!result.success) {
      return `❌ Erro: ${result.error}`;
    }

    const { items, metadata } = result;
    const suggestedItems = items.filter(item => item.suggestion?.has_suggestion);

    let report = `📊 RELATÓRIO DE SUGESTÕES\n`;
    report += `═══════════════════════════\n`;
    report += `📈 Pedidos Históricos: ${metadata.historical_orders}\n`;
    report += `🎯 Receitas Analisadas: ${metadata.recipes_analyzed}\n`;
    report += `✅ Sugestões Aplicadas: ${metadata.suggestions_applied}\n`;
    report += `🌟 Alta Confiança: ${metadata.high_confidence_suggestions}\n`;
    report += `📅 Período Analisado: ${metadata.lookback_weeks} semanas\n\n`;

    if (suggestedItems.length > 0) {
      report += `🔍 DETALHES DAS SUGESTÕES:\n`;
      report += `─────────────────────────\n`;

      suggestedItems.forEach(item => {
        const suggestion = item.suggestion;
        report += `• ${item.recipe_name}\n`;
        report += `  └ Quantidade: ${suggestion.suggested_base_quantity} ${item.unit_type}\n`;
        if (CategoryLogic.isCarneCategory(item.category)) {
          report += `  └ Porcionamento: ${suggestion.suggested_adjustment_percentage}%\n`;
        }
        report += `  └ Confiança: ${Math.round(suggestion.confidence * 100)}% (${suggestion.based_on_samples} amostras)\n`;
        report += `  └ Fonte: ${suggestion.source}\n\n`;
      });
    }

    return report;
  }
}

export default OrderSuggestionManager;