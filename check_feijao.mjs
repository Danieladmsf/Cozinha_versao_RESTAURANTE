import { db } from './lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Inspecionando Receita do Feijao...");
    const snap = await getDoc(doc(db, "Recipe", "rec_Ffu3OXlrBFNheRwpC5vC_1772574273684"));
    console.log(JSON.stringify(snap.data(), null, 2));
    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
