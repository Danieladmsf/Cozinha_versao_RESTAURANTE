
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer, limit, query } from 'firebase/firestore';

async function main() {
    const recSnap = await getDocsFromServer(query(collection(db, "Recipe"), limit(5)));

    recSnap.forEach(r => {
        const data = r.data();
        console.log(`[Recipe] ${data.name} | keys: ${Object.keys(data).join(', ')}`);
        if (data.product_code || data.sku || data.code || data.ean || typeof data.id_vr !== 'undefined') {
            console.log("  => Found possible code field:", { id_vr: data.id_vr, sku: data.sku, code: data.code, product_code: data.product_code });
        }
    });

    console.log("-------------------");
    const pSnap = await getDocsFromServer(query(collection(db, "Product"), limit(5)));
    pSnap.forEach(r => {
        const data = r.data();
        console.log(`[Product] ${data.name} | keys: ${Object.keys(data).join(', ')}`);
    });

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
