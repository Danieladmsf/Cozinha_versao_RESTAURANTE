import { doc, getDoc, getDocFromServer, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function loadRecipe(recipeId) {
    if (!recipeId) {
        return { success: false, error: "ID inválido" };
    }

    try {
        const recipeRef = doc(db, 'Recipe', recipeId);
        // FORCE SERVER FETCH TO BYPASS AGGRESSIVE BROWSER CACHING
        const recipeSnap = await getDocFromServer(recipeRef);

        if (!recipeSnap.exists()) {
            return { success: false, error: "Receita não encontrada" };
        }

        const recipeData = { id: recipeSnap.id, ...recipeSnap.data() };

        // As preparações são salvas como um array no documento da receita, e não em uma sub-coleção
        let preparations = recipeData.preparations || [];

        // Ordenar preparações pelo campo de ordem para garantir sequência 
        preparations.sort((a, b) => (a.order || 0) - (b.order || 0));

        return {
            success: true,
            recipe: recipeData,
            preparations
        };
    } catch (error) {
        console.error("Erro ao carregar receita:", error);
        return { success: false, error: error.message };
    }
}
