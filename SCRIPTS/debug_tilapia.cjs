const admin = require('firebase-admin');
const sa = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    const names = [
        'Filé de Tilápia',
        'Sal Refinado',
        'Alho Fresco',
        'Pimenta do Reino',
        'Óleo de Soja',
        'Farinha de Trigo',
        'Ovos (unidade ~50g)',
        'Farinha de Rosca',
        'Óleo de Soja (Fritura)'
    ];

    for (const n of names) {
        const snap = await db.collection('Ingredient').where('name', '==', n).limit(1).get();
        if (!snap.empty) {
            const d = snap.docs[0];
            const data = d.data();
            console.log(n);
            console.log('  id: ' + d.id);
            console.log('  price: ' + data.price);
            console.log('  current_price: ' + data.current_price);
            console.log('  tech: ' + JSON.stringify(data.technical_data || 'NONE'));
            console.log('');
        } else {
            console.log(n + ': NOT FOUND\n');
        }
    }
}
run().catch(console.error).finally(() => process.exit(0));
