const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateUsabilidadeData() {
    console.log("🔄 Buscando documentos com dados de usabilidade no campo antigo...\n");

    // Coleções de POPs que podem ter o campo
    const colecoes = ['ferramentas', 'epi_s', 'pop_epis', 'pop_ferramentas', 'epis'];

    for (const colecao of colecoes) {
        try {
            const snapshot = await db.collection(colecao).get();

            if (snapshot.empty) {
                console.log(`📂 Coleção '${colecao}': vazia ou não existe`);
                continue;
            }

            console.log(`📂 Coleção '${colecao}': ${snapshot.size} documentos`);

            for (const doc of snapshot.docs) {
                const data = doc.data();

                // Verificar se tem conteúdo no campo materiais que parece ser usabilidade
                const materiais = data.materiais || '';
                const usabilidade = data.usabilidade || '';

                // Se materiais contém [OBRIGATÓRIO] ou [RECOMENDADO], provavelmente é usabilidade
                const isUsabilidadeContent = materiais.includes('[OBRIGATÓRIO]') || materiais.includes('[RECOMENDADO]');

                if (isUsabilidadeContent && !usabilidade) {
                    console.log(`\n✅ Documento encontrado: ${doc.id}`);
                    console.log(`   Nome: ${data.nome || 'sem nome'}`);
                    console.log(`   Código: ${data.codigo || 'sem código'}`);
                    console.log(`   Conteúdo materiais (primeiros 100 chars): ${materiais.substring(0, 100)}...`);

                    // Migrar: mover materiais para usabilidade
                    await db.collection(colecao).doc(doc.id).update({
                        usabilidade: materiais,  // Mover conteúdo para usabilidade
                        materiais: ''            // Limpar o campo antigo
                    });

                    console.log(`   ✅ Migrado: materiais → usabilidade`);
                }
            }
        } catch (error) {
            console.log(`⚠️ Erro na coleção '${colecao}': ${error.message}`);
        }
    }

    console.log("\n✅ Migração concluída!");
}

migrateUsabilidadeData()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Erro:", error);
        process.exit(1);
    });
