/**
 * Script para vincular receitas às categorias por ID
 * Adiciona category_id e corrige o nome da categoria nas receitas
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../.venv/cozinha-afeto-2026-firebase-adminsdk-fbsvc-ab856b85c0.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Mapeamento de nomes parciais para IDs e nomes corretos do CategoryTree
const categoryMapping = {
    // Nomes que estão nas receitas -> Nome correto no CategoryTree
    'MACARRÃO': 'MACARRÃO / MASSAS',
    'MOLHOS': 'MOLHOS / PATÊS / GELEIAS',
    'TEMAKI': 'POKE / TEMAKI',
    'POKE': 'POKE / TEMAKI',
    // Nomes que já estão corretos (ou próximos)
    'MARMITA 3 DIVISÓRIAS': 'MARMITA 3 DIVISÓRIAS',
    'MONO ARROZ': 'MONO ARROZ',
    'MONO FEIJÃO': 'MONO FEIJÃO',
    'MONO GUARNIÇÃO': 'MONO GUARNIÇÃO',
    'MONO PROTEÍNAS': 'MONO PROTEÍNAS',
    'SALADAS COZIDAS': 'SALADAS COZIDAS',
    'SALADAS PROTEICAS': 'SALADAS PROTEICAS',
    'SUSHI': 'SUSHI',
};

async function main() {
    console.log('='.repeat(80));
    console.log('VINCULAÇÃO DE RECEITAS A CATEGORIAS POR ID');
    console.log('='.repeat(80));

    // 1. Carregar todas as categorias do CategoryTree
    const catTreeSnap = await db.collection('CategoryTree').get();
    const categories = [];
    catTreeSnap.forEach(doc => {
        categories.push({ id: doc.id, ...doc.data() });
    });

    console.log(`\n📂 ${categories.length} categorias carregadas do CategoryTree`);

    // Criar índice por nome
    const catByName = {};
    categories.forEach(cat => {
        catByName[cat.name] = cat;
    });

    // 2. Carregar todas as receitas
    const recipeSnap = await db.collection('Recipe').get();
    console.log(`🍳 ${recipeSnap.size} receitas para processar`);

    let updated = 0;
    let errors = 0;
    const batch = db.batch();

    recipeSnap.forEach(doc => {
        const recipe = doc.data();
        const currentCategory = recipe.category || '';

        // Tentar encontrar a categoria correspondente
        let matchedCat = null;

        // 1. Busca exata
        if (catByName[currentCategory]) {
            matchedCat = catByName[currentCategory];
        }
        // 2. Busca pelo mapeamento
        else if (categoryMapping[currentCategory] && catByName[categoryMapping[currentCategory]]) {
            matchedCat = catByName[categoryMapping[currentCategory]];
        }
        // 3. Busca parcial (categoria contém o nome)
        else {
            for (const cat of categories) {
                if (cat.name.includes(currentCategory) || currentCategory.includes(cat.name)) {
                    matchedCat = cat;
                    break;
                }
            }
        }

        if (matchedCat) {
            // Atualizar receita com category_id e nome correto
            batch.update(doc.ref, {
                category_id: matchedCat.id,
                category: matchedCat.name,
                updatedAt: new Date()
            });
            updated++;
            console.log(`  ✅ "${recipe.name.substring(0, 40)}..." => ${matchedCat.name} (${matchedCat.id})`);
        } else {
            errors++;
            console.log(`  ❌ "${recipe.name.substring(0, 40)}..." - Categoria não encontrada: "${currentCategory}"`);
        }
    });

    // Executar batch update
    if (updated > 0) {
        await batch.commit();
        console.log(`\n✅ ${updated} receitas atualizadas com sucesso!`);
    }

    if (errors > 0) {
        console.log(`⚠️ ${errors} receitas não puderam ser vinculadas`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('VINCULAÇÃO CONCLUÍDA');
    console.log('='.repeat(80));
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erro:', err);
        process.exit(1);
    });
