
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';
import fs from 'fs';

async function main() {
    console.log("🛠️ Extraindo Cardápio...");
    const snap = await getDocsFromServer(collection(db, "WeeklyMenu"));

    let allMenus = [];
    snap.forEach(d => {
        allMenus.push({ id: d.id, ...d.data() });
    });

    fs.writeFileSync('./menus_dump.json', JSON.stringify(allMenus, null, 2));
    console.log("Salvo em menus_dump.json");
    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
