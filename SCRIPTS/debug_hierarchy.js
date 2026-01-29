
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function debugHierarchy() {
    console.log("Analyzing Category Hierarchy...");

    // 1. Find all roots named ROTISSERIA
    const rootsSnapshot = await getDocs(collection(db, "CategoryTree"));
    const allCats = rootsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const rotisseriaRoots = allCats.filter(c => c.name && c.name.toUpperCase() === "ROTISSERIA");

    console.log(`\nFound ${rotisseriaRoots.length} categories named 'ROTISSERIA':`);

    for (const root of rotisseriaRoots) {
        console.log(`- [${root.id}] Name: ${root.name}, Level: ${root.level}, Active: ${root.active}, Type: ${root.type}`);

        // Find children
        const children = allCats.filter(c => c.parent_id === root.id);
        if (children.length > 0) {
            console.log(`  Children (${children.length}):`);
            children.forEach(child => {
                console.log(`  -> [${child.id}] ${child.name} (Active: ${child.active}, Type: ${child.type})`);
            });
        } else {
            console.log("  No children found.");
        }
    }

    // 2. Find explicit 'PRODUCAO - ROTISSERIA'
    const ghost = allCats.filter(c => c.name && c.name.toUpperCase().includes("PRODUCAO - ROTISSERIA"));
    if (ghost.length > 0) {
        console.log("\nFound 'PRODUCAO - ROTISSERIA':");
        ghost.forEach(g => console.log(`- [${g.id}] ${g.name} (Parent: ${g.parent_id})`));
    }

    process.exit(0);
}

debugHierarchy();
