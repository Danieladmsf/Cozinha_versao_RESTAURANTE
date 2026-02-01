/**
 * Script para criar subcategorias em "produtos" e registrar receitas
 * Execução: node SCRIPTS/seed_produtos_receitas.cjs
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

// Estrutura de dados
const CATEGORIAS_PRODUTOS = [
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
        { code: "007660", name: "REFEIÇÃO FEIJOADA" }
    ],
    "MACARRÃO / MASSAS": [
        { code: "008480", name: "MACARRONADA À BOLONHESA" },
        { code: "093626", name: "MACARRÃO COM BRÓCOLIS E BACON" },
        { code: "008442", name: "MACARRÃO COM CALABRESA AO MOLHO ROSÉ" },
        { code: "008321", name: "ESPAGUETE À BOLONHESA + POLPETONE" },
        { code: "008900", name: "YAKISSOBA" },
        { code: "008400", name: "LASANHA À BOLONHESA" },
        { code: "006960", name: "NHOQUE AO MOLHO SUGO" },
        { code: "008663", name: "RONDELE FRANGO COM REQUEIJÃO" }
    ],
    "MONO ARROZ": [
        { code: "008028", name: "ARROZ BRANCO" }
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
        { code: "008804", name: "SOBRECOXA RECHEADA" }
    ],
    "SALADAS PROTEICAS": [
        { code: "008963", name: "SALADA CAESAR COM FRANGO" },
        { code: "008962", name: "SALADA MIX DE FOLHAS COM PROTEÍNAS" }
    ],
    "SALADAS COZIDAS": [
        { code: "008221", name: "CAPONATA DE BERINJELA" },
        { code: "008789", name: "SUNOMONO" },
        { code: "008695", name: "SALADA DE BETERRABA" },
        { code: "008690", name: "SALADA DE BATATA CURTINHA" }
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

// ROTISSERIA - EXTRA (segundo bloco)
const CATEGORIAS_ROTISSERIA = [
    "MARMITA 3 DIVISÓRIAS",
    "MACARRÃO",
    "MONO ARROZ",
    "MONO PROTEÍNAS",
    "SALADAS COZIDAS"
];

const RECEITAS_ROTISSERIA = {
    "MARMITA 3 DIVISÓRIAS": [
        { code: "008480", name: "ROTISSERIA MACARRONADA À BOLONHESA BENDITO KG" },
        { code: "008321", name: "ESPAGUETE À BOLONHESA + POLPETONE RECHEADO" },
        { code: "008400", name: "ROTISSERIA LASANHA À BOLONHESA BENDITO KG" }
    ],
    "MACARRÃO": [
        { code: "008037", name: "ROTISSERIA ARROZ CARRETEIRO BENDITO KG" },
        { code: "008023", name: "ROTISSERIA ARROZ À GREGA BENDITO KG" }
    ],
    "MONO ARROZ": [
        { code: "006857", name: "ROTISSERIA MAIONESE DE LEGUMES COM FRANGO" }
    ],
    "MONO PROTEÍNAS": [
        { code: "093583", name: "ASSADO DE FRANGO BENDITO INTEIRO" }
    ],
    "SALADAS COZIDAS": [
        { code: "093964", name: "ROTISSERIA CUPIM ASSADO AO MOLHO DE ALHO KG" },
        { code: "008484", name: "ROTISSERIA MAMINHA ASSADA BENDITO KG" }
    ]
};

async function main() {
    console.log('='.repeat(80));
    console.log('CRIANDO CATEGORIAS E RECEITAS EM PRODUTOS');
    console.log('='.repeat(80));

    const now = admin.firestore.FieldValue.serverTimestamp();
    const categoryIds = {};

    // 1. Criar categoria raiz "PRODUTOS PRINCIPAIS" em produtos
    console.log('\n📂 Criando categoria raiz "PRODUTOS PRINCIPAIS"...');
    const produtosPrincipaisRef = await db.collection('CategoryTree').add({
        name: "PRODUTOS PRINCIPAIS",
        type: "produtos",
        level: 1,
        parent_id: null,
        order: 1,
        active: true,
        description: "Produtos principais para venda",
        createdAt: now,
        updatedAt: now
    });
    console.log(`   ✅ Criada: PRODUTOS PRINCIPAIS (ID: ${produtosPrincipaisRef.id})`);

    // 2. Criar subcategorias (level 2) dentro de PRODUTOS PRINCIPAIS
    console.log('\n📂 Criando subcategorias em PRODUTOS PRINCIPAIS...');
    let order = 1;
    for (const catName of CATEGORIAS_PRODUTOS) {
        const catRef = await db.collection('CategoryTree').add({
            name: catName,
            type: "produtos",
            level: 2,
            parent_id: produtosPrincipaisRef.id,
            order: order++,
            active: true,
            description: "",
            createdAt: now,
            updatedAt: now
        });
        categoryIds[catName] = catRef.id;
        console.log(`   ✅ Criada: ${catName} (ID: ${catRef.id})`);
    }

    // 3. Criar categoria raiz "ROTISSERIA - EXTRA" em produtos
    console.log('\n📂 Criando categoria raiz "ROTISSERIA - EXTRA"...');
    const rotisseriaRef = await db.collection('CategoryTree').add({
        name: "ROTISSERIA - EXTRA",
        type: "produtos",
        level: 1,
        parent_id: null,
        order: 2,
        active: true,
        description: "Produtos de rotisseria para venda externa",
        createdAt: now,
        updatedAt: now
    });
    console.log(`   ✅ Criada: ROTISSERIA - EXTRA (ID: ${rotisseriaRef.id})`);

    // 4. Criar subcategorias de ROTISSERIA - EXTRA (level 2)
    console.log('\n📂 Criando subcategorias em ROTISSERIA - EXTRA...');
    order = 1;
    for (const catName of CATEGORIAS_ROTISSERIA) {
        const rotCatName = `ROT_${catName}`;
        const catRef = await db.collection('CategoryTree').add({
            name: catName,
            type: "produtos",
            level: 2,
            parent_id: rotisseriaRef.id,
            order: order++,
            active: true,
            description: "",
            createdAt: now,
            updatedAt: now
        });
        categoryIds[rotCatName] = catRef.id;
        console.log(`   ✅ Criada: ${catName} (ID: ${catRef.id})`);
    }

    // 5. Criar receitas do primeiro bloco (PRODUTOS PRINCIPAIS)
    console.log('\n🍳 Criando receitas em PRODUTOS PRINCIPAIS...');
    let totalReceitas = 0;
    for (const [catName, receitas] of Object.entries(RECEITAS_POR_CATEGORIA)) {
        const categoryId = categoryIds[catName];
        console.log(`\n   📁 ${catName}:`);
        for (const receita of receitas) {
            await db.collection('recipes').add({
                code: receita.code,
                name: receita.name,
                category: "PRODUTOS PRINCIPAIS",
                categoryId: produtosPrincipaisRef.id,
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

    // 6. Criar receitas do segundo bloco (ROTISSERIA - EXTRA)
    console.log('\n🍳 Criando receitas em ROTISSERIA - EXTRA...');
    for (const [catName, receitas] of Object.entries(RECEITAS_ROTISSERIA)) {
        const rotCatName = `ROT_${catName}`;
        const categoryId = categoryIds[rotCatName];
        console.log(`\n   📁 ${catName}:`);
        for (const receita of receitas) {
            await db.collection('recipes').add({
                code: receita.code,
                name: receita.name,
                category: "ROTISSERIA - EXTRA",
                categoryId: rotisseriaRef.id,
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
    console.log(`   📂 Categorias criadas: ${Object.keys(categoryIds).length + 2}`);
    console.log(`   🍳 Receitas criadas: ${totalReceitas}`);
    console.log('='.repeat(80));
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erro:', err);
        process.exit(1);
    });
