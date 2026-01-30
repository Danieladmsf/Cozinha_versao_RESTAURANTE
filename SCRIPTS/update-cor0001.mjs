// Script para encontrar e atualizar o registro COR0001
// Execute com: node scripts/update-cor0001.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Dados completos do POP
const popData = {
    nome: 'Corte em Tiras',
    descricao: 'Procedimento padrão para corte de carne em tiras uniformes (5-7cm × 1-1,5cm)',

    // Dados Técnicos
    especificacoes: `<ul>
<li><strong>Tipo de Corte:</strong> Tiras longitudinais</li>
<li><strong>Dimensões:</strong> 5-7 cm de comprimento × 1-1,5 cm de largura × 0,8-1 cm de espessura</li>
<li><strong>Peso Médio por Tira:</strong> 15-25g</li>
<li><strong>Rendimento Estimado:</strong> 85-90% (perda de aparas)</li>
<li><strong>Temperatura da Carne:</strong> Refrigerada (0-4°C) para facilitar o corte</li>
</ul>`,

    // EPIs Necessários
    materiais: `<ul>
<li>Luva de malha de aço (mão que segura a carne)</li>
<li>Avental impermeável</li>
<li>Touca descartável</li>
<li>Calçado antiderrapante fechado</li>
</ul>`,

    // Manutenção
    manutencao: `<ul>
<li>Faca de chef ou de desossa com fio afiado</li>
<li>Afiador de faca disponível no posto de trabalho</li>
<li>Tábua de corte higienizada (verde para carnes ou branca)</li>
<li>Higienizar equipamentos a cada 2 horas de uso contínuo</li>
</ul>`,

    // Precauções de Segurança
    precaucoes: `<ul>
<li><strong>NUNCA</strong> cortar com a faca em direção ao corpo</li>
<li>Manter os dedos da mão de apoio curvados ("garra")</li>
<li>Carne deve estar parcialmente firme (não congelada, não mole demais)</li>
<li>Descartar aparas em recipiente identificado</li>
<li>Lavar as mãos antes e depois do procedimento</li>
</ul>`,

    // Passos do Procedimento
    passos: [
        {
            description: `<p><strong>Preparar a peça de carne</strong></p><p>Retirar a peça da refrigeração. Remover excesso de gordura e nervuras visíveis. Posicionar sobre a tábua de corte higienizada.</p>`,
            imageUrl: ''
        },
        {
            description: `<p><strong>Cortar em fatias transversais</strong></p><p>Com a faca bem afiada, cortar a peça em fatias de aproximadamente 1 cm de espessura, perpendiculares às fibras da carne.</p>`,
            imageUrl: ''
        },
        {
            description: `<p><strong>Subdividir em tiras</strong></p><p>Empilhar 2-3 fatias e cortar longitudinalmente em tiras de 5-7 cm de comprimento por 1-1,5 cm de largura.</p>`,
            imageUrl: ''
        },
        {
            description: `<p><strong>Verificar uniformidade</strong></p><p>Conferir se as tiras estão com dimensões similares para garantir cocção uniforme. Separar peças fora do padrão para reprocessamento.</p>`,
            imageUrl: ''
        },
        {
            description: `<p><strong>Armazenar ou porcionar</strong></p><p>Pesar as porções conforme ficha técnica. Armazenar em recipiente identificado com data, validade e responsável.</p>`,
            imageUrl: ''
        }
    ],

    updatedAt: serverTimestamp()
};

async function findAndUpdate() {
    console.log('🔍 Buscando registro COR0001 na coleção cortes_de_insumos...\n');

    try {
        const colecao = 'cortes_de_insumos';
        const snapshot = await getDocs(collection(db, colecao));

        let docFound = null;
        snapshot.forEach(document => {
            const data = document.data();
            if (data.codigo === 'COR0001') {
                docFound = { id: document.id, ...data };
            }
        });

        if (!docFound) {
            console.log('❌ Registro COR0001 não encontrado!');
            console.log('   Documentos na coleção:');
            snapshot.forEach(d => console.log(`   - ${d.id}: ${d.data().codigo || 'sem código'}`));
            process.exit(1);
        }

        console.log(`✅ Encontrado! ID: ${docFound.id}`);
        console.log(`   Código atual: ${docFound.codigo}`);
        console.log(`   Nome atual: ${docFound.nome || 'VAZIO'}`);
        console.log('\n📝 Atualizando com dados completos...\n');

        // Atualizar o documento
        await updateDoc(doc(db, colecao, docFound.id), popData);

        console.log('✅ Registro atualizado com sucesso!');
        console.log('   ✓ Nome: Corte em Tiras');
        console.log('   ✓ Dados Técnicos: Preenchido');
        console.log('   ✓ EPIs Necessários: Preenchido');
        console.log('   ✓ Manutenção: Preenchido');
        console.log('   ✓ Precauções: Preenchido');
        console.log('   ✓ Passos: 5 passos criados');

    } catch (error) {
        console.error('❌ Erro:', error);
    }

    process.exit(0);
}

findAndUpdate();
