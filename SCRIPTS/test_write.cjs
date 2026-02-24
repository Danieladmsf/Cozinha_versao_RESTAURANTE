const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, '../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function check() {
    const db = admin.firestore();
    try {
        console.log('Tentando gravar 1 documento...');
        const docRef = await db.collection('Product').add({ name: 'TEST_BILLING', active: false });
        console.log('✅ SUCESSO! ID:', docRef.id);
        await docRef.delete();
        console.log('✅ DELETADO');
    } catch (e) {
        console.error('❌ ERRO:', e.message);
    }
    process.exit(0);
}

check();
