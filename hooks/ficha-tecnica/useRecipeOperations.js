import { useCallback } from 'react';
import { useToast } from '@/components/ui';

/**
 * Hook de operações para a Ficha Técnica - v2 (Replacement Fix)
 * Extraído automaticamente de RecipeTechnicall.jsx
 */
export function useRecipeOperations() {
  const { toast } = useToast();

  // Função para parsing seguro
  const parseNumericValue = useCallback((value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
      const parsed = parseFloat(cleanValue);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }, []);

  // Operações de preparação
  /* 
   * Adiciona uma nova preparação à lista.
   * AUTO-POPULATE: Ao adicionar uma etapa, ela é automaticamente incluída nas montagens existentes.
   * Ao adicionar uma montagem, todas as etapas anteriores são incluídas como sub_components.
   */
  const addPreparation = useCallback((preparationsData, setPreparationsData, newPreparation) => {
    const newPrep = {
      id: String(Date.now()),
      title: newPreparation.title || `${preparationsData.length + 1}º Processo`,
      ingredients: newPreparation.ingredients || [],
      sub_components: newPreparation.sub_components || [],
      instructions: newPreparation.instructions || "",
      processes: newPreparation.processes || ['cooking'],
      assembly_config: newPreparation.assembly_config,
      ...newPreparation
    };

    // Verificar se a nova etapa é uma montagem
    const isAssembly = newPrep.processes?.includes('assembly');

    setPreparationsData(prev => {
      let updatedPreparations = [...prev];

      if (isAssembly) {
        // Auto-popular montagem com todas as etapas anteriores
        const previousSteps = updatedPreparations.filter(p => !p.processes?.includes('assembly'));

        newPrep.sub_components = previousSteps.map(step => ({
          id: String(Date.now() + Math.random()),
          name: step.title,
          type: 'preparation',
          source_id: step.id,
          assembly_weight_kg: 0,
          origin_id: step.id // Marca como item de matriz (bloqueado)
        }));
      } else {
        // Auto-vincular esta nova etapa nas montagens/porcionamentos existentes
        updatedPreparations = updatedPreparations.map(prep => {
          if (prep.processes?.includes('assembly')) {
            const newSubComponent = {
              id: String(Date.now() + Math.random()),
              name: newPrep.title,
              type: 'preparation',
              source_id: newPrep.id,
              assembly_weight_kg: 0,
              origin_id: newPrep.id // Marca como item de matriz (bloqueado)
            };
            // Adicionar como sub-componente na montagem

            return {
              ...prep,
              sub_components: [...(prep.sub_components || []), newSubComponent]
            };
          }
          return prep;
        });
      }

      return [...updatedPreparations, newPrep];
    });

    return newPrep;
  }, []);

  const updatePreparation = useCallback((preparationsData, setPreparationsData, prepIndex, field, value) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        newPreparations[prepIndex] = {
          ...newPreparations[prepIndex],
          [field]: value
        };
      }
      return newPreparations;
    });
  }, []);

  /*
   * Remove uma preparação e limpa referências em montagens.
   * CORREÇÃO: Robustez na comparação de IDs (string vs number).
   */
  const removePreparation = useCallback((preparationsData, setPreparationsData, prepId) => {
    setPreparationsData(prev => {
      // Verificação de segurança
      if (!prepId) {
        console.error('Tentativa de remover preparação sem ID!');
        return prev;
      }

      const targetId = String(prepId);

      // 1. Filtrar removendo a preparação alvo (comparaão segura de string)
      const remainingPreps = prev.filter(prep => String(prep.id) !== targetId);

      // Se nada foi removido (ou tudo?), algo está errado.
      if (remainingPreps.length === prev.length) {
        console.warn('Nenhuma preparação foi removida com o ID:', targetId);
      }

      // 2. Remover referências em sub-componentes (Montagem) E Renumerar etapas
      return remainingPreps.map((prep, index) => {
        let updatedPrep = { ...prep };

        // 2.1 Renumerar Título (Fix "Buraco" na sequência)
        // Se o título seguir o padrão "Xº Etapa: ...", atualiza para o novo índice
        if (updatedPrep.title && /^\d+º Etapa:/.test(updatedPrep.title)) {
          const nameContent = updatedPrep.title.replace(/^\d+º Etapa:\s*/, '');
          updatedPrep.title = `${index + 1}º Etapa: ${nameContent}`;
        }

        // 2.2 Limpar sub-componentes
        if (updatedPrep.sub_components && updatedPrep.sub_components.length > 0) {
          const filteredSubComponents = updatedPrep.sub_components.filter(sc => String(sc.source_id) !== targetId);

          if (filteredSubComponents.length !== updatedPrep.sub_components.length) {
            updatedPrep.sub_components = filteredSubComponents;
          }
        }

        return updatedPrep;
      });
    });

    toast({
      title: "Processo removido",
      description: "O processo foi removido com sucesso.",
    });
  }, [toast]);

  const unlockPreparation = useCallback((preparationsData, setPreparationsData, prepIndex) => {
    console.log("🔓 [useRecipeOperations] unlockPreparation called for index:", prepIndex);
    setPreparationsData(prev => {
      console.log("🔓 [useRecipeOperations] Current preps count:", prev?.length);
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        const prep = { ...newPreparations[prepIndex] };
        console.log("🔓 [useRecipeOperations] Unlocking prep:", prep.title);
        
        // 1. Remover origin_id da etapa
        const { origin_id, ...restPrep } = prep;
        
        // 2. Destravar ingredientes
        console.log(`🔓 [useRecipeOperations] Unlocking ${prep.ingredients?.length || 0} ingredients`);
        const unlockedIngredients = (prep.ingredients || []).map(ing => ({
          ...ing,
          locked: false
        }));

        // 3. Destravar sub-componentes (montagens)
        const unlockedSubComponents = (prep.sub_components || []).map(sc => ({
          ...sc,
          locked: false,
          origin_id: null // Quebra o vínculo com a matriz se for item de montagem
        }));

        const finalPrep = {
          ...restPrep,
          ingredients: unlockedIngredients,
          sub_components: unlockedSubComponents
        };
        
        console.log("🔓 [useRecipeOperations] Final unlocked prep ingredients state:", finalPrep.ingredients.map(i => `${i.name}: ${i.locked}`));

        newPreparations[prepIndex] = finalPrep;
        console.log("🔓 [useRecipeOperations] Prep unlocked successfully");
      } else {
        console.warn("🔓 [useRecipeOperations] Prep not found at index:", prepIndex);
      }
      return newPreparations;
    });

    toast({
      title: "Etapa desbloqueada",
      description: "Agora você pode editar esta etapa localmente. O vínculo com a matriz foi removido.",
    });
  }, [toast]);

  // Operações de ingredientes
  const addIngredientToPreparation = useCallback((preparationsData, setPreparationsData, prepIndex, ingredient) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        // CORRIGIDO: Spread primeiro, depois garantir campos numéricos
        const newIngredient = {
          id: String(Date.now()),
          ...ingredient,
          name: ingredient.name,
          // Garantir que campos de peso sejam numéricos (0 se vazio)
          weight_raw: ingredient.weight_raw || 0,
          weight_frozen: ingredient.weight_frozen || 0,
          weight_thawed: ingredient.weight_thawed || 0,
          weight_clean: ingredient.weight_clean || 0,
          weight_cooked: ingredient.weight_cooked || 0,
          weight_portioned: ingredient.weight_portioned || 0,
          weight_pre_cooking: ingredient.weight_pre_cooking || 0,
          current_price: ingredient.current_price || 0,
          unit: ingredient.unit || 'kg',
        };

        newPreparations[prepIndex].ingredients = [
          ...(newPreparations[prepIndex].ingredients || []),
          newIngredient
        ];
      }
      return newPreparations;
    });
  }, []);

  const updateIngredient = useCallback((preparationsData, setPreparationsData, prepIndex, ingredientIndex, field, value) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      // Clone the preparation object to ensure reference change
      if (newPreparations[prepIndex]) {
        const newPrep = { ...newPreparations[prepIndex] };

        // Clone ingredients array if it exists
        if (newPrep.ingredients) {
          const newIngredients = [...newPrep.ingredients];

          if (newIngredients[ingredientIndex]) {
            // CORRIGIDO: Converter strings vazias para 0 em campos de peso
            const isWeightField = field.startsWith('weight_');
            const normalizedValue = isWeightField && value === '' ? 0 : value;

            newIngredients[ingredientIndex] = {
              ...newIngredients[ingredientIndex],
              [field]: normalizedValue
            };

            newPrep.ingredients = newIngredients;
            newPreparations[prepIndex] = newPrep;
          }
        }
      }
      return newPreparations;
    });
  }, []);

  const replaceIngredientInPreparation = useCallback((preparationsData, setPreparationsData, prepIndex, ingredientIndex, newIngredientData) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex] && newPreparations[prepIndex].ingredients?.[ingredientIndex]) {
        const currentIng = newPreparations[prepIndex].ingredients[ingredientIndex];
        
        // Substituir apenas os dados do ingrediente (nome, id, preço) mas PRESERVAR os pesos digitados
        newPreparations[prepIndex].ingredients[ingredientIndex] = {
          ...currentIng, // Mantém pesos (weight_raw, inclusive)
          ...newIngredientData, // Sobrescreve nome, id, price, unit, etc
          id: currentIng.id || String(Date.now()), // Preserva o ID exclusivo da linha se existir
        };
      }
      return newPreparations;
    });
  }, []);

  const removeIngredient = useCallback((preparationsData, setPreparationsData, prepIndex, ingredientIndex) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        const newPrep = { ...newPreparations[prepIndex] };

        if (newPrep.ingredients) {
          const newIngredients = [...newPrep.ingredients];
          newIngredients.splice(ingredientIndex, 1);

          newPrep.ingredients = newIngredients;
          newPreparations[prepIndex] = newPrep;
        }
      }
      return newPreparations;
    });
  }, []);

  // Operações de receitas (adicionadas em etapas)
  const updateRecipe = useCallback((preparationsData, setPreparationsData, prepIndex, recipeIndex, field, value) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        const newPrep = { ...newPreparations[prepIndex] };

        if (newPrep.recipes && newPrep.recipes[recipeIndex]) {
          const newRecipes = [...newPrep.recipes];

          // Converter strings vazias para 0 em campos de peso (mesmo comportamento do updateIngredient)
          const isWeightField = field === 'used_weight' || field.startsWith('weight_');
          const normalizedValue = isWeightField && value === '' ? 0 : value;

          newRecipes[recipeIndex] = {
            ...newRecipes[recipeIndex],
            [field]: normalizedValue
          };

          newPrep.recipes = newRecipes;
          newPreparations[prepIndex] = newPrep;
        }
      }
      return newPreparations;
    });
  }, []);

  const removeRecipe = useCallback((preparationsData, setPreparationsData, prepIndex, recipeIndex) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        const newPrep = { ...newPreparations[prepIndex] };

        if (newPrep.recipes) {
          const newRecipes = [...newPrep.recipes];
          newRecipes.splice(recipeIndex, 1);

          newPrep.recipes = newRecipes;
          newPreparations[prepIndex] = newPrep;
        }
      }
      return newPreparations;
    });
  }, []);

  // Operações de sub-componentes
  const addSubComponent = useCallback((preparationsData, setPreparationsData, prepIndex, subComponent) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        const newSubComponent = {
          id: String(Date.now()),
          name: subComponent.name,
          type: subComponent.isRecipe ? 'recipe' : 'preparation',
          source_id: subComponent.id,
          assembly_weight_kg: 0,
          yield_weight: subComponent.yield_weight || 0,
          total_cost: subComponent.total_cost || 0,
          ...subComponent
        };

        newPreparations[prepIndex].sub_components = [
          ...(newPreparations[prepIndex].sub_components || []),
          newSubComponent
        ];
      }
      return newPreparations;
    });
  }, []);

  const updateSubComponent = useCallback((preparationsData, setPreparationsData, prepIndex, subCompIndex, field, value) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        const newPrep = { ...newPreparations[prepIndex] };

        if (newPrep.sub_components && newPrep.sub_components[subCompIndex]) {
          const newSubComponents = [...newPrep.sub_components];

          newSubComponents[subCompIndex] = {
            ...newSubComponents[subCompIndex],
            [field]: value
          };

          newPrep.sub_components = newSubComponents;
          newPreparations[prepIndex] = newPrep;
        }
      }
      return newPreparations;
    });
  }, []);

  const removeSubComponent = useCallback((preparationsData, setPreparationsData, prepIndex, subCompIndex) => {
    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        const newPrep = { ...newPreparations[prepIndex] };

        if (newPrep.sub_components) {
          const newSubComponents = [...newPrep.sub_components];
          newSubComponents.splice(subCompIndex, 1);

          newPrep.sub_components = newSubComponents;
          newPreparations[prepIndex] = newPrep;
        }
      }
      return newPreparations;
    });
  }, []);

  // Operações de receita
  const saveRecipe = useCallback(async (recipeData, preparationsData) => {
    // Lógica de salvamento será implementada aqui
  }, [toast]);

  const loadRecipe = useCallback(async (recipeId) => {
    try {
      const response = await fetch(`/api/recipes?id=${recipeId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      const recipe = result.data;

      if (!recipe) {
        throw new Error('Receita não encontrada');
      }

      // CORRIGIDO: Normalizar campos de peso vazios em ingredientes (Firestore omite strings vazias)
      const normalizedPreparations = (recipe.preparations || []).map(prep => ({
        ...prep,
        id: prep.id || String(Date.now() + Math.random()), // Garante ID único
        notes: prep.notes || [], // Preservar notas
        ingredients: (prep.ingredients || []).map(ing => ({
          ...ing,
          weight_raw: ing.weight_raw || 0,
          weight_frozen: ing.weight_frozen || 0,
          weight_thawed: ing.weight_thawed || 0,
          weight_clean: ing.weight_clean || 0,
          weight_cooked: ing.weight_cooked || 0,
          weight_portioned: ing.weight_portioned || 0,
          weight_pre_cooking: ing.weight_pre_cooking || 0,
        }))
      }));

      return {
        success: true,
        recipe: {
          id: recipe.id,
          name: recipe.name || '',
          name_complement: recipe.name_complement || '',
          category: recipe.category || '',
          prep_time: recipe.prep_time || 0,
          total_weight: recipe.total_weight || 0,
          yield_weight: recipe.yield_weight || 0,
          cuba_weight: recipe.cuba_weight || 0,
          total_cost: recipe.total_cost || 0,
          cost_per_kg_raw: recipe.cost_per_kg_raw || 0,
          cost_per_kg_yield: recipe.cost_per_kg_yield || 0,
          active: recipe.active !== undefined ? recipe.active : true,
          instructions: recipe.instructions || '',
          photo_url: recipe.photo_url || ''
        },
        preparations: normalizedPreparations
      };
    } catch (error) {
      toast({
        title: "Erro ao carregar",
        description: "Ocorreu um erro ao carregar a receita: " + error.message,
        variant: "destructive"
      });

      return { success: false, error };
    }
  }, [toast]);

  return {
    parseNumericValue,
    addPreparation,
    updatePreparation,
    removePreparation,
    addIngredientToPreparation,
    replaceIngredientInPreparation,
    updateIngredient,
    removeIngredient,
    updateRecipe,
    removeRecipe,
    addSubComponent,
    updateSubComponent,
    removeSubComponent,
    unlockPreparation,
    saveRecipe,
    loadRecipe
  };
}