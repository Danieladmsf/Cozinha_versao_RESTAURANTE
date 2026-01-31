const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkCategoriaCards() {
    console.log("🔍 Buscando categorias de POPs...\n");

    // Coleções que podem ter categorias
    const colecoes = ['pop_categorias', 'categorias', 'ferramentas_categorias'];

    for (const colecao of colecoes) {
        try {
            const snapshot = await db.collection(colecao).get();

            if (snapshot.empty) {
                console.log(`📂 Coleção '${colecao}': vazia`);
                continue;
            }

            console.log(`📂 Coleção '${colecao}': ${snapshot.size} documentos\n`);

            for (const doc of snapshot.docs) {
                const data = doc.data();
                console.log(`📋 Categoria: ${data.nome || data.name || doc.id}`);
                console.log(`   ID: ${doc.id}`);

                if (data.cards && Array.isArray(data.cards)) {
                    console.log(`   Cards (${data.cards.length}):`);
                    data.cards.forEach((card, idx) => {
                        console.log(`     ${idx + 1}. ID: "${card.id}" | Título: "${card.titulo}"`);
                    });
                } else {
                    console.log(`   Sem cards definidos`);
                }
                console.log('');
            }
        } catch (error) {
            console.log(`⚠️ Erro na coleção '${colecao}': ${error.message}`);
        }
    }

    console.log("✅ Verificação concluída!");
}

checkCategoriaCards()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Erro:", error);
        process.exit(1);
    });
