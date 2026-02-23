import { useCallback } from 'react';

/**
 * Hook dedicado a isolar a complexa lógica de Criação de Etapa a partir do ProcessCreatorModal,
 * incluindo auto-população de montagens com etapas anteriores e regras de ordenação de Modais Seguintes.
 */
export function useRecipePreparationModal({
    preparationsData,
    setPreparationsData,
    setIsDirty,
    setIsProcessCreatorOpen,
    pendingPreparationRef,
    setCurrentPrepIndexForIngredient,
    setIngredientModalOpen,
    setCurrentPrepIndexForRecipe,
    setRecipeModalOpen,
    setCurrentPrepIndexForAssembly,
    setIsAssemblyItemModalOpen,
    setCurrentPrepIndexForPackaging,
    setPackagingModalOpen
}) {

    // Função para adicionar preparação do modal (usada pelo ProcessCreatorModal)
    // AUTO-POPULATE: Ao adicionar uma etapa, ela é automaticamente incluída nas montagens existentes.
    const handleAddPreparationFromModal = useCallback((newPreparation, options = {}) => {
        // Ensure ID exists and is unique
        const prepWithId = {
            ...newPreparation,
            id: newPreparation.id || String(Date.now() + Math.random())
        };

        // DEFER CREATION LOGIC:
        // Se a opção deferCreation estiver ativa, NÃO adicionamos a preparação ao estado ainda.
        // Apenas guardamos no ref e abrimos o modal.
        if (options.deferCreation) {
            pendingPreparationRef.current = prepWithId;

            setIsProcessCreatorOpen(false);
            const targetIndex = preparationsData.length; // Virtual index for modal purposes (will be appended)

            if (options.openIngredientSelector) {
                setCurrentPrepIndexForIngredient(targetIndex);
                // Note: Ingredient Selector uses index to find prep, but here prep doesn't exist yet.
                // We need to handle this in handleSelectMultipleIngredients by checking pendingPreparationRef.
                setIngredientModalOpen(true);
            } else if (options.openRecipeSelector) {
                setCurrentPrepIndexForRecipe(targetIndex);
                setRecipeModalOpen(true);
            } else if (options.openAssemblySelector) {
                setCurrentPrepIndexForAssembly(targetIndex);
                setIsAssemblyItemModalOpen(true);
            } else if (options.openPackagingSelector) {
                setCurrentPrepIndexForPackaging(targetIndex);
                setPackagingModalOpen(true);
            }
            return;
        }

        setPreparationsData(prev => {
            let updatedPreparations = [...prev];

            // Fix Titulo Duplicado: Se o título sugerir que é uma "Xº Etapa" e estiver duplicado, ajusta.
            // Isso é apenas um fallback visual, o ideal é o modal mandar certo, mas garante consistência.
            if (prepWithId.title && prepWithId.title.match(/^\d+º Etapa:/)) {
                // Fallback visual
            }

            // Verificar se a nova etapa é uma montagem
            const isAssembly = prepWithId.processes?.includes('assembly');

            if (isAssembly) {
                // Se for montagem: adicionar todas as etapas anteriores (não-montagem) como sub_components
                const previousSteps = updatedPreparations.filter(p => !p.processes?.includes('assembly'));

                prepWithId.sub_components = previousSteps.map(step => ({
                    id: String(Date.now() + Math.random()),
                    name: step.title,
                    type: 'preparation',
                    source_id: step.id,
                    assembly_weight_kg: 0,
                    origin_id: step.id // Marca como item de matriz (bloqueado)
                }));
            } else {
                // Se NÃO for montagem: adicionar esta etapa em todas as montagens existentes (e porcionamentos)
                const assemblies = updatedPreparations.filter(p => p.processes?.includes('assembly') || p.processes?.includes('portioning'));

                updatedPreparations = updatedPreparations.map(prep => {
                    if (prep.processes?.includes('assembly') || prep.processes?.includes('portioning')) {
                        // Adicionar a nova etapa como sub_component da montagem
                        const newSubComponent = {
                            id: String(Date.now() + Math.random()),
                            name: prepWithId.title,
                            type: 'preparation',
                            source_id: prepWithId.id,
                            assembly_weight_kg: 0,
                            // origin_id removido para permitir edição/remoção local
                        };

                        return {
                            ...prep,
                            sub_components: [...(prep.sub_components || []), newSubComponent]
                        };
                    }
                    return prep;
                });
            }

            const updated = [...updatedPreparations, prepWithId];

            // AUTO-SORT: Garantir que porcionamento/montagem sejam sempre os últimos
            const regularSteps = updated.filter(p =>
                !p.processes?.includes('assembly') && !p.processes?.includes('portioning')
            );
            const finalSteps = updated.filter(p =>
                p.processes?.includes('assembly') || p.processes?.includes('portioning')
            );

            const sorted = [...regularSteps, ...finalSteps];

            // AUTO-RENAME: Renumerar os títulos para manter sequência correta
            const renumbered = sorted.map((prep, index) => {
                const stepNumber = index + 1;
                // Só renumera se o título seguir o padrão "Xº Etapa: ..."
                if (prep.title && prep.title.match(/^\d+º Etapa:/)) {
                    const titleWithoutNumber = prep.title.replace(/^\d+º Etapa:/, '').trim();
                    return {
                        ...prep,
                        title: `${stepNumber}º Etapa: ${titleWithoutNumber}`
                    };
                }
                return prep;
            });

            return renumbered;
        });

        setIsDirty(true);
        setIsProcessCreatorOpen(false);

        // UX AUTOMATION: Abrir modal correspondente imediatamente após criar a etapa (Synchronous)
        const targetIndex = preparationsData.length;

        if (options.openIngredientSelector) {
            setCurrentPrepIndexForIngredient(targetIndex);
            setIngredientModalOpen(true);
        } else if (options.openRecipeSelector) {
            setCurrentPrepIndexForRecipe(targetIndex);
            setRecipeModalOpen(true);
        } else if (options.openAssemblySelector) {
            setCurrentPrepIndexForAssembly(targetIndex);
            setIsAssemblyItemModalOpen(true);
        } else if (options.openPackagingSelector) {
            setCurrentPrepIndexForPackaging(targetIndex);
            setPackagingModalOpen(true);
        }

    }, [
        preparationsData.length,
        pendingPreparationRef,
        setIsProcessCreatorOpen,
        setCurrentPrepIndexForIngredient,
        setIngredientModalOpen,
        setCurrentPrepIndexForRecipe,
        setRecipeModalOpen,
        setCurrentPrepIndexForAssembly,
        setIsAssemblyItemModalOpen,
        setCurrentPrepIndexForPackaging,
        setPackagingModalOpen,
        setPreparationsData,
        setIsDirty
    ]);

    return {
        handleAddPreparationFromModal
    };
}
