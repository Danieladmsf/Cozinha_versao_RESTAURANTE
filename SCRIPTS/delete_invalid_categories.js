
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";

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

async function deleteInvalidCategories() {
    console.log("Deleting invalid 'produtos' type categories...");

    // Find root with type 'produtos'
    const q = query(collection(db, "CategoryTree"), where("type", "==", "produtos"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log("No invalid categories found.");
        process.exit(0);
    }

    // Recursive deletion not strictly needed if we just nuke the type 'produtos', 
    // assuming valid ones are 'receitas_-_base'.
    // Let's list what we are deleting first.

    const docs = snapshot.docs;
    console.log(`Found ${docs.length} invalid categories to delete:`);
    docs.forEach(d => console.log(`- ${d.data().name} (${d.id})`));

    // Delete them
    const promises = docs.map(d => deleteDoc(doc(db, "CategoryTree", d.id)));
    await Promise.all(promises);

    console.log("Deleted.");
    process.exit(0);
}

deleteInvalidCategories();
