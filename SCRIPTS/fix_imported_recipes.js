/**
 * Script de Correção: Reimportar dados das receitas pai
 * 
 * Este script atualiza todas as receitas filhas com os dados mais recentes
 * das receitas pai, corrigindo pesos, custos e rendimentos.
 * 
 * Executar com: node SCRIPTS/fix_imported_recipes.js
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Cache de receitas pai
const parentCache = new Map();

async function getParentRecipe(parentId) {
    if (parentCache.has(parentId)) {
        return parentCache.get(parentId);
    }

    const docSnap = await getDoc(doc(db, 'Recipe', parentId));
    if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        parentCache.set(parentId, data);
        return data;
    }
    return null;
}

function buildParentIngredientMap(parentData) {
    const map = new Map();

    (parentData.preparations || []).forEach(prep => {
        (prep.ingredients || []).forEach(ing => {
            const key = ing.ingredient_id || ing.id;
            if (key) {
                map.set(key, { ...ing });
            }
        });
    });

    return map;
}

// Função para remover campos undefined de um objeto (Firestore não aceita undefined)
function cleanObject(obj) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

async function fixRecipe(docSnapshot) {
    const recipeId = docSnapshot.id;
    const recipe = docSnapshot.data();
    let needsUpdate = false;

    console.log(`\n📋 Verificando: ${recipe.name} (${recipeId})`);

    const preparations = recipe.preparations || [];
    const updatedPreparations = [];

    for (const prep of preparations) {
        // Verificar se tem source_recipe_id (é uma preparação importada)
        const parentId = prep.source_recipe_id;

        if (!parentId) {
            // Verificar se algum ingrediente tem origin_recipe_id ou source_recipe_id
            const hasImportedIngs = prep.ingredients?.some(i => i.origin_recipe_id || i.source_recipe_id);
            if (!hasImportedIngs) {
                updatedPreparations.push(prep);
                continue;
            }
            // Extrair o ID do primeiro ingrediente importado
            const firstImported = prep.ingredients?.find(i => i.origin_recipe_id || i.source_recipe_id);
            if (!firstImported) {
                updatedPreparations.push(prep);
                continue;
            }
            // Simular como se tivesse source_recipe_id
            prep.source_recipe_id = firstImported.origin_recipe_id || firstImported.source_recipe_id;
            prep.source_recipe_name = firstImported.origin_recipe_name || firstImported.source_recipe_name;
        }

        // Buscar receita pai
        const parentRecipe = await getParentRecipe(prep.source_recipe_id);

        if (!parentRecipe) {
            console.log(`   ⚠️ Receita pai não encontrada: ${prep.source_recipe_id}`);
            updatedPreparations.push(prep);
            continue;
        }

        console.log(`   🔗 Vinculada a: ${parentRecipe.name}`);

        // Construir mapa de ingredientes do pai
        const parentIngMap = buildParentIngredientMap(parentRecipe);

        // Atualizar ingredientes
        const updatedIngredients = (prep.ingredients || []).map(ing => {
            // Determinar o ingredient_id para lookup
            const lookupId = ing.source_ingredient_id || ing.ingredient_id || ing.id;

            // Buscar no pai
            const parentIng = parentIngMap.get(lookupId);

            if (!parentIng) {
                // Tentar lookup alternativo por nome do ingrediente
                for (const [key, val] of parentIngMap.entries()) {
                    if (val.name === ing.name) {
                        console.log(`   📦 Match por nome: ${ing.name}`);
                        needsUpdate = true;
                        const updated = {
                            ...ing,
                            price: val.price,
                            cost_clean: val.cost_clean,
                            weight_raw: val.weight_raw,
                            weight_clean: val.weight_clean,
                            weight_cooked: val.weight_cooked,
                            source_recipe_id: prep.source_recipe_id,
                            source_recipe_name: prep.source_recipe_name || parentRecipe.name,
                            source_ingredient_id: val.ingredient_id || key
                        };
                        delete updated.origin_recipe_id;
                        delete updated.origin_recipe_name;
                        return cleanObject(updated);
                    }
                }
                return ing; // Não encontrou, manter original
            }

            needsUpdate = true;

            const updated = {
                ...ing,
                price: parentIng.price,
                cost_clean: parentIng.cost_clean,
                weight_raw: parentIng.weight_raw,
                weight_clean: parentIng.weight_clean,
                weight_cooked: parentIng.weight_cooked,
                source_recipe_id: prep.source_recipe_id,
                source_recipe_name: prep.source_recipe_name || parentRecipe.name,
                source_ingredient_id: parentIng.ingredient_id || lookupId
            };
            delete updated.origin_recipe_id;
            delete updated.origin_recipe_name;
            return cleanObject(updated);
        });

        updatedPreparations.push({
            ...prep,
            ingredients: updatedIngredients,
            source_recipe_id: prep.source_recipe_id,
            source_recipe_name: prep.source_recipe_name || parentRecipe.name
        });
    }

    // Salvar se houve mudanças
    if (needsUpdate) {
        try {
            await updateDoc(doc(db, 'Recipe', recipeId), {
                preparations: updatedPreparations
            });
            console.log(`   ✅ Atualizada!`);
            return true;
        } catch (err) {
            console.error(`   ❌ Erro ao salvar:`, err.message);
        }
    } else {
        console.log(`   ⏭️ Sem alterações necessárias.`);
    }

    return false;
}

async function main() {
    console.log('🚀 Iniciando correção de receitas importadas...\n');
    console.log('='.repeat(60));

    try {
        const snapshot = await getDocs(collection(db, 'Recipe'));
        console.log(`📊 Total de receitas: ${snapshot.size}\n`);

        let fixed = 0;

        for (const docSnapshot of snapshot.docs) {
            const wasFixed = await fixRecipe(docSnapshot);
            if (wasFixed) fixed++;
        }

        console.log('\n' + '='.repeat(60));
        console.log(`📊 Receitas corrigidas: ${fixed}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    }

    process.exit(0);
}

main();
