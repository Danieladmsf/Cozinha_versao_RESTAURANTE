import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import { DemandCalculator } from "./lib/production-engine/DemandCalculator.js";

if (!getApps().length) {
    const serviceAccount = JSON.parse(fs.readFileSync("C:\\APP COZINHA\\firebase-adminsdk.json", "utf-8"));
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

async function run() {
  const dates = ['2026-03-09'];
  console.log("Fetching orders for date:", dates);
  const snapshot = await db.collection('orders')
    .where('deliveryDate', 'in', dates)
    .where('isActive', '==', true)
    .get();
  
  const orders = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
  
  console.log("Total valid orders:", orders.length);
  orders.forEach(o => {
    console.log(`Order: ${o.id} - Customer: ${o.customer?.name} - Items: ${o.items?.length}`);
    o.items?.forEach(i => {
      console.log(`  [] ${i.selectedRecipeName || i.recipeName} (${i.quantity}x)`);
    });
  });

  // Calculate demand
  console.log("\n--- CALCULATING DEMAND ---");
  const demandCalculator = new DemandCalculator(db);
  const consolidated = await demandCalculator.calculateConsolidatedDemand(orders, dates);

  console.log("\n--- INGREDIENTS CONSOLIDATED ---");
  const arroz = consolidated.ingredients.find(i => i.name.toLowerCase().includes("arroz tipo 1"));
  if (arroz) {
     console.log(`Arroz Tipo 1 Raw Weight: ${arroz.rawWeight || arroz.weight} kg`);
     console.log(`Arroz Tipo 1 Used In:`, JSON.stringify(arroz.usedIn, null, 2));
  } else {
     console.log("Arroz Tipo 1 not found in consolidated ingredients.");
  }
}
run().catch(console.error);
