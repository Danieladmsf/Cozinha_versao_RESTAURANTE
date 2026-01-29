
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

async function deleteRecipes() {
    const targetCategory = "Produtos > marmitas 3 DV";
    console.log(`Starting deletion for category: ${targetCategory}`);

    try {
        const q = query(collection(db, "Recipe"), where("category", "==", targetCategory));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("No recipes found to delete.");
            return;
        }

        console.log(`Found ${snapshot.size} recipes to delete.`);
        const batchSize = 10;
        let deletedCount = 0;

        for (const docSnapshot of snapshot.docs) {
            await deleteDoc(doc(db, "Recipe", docSnapshot.id));
            deletedCount++;
            if (deletedCount % 10 === 0) console.log(`Deleted ${deletedCount} recipes...`);
        }

        console.log(`Successfully deleted ${deletedCount} recipes.`);
    } catch (error) {
        console.error("Error deleting recipes:", error);
    } finally {
        process.exit(0);
    }
}

deleteRecipes();
