import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";

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

async function run() {
    try {
        const q = query(collection(db, 'recipes'));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            let data = doc.data();
            let codeToCheck = String(data.code || "");
            let vrCode = String(data.vr_product_code || "");
            let pCode = String(data.product_code || "");
            let exCode = String(data.external_code || "");

            if (codeToCheck.includes("7875") || vrCode.includes("7875") || pCode.includes("7875") || exCode.includes("7875")) {
                console.log(`FOUND CODE 7875`);
                console.log(`Name: ${data.name}`);
                console.log(`Code: ${data.code}`);
                console.log(`VR Product Code: ${data.vr_product_code}`);
                console.log(`Product Code: ${data.product_code}`);
                console.log(`External Code: ${data.external_code}`);
                console.log('---');
            }
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
