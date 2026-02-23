
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui';

export function useRecipeQuickEditor() {
  const { toast } = useToast();

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/recipes');
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      const sortedRecipes = result.data.sort((a, b) => a.name.localeCompare(b.name));
      setRecipes(sortedRecipes);
      return { success: true, recipes: sortedRecipes };
    } catch (error) {
      setError(error.message);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as receitas.",
        variant: "destructive"
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateRecipe = useCallback(async (recipeId, updatedData) => {
    // Placeholder for update logic
    toast({
      title: "Função não implementada",
      description: "A atualização de receitas ainda não foi implementada.",
    });
  }, [toast]);

  const deleteRecipe = useCallback(async (recipeId) => {
    try {
      const response = await fetch(`/api/recipes?id=${recipeId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
      toast({ title: "Receita excluída", description: "A receita foi removida com sucesso." });
      return { success: true };
    } catch (error) {
      toast({ title: "Erro", description: `Não foi possível excluir: ${error.message}`, variant: "destructive" });
      return { success: false, error };
    }
  }, [toast]);

  const bulkDeleteRecipes = useCallback(async (recipeIds) => {
    let successCount = 0;
    let failCount = 0;
    for (const id of recipeIds) {
      try {
        const response = await fetch(`/api/recipes?id=${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }
    setRecipes(prev => prev.filter(r => !recipeIds.includes(r.id)));
    if (failCount === 0) {
      toast({ title: "Receitas excluídas", description: `${successCount} receita(s) removida(s) com sucesso.` });
    } else {
      toast({ title: "Exclusão parcial", description: `${successCount} excluída(s), ${failCount} falhou(aram).`, variant: "destructive" });
    }
    return { success: failCount === 0, successCount, failCount };
  }, [toast]);

  const refreshRecipes = useCallback(async () => {
    return await loadRecipes();
  }, [loadRecipes]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  return {
    recipes,
    loading,
    error,
    refreshRecipes,
    updateRecipe,
    deleteRecipe,
    bulkDeleteRecipes,
  };
}
