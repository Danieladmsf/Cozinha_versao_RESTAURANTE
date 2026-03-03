
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Checando MenuConfig e VisibleTypes...");

    // Na listagem (ProductsList.jsx), o useEffect carrega:
    // const configs = await MenuConfig.query([
    //   { field: 'user_id', operator: '==', value: mockUserId },
    //   { field: 'is_default', operator: '==', value: true }
    // ]);
    const snap = await getDocsFromServer(collection(db, "MenuConfig"));
    console.log(`Coleções MenuConfig encontradas: ${snap.size}`);

    snap.forEach(d => {
        console.log(`- Config ID: ${d.id}`);
        console.log(`  user_id: ${d.data().user_id}`);
        console.log(`  is_default: ${d.data().is_default}`);
        console.log(`  product_visible_types:`, JSON.stringify(d.data().product_visible_types || {}));
    });

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
