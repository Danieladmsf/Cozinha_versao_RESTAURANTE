const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function queryMenuForDate() {
    const targetDate = '2025-01-19';

    console.log(`\n🔍 Buscando cardápio para: ${targetDate}\n`);
    console.log('='.repeat(60));

    try {
        // Query WeeklyMenu collection
        const menuRef = collection(db, 'WeeklyMenu');
        const menuSnapshot = await getDocs(menuRef);

        console.log(`📁 Total de documentos em WeeklyMenu: ${menuSnapshot.size}\n`);

        let found = false;

        for (const doc of menuSnapshot.docs) {
            const data = doc.data();

            // Check if this menu contains our target date
            if (data.days) {
                for (const day of data.days) {
                    if (day.date === targetDate) {
                        found = true;
                        console.log(`✅ Encontrado no documento: ${doc.id}`);
                        console.log(`   Semana: ${data.week_number || 'N/A'}`);
                        console.log(`   Ano: ${data.year || 'N/A'}`);
                        console.log(`\n📅 Dados do dia ${targetDate}:`);
                        console.log('-'.repeat(60));

                        // Print categories and items
                        if (day.categories) {
                            for (const [categoryId, categoryData] of Object.entries(day.categories)) {
                                console.log(`\n🏷️  Categoria ID: ${categoryId}`);
                                if (categoryData.items && categoryData.items.length > 0) {
                                    categoryData.items.forEach((item, idx) => {
                                        console.log(`   ${idx + 1}. Recipe ID: ${item.recipe_id || 'Vazio'}`);
                                        if (item.locations) {
                                            console.log(`      Locations: ${JSON.stringify(item.locations)}`);
                                        }
                                    });
                                } else {
                                    console.log('   (sem itens)');
                                }
                            }
                        }
                        break;
                    }
                }
            }
        }

        if (!found) {
            console.log(`❌ Nenhum cardápio encontrado para ${targetDate}`);

            // Show available dates
            console.log('\n📆 Datas disponíveis no banco:');
            const allDates = new Set();
            menuSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.days) {
                    data.days.forEach(day => {
                        if (day.date) allDates.add(day.date);
                    });
                }
            });

            [...allDates].sort().forEach(date => console.log(`   - ${date}`));
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }

    process.exit(0);
}

queryMenuForDate();
