import fs from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function checkData() {
    console.log("Fetching Orders...");
    const ordersSnap = await getDocs(query(collection(db, "Order"), where("year", "==", 2026), where("week_number", "==", 11)));
    let orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log(`Found ${orders.length} orders for 2026 W11.`);
    orders.forEach(o => {
       console.log(`\nOrder ${o.id}: customer ${o.customer?.name} / ${o.customer_name} - Day: ${o.day_of_week}`);
       (o.items || []).forEach(i => {
           const name = i.recipe_name || i.selectedRecipeName || i.name;
           console.log(`  - ${name} (x${i.quantity})`);
       });
    });
}

checkData()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
