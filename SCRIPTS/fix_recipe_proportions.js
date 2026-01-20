/**
 * Script de Correção v2: Sincronizar PROPORÇÕES das receitas pai
 * 
 * Este script atualiza receitas filhas aplicando as PROPORÇÕES (não valores absolutos)
 * das receitas pai.
 * 
 * Exemplo:
 * - Pai: peso_bruto=0.470, peso_cozido=0.711 → Proporção = 1.513 (151.3%)
 * - Filho: peso_bruto=0.234 → peso_cozido = 0.234 * 1.513 = 0.354
 * 
 * Executar com: node SCRIPTS/fix_recipe_proportions.js
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";

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

const parentCache = new Map();

async function getParentRecipe(parentId) {
    if (parentCache.has(parentId)) return parentCache.get(parentId);

    const docSnap = await getDoc(doc(db, 'Recipe', parentId));
    if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        parentCache.set(parentId, data);
        return data;
    }
    return null;
}

// Construir mapa com PROPORÇÕES dos ingredientes do pai
function buildParentProportionMap(parentData) {
    const map = new Map();

    (parentData.preparations || []).forEach(prep => {
        (prep.ingredients || []).forEach(ing => {
            const key = ing.ingredient_id || ing.id;
            if (!key) return;

            // Parsear valores
            const parseNum = (val) => {
                if (val === undefined || val === null) return 0;
                return parseFloat(String(val).replace(',', '.')) || 0;
            };

            const weight_raw = parseNum(ing.weight_raw);
            const weight_clean = parseNum(ing.weight_clean);
            const weight_cooked = parseNum(ing.weight_cooked);
            const pre_cooking = parseNum(ing.weight_pre_cooking || ing.weight_clean);

            // Calcular proporções
            const cleanRatio = weight_raw > 0 ? weight_clean / weight_raw : 1;
            const preCookRatio = weight_clean > 0 ? pre_cooking / weight_clean : 1;
            const cookRatio = pre_cooking > 0 ? weight_cooked / pre_cooking : 1;

            map.set(key, {
                name: ing.name,
                ingredient_id: key,
                price: parseNum(ing.price),
                // Proporções
                cleanRatio,        // Proporção limpeza (peso_limpo / peso_bruto)
                preCookRatio,      // Proporção pré-cocção (pre_cocção / peso_limpo)
                cookRatio,         // Proporção cocção (peso_cozido / pre_cocção)
                // Para recalcular custo_limpo
                loss_percent: parseNum(ing.loss_percent),
            });
        });
    });

    return map;
}

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

    console.log(`\n📋 Verificando: ${recipe.name}`);

    const preparations = recipe.preparations || [];
    const updatedPreparations = [];

    for (const prep of preparations) {
        // Determinar se é preparação importada
        let parentId = prep.source_recipe_id;

        if (!parentId) {
            const firstImported = prep.ingredients?.find(i => i.origin_recipe_id || i.source_recipe_id);
            if (firstImported) {
                parentId = firstImported.origin_recipe_id || firstImported.source_recipe_id;
            }
        }

        if (!parentId) {
            updatedPreparations.push(prep);
            continue;
        }

        const parentRecipe = await getParentRecipe(parentId);
        if (!parentRecipe) {
            updatedPreparations.push(prep);
            continue;
        }

        console.log(`   🔗 Vinculada a: ${parentRecipe.name}`);

        const parentProportions = buildParentProportionMap(parentRecipe);

        const updatedIngredients = (prep.ingredients || []).map(ing => {
            // Encontrar proporções do pai
            let parentProp = null;

            // Tentar por source_ingredient_id
            if (ing.source_ingredient_id) {
                parentProp = parentProportions.get(ing.source_ingredient_id);
            }

            // Fallback: por nome
            if (!parentProp) {
                for (const [key, val] of parentProportions.entries()) {
                    if (val.name === ing.name) {
                        parentProp = val;
                        break;
                    }
                }
            }

            if (!parentProp) {
                return ing; // Não encontrou, manter original
            }

            console.log(`   📦 ${ing.name}: Aplicando proporções do pai`);
            needsUpdate = true;

            // Parsear valores atuais do filho
            const parseNum = (val) => {
                if (val === undefined || val === null) return 0;
                return parseFloat(String(val).replace(',', '.')) || 0;
            };

            const childRaw = parseNum(ing.weight_raw);

            // Aplicar proporções
            const newClean = childRaw * parentProp.cleanRatio;
            const newPreCook = newClean * parentProp.preCookRatio;
            const newCooked = newPreCook * parentProp.cookRatio;

            // Recalcular custo limpo baseado no preço e perda
            const price = parentProp.price;
            const lossPercent = parentProp.loss_percent;
            const costClean = lossPercent > 0 ? price / (1 - lossPercent / 100) : price;

            console.log(`      peso_bruto=${childRaw} → peso_cozido=${newCooked.toFixed(3)} (ratio=${parentProp.cookRatio.toFixed(3)})`);

            const updated = {
                ...ing,
                // Preço do pai
                price: price,
                cost_clean: costClean,
                // Pesos recalculados com proporções do pai
                weight_clean: newClean.toFixed(3),
                weight_pre_cooking: newPreCook.toFixed(3),
                weight_cooked: newCooked.toFixed(3),
                // Rastreamento
                source_recipe_id: parentId,
                source_recipe_name: parentRecipe.name,
                source_ingredient_id: parentProp.ingredient_id
            };

            delete updated.origin_recipe_id;
            delete updated.origin_recipe_name;

            return cleanObject(updated);
        });

        updatedPreparations.push({
            ...prep,
            ingredients: updatedIngredients,
            source_recipe_id: parentId,
            source_recipe_name: parentRecipe.name
        });
    }

    if (needsUpdate) {
        try {
            await updateDoc(doc(db, 'Recipe', recipeId), {
                preparations: updatedPreparations
            });
            console.log(`   ✅ Atualizada com proporções corretas!`);
            return true;
        } catch (err) {
            console.error(`   ❌ Erro:`, err.message);
        }
    } else {
        console.log(`   ⏭️ Sem vínculos para corrigir.`);
    }

    return false;
}

async function main() {
    console.log('🚀 Corrigindo PROPORÇÕES das receitas importadas...\n');
    console.log('='.repeat(60));

    const snapshot = await getDocs(collection(db, 'Recipe'));
    console.log(`📊 Total: ${snapshot.size} receitas\n`);

    let fixed = 0;
    for (const docSnapshot of snapshot.docs) {
        if (await fixRecipe(docSnapshot)) fixed++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Receitas corrigidas: ${fixed}`);
    console.log('='.repeat(60));

    process.exit(0);
}

main().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
