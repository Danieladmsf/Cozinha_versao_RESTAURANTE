// Script para ATUALIZAR o POP COR0001 - Tiras de Carne Bovina
// Execute com: node SCRIPTS/seed-pop-corte-tiras.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';

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

// Dados COMPLETOS do POP
const popData = {
    codigo: 'COR0001',
    nome: 'Tiras de Carne Bovina',
    descricao: 'Procedimento operacional padrão para o corte de carne bovina em tiras uniformes, garantindo qualidade e padronização no preparo de pratos como strogonoff, yakisoba e grelhados.',

    // Dados Técnicos
    especificacoes: `<ul>
        <li><strong>Tipo de Corte:</strong> Tiras longitudinais, perpendiculares às fibras</li>
        <li><strong>Dimensões Padrão:</strong> 5-7 cm (comprimento) × 1-1,5 cm (largura) × 0,8-1 cm (espessura)</li>
        <li><strong>Peso Médio por Tira:</strong> 15-25g</li>
        <li><strong>Rendimento Estimado:</strong> 85-90% (perda de aparas e gordura)</li>
        <li><strong>Temperatura da Carne:</strong> Refrigerada entre 0-4°C (facilita o corte preciso)</li>
        <li><strong>Cortes Indicados:</strong> Alcatra, patinho, coxão mole, contrafilé</li>
        <li><strong>Validade Após Corte:</strong> 48h sob refrigeração (0-4°C) ou 90 dias congelado (-18°C)</li>
    </ul>`,

    // EPIs Necessários (com códigos para cadastro futuro)
    materiais: `<ul>
        <li><strong style="color: #dc2626">[EPI001]</strong> Luva de Malha de Aço — <em>OBRIGATÓRIO na mão que segura a carne</em></li>
        <li><strong>[EPI002]</strong> Avental Impermeável — PVC ou descartável</li>
        <li><strong>[EPI003]</strong> Touca Descartável — cobrindo todo o cabelo</li>
        <li><strong>[EPI004]</strong> Calçado Antiderrapante — bota de borracha ou sapato de segurança fechado</li>
        <li><strong>[EPI005]</strong> Máscara Descartável — quando necessário</li>
    </ul>`,

    // Materiais e Equipamentos (com códigos para cadastro futuro)
    manutencao: `<ul>
        <li><strong>[FER001]</strong> Faca de Chef (20-25cm) — ou de desossa, sempre bem afiada</li>
        <li><strong>[FER002]</strong> Chaira de Aço — afiador disponível no posto de trabalho</li>
        <li><strong>[FER003]</strong> Tábua de Corte — polietileno verde (carnes) ou branca, higienizada</li>
        <li><strong>[FER004]</strong> Recipiente GN Inox — para armazenamento e transporte</li>
        <li><strong>[FER005]</strong> Balança Digital — para conferência de porções</li>
    </ul>
    <p style="font-size: 0.85em; color: #6b7280; margin-top: 8px;">⚠️ Higienizar equipamentos a cada 2 horas de uso contínuo</p>`,

    // Precauções de Segurança
    precaucoes: `<ul>
        <li><strong style="color: #dc2626">NUNCA</strong> direcionar a faca em direção ao corpo durante o corte</li>
        <li><strong style="color: #dc2626">SEMPRE</strong> manter os dedos da mão de apoio curvados em formato de "garra"</li>
        <li>A carne deve estar parcialmente firme (refrigerada, não congelada nem mole demais)</li>
        <li>Descartar aparas imediatamente em recipiente identificado ("DESCARTE")</li>
        <li>Lavar e desinfetar as mãos antes, durante (ao trocar de tarefa) e após o procedimento</li>
        <li>Não conversar, tossir ou espirrar sobre os alimentos</li>
        <li>Reportar imediatamente qualquer acidente ou corte ao supervisor</li>
    </ul>`,

    // Passos do Procedimento (atualizado conforme categoria Cortes de insumos)
    passos: [
        {
            titulo: 'Preparar a Estação de Trabalho',
            description: `<p><strong>Preparar a estação de trabalho</strong></p>
<p>Higienizar a bancada e tábua de corte com solução clorada. Verificar se a faca está devidamente afiada. Vestir todos os EPIs obrigatórios antes de iniciar.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Preparar a Peça de Carne',
            description: `<p><strong>Preparar a peça de carne</strong></p>
<p>Retirar a peça da refrigeração (temperatura 0-4°C). Remover excesso de gordura externa e nervuras visíveis com a faca. Posicionar a peça sobre a tábua de corte, com as fibras da carne visíveis.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Cortar em Fatias',
            description: `<p><strong>Cortar em fatias transversais</strong></p>
<p>Com a faca bem afiada, cortar a peça em fatias de aproximadamente <strong>1 cm de espessura</strong>, realizando o corte <strong>perpendicular às fibras da carne</strong>. Isso garante maciez no produto final.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Subdividir em Tiras',
            description: `<p><strong>Subdividir em tiras uniformes</strong></p>
<p>Empilhar 2-3 fatias e cortar longitudinalmente em tiras de <strong>5-7 cm de comprimento × 1-1,5 cm de largura</strong>. Manter movimentos firmes e uniformes.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Verificar Uniformidade',
            description: `<p><strong>Verificar uniformidade das tiras</strong></p>
<p>Conferir visualmente se as tiras estão com dimensões similares para garantir cocção uniforme. Separar peças fora do padrão para reprocessamento ou uso em preparações diferentes (como carne moída).</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Pesar e Porcionar',
            description: `<p><strong>Pesar e porcionar conforme ficha técnica</strong></p>
<p>Utilizar balança digital para pesar as porções de acordo com a ficha técnica do prato destino. Registrar o peso para controle de rendimento.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Armazenar Corretamente',
            description: `<p><strong>Armazenar ou destinar imediatamente</strong></p>
<p>Acondicionar em recipiente GN inox ou plástico identificado com: <strong>produto, data de corte, validade e responsável</strong>. Manter sob refrigeração (0-4°C) ou congelar imediatamente (-18°C) se não for utilizar em 48h.</p>`,
            imageUrl: ''
        }
    ],

    updatedAt: serverTimestamp()
};

async function updatePOP() {
    console.log('🔍 Buscando POP COR0001 para atualizar...\n');

    try {
        // A coleção corresponde à categoria "Cortes de insumos"
        const colecao = 'cortes_de_insumos';

        // Buscar o documento pelo código
        const q = query(collection(db, colecao), where('codigo', '==', 'COR0001'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('❌ POP COR0001 não encontrado na coleção:', colecao);
            console.log('   Verifique se o POP existe ou se a coleção está correta.');
            process.exit(1);
        }

        // Atualizar o documento encontrado
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, popData);

        console.log('✅ POP atualizado com sucesso!');
        console.log(`   ID do documento: ${docRef.id}`);
        console.log(`   Coleção: ${colecao}`);
        console.log(`   Código: ${popData.codigo}`);
        console.log(`   Nome: ${popData.nome}`);
        console.log(`   Passos: ${popData.passos.length}`);
        console.log('\n📋 Campos atualizados:');
        console.log('   ✓ especificacoes (Dados Técnicos)');
        console.log('   ✓ materiais (EPIs Necessários)');
        console.log('   ✓ manutencao (Materiais e Equipamentos)');
        console.log('   ✓ precaucoes (Precauções de Segurança)');
        console.log('   ✓ passos (7 etapas do procedimento)');

    } catch (error) {
        console.error('❌ Erro ao atualizar POP:', error);
    }

    process.exit(0);
}

updatePOP();
