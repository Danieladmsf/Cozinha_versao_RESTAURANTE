// Script para preencher o POP EPI0001 na coleção CORRETA (epi_s)
// Execute com: node SCRIPTS/fill-epi-correct.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';

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
    codigo: 'EPI0001',
    nome: 'Luva de Malha de Aço',
    descricao: 'Equipamento de proteção individual obrigatório para manipulação de facas e objetos cortantes. Protege contra cortes acidentais durante o preparo de alimentos.',

    especificacoes: `<ul>
        <li><strong>Material:</strong> Malha de aço inoxidável AISI 304</li>
        <li><strong>Resistência:</strong> Nível 5 (EN 388) - máxima proteção contra corte</li>
        <li><strong>Tamanhos Disponíveis:</strong> P, M, G, GG</li>
        <li><strong>Mão de Uso:</strong> Sempre na mão que segura o alimento (oposta à faca)</li>
        <li><strong>Peso Médio:</strong> 150-200g por unidade</li>
        <li><strong>Punho:</strong> Ajustável com velcro ou gancho de pressão</li>
        <li><strong>Vida Útil:</strong> 2-5 anos conforme uso e manutenção</li>
    </ul>`,

    materiais: `<ul>
        <li><strong style="color: #dc2626">[OBRIGATÓRIO]</strong> Corte de carnes (bovinas, suínas, aves, peixes)</li>
        <li><strong>[OBRIGATÓRIO]</strong> Desossa de peças de carne</li>
        <li><strong>[OBRIGATÓRIO]</strong> Fatiamento em máquina de frios</li>
        <li><strong>[RECOMENDADO]</strong> Corte de vegetais duros (abóbora, mandioca)</li>
        <li><strong>[RECOMENDADO]</strong> Abertura de ostras e frutos do mar</li>
    </ul>`,

    manutencao: `<ul>
        <li><strong>[FER006]</strong> Escova de Cerdas Duras — para limpeza entre as malhas</li>
        <li><strong>[FER007]</strong> Detergente Neutro — para remoção de gordura</li>
        <li><strong>[FER008]</strong> Solução Sanitizante — quaternário de amônio 200ppm</li>
    </ul>
    <p style="margin-top: 10px;"><strong>Procedimento de Higienização:</strong></p>
    <ul>
        <li>1. Enxaguar em água corrente</li>
        <li>2. Escovar com detergente neutro</li>
        <li>3. Enxaguar abundantemente</li>
        <li>4. Imergir em solução sanitizante por 2 min</li>
        <li>5. Secar pendurada em local ventilado</li>
    </ul>`,

    precaucoes: `<ul>
        <li><strong style="color: #dc2626">NÃO</strong> é à prova de perfuração — pontas de faca podem penetrar</li>
        <li><strong style="color: #dc2626">NÃO</strong> usar luva danificada ou com elos soltos</li>
        <li><strong style="color: #dc2626">NÃO</strong> usar tamanho incorreto</li>
        <li><strong style="color: #dc2626">NÃO</strong> expor a altas temperaturas</li>
        <li><strong>SEMPRE</strong> inspecionar antes do uso</li>
        <li><strong>SEMPRE</strong> trocar se identificar defeitos</li>
    </ul>`,

    passos: [
        {
            titulo: 'Verificar Condições',
            description: `<p><strong>Inspecionar a luva</strong></p><p>Verificar elos soltos, furos ou ferrugem. Descartar luvas danificadas.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Higienizar as Mãos',
            description: `<p><strong>Lavar e secar as mãos</strong></p><p>Lavar por 20 segundos. Opcionalmente usar luva de látex por baixo.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Vestir Corretamente',
            description: `<p><strong>Colocar na mão oposta à faca</strong></p><p>A luva deve ficar justa mas confortável. Ajustar o punho.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Posicionar Durante o Corte',
            description: `<p><strong>Usar técnica de "garra"</strong></p><p>Dedos curvados para dentro. Manter afastados da lâmina.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Higienizar Após Uso',
            description: `<p><strong>Limpar e sanitizar</strong></p><p>Escovar, enxaguar, sanitizar por 2 min e secar pendurada.</p>`,
            imageUrl: ''
        },
        {
            titulo: 'Armazenar',
            description: `<p><strong>Guardar corretamente</strong></p><p>Local limpo, seco e arejado. Nunca guardar molhada.</p>`,
            imageUrl: ''
        }
    ],

    updatedAt: serverTimestamp()
};

async function fillCorrectPOP() {
    console.log('🔍 Buscando documentos na coleção CORRETA "epi_s"...\n');

    try {
        // COLEÇÃO CORRETA: epi_s
        const snapshot = await getDocs(collection(db, 'epi_s'));

        console.log(`📄 Encontrados ${snapshot.size} documento(s)\n`);

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            console.log(`   ID: ${docSnap.id}`);
            console.log(`   Nome: ${data.nome || '(sem nome)'}`);
            console.log(`   Codigo: ${data.codigo || '(sem codigo)'}`);
            console.log(`   ➡️ Atualizando...`);

            await updateDoc(docSnap.ref, popData);
            console.log(`   ✅ Documento preenchido!\n`);
        }

        console.log('✅ Operação concluída! Recarregue a página (Ctrl+Shift+R)');

    } catch (error) {
        console.error('❌ Erro:', error);
    }

    process.exit(0);
}

fillCorrectPOP();
