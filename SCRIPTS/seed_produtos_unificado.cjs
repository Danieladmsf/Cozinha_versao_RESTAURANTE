/**
 * Script para LIMPAR e RECRIAR categorias/receitas de forma UNIFICADA em "produtos"
 * Execução: node SCRIPTS/seed_produtos_unificado.cjs
 */

const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '../.venv/cozinha-afeto-2026-firebase-adminsdk-fbsvc-ab856b85c0.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Estrutura UNIFICADA de subcategorias
const SUBCATEGORIAS = [
    "MARMITA 3 DIVISÓRIAS",
    "MACARRÃO / MASSAS",
    "MONO ARROZ",
    "MONO FEIJÃO",
    "MONO GUARNIÇÃO",
    "MONO PROTEÍNAS",
    "SALADAS PROTEICAS",
    "SALADAS COZIDAS",
    "SUSHI",
    "POKE / TEMAKI",
    "MOLHOS / PATÊS / GELEIAS"
];

// Todas as receitas UNIFICADAS por categoria
const RECEITAS_POR_CATEGORIA = {
    "MARMITA 3 DIVISÓRIAS": [
        { code: "007768", name: "REFEIÇÃO LAGARTO M. MADEIRA + BATATA ASSADA" },
        { code: "008966", name: "REFEIÇÃO ISCA DE FRANGO À MILANESA" },
        { code: "007875", name: "REFEIÇÃO STROGONOFF FRANGO" },
        { code: "007877", name: "REFEIÇÃO TIRINHA CARNE CHINESA" },
        { code: "007673", name: "REFEIÇÃO FILÉ FRANGO PARMEGIANA" },
        { code: "008948", name: "REFEIÇÃO COPA LOMBO SUÍNA À MILANESA" },
        { code: "007625", name: "REFEIÇÃO CARNE PANELA" },
        { code: "007796", name: "REFEIÇÃO MEDALHÃO FRANGO" },
        { code: "009362", name: "REFEIÇÃO ISCA DE FRANGO ACEBOLADA" },
        { code: "007874", name: "REFEIÇÃO STROGONOFF CARNE" },
        { code: "007660", name: "REFEIÇÃO FEIJOADA" },
        // Rotisseria
        { code: "008480", name: "ROTISSERIA MACARRONADA À BOLONHESA BENDITO KG" },
        { code: "008321", name: "ESPAGUETE À BOLONHESA + POLPETONE RECHEADO" },
        { code: "008400", name: "ROTISSERIA LASANHA À BOLONHESA BENDITO KG" }
    ],
    "MACARRÃO / MASSAS": [
        { code: "008480", name: "MACARRONADA À BOLONHESA" },
        { code: "093626", name: "MACARRÃO COM BRÓCOLIS E BACON" },
        { code: "008442", name: "MACARRÃO COM CALABRESA AO MOLHO ROSÉ" },
        { code: "008321", name: "ESPAGUETE À BOLONHESA + POLPETONE" },
        { code: "008900", name: "YAKISSOBA" },
        { code: "008400", name: "LASANHA À BOLONHESA" },
        { code: "006960", name: "NHOQUE AO MOLHO SUGO" },
        { code: "008663", name: "RONDELE FRANGO COM REQUEIJÃO" },
        // Rotisseria
        { code: "008037", name: "ROTISSERIA ARROZ CARRETEIRO BENDITO KG" },
        { code: "008023", name: "ROTISSERIA ARROZ À GREGA BENDITO KG" }
    ],
    "MONO ARROZ": [
        { code: "008028", name: "ARROZ BRANCO" },
        // Rotisseria
        { code: "006857", name: "ROTISSERIA MAIONESE DE LEGUMES COM FRANGO" }
    ],
    "MONO FEIJÃO": [
        { code: "008328", name: "FEIJÃO" },
        { code: "008336", name: "FEIJOADA" }
    ],
    "MONO GUARNIÇÃO": [
        { code: "008089", name: "BATATA ASSADA" },
        { code: "008598", name: "PURÊ DE BATATA" },
        { code: "008403", name: "LEGUMES" },
        { code: "008080", name: "BANANA" },
        { code: "008292", name: "CREME DE MILHO" },
        { code: "008391", name: "JILÓ FRITO" },
        { code: "008153", name: "BERINJELA À PIZZAIOLO" },
        { code: "008279", name: "COUVE-FLOR EMPANADA" },
        { code: "008323", name: "FAROFA" }
    ],
    "MONO PROTEÍNAS": [
        { code: "008409", name: "LINGUIÇA ASSADA" },
        { code: "008361", name: "FILÉ SOBRECOXA ASSADA" },
        { code: "008491", name: "MEDALHÃO DE FRANGO" },
        { code: "008602", name: "QUIBE ASSADO" },
        { code: "008349", name: "FILÉ FRANGO PARMEGIANA" },
        { code: "008284", name: "COXA SOBRECOXA ASSADA" },
        { code: "008381", name: "FRANGO XADREZ" },
        { code: "008834", name: "STROGONOFF DE CARNE" },
        { code: "008298", name: "DOBRADINHA" },
        { code: "008804", name: "SOBRECOXA RECHEADA" },
        // Rotisseria
        { code: "093583", name: "ASSADO DE FRANGO BENDITO INTEIRO" }
    ],
    "SALADAS PROTEICAS": [
        { code: "008963", name: "SALADA CAESAR COM FRANGO" },
        { code: "008962", name: "SALADA MIX DE FOLHAS COM PROTEÍNAS" }
    ],
    "SALADAS COZIDAS": [
        { code: "008221", name: "CAPONATA DE BERINJELA" },
        { code: "008789", name: "SUNOMONO" },
        { code: "008695", name: "SALADA DE BETERRABA" },
        { code: "008690", name: "SALADA DE BATATA CURTINHA" },
        // Rotisseria
        { code: "093964", name: "ROTISSERIA CUPIM ASSADO AO MOLHO DE ALHO KG" },
        { code: "008484", name: "ROTISSERIA MAMINHA ASSADA BENDITO KG" }
    ],
    "SUSHI": [
        { code: "009124", name: "HOT ROLL" },
        { code: "009119", name: "CALIFÓRNIA" },
        { code: "009123", name: "SUSHI KANI COM CREAM CHEESE" }
    ],
    "POKE / TEMAKI": [
        { code: "009125", name: "POKE DE KANI" },
        { code: "009129", name: "POKE DE SHIMEJI" },
        { code: "009289", name: "TEMAKI HOT SALMÃO GRELHADO" }
    ],
    "MOLHOS / PATÊS / GELEIAS": [
        { code: "008386", name: "GELEIA DE PIMENTA" },
        { code: "008551", name: "PATÊ DE ALHO" },
        { code: "007575", name: "PATÊ DE AZEITONA VERDE" },
        { code: "007576", name: "PATÊ DE GORGONZOLA" },
        { code: "007570", name: "MOLHO PESTO" }
    ]
};

async function deleteCollection(collectionPath, query) {
    const snapshot = await query.get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    if (snapshot.size > 0) {
        await batch.commit();
    }
    return snapshot.size;
}

async function main() {
    console.log('='.repeat(80));
    console.log('LIMPANDO E RECRIANDO CATEGORIAS/RECEITAS UNIFICADAS');
    console.log('='.repeat(80));

    const now = admin.firestore.FieldValue.serverTimestamp();

    // 1. LIMPAR - Deletar categorias com type="produtos"
    console.log('\n🗑️  Limpando categorias antigas em "produtos"...');
    const catQuery = db.collection('CategoryTree').where('type', '==', 'produtos');
    const deletedCats = await deleteCollection('CategoryTree', catQuery);
    console.log(`   Deletadas: ${deletedCats} categorias`);

    // 2. LIMPAR - Deletar receitas com type="produtos"
    console.log('\n🗑️  Limpando receitas antigas em "produtos"...');
    const recQuery = db.collection('recipes').where('type', '==', 'produtos');
    const deletedRecs = await deleteCollection('recipes', recQuery);
    console.log(`   Deletadas: ${deletedRecs} receitas`);

    // 3. CRIAR - Categoria raiz única "PRODUTOS"
    console.log('\n📂 Criando categoria raiz "PRODUTOS"...');
    const produtosRef = await db.collection('CategoryTree').add({
        name: "PRODUTOS",
        type: "produtos",
        level: 1,
        parent_id: null,
        order: 1,
        active: true,
        description: "Produtos para venda",
        createdAt: now,
        updatedAt: now
    });
    console.log(`   ✅ Criada: PRODUTOS (ID: ${produtosRef.id})`);

    // 4. CRIAR - Subcategorias (level 2)
    console.log('\n📂 Criando subcategorias...');
    const categoryIds = {};
    let order = 1;

    for (const catName of SUBCATEGORIAS) {
        const catRef = await db.collection('CategoryTree').add({
            name: catName,
            type: "produtos",
            level: 2,
            parent_id: produtosRef.id,
            order: order++,
            active: true,
            description: "",
            createdAt: now,
            updatedAt: now
        });
        categoryIds[catName] = catRef.id;
        console.log(`   ✅ ${catName}`);
    }

    // 5. CRIAR - Receitas
    console.log('\n🍳 Criando receitas...');
    let totalReceitas = 0;

    for (const [catName, receitas] of Object.entries(RECEITAS_POR_CATEGORIA)) {
        const categoryId = categoryIds[catName];
        console.log(`\n   📁 ${catName}:`);

        for (const receita of receitas) {
            await db.collection('recipes').add({
                code: receita.code,
                name: receita.name,
                category: "PRODUTOS",
                categoryId: produtosRef.id,
                subCategory: catName,
                subCategoryId: categoryId,
                type: "produtos",
                active: true,
                createdAt: now,
                updatedAt: now
            });
            console.log(`      ✅ ${receita.code} – ${receita.name}`);
            totalReceitas++;
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('CRIAÇÃO CONCLUÍDA!');
    console.log(`   📂 Categorias criadas: ${SUBCATEGORIAS.length + 1} (1 raiz + ${SUBCATEGORIAS.length} subcategorias)`);
    console.log(`   🍳 Receitas criadas: ${totalReceitas}`);
    console.log('='.repeat(80));
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erro:', err);
        process.exit(1);
    });
