const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, '../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function chunkArray(array, size) {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}

async function migrate() {
    console.log('🚀 Iniciando migração em massa (Promise.all Mode): Recipes -> Products');
    try {
        const categoriesSnapshot = await db.collection('CategoryTree').get();
        const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const defaultCategory = categories.find(c => c.type === 'produtos') || null;

        const recipesSnapshot = await db.collection('Recipe').get();
        const recipes = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`📦 Encontradas ${recipes.length} receitas totais no banco.`);

        const productsSnapshot = await db.collection('Product').get();
        const existingProducts = productsSnapshot.docs.map(doc => doc.data().name?.toLowerCase());

        let createdCount = 0;
        let skippedCount = 0;
        let errorsCount = 0;

        const recipesToProcess = [];

        for (const recipe of recipes) {
            if (!recipe.name) continue;

            const nameLower = recipe.name.toLowerCase();

            if (existingProducts.includes(nameLower)) {
                skippedCount++;
                continue;
            }

            let categoryId = defaultCategory ? defaultCategory.id : null;
            let categoryName = defaultCategory ? defaultCategory.name : 'Sem Categoria';

            const matchingCat = categories.find(c => c.type === 'produtos' && c.name?.toLowerCase() === recipe.category?.toLowerCase());
            if (matchingCat) {
                categoryId = matchingCat.id;
                categoryName = matchingCat.name;
            }

            const productData = {
                name: recipe.name,
                code: '',
                description: `Criado em lote a partir da receita: ${recipe.name}`,
                category_id: categoryId,
                category: categoryName,
                price: recipe.suggested_price || recipe.total_cost || 0,
                unit_type: 'un',
                shelf_life_days: '',
                active: true,
                components: [
                    {
                        recipe_id: recipe.id,
                        weight_kg: recipe.yield_weight || 0
                    }
                ],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            recipesToProcess.push(productData);
        }

        console.log(`⏳ Iniciando gravação de ${recipesToProcess.length} SKUs ausentes...`);

        const chunks = await chunkArray(recipesToProcess, 20); // 20 concurrent
        let chunkIdx = 0;

        for (const chunk of chunks) {
            chunkIdx++;
            console.log(`Gravando Lote ${chunkIdx}/${chunks.length}...`);
            await Promise.all(chunk.map(async (data) => {
                try {
                    await db.collection('Product').add(data);
                    createdCount++;
                } catch (e) {
                    console.error('❌ Erro gravando:', data.name, e.message);
                    errorsCount++;
                }
            }));
        }

        console.log('✅ Migração Concluída!');
        console.log(`📊 SKUs Novos Criados: ${createdCount}`);
        console.log(`⏭️ Ignorados (já existiam SKUs): ${skippedCount}`);
        console.log(`🐛 Erros: ${errorsCount}`);

    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
    }
    process.exit(0);
}

migrate();
