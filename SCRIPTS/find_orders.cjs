const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('C:/APP COZINHA/cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json', 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function run() {
    console.log("Checando coleção Order:");
    const o = await db.collection('Order').limit(5).get();
    o.forEach(d => console.log(d.id, d.data().customer_name, d.data().date, d.data().day_of_week));

    console.log("\nChecando coleção WeeklyMenu:");
    const wm = await db.collection('WeeklyMenu').limit(1).get();
    wm.forEach(d => console.log(JSON.stringify(d.data(), null, 2)));
}
run();
