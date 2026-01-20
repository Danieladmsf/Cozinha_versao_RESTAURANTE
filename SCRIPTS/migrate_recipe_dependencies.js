/**
 * Script de Migração: Dependências de Receitas
 * 
 * Este script migra receitas do formato antigo para o novo formato:
 * 
 * ANTES:
 *   - dependencies: ["id1", "id2"]
 *   - ingredients[].origin_recipe_id
 *   - ingredients[].origin_recipe_name
 * 
 * DEPOIS:
 *   - parent_recipes: [{id, name, prep_index}]
 *   - preparations[].source_recipe_id
 *   - preparations[].source_recipe_name
 *   - ingredients[].source_recipe_id
 *   - ingredients[].source_ingredient_id
 * 
 * Executar com: node SCRIPTS/migrate_recipe_dependencies.js
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteField } from "firebase/firestore";

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

// Estatísticas
let stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0
};

async function migrateRecipe(docSnapshot) {
    const recipeId = docSnapshot.id;
    const recipe = docSnapshot.data();
    const updates = {};
    let needsUpdate = false;

    console.log(`\n📋 Processando: ${recipe.name} (${recipeId})`);

    // 1. Migrar preparations
    const preparations = recipe.preparations || [];
    const newPreparations = [];
    const parentRecipesMap = new Map(); // Para construir parent_recipes

    for (let prepIndex = 0; prepIndex < preparations.length; prepIndex++) {
        const prep = { ...preparations[prepIndex] };
        let prepChanged = false;

        // Verificar ingredientes
        if (prep.ingredients && prep.ingredients.length > 0) {
            const newIngredients = [];
            let foundOriginId = null;
            let foundOriginName = null;

            for (const ing of prep.ingredients) {
                const newIng = { ...ing };

                // Converter origin_recipe_id → source_recipe_id
                if (ing.origin_recipe_id && !ing.source_recipe_id) {
                    newIng.source_recipe_id = ing.origin_recipe_id;
                    newIng.source_recipe_name = ing.origin_recipe_name || 'Receita Vinculada';
                    // O source_ingredient_id deve ser o ID base do ingrediente (ingredient_id)
                    // para poder fazer match com o ingrediente na receita pai
                    newIng.source_ingredient_id = ing.ingredient_id || ing.id;

                    foundOriginId = ing.origin_recipe_id;
                    foundOriginName = ing.origin_recipe_name;
                    prepChanged = true;

                    // Remover campos antigos
                    delete newIng.origin_recipe_id;
                    delete newIng.origin_recipe_name;
                }
                // TAMBÉM migrar se já tem source_recipe_id mas não tem source_ingredient_id
                else if (ing.source_recipe_id && !ing.source_ingredient_id) {
                    newIng.source_ingredient_id = ing.ingredient_id || ing.id;
                    prepChanged = true;

                    if (!foundOriginId) {
                        foundOriginId = ing.source_recipe_id;
                        foundOriginName = ing.source_recipe_name;
                    }
                }

                newIngredients.push(newIng);
            }

            prep.ingredients = newIngredients;

            // Setar source_recipe_id na preparação
            if (foundOriginId && !prep.source_recipe_id) {
                prep.source_recipe_id = foundOriginId;
                prep.source_recipe_name = foundOriginName || 'Receita Vinculada';
                prepChanged = true;

                // Adicionar ao mapa de parent_recipes
                if (!parentRecipesMap.has(foundOriginId)) {
                    parentRecipesMap.set(foundOriginId, {
                        id: foundOriginId,
                        name: foundOriginName || 'Receita Vinculada',
                        prep_index: prepIndex
                    });
                }
            }
        }

        if (prepChanged) {
            needsUpdate = true;
        }

        newPreparations.push(prep);
    }

    // 2. Converter dependencies → parent_recipes
    if (recipe.dependencies && recipe.dependencies.length > 0 && !recipe.parent_recipes) {
        // Buscar nomes das receitas pai
        for (const depId of recipe.dependencies) {
            if (!parentRecipesMap.has(depId)) {
                try {
                    const parentDoc = await getDoc(doc(db, 'Recipe', depId));
                    if (parentDoc.exists()) {
                        parentRecipesMap.set(depId, {
                            id: depId,
                            name: parentDoc.data().name || 'Receita Vinculada',
                            prep_index: -1 // Não sabemos qual preparação
                        });
                    }
                } catch (err) {
                    console.warn(`   ⚠️ Não consegui buscar pai ${depId}:`, err.message);
                }
            }
        }
        needsUpdate = true;
    }

    // 3. Aplicar updates se necessário
    if (needsUpdate) {
        updates.preparations = newPreparations;
        updates.parent_recipes = Array.from(parentRecipesMap.values());

        // Remover campo antigo
        updates.dependencies = deleteField();

        try {
            await updateDoc(doc(db, 'Recipe', recipeId), updates);
            console.log(`   ✅ Migrado! parent_recipes:`, updates.parent_recipes.map(p => p.name).join(', ') || '(nenhum)');
            stats.migrated++;
        } catch (err) {
            console.error(`   ❌ Erro ao salvar:`, err.message);
            stats.errors++;
        }
    } else {
        console.log(`   ⏭️ Já está no formato novo, pulando.`);
        stats.skipped++;
    }
}

async function main() {
    console.log('🚀 Iniciando migração de dependências de receitas...\n');
    console.log('='.repeat(60));

    try {
        // Buscar todas as receitas
        const snapshot = await getDocs(collection(db, 'Recipe'));
        stats.total = snapshot.size;

        console.log(`📊 Total de receitas encontradas: ${stats.total}\n`);

        // Processar cada receita
        for (const docSnapshot of snapshot.docs) {
            await migrateRecipe(docSnapshot);
        }

        // Resumo
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMO DA MIGRAÇÃO:');
        console.log('='.repeat(60));
        console.log(`   Total processadas: ${stats.total}`);
        console.log(`   ✅ Migradas:       ${stats.migrated}`);
        console.log(`   ⏭️ Já atualizadas: ${stats.skipped}`);
        console.log(`   ❌ Erros:          ${stats.errors}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    }

    process.exit(0);
}

main();
