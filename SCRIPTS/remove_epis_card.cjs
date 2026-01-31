const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function removeEpisCard() {
    console.log("🔄 Removendo card 'EPIs Necessários' da categoria EPI's...\n");

    const docRef = db.collection('pop_categorias').doc('epi_s');
    const doc = await docRef.get();

    if (!doc.exists) {
        console.log("❌ Categoria epi_s não encontrada");
        return;
    }

    const data = doc.data();
    console.log(`📋 Categoria: ${data.nome}`);
    console.log(`   Cards antes: ${data.cards.length}`);

    // Filtrar para remover o card 'epis' (EPIs Necessários)
    const newCards = data.cards.filter(card => card.id !== 'epis');

    console.log(`   Cards depois: ${newCards.length}`);
    console.log(`   Removido: card com id 'epis' (EPIs Necessários)`);

    await docRef.update({ cards: newCards });

    console.log("\n✅ Card removido com sucesso! Recarregue a página.");
}

removeEpisCard()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Erro:", error);
        process.exit(1);
    });
