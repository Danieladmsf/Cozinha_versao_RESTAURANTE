const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// Dados Técnicos atualizados com Validade
const especificacoesAtualizado = `
<p><strong>Tipo de Corte:</strong> Tiras longitudinais, perpendiculares às fibras</p>
<p><strong>Dimensões Padrão:</strong> 5-7 cm (comprimento) × 1-1,5 cm (largura)</p>
<p><strong>Matéria-Prima:</strong> Peito ou filé de frango sem osso e sem pele</p>
<p><strong>Temperatura Ideal:</strong> 0°C a 4°C (carne refrigerada, mais firme para cortar)</p>
<p><strong>Rendimento:</strong> Aprox. 95% do peso bruto</p>
<p><strong>Validade após corte:</strong></p>
<p>• Refrigerado (0-4°C): 24 a 48 horas</p>
<p>• Congelado (-18°C): até 3 meses</p>
<p>• Descongelado: usar em até 24 horas (não recongelar)</p>
`.trim();

async function atualizarValidade() {
    console.log("🔄 Atualizando Dados Técnicos com Validade...\n");

    const snapshot = await db.collection('cortes_de_insumos')
        .where('codigo', '==', 'COR0002')
        .get();

    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        console.log(`✅ Encontrado: ${doc.data().nome}`);

        await db.collection('cortes_de_insumos').doc(doc.id).update({
            especificacoes: especificacoesAtualizado,
            updatedAt: new Date()
        });

        console.log("✅ Validade adicionada aos Dados Técnicos!");
    } else {
        console.log("❌ POP não encontrado.");
    }
}

atualizarValidade()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Erro:", error);
        process.exit(1);
    });
