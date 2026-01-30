// Script para preencher dados fictícios no POP da Faca
// Execute com: node scripts/seed-faca-pop.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

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

async function seedFacaData() {
    try {
        console.log('🔍 Buscando documento da faca...');

        const ferramentasRef = collection(db, 'ferramentas');
        const snapshot = await getDocs(ferramentasRef);

        let facaDoc = null;
        let facaId = null;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.nome && data.nome.toLowerCase().includes('faca')) {
                facaDoc = data;
                facaId = docSnap.id;
            }
        });

        if (!facaDoc) {
            console.log('❌ Documento da faca não encontrado!');
            console.log('Documentos existentes:');
            snapshot.forEach(docSnap => {
                console.log(`  - ${docSnap.id}: ${docSnap.data().nome}`);
            });
            process.exit(1);
        }

        console.log(`✅ Encontrado: ${facaDoc.nome} (ID: ${facaId})`);

        // Dados fictícios para preencher
        const dadosFicticios = {
            especificacoes: `<p><strong>Comprimento total:</strong> 35cm</p>
<p><strong>Lâmina:</strong> 20cm de aço inox AISI 420</p>
<p><strong>Cabo:</strong> Polipropileno branco antimicrobiano</p>
<p><strong>Peso:</strong> 180g</p>
<p><strong>Dureza:</strong> 54-56 HRC</p>
<p><strong>Ângulo de fio:</strong> 20°</p>`,

            materiais: `<p><span style="color: #dc2626">Luva de malha de aço nível 5</span> - <strong>Obrigatório</strong></p>
<p>Avental de PVC</p>
<p>Óculos de proteção (ao afiar)</p>
<p>Calçado antiderrapante</p>`,

            manutencao: `<p><strong>Semanalmente:</strong> Afiar com chaira de aço cromado</p>
<p><strong>Mensalmente:</strong> Amolar com pedra 1000/3000</p>
<p><strong>Após cada uso:</strong> Higienizar com detergente neutro e água quente</p>
<p><em>Nunca deixar de molho!</em></p>
<p>Guardar em porta-facas magnético ou com protetor de lâmina</p>
<p>Verificar integridade do cabo trimestralmente</p>`,

            precaucoes: `<p><span style="color: #dc2626"><strong>NUNCA</strong> cortar em direção ao corpo!</span></p>
<p><span style="color: #dc2626">Manter sempre afiada</span> - faca cega é mais perigosa</p>
<p>Não usar para abrir embalagens ou latas</p>
<p>Transportar sempre com lâmina para baixo</p>
<p><span style="color: #dc2626">Não deixar na pia submersa em água</span></p>
<p>Comunicar imediatamente qualquer dano ao supervisor</p>`,

            passos: [
                {
                    description: `<p><strong>Inspecionar a faca</strong> antes do uso:</p>
<p>Verificar se a lâmina está limpa, sem ferrugem ou danos.</p>
<p>Confirmar que o cabo está firme e sem rachaduras.</p>`,
                    imageUrl: facaDoc.passos?.[0]?.imageUrl || null
                },
                {
                    description: `<p><strong>Higienizar corretamente:</strong></p>
<p>Lavar com água quente e detergente neutro.</p>
<p><span style="color: #dc2626">Secar imediatamente</span> com pano limpo.</p>
<p><em>Nunca colocar na máquina de lavar louças!</em></p>`,
                    imageUrl: null
                },
                {
                    description: `<p><strong>Técnica de corte segura:</strong></p>
<p>Posicionar os dedos em "garra" para proteger as pontas.</p>
<p>Manter a faca sempre em contato com a tábua.</p>
<p>Usar movimentos suaves e controlados.</p>`,
                    imageUrl: null
                },
                {
                    description: `<p><strong>Armazenamento:</strong></p>
<p>Guardar em suporte magnético ou bloco de facas.</p>
<p><span style="color: #dc2626">Nunca guardar solta em gavetas!</span></p>
<p>Usar protetor de lâmina se necessário transportar.</p>`,
                    imageUrl: null
                }
            ],

            updatedAt: serverTimestamp()
        };

        console.log('📝 Atualizando documento...');
        await updateDoc(doc(db, 'ferramentas', facaId), dadosFicticios);

        console.log('✅ Documento atualizado com sucesso!');
        console.log('');
        console.log('📄 Dados inseridos:');
        console.log('  - Especificações técnicas');
        console.log('  - EPIs necessários');
        console.log('  - Instruções de manutenção');
        console.log('  - Precauções de segurança');
        console.log('  - 4 passos do procedimento');
        console.log('');
        console.log('🔄 Recarregue a página para ver as alterações!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

seedFacaData();
