
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
            if (data.nome && data.nome.toLowerCase().includes('faca') && data.nome.toLowerCase().includes('carne')) {
                facaDoc = data;
                facaId = docSnap.id;
            }
        });

        if (!facaDoc) {
            console.log('❌ Documento da faca não encontrado!');
            process.exit(1);
        }

        console.log(`✅ Encontrado: ${facaDoc.nome} (ID: ${facaId})`);

        // Dados com referências
        const dadosAtualizados = {
            especificacoes: `<p><strong>Comprimento total:</strong> 35cm</p>
<p><strong>Lâmina:</strong> 20cm de aço inox AISI 420</p>
<p><strong>Cabo:</strong> Polipropileno branco antimicrobiano</p>
<p><strong>Peso:</strong> 180g</p>
<p><strong>Dureza:</strong> 54-56 HRC</p>
<p><strong>Ângulo de fio:</strong> 20°</p>`,

            materiais: `<p>[EPI0001] Luva de malha de aço nível 5 - <strong>Obrigatório</strong></p>
<p>Avental de PVC</p>
<p>Óculos de proteção (ao afiar)</p>
<p>Calçado antiderrapante</p>`,

            manutencao: `<p><strong>Semanalmente:</strong> Afiar com [FER0002] Chaira de Aço Cromado</p>
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

            updatedAt: serverTimestamp()
        };

        // Se houver usabilidade no mapa de cards, podemos adicionar aqui também no conteudo_extra
        // Mas como não sei o ID exato que o usuário gerou para o card usabilidade (se foi 'usabilidade' ou um hash),
        // vou deixar o usuário preencher isso via UI ou tentar descobrir via categoria.

        // Tentar atualizar conteudo_extra com card de Usabilidade placeholder se a categoria tiver
        // Como não tenho as categorias aqui fácil, vou apenas atualizar os campos principais

        console.log('📝 Atualizando documento da Faca...');
        await updateDoc(doc(db, 'ferramentas', facaId), dadosAtualizados);

        console.log('✅ Documento atualizado com referências [ID]!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

seedFacaData();
