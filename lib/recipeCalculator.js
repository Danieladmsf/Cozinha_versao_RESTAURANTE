/**
 * SISTEMA UNIFICADO DE CÁLCULOS DE RECEITAS
 * 
 * Nova arquitetura limpa e organizada para todos os cálculos da ficha técnica.
 * Elimina duplicação de código e padroniza nomenclatura de campos.
 * 
 * @version 2.0.0
 * @author Sistema Cozinha Afeto
 */

// ========================================
// UTILITÁRIOS BÁSICOS
// ========================================

/**
 * Parsing seguro e padronizado de valores numéricos
 * Aceita strings com vírgula, pontos, valores undefined/null
 */
export const parseNumber = (value) => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Formatação padronizada de valores
 */
export const formatters = {
  weight: (value, decimals = 3) => {
    const num = parseNumber(value);
    return num.toFixed(decimals).replace('.', ',');
  },

  currency: (value) => {
    const num = parseNumber(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  },

  percentage: (value, decimals = 1) => {
    const num = parseNumber(value);
    return `${num.toFixed(decimals).replace('.', ',')}%`;
  }
};

// ========================================
// DEFINIÇÕES DE ESTRUTURA DE DADOS
// ========================================

/**
 * Campos padronizados de peso por processo
 * ÚNICA FONTE DA VERDADE para nomes de campos
 */
export const WEIGHT_FIELDS = {
  // Entrada/Bruto
  frozen: 'weight_frozen',        // Peso congelado
  raw: 'weight_raw',             // Peso bruto/cru
  thawed: 'weight_thawed',       // Peso descongelado

  // Processamento
  clean: 'weight_clean',         // Peso após limpeza
  preCooking: 'weight_pre_cooking', // Peso pré-cocção
  cooked: 'weight_cooked',       // Peso após cocção
  portioned: 'weight_portioned', // Peso porcionado

  // Assembly/Montagem
  assembly: 'assembly_weight_kg' // Peso na montagem
};

/**
 * Campos de preços padronizados
 */
export const PRICE_FIELDS = {
  current: 'current_price',      // Preço atual
  raw: 'raw_price_kg',          // Preço por kg bruto
  liquid: 'liquid_price_kg',    // Preço por kg líquido
  price: 'price'                // Fallback para preço genérico
};

/**
 * Sequência lógica de processamento
 * Define a ordem natural dos processos
 */
export const PROCESS_SEQUENCE = [
  'defrosting',  // Descongelamento
  'cleaning',    // Limpeza
  'cooking',     // Cocção
  'portioning',  // Porcionamento
  'assembly'     // Montagem
];

// ========================================
// CLASSE PRINCIPAL DE CÁLCULOS
// ========================================

export class RecipeCalculator {

  /**
   * Extrai o peso inicial de um ingrediente
   * Segue prioridade lógica inteligente baseada nos campos preenchidos
   */
  static getInitialWeight(ingredient) {
    // Prioridade inteligente: usar o primeiro campo preenchido na ordem lógica
    const weights = [
      parseNumber(ingredient[WEIGHT_FIELDS.frozen]),      // Peso congelado
      parseNumber(ingredient[WEIGHT_FIELDS.raw]),         // Peso bruto
      parseNumber(ingredient[WEIGHT_FIELDS.preCooking]),  // Peso pré-cocção
      parseNumber(ingredient[WEIGHT_FIELDS.thawed]),      // Peso descongelado
      parseNumber(ingredient.quantity)                    // Quantidade geral
    ];

    // Retornar o primeiro peso válido (> 0)
    for (const weight of weights) {
      if (weight > 0) {
        return weight;
      }
    }

    return 0;
  }

  /**
   * Obtém o peso inicial baseado nos processos ativos
   * Usado para cálculos mais inteligentes na UI
   */
  static getInitialWeightByProcesses(ingredient, processes = []) {
    const hasProcess = (processName) => processes.includes(processName);

    if (hasProcess('defrosting')) {
      return parseNumber(ingredient[WEIGHT_FIELDS.frozen]);
    }

    if (hasProcess('cleaning') && !hasProcess('defrosting')) {
      return parseNumber(ingredient[WEIGHT_FIELDS.raw]);
    }

    if (hasProcess('cooking')) {
      return parseNumber(ingredient[WEIGHT_FIELDS.preCooking]) ||
        parseNumber(ingredient[WEIGHT_FIELDS.clean]) ||
        parseNumber(ingredient[WEIGHT_FIELDS.thawed]) ||
        parseNumber(ingredient[WEIGHT_FIELDS.raw]);
    }

    // Fallback para o método padrão
    return this.getInitialWeight(ingredient);
  }

  /**
   * Extrai o peso final de um ingrediente
   * Segue prioridade lógica: porcionado > cozido > limpo > descongelado > bruto
   */
  static getFinalWeight(ingredient) {
    return parseNumber(ingredient[WEIGHT_FIELDS.assembly]) || // Prioritize Assembly Weight
      parseNumber(ingredient[WEIGHT_FIELDS.portioned]) ||
      parseNumber(ingredient[WEIGHT_FIELDS.cooked]) ||
      parseNumber(ingredient[WEIGHT_FIELDS.clean]) ||
      parseNumber(ingredient[WEIGHT_FIELDS.thawed]) ||
      parseNumber(ingredient[WEIGHT_FIELDS.raw]) ||
      parseNumber(ingredient.quantity) || 0;
  }

  /**
   * Obtém o preço unitário de um ingrediente
   * Prioriza current_price, depois outros campos
   */
  static getUnitPrice(ingredient) {
    return parseNumber(ingredient[PRICE_FIELDS.current]) ||
      parseNumber(ingredient[PRICE_FIELDS.raw]) ||
      parseNumber(ingredient[PRICE_FIELDS.liquid]) ||
      parseNumber(ingredient[PRICE_FIELDS.price]) || 0;
  }

  /**
   * Calcula perda percentual entre dois pesos
   */
  static calculateLoss(initialWeight, finalWeight) {
    const initial = parseNumber(initialWeight);
    const final = parseNumber(finalWeight);

    if (initial === 0) return 0;

    const lossPercent = ((initial - final) / initial) * 100;
    return Math.max(0, lossPercent); // Nunca negativo
  }

  /**
   * Calcula rendimento percentual de um ingrediente
   */
  static calculateYield(ingredient) {
    const initialWeight = this.getInitialWeight(ingredient);
    const finalWeight = this.getFinalWeight(ingredient);

    if (initialWeight === 0) return 0;

    return (finalWeight / initialWeight) * 100;
  }

  /**
   * Calcula o custo total de um ingrediente
   * Custo = peso inicial × preço unitário
   */
  static calculateIngredientCost(ingredient) {
    const initialWeight = this.getInitialWeight(ingredient);
    const unitPrice = this.getUnitPrice(ingredient);

    // CORREÇÃO: Se não há peso inicial, tentar usar o peso final como base
    // Isso pode acontecer quando só o peso final (pós-cocção) está preenchido
    let actualWeight = initialWeight;
    if (actualWeight === 0) {
      actualWeight = this.getFinalWeight(ingredient);
    }

    return actualWeight * unitPrice;
  }

  /**
   * Escala ingredientes por um fator multiplicador.
   * ÚNICA FONTE DA VERDADE para escala de ingredientes.
   * Usado por: AssemblySubComponents (peso do componente),
   *            IngredientTable (Rendimento da Etapa),
   *            RecipeTechnical (refreshMatrixRecipes)
   * 
   * @param {Array} ingredients - Array de ingredientes a escalar
   * @param {number} factor - Fator multiplicador (ex: 2.0 para dobrar)
   * @returns {Array} Novo array de ingredientes com valores escalados
   */
  static scaleIngredients(ingredients, factor) {
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return ingredients || [];
    }
    if (!factor || isNaN(factor) || factor <= 0) {
      return ingredients;
    }

    return ingredients.map(ing => {
      const scaleValue = (val) => {
        if (val === null || val === undefined || val === '') return val;
        const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
        if (isNaN(num)) return val;
        return num * factor;
      };

      const scaledIng = { ...ing };

      const fieldsToScale = [
        'quantity', 'weight_frozen', 'weight_raw', 'weight_thawed',
        'weight_clean', 'weight_pre_cooking', 'weight_cooked',
        'weight_portioned', 'assembly_weight_kg'
      ];

      fieldsToScale.forEach(field => {
        if (field in ing && ing[field] !== undefined && ing[field] !== null && ing[field] !== '') {
          scaledIng[field] = scaleValue(ing[field]);
        }
      });

      if (ing.name && ing.name.toLowerCase().includes('alho')) {
        console.log(`[MATRIX DEBUG] ALHO ORIGINAL (Factor: ${factor}):`, {
          raw: ing.weight_raw,
          pre: ing.weight_pre_cooking,
          cooked: ing.weight_cooked
        });
        console.log(`[MATRIX DEBUG] ALHO SCALED:`, {
          raw: scaledIng.weight_raw,
          pre: scaledIng.weight_pre_cooking,
          cooked: scaledIng.weight_cooked
        });
      }

      return scaledIng;
    });
  }

  // ========================================
  // CÁLCULOS DE PREPARAÇÃO
  // ========================================

  /**
   * Calcula métricas de uma preparação individual
   */
  static calculatePreparationMetrics(preparation, allPreparations = []) {
    if (!preparation) {
      return {
        totalRawWeight: 0,
        totalYieldWeight: 0,
        totalCost: 0,
        yieldPercentage: 0,
        averageYield: 0
      };
    }

    let totalRawWeight = 0;
    let totalYieldWeight = 0;
    let totalCost = 0;

    // DEBUG: Log all preparations summary to check for ghosts
    if (preparation.processes?.includes('assembly')) {
      console.log(`[DEBUG] Calculating Assembly Step: ${preparation.title}`);
      allPreparations.forEach(p => console.log(`   -> Available Prep: ${p.title} (${p.id}), Cost: ${p.total_cost_prep}, Yield: ${p.total_yield_weight_prep}, P.Count: ${p.processes?.length}`));
    }

    if (preparation.ingredients && Array.isArray(preparation.ingredients)) {
      preparation.ingredients.forEach(ingredient => {
        const initialWeight = this.getInitialWeight(ingredient);
        const finalWeight = this.getFinalWeight(ingredient);
        const cost = this.calculateIngredientCost(ingredient);
        totalRawWeight += initialWeight;
        totalYieldWeight += finalWeight;
        totalCost += cost;
      });
    }

    // Calcular receitas adicionadas (sub-receitas)
    if (preparation.recipes && Array.isArray(preparation.recipes)) {
      preparation.recipes.forEach(recipe => {
        // Apenas usar o peso que o usuário especificou (used_weight)
        // Se estiver vazio, não adicionar nada aos totais
        const usedWeight = parseNumber(recipe.used_weight);

        // Só processar se houver um peso usado válido
        if (usedWeight > 0) {
          const costPerKg = parseNumber(recipe.cost_per_kg_yield);

          // Custo = peso usado × custo por kg líquido da receita
          const recipeCost = usedWeight * costPerKg;

          // Para receitas, o peso bruto e líquido são iguais (receita já foi processada)
          // Rendimento da receita é sempre 100%
          totalRawWeight += usedWeight;
          totalYieldWeight += usedWeight;
          totalCost += recipeCost;
        }
      });
    }

    if (preparation.sub_components && Array.isArray(preparation.sub_components)) {
      preparation.sub_components.forEach(subComp => {
        const weight = parseNumber(subComp.assembly_weight_kg || subComp.weight_portioned); // Prioritize assembly weight
        let cost = 0;
        let rawWeightContribution = weight; // Default for raw ingredients added directly to assembly

        const sourcePrep = allPreparations.find(p => p.id === subComp.source_id);

        // Check if source preparation is a packaging step
        const isPackaging = sourcePrep?.processes?.includes('packaging');

        if (sourcePrep && sourcePrep.id !== preparation.id) {
          const sourceMetrics = this.calculatePreparationMetrics(sourcePrep, allPreparations);

          // PATCH: Fallback for single-ingredient preparations (like Packaging wrappers) that might have 0 calculated cost
          // due to missing weight data but have a valid unit price.
          if (sourceMetrics.totalCost === 0 && sourcePrep.ingredients?.length === 1 && (!sourcePrep.sub_components || sourcePrep.sub_components.length === 0)) {
            const singleIngredient = sourcePrep.ingredients[0];
            const unitPrice = this.getUnitPrice(singleIngredient);

            if (unitPrice > 0) {
              // If it's packaging, we consider the weight as the quantity of units since there is no weight to fractionate.
              cost = isPackaging ? parseNumber(weight) * unitPrice : weight * unitPrice;
              rawWeightContribution = isPackaging ? 0 : weight;
            }
          } else if (sourceMetrics.totalYieldWeight > 0) {
            const scaleFactor = weight / sourceMetrics.totalYieldWeight;
            cost = scaleFactor * sourceMetrics.totalCost;
            rawWeightContribution = scaleFactor * sourceMetrics.totalRawWeight;
          } else {
            if (isPackaging) {
              // units x source prep cost (even if no yield weight exists, but cost exists)
              cost = parseNumber(weight) * sourceMetrics.totalCost;
            } else {
              cost = 0;
            }
            rawWeightContribution = 0;
          }
        } else if (subComp.type === 'ingredient') {
          const unitPrice = this.getUnitPrice(subComp);
          cost = weight * unitPrice;
          rawWeightContribution = weight;
        } else {
          cost = parseNumber(subComp.total_cost);
          rawWeightContribution = weight;
        }

        // If it's a packaging step, don't add weight, only cost
        if (isPackaging) {
          totalCost += cost;
          // Don't add weight for packaging
        } else {
          totalRawWeight += rawWeightContribution;
          totalYieldWeight += weight;
          totalCost += cost;
        }
      });
    }

    const yieldPercentage = totalRawWeight > 0 ? (totalYieldWeight / totalRawWeight) * 100 : 0;

    // Calcular tempo de preparo estimado (Labour Time)
    let totalPrepTime = 0;
    if (preparation.ingredients && Array.isArray(preparation.ingredients)) {
      preparation.ingredients.forEach(ingredient => {
        const initialWeight = this.getInitialWeight(ingredient);
        const timePerKg = parseNumber(ingredient.technical_data?.cleaning_time_per_kg);
        if (initialWeight > 0 && timePerKg > 0) {
          totalPrepTime += initialWeight * timePerKg;
        }
      });
    }

    return {
      totalRawWeight,
      totalYieldWeight,
      totalCost,
      yieldPercentage,
      totalPrepTime, // Tempo em segundos
      averageYield: 0
    };
  }

  // ========================================
  // CÁLCULOS DE RECEITA COMPLETA
  // ========================================

  /**
   * Calcula todas as métricas de uma receita
   */
  static calculateRecipeMetrics(preparations, recipeData = {}) {
    if (!preparations || !Array.isArray(preparations) || preparations.length === 0) {
      return this.getEmptyMetrics();
    }

    // Encontrar a última etapa que seja montagem ou porcionamento
    const finalAssemblyStepIndex = preparations.map(p => p.processes?.some(pr => ['assembly', 'portioning'].includes(pr))).lastIndexOf(true);
    const finalAssemblyStep = finalAssemblyStepIndex !== -1 ? preparations[finalAssemblyStepIndex] : null;

    let finalYieldWeight = 0;
    let finalCost = 0;
    let totalRawWeight = 0;
    let unitsQuantity = 1; // Default to 1

    if (finalAssemblyStep) {
      // Se uma etapa de montagem final existe, suas métricas definem os totais da receita.
      const finalStepMetrics = this.calculatePreparationMetrics(finalAssemblyStep, preparations);
      finalYieldWeight = finalStepMetrics.totalYieldWeight;
      finalCost = finalStepMetrics.totalCost;
      totalRawWeight = finalStepMetrics.totalRawWeight;

      // Obter units_quantity da finalAssemblyStep
      const assemblyConfig = finalAssemblyStep.assembly_config;
      if (assemblyConfig && assemblyConfig.units_quantity) {
        const parsedUnits = parseNumber(assemblyConfig.units_quantity);
        if (parsedUnits > 0) {
          unitsQuantity = parsedUnits;
        }
      }
    } else {
      // Fallback: Se não há etapa de montagem, somar tudo.
      preparations.forEach(prep => {
        const prepMetrics = this.calculatePreparationMetrics(prep, preparations);
        totalRawWeight += prepMetrics.totalRawWeight;
        finalYieldWeight += prepMetrics.totalYieldWeight;
        finalCost += prepMetrics.totalCost;
      });
    }

    // CORREÇÃO: Multiplicar por unitsQuantity ao invés de dividir
    // Quando há múltiplas unidades (ex: 3 porções), o peso/custo nos sub_components
    // representa uma ÚNICA unidade (23g, R$0,20)
    // O total da receita deve ser: peso_unitário × quantidade_unidades
    // Ex: 3 porções × 23g = 69g total
    // IMPORTANTE: NÃO multiplicar se o tipo for 'kg', pois nesse caso a montagem já representa o peso total
    const unitType = finalAssemblyStep?.assembly_config?.unit_type || 'un';
    if (unitsQuantity !== 1 && unitType !== 'kg') {
      finalYieldWeight = finalYieldWeight * unitsQuantity;
      finalCost = finalCost * unitsQuantity;
      totalRawWeight = totalRawWeight * unitsQuantity;
    }

    // ========================================
    // CALCULAR CUSTO OPERACIONAL (COO)
    // Soma dos custos de equipamentos (POPs) inseridos nas preparações
    // ========================================
    let operationalCost = 0;
    const countedPopIds = new Set(); // Evitar duplicação

    preparations.forEach(prep => {
      // MÉTODO 1: Somar equipment_costs diretamente da preparação (preferido - sessão atual)
      if (prep.equipment_costs && Array.isArray(prep.equipment_costs) && prep.equipment_costs.length > 0) {
        prep.equipment_costs.forEach(eq => {
          const cost = parseNumber(eq.cost);
          if (cost > 0 && !countedPopIds.has(eq.pop_id)) {
            console.log(`💰 [RecipeCalculator] Equipment cost from state: ${eq.name} = R$ ${cost.toFixed(4)}`);
            operationalCost += cost;
            countedPopIds.add(eq.pop_id);
          }
        });
      }

      // MÉTODO 2: Fallback - Extrair de campos de texto HTML (para dados carregados do Firebase)
      // Só usar se não temos equipment_costs na sessão para esta preparação
      // Handle notes as array of objects with content field
      if (prep.notes && Array.isArray(prep.notes)) {
        prep.notes.forEach(note => {
          if (note.content && typeof note.content === 'string') {
            operationalCost += this.extractOperationalCostsFromHTML(note.content, countedPopIds);
          }
        });
      }

      // Handle other text fields as strings
      const textFields = [prep.detailed_process, prep.description, prep.content];
      textFields.forEach(field => {
        if (field && typeof field === 'string') {
          operationalCost += this.extractOperationalCostsFromHTML(field, countedPopIds);
        }
      });
    });

    console.log('💰 [RecipeCalculator] Total Operational Cost (COO):', operationalCost);

    const costPerKgRaw = totalRawWeight > 0 ? finalCost / totalRawWeight : 0;
    const costPerKgYield = finalYieldWeight > 0 ? finalCost / finalYieldWeight : 0;
    const overallYieldPercentage = totalRawWeight > 0 ? (finalYieldWeight / totalRawWeight) * 100 : 0;

    // Calcular tempo total de preparo (soma das preparações)
    const totalPrepTime = preparations.reduce((total, prep) => {
      const prepMetrics = this.calculatePreparationMetrics(prep, preparations);
      return total + (prepMetrics.totalPrepTime || 0);
    }, 0);

    const result = {
      total_weight: totalRawWeight,
      yield_weight: finalYieldWeight,
      cuba_weight: finalYieldWeight,
      portion_weight_calculated: finalYieldWeight,
      total_cost: finalCost, // Usar finalCost para tudo
      cost_per_kg_raw: costPerKgRaw,
      cost_per_kg_yield: costPerKgYield,
      cuba_cost: finalCost, // Usar finalCost para tudo
      portion_cost: finalCost, // Usar finalCost para tudo
      operational_cost: operationalCost, // COO
      total_prep_time: totalPrepTime, // Tempo total em segundos
      yield_percentage: overallYieldPercentage,
      container_type: this.getContainerType(preparations),
      weight_field_name: this.getWeightFieldName(preparations),
      cost_field_name: this.getCostFieldName(preparations),
      last_calculated: new Date().toISOString(),
      preparation_metrics: preparations.map((prep, index) => ({
        ...this.calculatePreparationMetrics(prep, preparations),
        preparationIndex: index,
        preparationTitle: prep.title,
      }))
    };

    return result;
  }

  /**
   * Extrai custos operacionais de POPs de equipamentos do HTML
   * POPs de equipamentos são inseridos com data-pop-id e contêm calculatedCost
   * @param {string} html - String HTML contendo POPs
   * @param {Set} countedPopIds - Set de IDs já contados (para evitar duplicação)
   * @returns {number} Soma dos custos de equipamentos
   */
  static extractOperationalCostsFromHTML(html, countedPopIds = new Set()) {
    if (!html || typeof html !== 'string') return 0;

    let totalCost = 0;

    // Regex para encontrar spans com data-pop-id
    // O TipTap renderiza POPs como: <span data-pop-id="xxx" style="..." data-cost="xxx">Name</span>
    // Mas como usamos NodeView, o custo está nos atributos do node que são serializados diferentemente
    // Vamos tentar extrair de diferentes formatos possíveis

    // Formato 1: JSON serializado em atributos data-*
    const popRegex = /<span[^>]*data-pop-id="([^"]+)"[^>]*>/gi;
    const matches = html.matchAll(popRegex);

    for (const match of matches) {
      const popId = match[1];

      // Evitar duplicação - pular se já contado do state
      if (countedPopIds.has(popId)) {
        console.log(`💰 [extractOperationalCosts] Skipping POP ${popId} (already counted from state)`);
        continue;
      }

      // Tentar extrair calculatedCost do atributo
      const fullTag = match[0];

      // Procurar por calculatedCost no atributo
      const costMatch = fullTag.match(/data-calculated-cost="([^"]+)"/i) ||
        fullTag.match(/calculatedcost="([^"]+)"/i);

      if (costMatch) {
        const cost = parseNumber(costMatch[1]);
        if (cost > 0) {
          console.log(`💰 [extractOperationalCosts] Found POP cost in HTML: R$ ${cost.toFixed(4)}`);
          totalCost += cost;
          countedPopIds.add(popId); // Marcar como contado
        }
      }
    }

    // Formato 2: TipTap JSON content (se o HTML contiver JSON serializado)
    // Procurar por padrão de custo calculado em formato JSON
    // NOTA: Este formato não tem pop_id, então pode duplicar. Desativando por segurança.
    // const jsonCostRegex = /"calculatedCost"\s*:\s*([\d.]+)/gi;
    // const jsonMatches = html.matchAll(jsonCostRegex);
    // ...

    return totalCost;
  }


  // ========================================
  // MÉTODOS AUXILIARES
  // ========================================

  /**
   * Retorna métricas vazias/zero
   */
  static getEmptyMetrics() {
    return {
      total_weight: 0,
      yield_weight: 0,
      cuba_weight: 0,
      total_cost: 0,
      cost_per_kg_raw: 0,
      cost_per_kg_yield: 0,
      cuba_cost: 0,
      portion_cost: 0, // NOVO: Campo para salvar no banco
      operational_cost: 0, // COO - Custo Operacional da Operação
      yield_percentage: 0,
      container_type: 'cuba',
      weight_field_name: 'Peso da Cuba',
      cost_field_name: 'Custo CMV',
      last_calculated: new Date().toISOString(),
      preparation_metrics: []
    };
  }

  /**
   * Determina o tipo de container baseado nas preparações
   */
  static getContainerType(preparations) {
    // Buscar por preparações com assembly ou portioning
    const assemblyPrep = preparations.find(prep =>
      prep.processes?.includes('assembly') ||
      prep.processes?.includes('portioning')
    );

    return assemblyPrep?.assembly_config?.container_type || 'cuba';
  }

  /**
   * Calcula o peso da cuba/porção
   * LÓGICA SIMPLES: usa o peso de rendimento total da receita
   */
  static calculatePortionWeight(preparations, totalYieldWeight = 0) {
    // LÓGICA SIMPLIFICADA: cuba weight = yield weight
    // Isso garante consistência e elimina bugs de detecção de processos
    return totalYieldWeight;
  }

  /**
   * Gera nome do campo de peso baseado no tipo de container
   */
  static getWeightFieldName(preparations) {
    const containerType = this.getContainerType(preparations);

    const fieldNames = {
      cuba: 'Peso da Cuba',
      'cuba-p': 'Peso da Cuba P',
      'cuba-g': 'Peso da Cuba G',
      descartavel: 'Peso da Embalagem',
      individual: 'Peso da Porção',
      'Porção': 'Peso da Porção',
      'Unid.': 'Peso da Unidade',
      kg: 'Peso por Kg',
      outros: 'Peso da Unidade'
    };

    return fieldNames[containerType] || 'Peso da Cuba';
  }

  /**
   * Gera nome do campo de custo baseado no tipo de container
   */
  static getCostFieldName(preparations) {
    const containerType = this.getContainerType(preparations);

    const fieldNames = {
      cuba: 'Custo CMV',
      'cuba-p': 'Custo CMV',
      'cuba-g': 'Custo CMV',
      descartavel: 'Custo CMV',
      individual: 'Custo CMV',
      'Porção': 'Custo CMV',
      'Unid.': 'Custo CMV',
      kg: 'Custo CMV',
      outros: 'Custo CMV'
    };

    return fieldNames[containerType] || 'Custo CMV';
  }

  // ========================================
  // VALIDAÇÕES E VERIFICAÇÕES
  // ========================================

  /**
   * Valida a estrutura de dados de uma receita
   */
  static validateRecipeData(preparations) {
    const errors = [];
    const warnings = [];

    if (!preparations || !Array.isArray(preparations)) {
      errors.push('Dados de preparações inválidos');
      return { isValid: false, errors, warnings };
    }

    preparations.forEach((prep, prepIndex) => {
      if (!prep.title) {
        warnings.push(`Preparação ${prepIndex + 1} sem título`);
      }

      if (prep.ingredients && Array.isArray(prep.ingredients)) {
        prep.ingredients.forEach((ing, ingIndex) => {
          if (!ing.name) {
            warnings.push(`Ingrediente ${ingIndex + 1} da preparação ${prepIndex + 1} sem nome`);
          }

          if (this.getInitialWeight(ing) === 0) {
            warnings.push(`Ingrediente "${ing.name}" sem peso inicial`);
          }

          if (this.getUnitPrice(ing) === 0) {
            warnings.push(`Ingrediente "${ing.name}" sem preço`);
          }
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Gera relatório de debug da receita
   */
  static generateDebugReport(preparations, recipeData = {}) {
    const validation = this.validateRecipeData(preparations);
    const metrics = this.calculateRecipeMetrics(preparations, recipeData);

    return {
      timestamp: new Date().toISOString(),
      validation,
      metrics,
      rawData: {
        preparationsCount: preparations?.length || 0,
        totalIngredients: preparations?.reduce((total, prep) =>
          total + (prep.ingredients?.length || 0), 0) || 0,
        totalSubComponents: preparations?.reduce((total, prep) =>
          total + (prep.sub_components?.length || 0), 0) || 0
      }
    };
  }
}

// ========================================
// COMPATIBILIDADE E EXPORTS
// ========================================

// Manter compatibilidade com código existente
export const parseNumericValue = parseNumber;
export const calculateRecipeMetrics = (recipeData, preparations) =>
  RecipeCalculator.calculateRecipeMetrics(preparations, recipeData);

// Disponibilizar no window para debug (apenas em desenvolvimento)


export default RecipeCalculator;