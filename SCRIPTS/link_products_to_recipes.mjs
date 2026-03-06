/**
 * Script para criar Recipes vinculadas a Products que ainda não têm.
 * Isso garante que todos os produtos apareçam na Ficha Técnica.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, addDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig, 'link-products');
const db = getFirestore(app);

async function linkAll() {
    console.log('🔍 Buscando todos os produtos e receitas...\n');

    const productSnap = await getDocs(collection(db, 'Product'));
    const recipeSnap = await getDocs(collection(db, 'Recipe'));

    const allProducts = productSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allRecipes = recipeSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`📊 Produtos: ${allProducts.length} | Receitas: ${allRecipes.length}\n`);

    // Criar mapa de receitas existentes por source_product_id e recipe_link_id
    const recipeBySourceId = {};
    const recipeByLinkId = {};
    allRecipes.forEach(r => {
        if (r.source_product_id) recipeBySourceId[r.source_product_id] = r;
    });

    // Criar mapa de produtos que já têm recipe vinculada via components ou recipe_link_id
    let created = 0;
    let alreadyLinked = 0;

    for (const product of allProducts) {
        // Verificar se já tem recipe vinculada
        const hasComponentLink = product.components && product.components.some(c => c.recipe_id);
        const hasRecipeLinkId = !!product.recipe_link_id;
        const hasSourceInRecipe = !!recipeBySourceId[product.id];

        if (hasComponentLink || hasRecipeLinkId || hasSourceInRecipe) {
            alreadyLinked++;
            continue;
        }

        // Produto sem recipe vinculada → criar uma
        console.log(`➕ Criando recipe para: "${product.name}" [${product.id}]`);

        const recipeRef = await addDoc(collection(db, 'Recipe'), {
            name: product.name || '',
            category: product.category || '',
            type: 'produtos',
            source_product_id: product.id,
            active: true,
            total_weight: 0,
            yield_weight: 0,
            total_cost: 0,
            ingredients: [],
            preparations: [],
            dependencies: [],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Vincular produto à receita
        await updateDoc(doc(db, 'Product', product.id), {
            components: [{ recipe_id: recipeRef.id, weight_kg: 0 }],
            recipe_link_id: recipeRef.id,
            updatedAt: new Date()
        });

        console.log(`   ✅ Recipe criada: ${recipeRef.id}`);
        created++;
    }

    console.log(`\n🎯 Resultado: ${created} receitas criadas | ${alreadyLinked} já vinculados`);
}

linkAll()
    .then(() => { console.log('✅ Finalizado.'); process.exit(0); })
    .catch(err => { console.error('❌', err); process.exit(1); });
