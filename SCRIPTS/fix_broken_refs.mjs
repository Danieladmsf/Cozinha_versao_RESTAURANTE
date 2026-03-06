/**
 * Corrigir referências quebradas: Products apontando para Recipes deletadas.
 * Para cada Product, verifica se as Recipes referenciadas existem.
 * Se não existem, procura a Recipe sobrevivente pelo mesmo nome.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig, 'fix-refs');
const db = getFirestore(app);

async function run() {
    console.log('🔍 Verificando referências quebradas...\n');

    const productSnap = await getDocs(collection(db, 'Product'));
    const recipeSnap = await getDocs(collection(db, 'Recipe'));

    const products = productSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const recipes = recipeSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Criar mapa de receitas existentes
    const recipeIds = new Set(recipes.map(r => r.id));
    const recipeByName = {};
    recipes.forEach(r => {
        const key = (r.name || '').trim().toLowerCase();
        if (!recipeByName[key]) recipeByName[key] = r;
    });

    // Também criar mapa por source_product_id
    const recipeByProductId = {};
    recipes.forEach(r => {
        if (r.source_product_id) recipeByProductId[r.source_product_id] = r;
    });

    let fixed = 0;
    let ok = 0;
    let noRecipe = 0;

    for (const product of products) {
        // Verificar recipe_link_id
        const linkId = product.recipe_link_id;
        const compRecipeId = product.components?.[0]?.recipe_id;

        const refId = linkId || compRecipeId;

        if (!refId) {
            noRecipe++;
            continue;
        }

        // Verificar se a recipe existe
        if (recipeIds.has(refId)) {
            ok++;
            continue;
        }

        // Recipe não existe! Encontrar substituta
        console.log(`❌ Produto "${product.name}" [${product.id}] → recipe_link "${refId}" NÃO EXISTE`);

        // Tentar encontrar por source_product_id
        let replacement = recipeByProductId[product.id];

        // Ou pelo nome
        if (!replacement) {
            const key = (product.name || '').trim().toLowerCase();
            replacement = recipeByName[key];
        }

        if (replacement) {
            console.log(`   ✅ Substituindo por: ${replacement.id} ("${replacement.name}")`);

            await updateDoc(doc(db, 'Product', product.id), {
                recipe_link_id: replacement.id,
                components: [{ recipe_id: replacement.id, weight_kg: product.components?.[0]?.weight_kg || 0 }],
                updatedAt: new Date()
            });
            fixed++;
        } else {
            console.log(`   ⚠️  Nenhuma recipe encontrada para substituir!`);
        }
    }

    console.log(`\n🎯 Resultado: ${fixed} referências corrigidas | ${ok} OK | ${noRecipe} sem referência`);
}

run()
    .then(() => { console.log('✅ Finalizado.'); process.exit(0); })
    .catch(err => { console.error('❌', err); process.exit(1); });
