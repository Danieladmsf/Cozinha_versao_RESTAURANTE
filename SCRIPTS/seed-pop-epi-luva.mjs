// Script para criar/atualizar o POP EPI0001 - Luva de Malha de Aço
// Execute com: node SCRIPTS/seed-pop-epi-luva.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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

// Dados COMPLETOS do POP - Luva de Malha de Aço
const popData = {
    codigo: 'EPI0001',
    nome: 'Luva de Malha de Aço',
    descricao: 'Equipamento de proteção individual obrigatório para manipulação de facas e objetos cortantes. Protege contra cortes acidentais durante o preparo de alimentos.',

    // Dados Técnicos
    especificacoes: `<ul>
        <li><strong>Material:</strong> Malha de aço inoxidável AISI 304</li>
        <li><strong>Resistência:</strong> Nível 5 (EN 388) - máxima proteção contra corte</li>
        <li><strong>Tamanhos Disponíveis:</strong> P, M, G, GG (verificar numeração)</li>
        <li><strong>Mão de Uso:</strong> Sempre na mão que segura o alimento (oposta à faca)</li>
        <li><strong>Peso Médio:</strong> 150-200g por unidade</li>
        <li><strong>Cor:</strong> Prata (aço) ou com punho colorido para identificação</li>
        <li><strong>Punho:</strong> Ajustável com tira de velcro ou gancho de pressão</li>
        <li><strong>Vida Útil:</strong> 2-5 anos conforme uso e manutenção</li>
    </ul>`,

    // Indicações de Uso
    materiais: `<ul>
        <li><strong style="color: #dc2626">[OBRIGATÓRIO]</strong> Corte de carnes (bovinas, suínas, aves, peixes)</li>
        <li><strong>[OBRIGATÓRIO]</strong> Desossa de peças de carne</li>
        <li><strong>[OBRIGATÓRIO]</strong> Fatiamento em máquina de frios</li>
        <li><strong>[RECOMENDADO]</strong> Corte de vegetais duros (abóbora, mandioca)</li>
        <li><strong>[RECOMENDADO]</strong> Abertura de ostras e frutos do mar</li>
        <li><strong>[DISPENSÁVEL]</strong> Corte de vegetais macios (tomate, alface)</li>
    </ul>`,

    // Manutenção e Higienização
    manutencao: `<ul>
        <li><strong>[FER006]</strong> Escova de Cerdas Duras — para limpeza entre as malhas</li>
        <li><strong>[FER007]</strong> Detergente Neutro — para remoção de gordura</li>
        <li><strong>[FER008]</strong> Solução Sanitizante — quaternário de amônio 200ppm</li>
    </ul>
    <p style="margin-top: 10px;"><strong>Procedimento de Higienização:</strong></p>
    <ul>
        <li>1. Enxaguar em água corrente para remover resíduos grosseiros</li>
        <li>2. Escovar com detergente neutro em todas as direções</li>
        <li>3. Enxaguar abundantemente</li>
        <li>4. Imergir em solução sanitizante por 2 minutos</li>
        <li>5. Secar pendurada em local ventilado</li>
    </ul>
    <p style="font-size: 0.85em; color: #6b7280; margin-top: 8px;">⚠️ Higienizar ANTES e APÓS cada uso. Nunca guardar molhada.</p>`,

    // Precauções de Segurança
    precaucoes: `<ul>
        <li><strong style="color: #dc2626">NÃO</strong> é à prova de perfuração — pontas de faca ainda podem penetrar</li>
        <li><strong style="color: #dc2626">NÃO</strong> usar luva danificada, com elos soltos ou furos</li>
        <li><strong style="color: #dc2626">NÃO</strong> usar tamanho incorreto — a luva deve estar justa mas confortável</li>
        <li><strong style="color: #dc2626">NÃO</strong> expor a altas temperaturas (frituras, grelhas, fornos)</li>
        <li><strong>SEMPRE</strong> inspecionar antes do uso — verificar elos e costuras</li>
        <li><strong>SEMPRE</strong> trocar imediatamente se identificar ferrugem, elos quebrados ou deformações</li>
        <li><strong>SEMPRE</strong> usar luva de látex/nitrilo POR BAIXO para maior higiene (opcional)</li>
    </ul>
    <p style="color: #dc2626; font-weight: bold; margin-top: 10px;">⚠️ A luva protege contra CORTES, não contra PERFURAÇÕES ou CALOR!</p>`,

    // Passos do Procedimento (Como Usar)
    passos: [
        {
            titulo: 'Verificar Condições da Luva',
            description: `<p><strong>Inspecionar a luva antes do uso</strong></p>
<p>Verificar se não há elos soltos, furos, ferrugem ou deformações na malha. Confirmar que o punho de ajuste está funcional. Luvas danificadas devem ser descartadas imediatamente.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Higienizar as Mãos',
            description: `<p><strong>Lavar e secar as mãos</strong></p>
<p>Lavar as mãos com água e sabão por pelo menos 20 segundos. Secar completamente. Opcionalmente, vestir luva de látex ou nitrilo antes da luva de aço para maior conforto e higiene.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Vestir a Luva Corretamente',
            description: `<p><strong>Colocar na mão oposta à faca</strong></p>
<p>Inserir a mão na luva com os dedos bem posicionados. A luva deve ficar <strong>justa mas confortável</strong>, sem apertar demais nem ficar folgada. Ajustar o punho com o velcro ou gancho.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Posicionar a Mão Durante o Corte',
            description: `<p><strong>Usar a técnica correta de corte</strong></p>
<p>A mão com luva deve segurar o alimento em formato de "garra" (dedos curvados para dentro). A faca sempre se movimenta na mão sem luva. Manter os dedos afastados da lâmina.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Higienizar Após o Uso',
            description: `<p><strong>Limpar e sanitizar a luva</strong></p>
<p>Enxaguar, escovar com detergente, enxaguar novamente e imergir em solução sanitizante por 2 minutos. Pendurar para secar em local ventilado. Nunca guardar molhada ou em recipiente fechado.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Armazenar Corretamente',
            description: `<p><strong>Guardar em local apropriado</strong></p>
<p>Após completamente seca, armazenar em local limpo, seco e arejado. Pode ser pendurada em gancho próprio ou guardada em recipiente ventilado. Identificar com nome do responsável se for de uso pessoal.</p>`,
            imageUrl: ''
        }
    ],

    updatedAt: serverTimestamp()
};

async function seedPOP() {
    console.log('🧤 Buscando/Criando POP EPI0001 - Luva de Malha de Aço...\n');

    try {
        // A coleção será "epis" (precisa existir a categoria no Firebase)
        const colecao = 'epis';

        // Verificar se o POP já existe
        const q = query(collection(db, colecao), where('codigo', '==', 'EPI0001'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // Criar novo documento
            console.log('📄 POP não encontrado. Criando novo...');
            const docRef = await addDoc(collection(db, colecao), {
                ...popData,
                createdAt: serverTimestamp()
            });
            console.log('✅ POP criado com sucesso!');
            console.log(`   ID do documento: ${docRef.id}`);
        } else {
            // Atualizar documento existente
            const docRef = querySnapshot.docs[0].ref;
            await updateDoc(docRef, popData);
            console.log('✅ POP atualizado com sucesso!');
            console.log(`   ID do documento: ${docRef.id}`);
        }

        console.log(`   Coleção: ${colecao}`);
        console.log(`   Código: ${popData.codigo}`);
        console.log(`   Nome: ${popData.nome}`);
        console.log(`   Passos: ${popData.passos.length}`);
        console.log('\n📋 Campos preenchidos:');
        console.log('   ✓ especificacoes (Dados Técnicos)');
        console.log('   ✓ materiais (Indicações de Uso)');
        console.log('   ✓ manutencao (Manutenção e Higienização)');
        console.log('   ✓ precaucoes (Precauções de Segurança)');
        console.log('   ✓ passos (6 etapas do procedimento)');

    } catch (error) {
        console.error('❌ Erro:', error);
    }

    process.exit(0);
}

seedPOP();
