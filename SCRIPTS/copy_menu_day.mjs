import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCvoMkdHB6PlGu9I3Lciqlcd13zYhbHgxY",
    authDomain: "controle-de-estoque-ab42c.firebaseapp.com",
    projectId: "controle-de-estoque-ab42c",
    storageBucket: "controle-de-estoque-ab42c.firebasestorage.app",
    messagingSenderId: "365318581498",
    appId: "1:365318581498:web:48d53c4b40abcc37b25ee6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Configuração
const SOURCE_WEEK_KEY = '2026-W04'; // Semana 4 de 2026 (18-24/01)
const TARGET_WEEK_KEY = '2026-W05'; // Semana 5 de 2026 (25-31/01)
const SOURCE_DAY_INDEX = 1; // Segunda-feira (19/01/2026) - índice 1 (domingo=0)
const TARGET_DAY_INDEX = 1; // Segunda-feira (26/01/2026) - índice 1 (domingo=0)
const MOCK_USER_ID = 'mock-user-id';

async function copyMenuData() {
    console.log(`\n🔄 Copiando cardápio da segunda-feira da semana ${SOURCE_WEEK_KEY}`);
    console.log(`   para segunda-feira da semana ${TARGET_WEEK_KEY}\n`);
    console.log('='.repeat(60));

    try {
        // 1. Buscar menu da semana fonte
        const menuRef = collection(db, 'WeeklyMenu');
        const sourceQuery = query(menuRef,
            where('user_id', '==', MOCK_USER_ID),
            where('week_key', '==', SOURCE_WEEK_KEY)
        );

        const sourceSnapshot = await getDocs(sourceQuery);
        console.log(`📁 Menus encontrados para ${SOURCE_WEEK_KEY}: ${sourceSnapshot.size}`);

        if (sourceSnapshot.empty) {
            console.log(`❌ Não foi encontrado menu para a semana ${SOURCE_WEEK_KEY}`);

            // Listar todas as semanas disponíveis
            const allMenus = await getDocs(menuRef);
            console.log(`\n📆 Semanas disponíveis:`);
            allMenus.docs.forEach(d => {
                const data = d.data();
                console.log(`   - ${data.week_key} (ID: ${d.id})`);
            });

            process.exit(1);
        }

        const sourceDoc = sourceSnapshot.docs[0];
        const sourceData = sourceDoc.data();

        console.log(`✅ Menu fonte encontrado: ${sourceDoc.id}`);
        console.log(`   week_key: ${sourceData.week_key}`);

        // Verificar dados do dia fonte
        const sourceDayData = sourceData.menu_data?.[SOURCE_DAY_INDEX];
        if (!sourceDayData) {
            console.log(`❌ Não há dados para o índice de dia ${SOURCE_DAY_INDEX} (Segunda) no menu fonte`);
            console.log(`   Índices disponíveis: ${Object.keys(sourceData.menu_data || {}).join(', ')}`);
            process.exit(1);
        }

        console.log(`\n📋 Dados do dia fonte (índice ${SOURCE_DAY_INDEX}):`);
        let totalItems = 0;
        for (const [catId, items] of Object.entries(sourceDayData)) {
            const count = Array.isArray(items) ? items.length : 0;
            totalItems += count;
            console.log(`   Categoria ${catId}: ${count} itens`);
        }
        console.log(`   Total de itens: ${totalItems}`);

        // 2. Buscar menu da semana destino
        const targetQuery = query(menuRef,
            where('user_id', '==', MOCK_USER_ID),
            where('week_key', '==', TARGET_WEEK_KEY)
        );

        const targetSnapshot = await getDocs(targetQuery);
        console.log(`\n📁 Menus encontrados para ${TARGET_WEEK_KEY}: ${targetSnapshot.size}`);

        if (targetSnapshot.empty) {
            console.log(`❌ Não foi encontrado menu para a semana ${TARGET_WEEK_KEY}`);
            console.log(`   Precisa criar o menu dessa semana primeiro acessando o cardápio no app.`);
            process.exit(1);
        }

        const targetDoc = targetSnapshot.docs[0];
        const targetData = targetDoc.data();

        console.log(`✅ Menu destino encontrado: ${targetDoc.id}`);

        // 3. Copiar dados
        const updatedMenuData = { ...targetData.menu_data };
        updatedMenuData[TARGET_DAY_INDEX] = JSON.parse(JSON.stringify(sourceDayData));

        console.log(`\n🔄 Copiando dados...`);

        // 4. Atualizar no Firebase
        const targetRef = doc(db, 'WeeklyMenu', targetDoc.id);
        await updateDoc(targetRef, {
            menu_data: updatedMenuData,
            updatedAt: new Date()
        });

        console.log(`\n✅ Sucesso!`);
        console.log(`   Cardápio da segunda-feira (19/01/2026) foi copiado para segunda-feira (26/01/2026)`);
        console.log(`   Total de ${totalItems} itens copiados`);

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error.stack);
    }

    process.exit(0);
}

copyMenuData();
