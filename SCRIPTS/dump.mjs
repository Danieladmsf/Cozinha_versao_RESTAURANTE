import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

if (!getApps().length) {
    const serviceAccount = JSON.parse(fs.readFileSync("C:\\APP COZINHA\\firebase-adminsdk.json", "utf-8"));
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

async function main() {
    console.log("Fetching Rotisseria Canelone...");
    const snap = await db.collection("recipes").where("name", ">=", "Rotisseria Canelone").limit(1).get();
    if (snap.empty) {
        console.log("Not found.");
        return;
    }
    const doc = snap.docs[0].data();
    console.log("First preparation processes:", doc.preparations[0].processes);
    console.log("First preparation sub_components:", doc.preparations[0].sub_components);
    console.log("First preparation ingredients length:", doc.preparations[0].ingredients?.length);
    console.log("origin_id:", doc.preparations[0].origin_id);
    fs.writeFileSync("C:\\APP COZINHA\\prep_dump.json", JSON.stringify(doc.preparations[0], null, 2));
    console.log("Dumped to prep_dump.json");
}

main().catch(console.error);
