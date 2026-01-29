
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function listTypes() {
    console.log("Listing CategoryType...");
    const snapshot = await getDocs(collection(db, "CategoryType"));
    const types = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(JSON.stringify(types, null, 2));
    process.exit(0);
}

listTypes();
