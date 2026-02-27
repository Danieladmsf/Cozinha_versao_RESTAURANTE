import fs from 'fs';
import admin from 'firebase-admin';

// Simple .env.local parser to get service account credentials
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            let val = match[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
            process.env[match[1].trim()] = val;
        }
    });
} catch (e) {
    console.log("No .env.local found");
}

if (!admin.apps.length) {
    let credential;
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        credential = admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        admin.initializeApp({ credential });
    } else {
        admin.initializeApp();
    }
}

const db = admin.firestore();

async function checkMissingSuggestions() {
    try {
        console.log("Checking sales_history for Thursday...");

        console.log("Fetching recipes...");
        const recipesSnapshot = await db.collection('recipes').where('active', '==', true).get();
        const recipes = [];
        recipesSnapshot.forEach(doc => {
            recipes.push({ id: doc.id, ...doc.data() });
        });

        const targetNames = [
            "Rotisseria Macarronada a Bolonhesa Bendito", // Usually has
            "Refeição: Arroz, Farofa, Batata Assada, Strogonoff Frango Bendito", // Empty
            "Rotisseria Macarrao C/cheddar e Bacon", // Empty
            "Strogonoff de Frango Bendito", // Empty
            "Rotisseria Lasanha a Bolonhesa Bendito" // Usually has
        ];

        const targetRecipes = recipes.filter(r => {
            return targetNames.some(name => r.name && r.name.includes(name));
        });

        console.log(`Found ${targetRecipes.length} target recipes.`);

        const productIdsToScan = [];
        targetRecipes.forEach(r => {
            const code = r.code || r.product_code || r.external_code || r.vr_product_code;
            if (code) {
                productIdsToScan.push(parseInt(code, 10));
                console.log(`Mapped ${r.name} to code ${code}`);
            } else {
                console.log(`Recipe ${r.name} has no code!`);
            }
        });

        console.log(`Checking SalesHistory for these codes...`);

        const BATCH_SIZE = 10;
        let allSales = [];

        for (let i = 0; i < productIdsToScan.map(String).length; i += BATCH_SIZE) {
            const batch = productIdsToScan.map(String).slice(i, i + BATCH_SIZE);
            if (batch.length === 0) continue;

            const salesRef = db.collection('sales_history')
                .where('productId', 'in', batch);

            const snapshot = await salesRef.get();
            snapshot.forEach(doc => {
                allSales.push(doc.data());
            });
        }

        console.log(`Found ${allSales.length} historical sale records for these products overall.`);

        productIdsToScan.forEach(productId => {
            const recipe = targetRecipes.find(r => (r.code || r.product_code || r.external_code || r.vr_product_code) == productId);
            if (!recipe) return;

            const salesData = allSales.filter(s => s.productId === String(productId));

            let thursdaySalesCount = 0;
            let totalSalesCount = 0;
            let thursdayQuantities = [];

            salesData.forEach(sale => {
                const saleDate = new Date(sale.date + 'T12:00:00');
                const dayOfWeek = saleDate.getDay();

                let totalQty = 0;
                if (Array.isArray(sale.events)) {
                    totalQty = sale.events.reduce((sum, ev) => sum + (ev.qty || 0), 0);
                } else if (sale.events && typeof sale.events === 'object') {
                    totalQty = Object.values(sale.events).reduce((sum, qty) => sum + qty, 0);
                } else if (sale.total_quantity !== undefined) {
                    totalQty = sale.total_quantity;
                }

                if (totalQty > 0) {
                    totalSalesCount++;
                    if (dayOfWeek === 4) { // Thursday
                        thursdaySalesCount++;
                        thursdayQuantities.push(totalQty);
                    }
                }
            });

            console.log(`\n--- ${recipe.name} (Code: ${productId}) ---`);
            console.log(`Total active sale days: ${totalSalesCount}`);
            console.log(`Total Thursday active sale days: ${thursdaySalesCount}`);
            if (thursdaySalesCount > 0) {
                console.log(`Thursday quantities: ${thursdayQuantities.join(', ')}`);
            }
        });

    } catch (err) {
        console.error('Error:', err);
    }
}

checkMissingSuggestions();
