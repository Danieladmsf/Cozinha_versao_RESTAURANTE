/**
 * Script de migração ONE-TIME para inserir categorias no Firebase
 * Este script deve ser executado apenas UMA VEZ para popular o banco de dados
 * Após execução, os arquivos seed-categories e rebuild-categories podem ser deletados
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '..', 'cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Estrutura mercadológica completa
const ESTRUTURA_MERCADOLOGICA = {
    "003": {
        name: "PROCESSADOS FLV",
        children: {
            "001": {
                name: "PROCESSADOS",
                children: {
                    "001": { name: "FRUTAS PROCESSADAS" },
                    "002": { name: "LEGUMES PROCESSADAS" },
                    "003": { name: "BEBIDAS PROCESSADAS" }
                }
            }
        }
    },
    "014": {
        name: "PADARIA E INDUSTRIALIZADOS",
        children: {
            "001": {
                name: "PRODUCAO",
                children: {
                    "001": { name: "PRODUCAO PADARIA" },
                    "002": { name: "BOLOS PRODUCAO" },
                    "003": { name: "BISCOITO DE POLVILHO" },
                    "004": { name: "BISCOITOS ARTESANAIS TERC." },
                    "005": { name: "DOCES PRODUCAO" },
                    "006": { name: "BROAS PRODUCAO" },
                    "007": { name: "SALGADOS PRODUCAO" },
                    "008": { name: "ROSCAS" },
                    "009": { name: "TORTAS" },
                    "010": { name: "TORRADAS PRODUCAO" },
                    "011": { name: "SANDUICHES E LANCHES" },
                    "012": { name: "QUEBRA PRODUCAO" },
                    "013": { name: "MASSA CONG" },
                    "014": { name: "PAES PRODUCAO" },
                    "015": { name: "PANETTONE E COLOMBA" }
                }
            }
        }
    },
    "017": {
        name: "ROTISSERIA",
        children: {
            "001": {
                name: "PRODUCAO - ROTISSERIA",
                children: {
                    "001": { name: "RESTAURANTE" },
                    "002": { name: "REFEICAO" },
                    "003": { name: "INSUMOS ROTISSERIA" },
                    "004": { name: "ALIMENTOS FAB. PROPRIA" },
                    "005": { name: "LANCHONETE" }
                }
            }
        }
    }
};

const TYPE = "receitas_-_base"; // Tipo para aba "Produtos"

async function migrateCategories() {
    console.log('🔄 Iniciando migração de categorias para Firebase...\n');

    // Verificar se já existem categorias
    const existingSnapshot = await db.collection('CategoryTree').get();
    if (existingSnapshot.size > 0) {
        console.log(`⚠️  Já existem ${existingSnapshot.size} categorias no banco de dados.`);
        console.log('   Para evitar duplicações, delete as categorias existentes primeiro.');
        console.log('   Ou execute este script apenas se o banco estiver vazio.\n');

        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

        const answer = await new Promise(resolve => {
            rl.question('Deseja continuar mesmo assim? (s/n): ', resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 's') {
            console.log('❌ Migração cancelada pelo usuário.');
            process.exit(0);
        }
    }

    const results = [];
    let order = 1;

    // Criar categorias hierarquicamente
    for (const [mainCode, mainCat] of Object.entries(ESTRUTURA_MERCADOLOGICA)) {
        // Nível 1 - Categoria principal
        const level1Doc = await db.collection('CategoryTree').add({
            code: mainCode,
            name: mainCat.name,
            type: TYPE,
            level: 1,
            order: order++,
            parent_id: null,
            active: true,
            created_at: new Date().toISOString()
        });

        console.log(`✅ [L1] ${mainCat.name} (${level1Doc.id})`);
        results.push({ level: 1, name: mainCat.name, id: level1Doc.id });

        // Nível 2 - Subcategorias
        if (mainCat.children) {
            let subOrder = 1;
            for (const [subCode, subCat] of Object.entries(mainCat.children)) {
                const fullSubCode = `${mainCode}.${subCode}`;

                const level2Doc = await db.collection('CategoryTree').add({
                    code: fullSubCode,
                    name: subCat.name,
                    type: TYPE,
                    level: 2,
                    order: subOrder++,
                    parent_id: level1Doc.id,
                    active: true,
                    created_at: new Date().toISOString()
                });

                console.log(`   ✅ [L2] ${subCat.name} (${level2Doc.id})`);
                results.push({ level: 2, name: subCat.name, id: level2Doc.id, parent: level1Doc.id });

                // Nível 3 - Sub-subcategorias
                if (subCat.children) {
                    let itemOrder = 1;
                    for (const [itemCode, itemCat] of Object.entries(subCat.children)) {
                        const fullItemCode = `${fullSubCode}.${itemCode}`;

                        const level3Doc = await db.collection('CategoryTree').add({
                            code: fullItemCode,
                            name: itemCat.name,
                            type: TYPE,
                            level: 3,
                            order: itemOrder++,
                            parent_id: level2Doc.id,
                            active: true,
                            created_at: new Date().toISOString()
                        });

                        console.log(`      ✅ [L3] ${itemCat.name} (${level3Doc.id})`);
                        results.push({ level: 3, name: itemCat.name, id: level3Doc.id, parent: level2Doc.id });
                    }
                }
            }
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`🎉 Migração concluída! ${results.length} categorias criadas.`);
    console.log('='.repeat(50));

    // Resumo por nível
    const level1 = results.filter(r => r.level === 1).length;
    const level2 = results.filter(r => r.level === 2).length;
    const level3 = results.filter(r => r.level === 3).length;

    console.log(`\n📊 Resumo:`);
    console.log(`   - Categorias (Nível 1): ${level1}`);
    console.log(`   - Subcategorias (Nível 2): ${level2}`);
    console.log(`   - Sub-subcategorias (Nível 3): ${level3}`);
    console.log(`   - Total: ${results.length}`);

    console.log('\n✨ Os arquivos seed-categories e rebuild-categories podem ser deletados agora.');

    process.exit(0);
}

migrateCategories().catch(error => {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
});
