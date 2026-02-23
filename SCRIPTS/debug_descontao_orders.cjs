const admin = require('firebase-admin');

const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    console.log("Fetching Descontão orders...");

    const custSnap = await db.collection('Customer').get();
    const descontCustomers = custSnap.docs.filter(d => d.data().name.includes('Descontão'));
    if (descontCustomers.length === 0) {
        console.log("Customer not found.");
        return;
    }
    const custId = descontCustomers[0].id;
    console.log(`Using customer: ${descontCustomers[0].data().name} (${custId})`);

    const ordersSnap = await db.collection('Order').where('customer_id', '==', custId).get();
    console.log(`Found ${ordersSnap.size} orders in root collection for customer_id ${custId}`);

    let allOrders = [];
    ordersSnap.forEach(doc => allOrders.push({ id: doc.id, ref: doc.ref.path, ...doc.data() }));

    // sorting manually
    allOrders = allOrders.filter(o => o.day_of_week === 1 || o.date === '2026-02-16');
    allOrders.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    for (const order of allOrders) {
        console.log(`\nOrder ID: ${order.id} | Path: ${order.ref} | Day: ${order.day_of_week} | Date: ${order.date}`);

        if (order.items && order.items.length > 0) {
            for (const item of order.items) {
                // Fetch recipe
                let recipeName = 'Unknown';
                let recipeCategory = 'Unknown';
                let rUnitType = 'Unknown';
                let pUnitType = 'Unknown';
                let rUnitsQty = 1;

                if (item.recipe_id) {
                    const rSnap = await db.collection('Recipe').doc(item.recipe_id).get();
                    if (rSnap.exists) {
                        const rData = rSnap.data();
                        recipeName = rData.name;
                        recipeCategory = rData.category;
                        rUnitType = rData.unit_type || rData.container_type || 'undefined';

                        if (rData.preparations && rData.preparations.length > 0) {
                            const lastPrep = rData.preparations[rData.preparations.length - 1];
                            if (lastPrep.assembly_config) {
                                pUnitType = lastPrep.assembly_config.unit_type || lastPrep.assembly_config.container_type;
                                rUnitsQty = lastPrep.assembly_config.units_quantity || 1;
                            }
                        }
                    }
                }

                console.log(`  - ${recipeName} [${recipeCategory}]`);
                console.log(`    Portal: qty=${item.quantity} unit_type=${item.unit_type || 'undefined'}`);
                console.log(`    Recipe: unit_type=${rUnitType} prep_unit_type=${pUnitType} units_qty=${rUnitsQty}`);
            }
        }
    }
}

run().catch(console.error).finally(() => process.exit(0));
