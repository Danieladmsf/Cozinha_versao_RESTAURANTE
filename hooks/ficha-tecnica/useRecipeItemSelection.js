import { useCallback } from 'react';

/**
 * Hook dedicado a abstrair todas as funções e regras de negócios envolvidas na Seleção
 * e Inserção de itens (Ingredientes, Receitas - também importadas de forma deferred - e Itens de Montagem)
 * através dos modais unificados.
 */
export function useRecipeItemSelection({
    preparationsData,
    setPreparationsData,
    setIsDirty,
    toast,
    pendingPreparationRef,
    currentPrepIndexForIngredient,
    currentPrepIndexForPackaging,
    currentPrepIndexForRecipe,
    currentPrepIndexForAssembly,
    handleAddPreparationFromModal,
    handleCloseIngredientModal,
    handleClosePackagingModal,
    handleCloseRecipeModal,
    handleCloseAssemblyItemModal
}) {

    // ============================================================================
    // ADIÇÃO GENÉRICA DE INGREDIENTES
    // ============================================================================
    const addIngredientToState = useCallback((prepIndex, ingredient) => {
        // Verificar se o ingrediente jÃ¡ existe na preparaÃ§Ã£o
        const currentPrep = preparationsData[prepIndex];
        const ingredientExists = currentPrep?.ingredients?.some(
            ing => ing.ingredient_id === ingredient.id || ing.name === ingredient.name || ing.id === ingredient.id
        );

        if (ingredientExists) {
            toast({
                title: "Ingrediente já existe",
                description: `"${ingredient.name}" já foi adicionado a esta preparação.`,
                variant: "destructive"
            });
            return;
        }

        // Criar um novo ingrediente com ID Ãºnico para evitar duplicatas
        const newIngredient = {
            ...ingredient,
            id: `${ingredient.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID Ãºnico robusto
            ingredient_id: ingredient.id, // Manter referÃªncia ao ingrediente original
            weight_frozen: '',
            weight_thawed: '',
            weight_raw: '',
            weight_clean: '',
            weight_pre_cooking: '',
            weight_cooked: '',
            weight_portioned: '',
            current_price: String(ingredient.current_price || '').replace('.', ','),
            quantity: ingredient.quantity || 1, // Ensure quantity is set, default to 1
            technical_data: {
                thawing_loss_pct: ingredient.technical_data?.thawing_loss_pct || 0,
                cleaning_loss_pct: ingredient.technical_data?.cleaning_loss_pct || 0,
                cooking_loss_pct: ingredient.technical_data?.cooking_loss_pct || 0,
                cleaning_time_per_kg: ingredient.technical_data?.cleaning_time_per_kg || 0
            }
        };

        setPreparationsData(prev => {
            const newPreparations = [...prev];
            if (newPreparations[prepIndex]) {
                newPreparations[prepIndex] = {
                    ...newPreparations[prepIndex],
                    ingredients: [...(newPreparations[prepIndex].ingredients || []), newIngredient]
                };
            }
            return newPreparations;
        });
        setIsDirty(true);
    }, [preparationsData, setPreparationsData, setIsDirty, toast]);


    // ============================================================================
    // INSERÇÃO DE INGREDIENTES SIMPLES E MÚLTIPLOS (MODAIS DE INGREDIENTE E PACKAGING)
    // ============================================================================
    const handleSelectIngredient = useCallback((ingredient) => {
        const prepIndex = currentPrepIndexForIngredient !== null ? currentPrepIndexForIngredient : currentPrepIndexForPackaging;

        if (prepIndex !== null) {
            addIngredientToState(prepIndex, ingredient);
        }
    }, [currentPrepIndexForIngredient, currentPrepIndexForPackaging, addIngredientToState]);


    const handleSelectMultipleIngredients = useCallback((selectedItems) => {
        // CHECK DEFERRAL FIRST
        if (pendingPreparationRef.current) {
            // We are in deferred creation mode.
            const pendingPrep = pendingPreparationRef.current;

            // Transform selectedItems to ingredients format
            const newIngredients = selectedItems.map(ingredient => ({
                ...ingredient,
                id: `${ingredient.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ingredient_id: ingredient.id,
                quantity: ingredient.quantity || 1,
                weight_frozen: '',
                weight_thawed: '',
                weight_raw: '',
                weight_clean: '',
                weight_pre_cooking: '',
                weight_cooked: '',
                weight_portioned: '',
                current_price: String(ingredient.current_price || '').replace('.', ','),
                technical_data: {
                    thawing_loss_pct: ingredient.technical_data?.thawing_loss_pct || 0,
                    cleaning_loss_pct: ingredient.technical_data?.cleaning_loss_pct || 0,
                    cooking_loss_pct: ingredient.technical_data?.cooking_loss_pct || 0,
                    cleaning_time_per_kg: ingredient.technical_data?.cleaning_time_per_kg || 0
                }
            }));

            const finalizedPrep = {
                ...pendingPrep,
                ingredients: [...pendingPrep.ingredients, ...newIngredients]
            };

            // Add step to list
            handleAddPreparationFromModal(finalizedPrep, { deferCreation: false });

            toast({
                title: "Etapa Criada",
                description: `${newIngredients.length} itens adicionados com sucesso.`,
            });

            pendingPreparationRef.current = null;

            // Close modals
            handleCloseIngredientModal();
            handleClosePackagingModal();
            return;
        }

        const prepIndex = currentPrepIndexForIngredient ?? currentPrepIndexForPackaging;

        if (prepIndex !== null) {
            let addedCount = 0;
            selectedItems.forEach(item => {
                // State updater inside addIngredientToState is safe for multiple sync calls.
                addIngredientToState(prepIndex, item);
                addedCount++;
            });

            if (addedCount > 0) {
                toast({
                    title: "Itens adicionados",
                    description: `${addedCount} itens foram adicionados à preparação.`
                });
            }

            handleCloseIngredientModal();
            handleClosePackagingModal();
        }
    }, [
        pendingPreparationRef,
        handleAddPreparationFromModal,
        toast,
        handleCloseIngredientModal,
        handleClosePackagingModal,
        currentPrepIndexForIngredient,
        currentPrepIndexForPackaging,
        addIngredientToState
    ]);


    // ============================================================================
    // INSERÇÃO DE RECEITAS (COMO INGREDIENTES/SUB-RECEITAS) NO MODAL DE RECEITA
    // ============================================================================
    const handleSelectRecipe = useCallback(async (recipe) => {
        // CHECK DEFERRAL FIRST
        if (pendingPreparationRef.current) {
            // We are in deferred creation mode.
            const pendingPrep = pendingPreparationRef.current;

            try {
                const { importRecipeAsPreparation } = await import('@/lib/services/recipeImportService');

                const { preparation } = await importRecipeAsPreparation(
                    recipe.id,
                    { prepIndex: preparationsData.length }
                );

                // Merge imported ingredients into pending prep
                const finalizedPrep = {
                    ...pendingPrep,
                    ingredients: [...pendingPrep.ingredients, ...preparation.ingredients],
                    source_recipe_id: preparation.source_recipe_id,
                    source_recipe_name: preparation.source_recipe_name
                };

                handleAddPreparationFromModal(finalizedPrep, { deferCreation: false });

                toast({
                    title: "Etapa Criada",
                    description: "Receita selecionada e etapa adicionada com sucesso.",
                });

            } catch (err) {
                console.error(err);
                toast({ title: "Erro", description: "Falha ao importar receita deferred.", variant: "destructive" });
            }

            pendingPreparationRef.current = null;
            handleCloseRecipeModal();
            return;
        }


        if (currentPrepIndexForRecipe !== null) {
            const prepIndex = currentPrepIndexForRecipe;
            handleCloseRecipeModal();

            try {
                const { importRecipeAsPreparation } = await import('@/lib/services/recipeImportService');

                const { preparation, parentInfo } = await importRecipeAsPreparation(
                    recipe.id,
                    { prepIndex: preparationsData.length }
                );

                // Adicionar ingredientes à preparação existente
                setPreparationsData(prev => {
                    const newPreparations = [...prev];
                    if (newPreparations[prepIndex]) {
                        newPreparations[prepIndex] = {
                            ...newPreparations[prepIndex],
                            ingredients: [
                                ...(newPreparations[prepIndex].ingredients || []),
                                ...preparation.ingredients
                            ],
                            source_recipe_id: preparation.source_recipe_id,
                            source_recipe_name: preparation.source_recipe_name
                        };
                    }
                    return newPreparations;
                });

                setIsDirty(true);
                toast({
                    title: "Receita Importada",
                    description: `${preparation.ingredients.length} ingredientes importados de "${parentInfo.name}".`,
                    className: "bg-green-100 border-green-500"
                });

            } catch (err) {
                console.error("Erro ao importar receita:", err);
                toast({ title: "Erro", description: "Falha ao importar receita.", variant: "destructive" });
            }
        }
    }, [
        pendingPreparationRef,
        preparationsData.length,
        handleAddPreparationFromModal,
        toast,
        handleCloseRecipeModal,
        currentPrepIndexForRecipe,
        setPreparationsData,
        setIsDirty
    ]);


    // ============================================================================
    // INSERÇÃO DE ITENS DE MONTAGEM (ASSEMBLY) NO MODAL DE MONTAGEM
    // ============================================================================
    const handleAddAssemblyItem = useCallback((itemData) => {
        if (currentPrepIndexForAssembly === null) return;

        const prepIndex = currentPrepIndexForAssembly;
        const targetPrep = preparationsData[prepIndex];

        if (!targetPrep) return;

        // PREVENÇÃO DE DUPLICIDADE
        const alreadyExists = targetPrep.sub_components?.some(sc =>
            (sc.source_id && sc.source_id === itemData.id) ||
            (sc.origin_id && sc.origin_id === itemData.id) ||
            (sc.id === itemData.id) // Fallback
        );

        if (alreadyExists) {
            toast({
                title: "Item duplicado",
                description: `O item "${itemData.name}" já foi adicionado a esta montagem.`,
                variant: "warning"
            });
            return;
        }

        setPreparationsData(prev => {
            const newPreparations = [...prev];
            const targetPrep = newPreparations[prepIndex];

            if (!targetPrep) return prev;

            let itemType = 'preparation'; // default
            if (itemData.isRecipe) {
                itemType = 'recipe';
            } else if (itemData.isIngredient) {
                itemType = 'ingredient';
            }

            const newSubComponent = {
                id: `${itemData.id}_${Date.now()}`,
                source_id: itemData.id,
                origin_id: itemData.id,
                name: itemData.name,
                type: itemType,
                current_price: itemData.current_price || 0,
                input_yield_weight: String(itemData.yield_weight || 0).replace('.', ','),
                input_total_cost: String(itemData.total_cost || 0).replace('.', ','),
                weight_portioned: '',
                yield_weight: '',
                total_cost: '',
                assembly_weight_kg: ''
            };

            newPreparations[prepIndex] = {
                ...targetPrep,
                sub_components: [...(targetPrep.sub_components || []), newSubComponent]
            };

            return newPreparations;
        });

        setIsDirty(true);

        toast({
            title: "Item adicionado",
            description: `"${itemData.name}" foi adicionado à preparação.`
        });

        handleCloseAssemblyItemModal();
    }, [currentPrepIndexForAssembly, preparationsData, toast, setPreparationsData, setIsDirty, handleCloseAssemblyItemModal]);


    return {
        addIngredientToState,
        handleSelectIngredient,
        handleSelectMultipleIngredients,
        handleSelectRecipe,
        handleAddAssemblyItem
    };
}
