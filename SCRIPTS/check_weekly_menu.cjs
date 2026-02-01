/**
 * Script para verificar WeeklyMenu no Firebase
 */
const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../.venv/cozinha-afeto-2026-firebase-adminsdk-fbsvc-ab856b85c0.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    console.log('='.repeat(80));
    console.log('VERIFICANDO WEEKLY MENU');
    console.log('='.repeat(80));

    // 1. Contar documentos
    const snap = await db.collection('WeeklyMenu').get();
    console.log(`\n📅 WeeklyMenu: ${snap.size} documentos`);

    if (snap.size > 0) {
        console.log('\n  Documentos:');
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`\n  📄 ID: ${doc.id}`);
            console.log(`     Semana: ${data.week_number}/${data.year}`);
            console.log(`     menu_data exists: ${!!data.menu_data}`);

            // Contar itens
            if (data.menu_data) {
                let totalItems = 0;
                Object.keys(data.menu_data).forEach(dayOrGroup => {
                    const dayData = data.menu_data[dayOrGroup];
                    if (typeof dayData === 'object') {
                        Object.values(dayData).forEach(cat => {
                            if (Array.isArray(cat)) {
                                totalItems += cat.filter(i => i.recipe_id).length;
                            }
                        });
                    }
                });
                console.log(`     Total itens com recipe_id: ${totalItems}`);
            }
        });
    }

    console.log('\n' + '='.repeat(80));
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erro:', err);
        process.exit(1);
    });
