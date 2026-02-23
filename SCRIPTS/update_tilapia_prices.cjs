const admin = require('firebase-admin');
const sa = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

async function run() {
    // 1. Criar ingrediente Filé de Tilápia se não existir
    const tilapiaSnap = await db.collection('Ingredient')
        .where('name', '==', 'Filé de Tilápia').get();

    let tilapiaId;
    if (tilapiaSnap.empty) {
        const ref = await db.collection('Ingredient').add({
            name: 'Filé de Tilápia',
            unit: 'kg',
            price: 32.90,
            category: 'Pescados',
            active: true,
            item_type: 'ingredient',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        tilapiaId = ref.id;
        console.log('✅ Ingrediente Filé de Tilápia criado:', tilapiaId);
    } else {
        tilapiaId = tilapiaSnap.docs[0].id;
        console.log('ℹ️  Filé de Tilápia já existe:', tilapiaId);
    }

    // 2. Mapa de nomes → ingredient_id e preço estimado
    const MAP = {
        'Filé de Tilápia': { id: tilapiaId, price: 32.90 },
        'Sal Refinado': { id: 'bpBfEm9oUwz8t73sPIv2', price: 2.50 },
        'Alho Fresco': { id: '1BWqf9KBUdkhJydgq0Da', price: 29.90 },
        'Pimenta do Reino': { id: 'xlRpMydoeJ3AjOG9sIwc', price: 89.90 },
        'Óleo de Soja': { id: 'T0vI5jbPMbHw3r4A9JSl', price: 7.50 },
        'Farinha de Trigo': { id: 'HBQWotxo2lDEEZIwzXaz', price: 4.90 },
        'Ovo Inteiro': { id: '5esyryEnrCaoM2xC3pcb', price: 14.90 },
        'Farinha de Rosca': { id: 'udu4K2vcjKv3PEwI1uJo', price: 8.90 },
        'Óleo de Soja (fritura)': { id: 'GeLIHAycPtXtUcXRy39I', price: 7.50 },
    };

    // 3. Buscar e atualizar a receita
    const recipeRef = db.collection('Recipe').doc('hMwWoqK51rPYNtuQN8zv');
    const recipeSnap = await recipeRef.get();
    if (!recipeSnap.exists) {
        console.log('❌ Receita não encontrada!');
        return;
    }

    const recipe = recipeSnap.data();
    const preps = recipe.preparations;

    preps.forEach(prep => {
        if (prep.ingredients) {
            prep.ingredients.forEach(ing => {
                const mapped = MAP[ing.name];
                if (mapped) {
                    ing.ingredient_id = mapped.id;
                    ing.current_price = mapped.price;
                    console.log(`  ✅ ${ing.name} → id:${mapped.id} preço:R$${mapped.price}`);
                }
            });
        }
    });

    await recipeRef.update({
        preparations: preps,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('\n🎉 Receita atualizada com preços e ingredient_ids!');
}

run().catch(console.error).finally(() => process.exit(0));
