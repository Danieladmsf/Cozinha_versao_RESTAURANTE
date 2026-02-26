/**
 * RECIPE ENGINE - SISTEMA UNIFICADO DE CÁLCULOS DE RECEITAS
 * 
 * Sistema principal, limpo e sem gambiarras para todos os cálculos relacionados 
 * a receitas, preparações, ingredientes e montagem.
 * 
 * ÚNICA FONTE DA VERDADE para todos os cálculos do sistema.
 * 
 * @version 3.0.0
 * @author Sistema Cozinha Afeto
 */

// Imports serão feitos dinamicamente para evitar problemas circulares

// ========================================
// DEFINIÇÕES DE CAMPOS PADRONIZADOS
// ========================================

export const WEIGHT_FIELDS = {
  // Ordem de prioridade para peso inicial
  INITIAL_PRIORITY: ['weight_frozen', 'weight_raw', 'weight_thawed', 'quantity'],

  // Ordem de prioridade para peso final
  FINAL_PRIORITY: ['weight_portioned', 'weight_cooked', 'weight_clean', 'weight_thawed', 'weight_raw', 'quantity'],

  // Mapeamento de processos para campos de peso
  PROCESS_MAPPING: {
    defrosting: { from: 'weight_frozen', to: 'weight_thawed' },
    cleaning: { from: ['weight_thawed', 'weight_raw'], to: 'weight_clean' },
    cooking: { from: ['weight_pre_cooking', 'weight_clean', 'weight_thawed', 'weight_raw'], to: 'weight_cooked' },
    portioning: { from: ['weight_cooked', 'weight_clean', 'weight_thawed', 'weight_raw'], to: 'weight_portioned' },
    assembly: { from: '*', to: 'assembly_weight_kg' }
  }
};

export const PRICE_FIELDS = {
  PRIORITY: ['current_price', 'unit_price', 'raw_price_kg', 'liquid_price_kg', 'price']
};

export const PROCESS_TYPES = {
  PREPARATION: ['defrosting', 'cleaning', 'cooking'],
  FINALIZATION: ['portioning', 'assembly', 'packaging']
};

// ========================================
// Regex limpa para validações leves
const NUMBER_CLEANUP_REGEX = /[^\d.,-]/g;

// ========================================
// ESTRUTURAS DE DADOS IDEAIS E CONSTANTES
// ========================================

/**
 * Sequência lógica de processamento
 */
export const PROCESS_SEQUENCE = [
  'defrosting',
  'cleaning',
  'cooking',
  'portioning',
  'assembly'
];

/**
 * Formatação padronizada de valores
 */
export const formatters = {
  weight: (value, decimals = 3) => {
    const num = RecipeEngine.parseValue(value);
    return num.toFixed(decimals).replace('.', ',');
  },

  currency: (value) => {
    const num = RecipeEngine.parseValue(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  },

  percentage: (value, decimals = 1) => {
    const num = RecipeEngine.parseValue(value);
    return `${num.toFixed(decimals).replace('.', ',')}%`;
  }
};

// ========================================
// CLASSE PRINCIPAL DO RECIPE ENGINE
// ========================================

export class RecipeEngine {

  // ========================================
  // MÉTODOS BÁSICOS DE DADOS
  // ========================================

  /**
   * Parsing único e robusto de valores numéricos
   */
  static parseValue(value) {
    // Se já é número válido
    if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
      return value;
    }

    // Se é string, processar
    if (typeof value === 'string') {
      // Remover espaços e caracteres não numéricos (exceto vírgula e ponto)
      let cleaned = value.trim().replace(/[^\d.,-]/g, '');

      // Se string vazia após limpeza
      if (cleaned === '' || cleaned === 'undefined' || cleaned === 'null') {
        return 0;
      }

      // Substituir vírgula por ponto (formato brasileiro → americano)
      cleaned = cleaned.replace(',', '.');

      // Converter para número
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
    }

    // Para qualquer outro tipo (null, undefined, boolean, etc.)
    return 0;
  }

  /**
   * Obtém peso inicial de um ingrediente seguindo prioridade lógica
   */
  static getInitialWeight(ingredient, processes = []) {
    if (!ingredient) return 0;

    // Se há processos específicos, usar lógica simples por processo
    if (processes.length > 0) {
      // Para cleaning, priorizar weight_raw ou weight_thawed
      if (processes.includes('cleaning')) {
        const rawWeight = this.parseValue(ingredient.weight_raw);
        if (rawWeight > 0) return rawWeight;
        const thawedWeight = this.parseValue(ingredient.weight_thawed);
        if (thawedWeight > 0) return thawedWeight;
      }

      // Para defrosting, usar weight_frozen
      if (processes.includes('defrosting')) {
        const frozenWeight = this.parseValue(ingredient.weight_frozen);
        if (frozenWeight > 0) return frozenWeight;
      }
    }

    // Lógica padrão: seguir ordem de prioridade
    for (const field of WEIGHT_FIELDS.INITIAL_PRIORITY) {
      const value = this.parseValue(ingredient[field]);
      if (value > 0) return value;
    }

    return 0;
  }

  /**
   * Obtém peso final de um ingrediente seguindo prioridade lógica
   */
  static getFinalWeight(ingredient) {
    if (!ingredient) return 0;

    for (const field of WEIGHT_FIELDS.FINAL_PRIORITY) {
      const value = this.parseValue(ingredient[field]);
      if (value > 0) return value;
    }

    return 0;
  }

  /**
   * Obtém preço unitário de um ingrediente
   */
  static getUnitPrice(ingredient) {
    if (!ingredient) return 0;

    for (const field of PRICE_FIELDS.PRIORITY) {
      const value = this.parseValue(ingredient[field]);
      if (value > 0) return value;
    }

    return 0;
  }

  // ========================================
  // CÁLCULOS DE INGREDIENTES
  // ========================================

  /**
   * Calcula custo total de um ingrediente
   */
  static calculateIngredientCost(ingredient, processes = []) {
    const weight = this.getInitialWeight(ingredient, processes);
    const price = this.getUnitPrice(ingredient);
    return weight * price;
  }

  /**
   * Calcula rendimento percentual de um ingrediente
   */
  static calculateIngredientYield(ingredient, processes = []) {
    const initialWeight = this.getInitialWeight(ingredient, processes);
    const finalWeight = this.getFinalWeight(ingredient);

    if (initialWeight === 0) return 0;
    return (finalWeight / initialWeight) * 100;
  }

  /**
   * Calcula perda percentual entre dois pesos
   */
  static calculateLoss(initialWeight, finalWeight) {
    const initial = this.parseValue(initialWeight);
    const final = this.parseValue(finalWeight);

    if (initial === 0) return 0;

    const lossPercent = ((initial - final) / initial) * 100;
    return Math.max(0, lossPercent);
  }

  // ========================================
  // CÁLCULOS DE PREPARAÇÃO
  // ========================================

  /**
   * Calcula métricas de uma preparação individual
   */
  static calculatePreparationMetrics(preparation, allRecipes = []) {
    if (!preparation) {
      return RecipeEngine.getEmptyPreparationMetrics();
    }

    // Normalizar dados de entrada (implementação básica aqui)
    const normalizedPrep = {
      ...preparation,
      ingredients: preparation.ingredients || [],
      sub_components: preparation.sub_components || [],
      processes: preparation.processes || []
    };

    // Determinar se é etapa de finalização
    const isFinalizationOnly = RecipeEngine.isFinalizationProcess(normalizedPrep.processes);

    let totalRawWeight = 0;
    let totalYieldWeight = 0;
    let totalCost = 0;
    let totalYieldSum = 0;
    let ingredientCount = 0;
    let totalPrepTime = 0; // Segundos

    // Herança Dinâmica: Se for clone de uma Matriz, herda peso e custo real escalado
    let custouDaMatriz = false;
    if (normalizedPrep.origin_id && allRecipes && allRecipes.length > 0) {
      const baseRecipe = allRecipes.find(r => r.id === normalizedPrep.origin_id);
      if (baseRecipe && baseRecipe.total_cost >= 0) {
        let scaleRatio = 1;
        const firstCloneIng = normalizedPrep.ingredients?.[0];
        if (firstCloneIng && baseRecipe.preparations) {
          let baseQ = 0;
          baseRecipe.preparations.forEach(bp => {
            const bMatch = bp.ingredients?.find(bi => bi.name === firstCloneIng.name);
            if (bMatch) baseQ = RecipeEngine.parseValue(bMatch.quantity);
          });
          if (baseQ > 0) {
            const cloneQ = RecipeEngine.parseValue(firstCloneIng.quantity);
            scaleRatio = cloneQ / baseQ;
          }
        }

        totalRawWeight = (RecipeEngine.parseValue(baseRecipe.total_weight) || 0) * scaleRatio;
        totalYieldWeight = (RecipeEngine.parseValue(baseRecipe.yield_weight) || 0) * scaleRatio;
        totalCost = (RecipeEngine.parseValue(baseRecipe.total_cost) || 0) * scaleRatio;
        ingredientCount = normalizedPrep.ingredients ? normalizedPrep.ingredients.length : 1;
        totalYieldSum = 100 * ingredientCount; // Herda a perfeição global base
        custouDaMatriz = true;
      }
    }

    // Processar ingredientes se não herdou custo pronto da Matriz
    if (!custouDaMatriz && normalizedPrep.ingredients && normalizedPrep.ingredients.length > 0) {
      normalizedPrep.ingredients.forEach(ingredient => {
        const initialWeight = RecipeEngine.getInitialWeight(ingredient, normalizedPrep.processes);
        const finalWeight = isFinalizationOnly ? initialWeight : RecipeEngine.getFinalWeight(ingredient);
        const cost = RecipeEngine.calculateIngredientCost(ingredient, normalizedPrep.processes);
        const yieldPercent = isFinalizationOnly ? 100 : RecipeEngine.calculateIngredientYield(ingredient, normalizedPrep.processes);

        // Calcular tempo de preparo (Mão de Obra)
        const timePerKg = RecipeEngine.parseValue(ingredient.technical_data?.cleaning_time_per_kg || ingredient.cleaning_time_per_kg);

        if (timePerKg > 0 && initialWeight > 0) {
          totalPrepTime += initialWeight * timePerKg;
        }

        totalRawWeight += initialWeight;
        totalYieldWeight += finalWeight;
        totalCost += cost;
        totalYieldSum += yieldPercent;
        ingredientCount++;
      });
    }

    // Processar sub-componentes (assembly/portioning) - implementação básica
    if (normalizedPrep.sub_components && normalizedPrep.sub_components.length > 0) {
      normalizedPrep.sub_components.forEach(sc => {
        const weight = RecipeEngine.parseValue(sc.assembly_weight_kg);
        const cost = RecipeEngine.parseValue(sc.input_total_cost) || 0;

        // Para sub-componentes, calcular custo proporcional
        const inputYieldWeight = RecipeEngine.parseValue(sc.input_yield_weight);
        let proportionalCost = cost;

        if (inputYieldWeight > 0 && weight > 0) {
          proportionalCost = (weight / inputYieldWeight) * cost;
        }

        // NOVO: Ignorar unidades embalagem na soma de peso culinário
        if (!sc.isPackaging && !sc.is_packaging) {
          totalRawWeight += weight;
          totalYieldWeight += weight; // Sub-componentes já processados
        }
        totalCost += proportionalCost;
      });
    }

    // Calcular receitas adicionadas (sub-receitas)
    if (preparation.recipes && Array.isArray(preparation.recipes)) {
      preparation.recipes.forEach(recipe => {
        const usedWeight = RecipeEngine.parseValue(recipe.used_weight);

        if (usedWeight > 0) {
          const costPerKg = RecipeEngine.parseValue(recipe.cost_per_kg_yield);
          const recipeCost = usedWeight * costPerKg;

          // MUDANÇA: O Peso Bruto da sub-receita não deve ser presumido igual ao peso líquido
          // Sub-Receitas carregam consigo a proporção de rendimento original (yield_percentage).
          const originalYieldPct = RecipeEngine.parseValue(recipe.yield_percentage) || 100;
          const estimatedRawWeight = originalYieldPct > 0 ? usedWeight / (originalYieldPct / 100) : usedWeight;

          totalRawWeight += estimatedRawWeight;
          totalYieldWeight += usedWeight;
          totalCost += recipeCost;
        }
      });
    }

    const averageYield = ingredientCount > 0 ? totalYieldSum / ingredientCount : 0;
    const yieldPercentage = totalRawWeight > 0 ? (totalYieldWeight / totalRawWeight) * 100 : 0;

    return {
      totalRawWeight,
      totalYieldWeight,
      totalCost,
      yieldPercentage,
      averageYield,
      totalPrepTime, // Retornar tempo calculado (segundos)
      hasIngredients: ingredientCount > 0,
      hasSubComponents: normalizedPrep.sub_components?.length > 0 || false,
      hasSubRecipes: preparation.recipes?.length > 0 || false,
      isFinalizationOnly
    };
  }

  /**
   * Verifica se são apenas processos de finalização
   */
  static isFinalizationProcess(processes = []) {
    if (!processes.length) return false;

    const hasPreparation = processes.some(p => PROCESS_TYPES.PREPARATION.includes(p));
    const hasFinalization = processes.some(p => PROCESS_TYPES.FINALIZATION.includes(p));

    return hasFinalization && !hasPreparation;
  }

  // ========================================
  // CÁLCULOS DE RECEITA COMPLETA
  // ========================================

  /**
   * Calcula todas as métricas de uma receita completa
   */
  static calculateRecipeMetrics(recipeData, preparationsData = [], allRecipes = []) {
    if (!preparationsData || preparationsData.length === 0) {
      return RecipeEngine.getEmptyRecipeMetrics();
    }

    // Normalizar dados (implementação básica)
    const normalizedRecipe = { ...recipeData };
    const normalizedPreparations = preparationsData.map(prep => ({
      ...prep,
      ingredients: prep.ingredients || [],
      sub_components: prep.sub_components || [],
      processes: prep.processes || []
    }));

    let totalRawWeight = 0;
    let totalYieldWeight = 0;
    let totalCost = 0;
    let totalPrepTime = 0;
    let preparationMetrics = [];

    // Calcular métricas de cada preparação
    normalizedPreparations.forEach((prep, index) => {
      const metrics = RecipeEngine.calculatePreparationMetrics(prep, allRecipes);

      const hasValidItems = metrics.hasIngredients || metrics.hasSubComponents || metrics.hasSubRecipes;

      // Somar apenas preparações válidas (com ingredientes, sub-componentes ou sub-receitas)
      if (hasValidItems) {
        // Verificar se é embalagem
        const isPackaging = prep.processes?.includes('packaging');

        // Se for embalagem, SÓ soma o custo (não soma peso, pois é unidade)
        if (isPackaging) {
          totalCost += metrics.totalCost;
          // NÃO soma totalYieldWeight nem totalRawWeight para embalagens
        } else {
          // Comportamento normal para alimentos
          totalRawWeight += metrics.totalRawWeight;
          totalYieldWeight += metrics.totalYieldWeight;
          totalCost += metrics.totalCost;
        }
      }

      // Somar tempo de preparo (para todas as preparações)
      if (metrics.totalPrepTime) {
        totalPrepTime += metrics.totalPrepTime;
      }

      preparationMetrics.push({
        ...metrics,
        preparationIndex: index,
        preparationTitle: prep.title,
        includedInTotal: hasValidItems
      });
    });

    // Calcular peso e custo da porção/cuba
    const originalYieldForCost = totalYieldWeight; // Manter para cálculo intermediário se necessário
    const portionMetrics = RecipeEngine.calculatePortionMetrics(normalizedPreparations, 0);

    // CORREÇÃO CRÍTICA: Se a receita tem uma etapa de montagem com sub-componentes (ou config de peso),
    // o yield_weight culinário real DEVE ser o da montagem. 
    // Somar ingredientes (Prep 1) + mesmos ingredientes na Montagem (Prep 3) gera contagem dupla do peso!
    if (portionMetrics.weight > 0) {
      totalYieldWeight = portionMetrics.weight;
    }

    // Calcular métricas derivadas usando o peso ajustado
    const costPerKgRaw = totalRawWeight > 0 ? totalCost / totalRawWeight : 0;
    const costPerKgYield = totalYieldWeight > 0 ? totalCost / totalYieldWeight : 0;
    const overallYieldPercentage = totalRawWeight > 0 ? (totalYieldWeight / totalRawWeight) * 100 : 0;

    // Recalcular portion cost com o costPerKg certo
    portionMetrics.cost = portionMetrics.weight * costPerKgYield;

    // ========================================
    // CALCULAR CUSTO OPERACIONAL (COO)
    // ========================================
    // Lógica Segura: Extrai custos APENAS da fonte de verdade stateful (equipment_costs)
    // Abandonadas leituras de Regex Inseguras sobre spans HTML.
    let operationalCost = 0;
    const countedPopIds = new Set();
    const countedLaborIds = new Set();

    normalizedPreparations.forEach(prep => {
      // 1. Equipamentos
      if (prep.equipment_costs && Array.isArray(prep.equipment_costs)) {
        prep.equipment_costs.forEach(eq => {
          const cost = RecipeEngine.parseValue(eq.calculatedCost || eq.cost);
          if (cost > 0 && !countedPopIds.has(eq.pop_id)) {
            operationalCost += cost;
            // Registrar para evitar somar de novo caso a etapa replique o mesmo POP global
            countedPopIds.add(eq.pop_id);
          }
        });
      }

      // 2. Mão de Obra
      if (prep.labor_costs && Array.isArray(prep.labor_costs)) {
        prep.labor_costs.forEach(labor => {
          const cost = RecipeEngine.parseValue(labor.calculatedCost || labor.cost);
          if (cost > 0) {
            // Note: We might allow the same employee in different prep steps?
            // If yes, we don't dedup, or we dedup with a combination of employee_id and prep_index.
            // For now, let's just sum it, since time is cumulative per step.
            operationalCost += cost;
          }
        });
      }
    });

    console.log('💰 [RecipeEngine] Total Operational Cost (COO):', operationalCost);

    return {
      // Pesos
      total_weight: totalRawWeight,
      yield_weight: totalYieldWeight,
      cuba_weight: portionMetrics.weight,
      portion_weight_calculated: portionMetrics.weight,

      // Custos
      total_cost: totalCost,
      cost_per_kg_raw: costPerKgRaw,
      cost_per_kg_yield: costPerKgYield,
      cuba_cost: portionMetrics.cost,
      portion_cost: portionMetrics.cost,
      operational_cost: operationalCost, // Adicionar custo operacional

      // Tempos / Operacional
      total_prep_time: totalPrepTime, // Segundos

      // Rendimentos
      yield_percentage: overallYieldPercentage,

      // Metadados
      container_type: portionMetrics.containerType,
      weight_field_name: portionMetrics.weightFieldName,
      cost_field_name: portionMetrics.costFieldName,
      last_calculated: new Date().toISOString(),

      // Métricas detalhadas
      preparation_metrics: preparationMetrics,

      // Flags de validação
      has_ingredients: preparationMetrics.some(m => m.hasIngredients),
      has_assembly: preparationMetrics.some(m => m.hasSubComponents || m.hasSubRecipes),
      is_valid: preparationMetrics.length > 0
    };
  }

  // ========================================
  // CÁLCULOS DE PORÇÃO/CUBA
  // ========================================

  /**
   * Calcula métricas da porção/cuba final
   */
  static calculatePortionMetrics(preparations, costPerKgYield) {
    // Implementação básica inline para evitar dependências circulares
    let portionWeight = 0;

    // Encontrar preparação de assembly/portioning
    const assemblyPrep = preparations.find(prep =>
      prep.processes?.includes('assembly') ||
      prep.processes?.includes('portioning')
    );

    if (assemblyPrep && assemblyPrep.sub_components?.length > 0) {
      // Somar pesos dos sub-componentes
      portionWeight = assemblyPrep.sub_components.reduce((total, sc) => {
        // Ignorar peso de itens que são puramente embalagens (unitários)
        if (sc.isPackaging || sc.is_packaging) return total;

        const weight = RecipeEngine.parseValue(sc.assembly_weight_kg);
        return total + weight;
      }, 0);
    } else {
      // Usar peso configurado ou peso de rendimento total
      const configWeight = assemblyPrep?.assembly_config?.total_weight;
      if (configWeight) {
        portionWeight = RecipeEngine.parseValue(configWeight);
      }
    }

    const portionCost = portionWeight * costPerKgYield;

    // Determinar tipo de container
    const containerType = RecipeEngine.getContainerType(preparations);

    return {
      weight: portionWeight,
      cost: portionCost,
      containerType,
      weightFieldName: RecipeEngine.getWeightFieldName(containerType),
      costFieldName: RecipeEngine.getCostFieldName(containerType)
    };
  }

  /**
   * Determina tipo de container baseado nas preparações
   */
  static getContainerType(preparations) {
    const assemblyPrep = preparations.find(prep =>
      prep.processes?.includes('assembly') ||
      prep.processes?.includes('portioning')
    );

    return assemblyPrep?.assembly_config?.container_type || 'cuba';
  }

  /**
   * Gera nome do campo de peso baseado no container
   */
  static getWeightFieldName(containerType) {
    const fieldNames = {
      'cuba': 'Peso da Cuba',
      'cuba-g': 'Peso da Cuba G',
      'cuba-p': 'Peso da Cuba P',
      'descartavel': 'Peso da Embalagem',
      'individual': 'Peso da Porção',
      'kg': 'Peso por Kg',
      'outros': 'Peso da Unidade'
    };

    return fieldNames[containerType] || 'Peso da Cuba';
  }

  /**
   * Gera nome do campo de custo baseado no container
   */
  static getCostFieldName(containerType) {
    // Sempre retornar 'Custo CMV' independente do tipo de container
    return 'Custo CMV';
  }

  // ========================================
  // MÉTODOS DE CONVENIÊNCIA
  // ========================================

  /**
   * Return empty preparation metrics
   */
  static getEmptyPreparationMetrics() {
    return {
      totalRawWeight: 0,
      totalYieldWeight: 0,
      totalCost: 0,
      yieldPercentage: 0,
      averageYield: 0,
      hasIngredients: false,
      hasSubComponents: false,
      isFinalizationOnly: false
    };
  }

  // ========================================
  // MÉTODOS DE CUSTO OPERACIONAL (POP/COO) E ESCALABILIDADE
  // ========================================

  /**
   * Escala ingredientes rigorosamente por um fator multiplicador
   * (Migrado do antigo RecipeCalculator.js)
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

      return scaledIng;
    });
  }

  // ========================================
  // MÉTODOS DE SINCRONIZAÇÃO E CORREÇÃO (NOVO)
  // ========================================

  /**
   * Recalcula um ingrediente com base num ingrediente pai preenchendo todos os pesos (Cascata)
   * 
   * @param {Object} childIng - Ingrediente filho (o que está na receita atual)
   * @param {Object} parentIng - Ingrediente pai (da receita matriz)
   * @returns {Object} Ingrediente recalculado 
   */
  static recalculateIngredientWeights(childIng, parentIng) {
    if (!parentIng) return childIng;

    // Converte e higieniza valores Base da Matriz
    const parentRaw = RecipeEngine.parseValue(parentIng.weight_raw);
    const parentClean = RecipeEngine.parseValue(parentIng.weight_clean) || parentRaw;
    const parentPreCook = RecipeEngine.parseValue(parentIng.weight_pre_cooking) || parentClean;
    const parentCooked = RecipeEngine.parseValue(parentIng.weight_cooked) || parentPreCook;

    // Fator do ingrediente atual (sempre guiado pelo peso Bruto)
    const childRaw = RecipeEngine.parseValue(childIng.weight_raw);

    // Calcular as proporções baseadas na matriz
    const cleanRatio = parentRaw > 0 ? parentClean / parentRaw : 1;
    const preCookRatio = parentClean > 0 ? parentPreCook / parentClean : 1;
    const cookRatio = parentPreCook > 0 ? parentCooked / parentPreCook : 1;

    // Cascata
    const newCleanVal = childRaw * cleanRatio;
    const newPreCookVal = newCleanVal * preCookRatio;
    const newCookedVal = newPreCookVal * cookRatio;

    return {
      ...childIng,
      // Atualizar campos monetários originais
      price: parentIng.price,
      cost_clean: parentIng.cost_clean,

      // Atualizar pesos garantindo 3 casas decimais num formato legível
      weight_clean: newCleanVal.toFixed(3),
      weight_pre_cooking: newPreCookVal.toFixed(3),
      weight_cooked: newCookedVal.toFixed(3),

      // Manter a rastreabilidade do vínculo
      source_recipe_id: parentIng._sourceRecipeId,
      source_recipe_name: parentIng._sourceRecipeName
    };
  }

  /**
   * Sincroniza toda uma preparação com a sua versão ou de ingredientes originais.
   * 
   * @param {Object} preparation - Dados da etapa
   * @param {Map} sourceIngredientMap - Mapa (Chave: ID) das receitas mães carregadas
   */
  static syncPreparationWithSource(preparation, sourceIngredientMap) {
    if (!preparation || !preparation.ingredients) return preparation;

    const updatedIngredients = preparation.ingredients.map(ing => {
      if (ing.source_ingredient_id) {
        // Encontrar o ingrediente original carregado do BD
        const sourceIng = sourceIngredientMap.get(ing.source_ingredient_id);
        if (sourceIng) {
          return RecipeEngine.recalculateIngredientWeights(ing, sourceIng);
        }
      }
      return ing;
    });

    return {
      ...preparation,
      ingredients: updatedIngredients
    };
  }

  /**
   * Refresh the current actual active ingredients with fresh DB data.
   * Recalculates thawing, cleaning, and cooking logic directly without UI reliance.
   * 
   * @param {Array} preparationsData - Preparações Atuais 
   * @param {Map} allIngredientsMap - Chave/valor dos ingredientes globais atualizados
   */
  static refreshIngredientsTechnicalData(preparationsData, allIngredientsMap) {
    if (!preparationsData || !preparationsData.length) return preparationsData;

    return preparationsData.map(prep => ({
      ...prep,
      ingredients: (prep.ingredients || []).map(ing => {
        // Find using name matching
        const originalIng = Array.from(allIngredientsMap.values()).find(i => i.name === ing.name);
        if (!originalIng) return ing;

        const tech = originalIng.technical_data || {};
        let newWeights = {};

        // Helper para o re-cálculo
        const formatVal = (v) => String(v.toFixed(3)).replace('.', ',');

        // 1. Descongelamento
        const weightFrozen = RecipeEngine.parseValue(ing.weight_frozen);
        if (weightFrozen > 0 && tech.thawing_loss_pct) {
          const loss = RecipeEngine.parseValue(tech.thawing_loss_pct);
          const val = weightFrozen * (1 - loss / 100);
          newWeights.weight_thawed = formatVal(val);
        }

        // 2. Limpeza
        const inputClean = newWeights.weight_thawed ? RecipeEngine.parseValue(newWeights.weight_thawed) : (RecipeEngine.parseValue(ing.weight_thawed) || RecipeEngine.parseValue(ing.weight_raw));
        if (inputClean > 0 && tech.cleaning_loss_pct) {
          const loss = RecipeEngine.parseValue(tech.cleaning_loss_pct);
          const val = inputClean * (1 - loss / 100);
          newWeights.weight_clean = formatVal(val);
        }

        // 3. Cocção
        const inputCook = newWeights.weight_clean ? RecipeEngine.parseValue(newWeights.weight_clean) : (RecipeEngine.parseValue(ing.weight_clean) || RecipeEngine.parseValue(ing.weight_raw));
        if (inputCook > 0 && tech.cooking_loss_pct) {
          const loss = RecipeEngine.parseValue(tech.cooking_loss_pct);
          const val = inputCook * (1 - loss / 100);
          newWeights.weight_cooked = formatVal(val);
        }

        return {
          ...ing,
          current_price: originalIng.current_price,
          unit: originalIng.unit,
          technical_data: {
            ...tech,
            cleaning_time_min: tech.cleaning_time_min,
            thawing_loss_pct: tech.thawing_loss_pct,
            cleaning_loss_pct: tech.cleaning_loss_pct,
            cooking_loss_pct: tech.cooking_loss_pct,
            labor_role_id: tech.labor_role_id
          },
          ...newWeights
        };
      })
    }));
  }

  /**
   * Sanitiza preparações removendo dados fantasmas de processos inativos antes de gravar.
   */
  static sanitizePreparationForSave(preparationsData) {
    if (!preparationsData || !preparationsData.length) return preparationsData;

    return preparationsData.map(prep => {
      const processes = prep.processes || [];
      const hasProcess = (processName) => processes.includes(processName);

      const sanitizedIngredients = (prep.ingredients || []).map(ing => {
        const sanitizedIng = { ...ing };

        if (!hasProcess('defrosting')) {
          sanitizedIng.weight_frozen = '';
          sanitizedIng.weight_thawed = '';
        }
        if (!hasProcess('cleaning')) {
          sanitizedIng.weight_clean = '';
        }
        if (!hasProcess('cooking')) {
          sanitizedIng.weight_pre_cooking = '';
          sanitizedIng.weight_cooked = '';
        }
        if (!hasProcess('portioning')) {
          sanitizedIng.weight_portioned = '';
        }

        return sanitizedIng;
      });

      return {
        ...prep,
        ingredients: sanitizedIngredients
      };
    });
  }

  /**
   * Retorna métricas vazias para receita
   */
  static getEmptyRecipeMetrics() {
    return {
      total_weight: 0,
      yield_weight: 0,
      cuba_weight: 0,
      portion_weight_calculated: 0,
      total_cost: 0,
      cost_per_kg_raw: 0,
      cost_per_kg_yield: 0,
      cuba_cost: 0,
      portion_cost: 0,
      yield_percentage: 0,
      container_type: 'cuba',
      weight_field_name: 'Peso da Cuba',
      cost_field_name: 'Custo CMV',
      last_calculated: new Date().toISOString(),
      preparation_metrics: [],
      has_ingredients: false,
      has_assembly: false,
      is_valid: false
    };
  }

  // ========================================
  // MÉTODOS DE FORMATADORES DE INTERFACE (UI)
  // ========================================

  static getThawingLossStatus(loss, frozenWeight, thawedWeight) {
    const absLoss = Math.abs(loss);
    if (absLoss < 0.01) return (frozenWeight > 0 && thawedWeight > 0) ? "success" : "neutral";
    if (loss <= 5) return "success";
    if (loss <= 10) return "warning";
    return "destructive";
  }

  static getCleaningLossStatus(loss, initialWeightForCleaning, cleanWeight) {
    const absLoss = Math.abs(loss);
    if (absLoss < 0.01) return (initialWeightForCleaning > 0 && cleanWeight > 0) ? "success" : "neutral";
    if (loss <= 10) return "success";
    if (loss <= 15) return "warning";
    return "destructive";
  }

  static getCookingLossStatus(loss, preCookWeight, cookedWeight) {
    const absLoss = Math.abs(loss);
    if (absLoss < 0.01) return (preCookWeight > 0 && cookedWeight > 0) ? "success" : "neutral";
    if (loss <= 15) return "success";
    if (loss <= 25) return "warning";
    return "destructive";
  }

  static getPortioningLossStatus(loss, prePortionWeight, portionedWeight) {
    const absLoss = Math.abs(loss);
    if (absLoss < 0.01) return (prePortionWeight > 0 && portionedWeight > 0) ? "success" : "neutral";
    if (loss <= 5) return "success";
    if (loss <= 10) return "warning";
    return "destructive";
  }

  static calculateAndClassifyThawingLoss(item) {
    const frozenWeight = RecipeEngine.parseValue(item.weight_frozen);
    const thawedWeight = RecipeEngine.parseValue(item.weight_thawed);
    const loss = RecipeEngine.calculateLoss(frozenWeight, thawedWeight);
    return { value: loss, status: RecipeEngine.getThawingLossStatus(loss, frozenWeight, thawedWeight) };
  }

  static calculateAndClassifyCleaningLoss(item) {
    const initialWeightForCleaning = RecipeEngine.parseValue(item.weight_thawed || item.weight_raw);
    const cleanWeight = RecipeEngine.parseValue(item.weight_clean);
    const loss = RecipeEngine.calculateLoss(initialWeightForCleaning, cleanWeight);
    return { value: loss, status: RecipeEngine.getCleaningLossStatus(loss, initialWeightForCleaning, cleanWeight) };
  }

  static calculateAndClassifyCookingLoss(item) {
    const preCookWeight = RecipeEngine.parseValue(item.weight_pre_cooking || item.weight_clean || item.weight_thawed || item.weight_raw || item.weight_frozen);
    const cookedWeight = RecipeEngine.parseValue(item.weight_cooked);
    const loss = RecipeEngine.calculateLoss(preCookWeight, cookedWeight);
    return { value: loss, status: RecipeEngine.getCookingLossStatus(loss, preCookWeight, cookedWeight) };
  }

  static calculateAndClassifyPortioningLoss(item) {
    const prePortionWeight = RecipeEngine.parseValue(item.weight_cooked || item.weight_clean || item.weight_thawed || item.weight_raw || item.weight_frozen);
    const portionedWeight = RecipeEngine.parseValue(item.weight_portioned);
    const loss = RecipeEngine.calculateLoss(prePortionWeight, portionedWeight);
    return { value: loss, status: RecipeEngine.getPortioningLossStatus(loss, prePortionWeight, portionedWeight) };
  }

  static calculateItemLiquidPrice(item) {
    const brutPrice = RecipeEngine.parseValue(item.current_price || item.unit_price);
    if (!brutPrice) return 0;

    const yieldPercent = RecipeEngine.calculateIngredientYield(item, ['defrosting', 'cleaning', 'cooking']);

    if (yieldPercent === 0 || yieldPercent === 100) return brutPrice;
    return (brutPrice * 100) / yieldPercent;
  }

  // ========================================
  // MÉTODO DE DEBUG
  // ========================================

  /**
   * Gera relatório detalhado para debug
   */
  static generateDebugReport(recipeData, preparationsData) {
    // Validação básica inline
    const validation = {
      isValid: Array.isArray(preparationsData) && preparationsData.length > 0,
      errors: [],
      warnings: []
    };

    if (!Array.isArray(preparationsData) || preparationsData.length === 0) {
      validation.errors.push('Nenhuma preparação fornecida');
    }

    const metrics = RecipeEngine.calculateRecipeMetrics(recipeData, preparationsData);

    return {
      timestamp: new Date().toISOString(),
      version: '3.0.0',
      input: {
        recipe: recipeData,
        preparations: preparationsData
      },
      validation,
      metrics,
      summary: {
        ingredientsCount: preparationsData?.reduce((total, prep) =>
          total + (prep.ingredients?.length || 0), 0) || 0,
        subComponentsCount: preparationsData?.reduce((total, prep) =>
          total + (prep.sub_components?.length || 0), 0) || 0,
        preparationsCount: preparationsData?.length || 0
      }
    };
  }
}

// ========================================
// EXPORTS PARA COMPATIBILIDADE
// ========================================

// Funções de conveniência para uso direto
export const parseValue = RecipeEngine.parseValue;
export const calculateRecipeMetrics = RecipeEngine.calculateRecipeMetrics;
export const calculatePreparationMetrics = RecipeEngine.calculatePreparationMetrics;
export const generateDebugReport = RecipeEngine.generateDebugReport;

export default RecipeEngine;