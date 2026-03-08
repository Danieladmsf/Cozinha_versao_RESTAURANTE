import fs from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
    const ordersSnap = await getDocs(collection(db, "Order"));
    const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const week10Orders = orders.filter(o => o.week_number === 10 && o.year === 2026);

    console.log(`Found ${week10Orders.length} orders for week 10.`);

    let sampleProductId = null;
    let sampleRecipeId = null;

    if (week10Orders.length > 0) {
        const o = week10Orders[0];
        console.log("Sample Order:", JSON.stringify(o, null, 2));
        if (o.items && o.items.length > 0) {
            sampleProductId = o.items[0].recipe_id; // in order items it is called recipe_id
            console.log("Sample ID from order item:", sampleProductId);
        }
    }

    console.log("Fetching Products...");
    const productsSnap = await getDocs(collection(db, "Product"));
    const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Found ${products.length} products.`);

    if (sampleProductId) {
        const prod = products.find(p => p.id === sampleProductId);
        if (prod) {
            console.log("Found Product matching order item:", prod.name);
            console.log("Product fields:", Object.keys(prod));
            console.log("Product recipe_id value:", prod.recipe_id);
            console.log("Product preparation exists:", !!prod.preparations);
            sampleRecipeId = prod.recipe_id;
        } else {
            console.log("Product not found for id:", sampleProductId);
        }
    } else {
        console.log("No product id from order to test.");
    }

    console.log("Fetching Recipes...");
    const recipeSnap = await getDocs(collection(db, "Recipe"));
    const recipes = recipeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Found ${recipes.length} recipes.`);

    if (sampleRecipeId) {
        const rec = recipes.find(r => r.id === sampleRecipeId);
        if (rec) {
            console.log("Found Recipe matching product.recipe_id:", rec.name);
            console.log("Recipe preparations count:", rec.preparations ? rec.preparations.length : 0);
        } else {
            console.log("Recipe not found for id:", sampleRecipeId);
        }
    }
}

checkData()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
