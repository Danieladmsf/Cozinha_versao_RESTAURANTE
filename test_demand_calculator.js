import { initializeApp as initClientApp } from "firebase/app";
import { getFirestore as getClientFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { DemandCalculator } from "./lib/production-engine/DemandCalculator.js";
import { RecipeEngine } from "./lib/recipe-engine/RecipeEngine.js";

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initClientApp(firebaseConfig);
const db = getClientFirestore(app);

async function run() {
  console.log("Fetching orders for W11...");
  const snapshot = await getDocs(query(collection(db, "Order"), where("year", "==", 2026), where("week_number", "==", 11)));
  let orders = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
  orders = orders.filter(o => o.day_of_week === 4);
  console.log("Total valid orders for Day 4:", orders.length);

  console.log("Fetching Recipes & Products...");
  const recipesSnap = await getDocs(collection(db, "Recipe"));
  const productsSnap = await getDocs(collection(db, "Product"));
  
  const allRecipes = [
     ...recipesSnap.docs.map(d => ({id: d.id, ...d.data(), entityType: 'recipe'})),
     ...productsSnap.docs.map(d => ({id: d.id, ...d.data(), entityType: 'product'}))
  ];
  
  console.log(`Loaded ${allRecipes.length} recipes/products.`);

  const demandMap = new Map(); // Category Map 
  console.log("\n--- CALCULATING DEMAND ---");
  const leaves = DemandCalculator.explodeOrders(orders, allRecipes, demandMap);

  console.log("\n--- INGREDIENTS CONSOLIDATED ---");
  let totalArroz = 0;
  const filteredLeaves = leaves.filter(l => (l.ingredient.name || '').toLowerCase().includes("arroz tipo 1"));
  
  const byRecipe = {};
  filteredLeaves.forEach(l => {
     totalArroz += l.scaledQty;
     byRecipe[l.topLevelRecipeName] = (byRecipe[l.topLevelRecipeName] || 0) + l.scaledQty;
  });

  console.log(`Total Arroz Tipo 1 Raw Weight: ${totalArroz.toFixed(3)} kg`);
  console.log(`Used By Recipe:`);
  Object.entries(byRecipe).forEach(([k,v]) => {
     console.log(`  - ${k}: ${v.toFixed(3)} kg`);
  });
}

run().catch(console.error);
