const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Path to Service Account Key (One level up from vr_soft_api)
const serviceAccountPath = path.join(__dirname, '..', 'cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('CRITICAL: Firebase Service Account Key not found at:', serviceAccountPath);
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Initialize App (Singleton check)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin Initialized.');
}

const db = admin.firestore();

module.exports = { db, admin };
