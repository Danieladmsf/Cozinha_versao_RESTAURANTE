import { useCallback } from 'react';
import { loadRecipe } from '@/lib/services/recipeService';

export function useRecipeLoad({
    setLoading,
    setRecipeData,
    setPreparationsData,
    setCurrentRecipeId,
    setIsEditing,
    setIsDirty,
    toast
}) {

    const loadRecipeById = useCallback(async (rawRecipeId) => {
        if (!rawRecipeId) return;
        const recipeId = String(rawRecipeId).trim();

        try {
            setLoading(true);

            const result = await loadRecipe(recipeId);

            console.log('🔴 [LOAD] Receita carregada do Firebase:', {
                recipeId,
                success: result.success,
                preparations: result.preparations?.map(p => ({
                    id: p.id,
                    title: p.title,
                    notes: p.notes
                }))
            });

            if (result.success) {
                // Atualizar estados com os dados da receita (como no Editar Cliente)
                setRecipeData(result.recipe);
                setPreparationsData(result.preparations || []);
                setCurrentRecipeId(result.recipe.id);
                setIsEditing(true);
                setIsDirty(false);

                toast({
                    title: "Receita carregada",
                    description: `"${result.recipe.name}" foi carregada para edição.`
                });
            } else {
                toast({
                    title: "Erro ao carregar",
                    description: result.error || "Não foi possível carregar a receita.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Erro ao carregar",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [setLoading, setRecipeData, setPreparationsData, setCurrentRecipeId, setIsEditing, setIsDirty, toast]);

    return {
        loadRecipeById
    };
}
