import { useCallback } from 'react';

/**
 * Hook para encapsular chamadas de persistência (salvar ficha técnica no banco)
 * abstraindo o "saveRecipeToFirestore" pra fora do RecipeBook.jsx
 */
export function useRecipeBookStorage() {

    /**
     * Função auxiliar para salvar a receita e suas preparações de volta no banco de dados.
     * Chama a API Route central para garantir segurança.
     * 
     * @param {Object} recipe Objeto da receita
     * @param {Array} preparations Lista de preparações atreladas à receita
     * @returns {Promise<boolean>} true se salvou com sucesso, false caso contrário
     */
    const saveRecipeToFirestore = useCallback(async (recipe, preparations = []) => {
        if (!recipe || !recipe.id) {
            console.warn("useRecipeBookStorage: Receita sem ID, não é possível salvar.");
            return false;
        }

        try {
            // Payload mescla a receita principal com as preparações (etapas)
            const payload = {
                ...recipe,
                preparations: preparations
            };

            const response = await fetch(`/api/recipes?id=${recipe.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Erro ao salvar no banco de dados');
            }

            console.log(`✅ Receita ${recipe.id} salva no Firestore via API com sucesso!`);
            return true;

        } catch (error) {
            console.error("❌ Erro ao salvar receita via hook de Storage:", error);
            return false;
        }
    }, []);

    return {
        saveRecipeToFirestore
    };
}
