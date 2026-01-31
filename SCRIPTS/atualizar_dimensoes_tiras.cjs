const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// Dados Técnicos - TIRAS DE FRANGO
const especificacoesFrango = `
<p><strong>Tipo de Corte:</strong> Tiras longitudinais, perpendiculares às fibras</p>
<p><strong>Dimensões Padrão:</strong> 5-6 cm (comprimento) × 1,5 cm (largura) × 1,5-2 cm (espessura)</p>
<p><strong>Peso por Isca:</strong> ~14g (7 iscas = 100g)</p>
<p><strong>Matéria-Prima:</strong> Peito ou filé de frango sem osso e sem pele</p>
<p><strong>Temperatura Ideal:</strong> 0°C a 4°C (carne refrigerada, mais firme para cortar)</p>
<p><strong>Rendimento:</strong> Aprox. 95% do peso bruto</p>
<p><strong>Validade após corte:</strong></p>
<p>• Refrigerado (0-4°C): 24 a 48 horas</p>
<p>• Congelado (-18°C): até 3 meses</p>
<p>• Descongelado: usar em até 24 horas (não recongelar)</p>
`.trim();

// Dados Técnicos - TIRAS DE CARNE BOVINA
const especificacoesCarne = `
<p><strong>Tipo de Corte:</strong> Tiras longitudinais, perpendiculares às fibras</p>
<p><strong>Dimensões Padrão:</strong> 5-6 cm (comprimento) × 1,5 cm (largura) × 1,5-2 cm (espessura)</p>
<p><strong>Peso por Isca:</strong> ~14g (7 iscas = 100g)</p>
<p><strong>Matéria-Prima:</strong> Alcatra, maminha, patinho ou coxão mole</p>
<p><strong>Temperatura Ideal:</strong> 0°C a 4°C (carne refrigerada, mais firme para cortar)</p>
<p><strong>Rendimento:</strong> Aprox. 85-90% do peso bruto (depende do corte)</p>
<p><strong>Validade após corte:</strong></p>
<p>• Refrigerado (0-4°C): 48 a 72 horas</p>
<p>• Congelado (-18°C): até 4 meses</p>
<p>• Descongelado: usar em até 24 horas (não recongelar)</p>
`.trim();

async function atualizarDimensoes() {
    console.log("🔄 Atualizando dimensões dos POPs...\n");

    // Atualizar TIRAS DE FRANGO (COR0002)
    let snapshot = await db.collection('cortes_de_insumos')
        .where('codigo', '==', 'COR0002')
        .get();

    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await db.collection('cortes_de_insumos').doc(doc.id).update({
            especificacoes: especificacoesFrango,
            updatedAt: new Date()
        });
        console.log("✅ TIRAS DE FRANGO (COR0002) atualizado!");
        console.log("   • Dimensões: 5-6cm × 1,5cm × 1,5-2cm");
        console.log("   • Peso: ~14g/isca (7 iscas = 100g)\n");
    }

    // Atualizar TIRAS DE CARNE BOVINA (COR0001)
    snapshot = await db.collection('cortes_de_insumos')
        .where('codigo', '==', 'COR0001')
        .get();

    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await db.collection('cortes_de_insumos').doc(doc.id).update({
            especificacoes: especificacoesCarne,
            updatedAt: new Date()
        });
        console.log("✅ TIRAS DE CARNE BOVINA (COR0001) atualizado!");
        console.log("   • Dimensões: 5-6cm × 1,5cm × 1,5-2cm");
        console.log("   • Peso: ~14g/isca (7 iscas = 100g)\n");
    }

    console.log("✅ Dimensões padronizadas para ambos os POPs!");
}

atualizarDimensoes()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Erro:", error);
        process.exit(1);
    });
