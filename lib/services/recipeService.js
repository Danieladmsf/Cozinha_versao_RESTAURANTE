import { doc, getDoc, getDocFromServer, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function loadRecipe(recipeId) {
    if (!recipeId) {
        return { success: false, error: "ID inválido" };
    }

    try {
        const recipeRef = doc(db, 'Recipe', recipeId);
        // FORCE SERVER FETCH TO BYPASS AGGRESSIVE BROWSER CACHING
        let recipeSnap = await getDocFromServer(recipeRef);

        if (!recipeSnap.exists()) {
            // Se não encontrou a receita diretamente, pode ser um ID curto de Produto vindo do Cardápio Semanal (VR Soft)
            // Ex: g5Wt2ob72kKZxUoESRnk em vez de rec_g5Wt2ob72kKZxUoESRnk_1772574281229
            try {
                const productRef = doc(db, 'Product', recipeId);
                const productSnap = await getDocFromServer(productRef);

                if (productSnap.exists()) {
                    const prodName = productSnap.data().name;
                    if (prodName) {
                        // Buscar a Receita que corresponde a este Produto pelo nome (Exato ou com prefixo SKU:)
                        const productRecipeQuery = query(
                            collection(db, 'Recipe'),
                            where('name', 'in', [prodName, `SKU: ${prodName}`])
                        );
                        const querySnapshot = await getDocs(productRecipeQuery);

                        if (!querySnapshot.empty) {
                            // Found the mapped extended ID!
                            recipeSnap = querySnapshot.docs[0];
                        } else {
                            // Última tentativa: buscar receitas do tipo produtos que contenham o nome (fuzzy match manual)
                            const allRecipesQuery = query(collection(db, 'Recipe'), where('type', '==', 'produtos'));
                            const allRecipesSnap = await getDocs(allRecipesQuery);
                            const fuzzyMatch = allRecipesSnap.docs.find(d => {
                                const rName = d.data().name || '';
                                return rName.includes(prodName) || prodName.includes(rName);
                            });

                            if (fuzzyMatch) {
                                recipeSnap = fuzzyMatch;
                            } else {
                                return { success: false, error: "Ficha Técnica não gerada para este produto (ID mapeado)." };
                            }
                        }
                    } else {
                        return { success: false, error: "Receita não encontrada e Produto sem nome." };
                    }
                } else {
                    return { success: false, error: "Receita não encontrada (ID inválido)" };
                }
            } catch (fallbackErr) {
                console.error("Erro no fallback de produto:", fallbackErr);
                return { success: false, error: "Receita não encontrada" };
            }
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
