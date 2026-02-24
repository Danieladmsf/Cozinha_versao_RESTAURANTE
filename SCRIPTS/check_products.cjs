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
    const snap = await db.collection('Product').get();
    console.log(`TOTAL PRODUCTS IN DB: ${snap.size}`);
    process.exit(0);
}

check();
