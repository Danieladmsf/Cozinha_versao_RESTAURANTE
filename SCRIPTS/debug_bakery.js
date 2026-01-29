
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

async function debugBakery() {
    console.log("Analyzing 'PADARIA' Hierarchy...");

    const snapshot = await getDocs(collection(db, "CategoryTree"));
    const allCats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Find Root "PADARIA E INDUSTRIALIZADOS"
    const roots = allCats.filter(c => c.name && c.name.toUpperCase().includes("PADARIA"));

    console.log(`\nFound ${roots.length} roots matching 'PADARIA':`);

    for (const root of roots) {
        // Filter by correct type to avoid the 'produtos' ghost if it still exists (though we deleted it, good to be safe)
        if (root.type !== 'receitas_-_base' && root.type !== 'produtos') continue; // Just show relevant ones

        console.log(`ROOT [${root.id}] ${root.name} (Type: ${root.type})`);

        const children = allCats.filter(c => c.parent_id === root.id);
        children.forEach(child => {
            console.log(`  -> CHILD [${child.id}] ${child.name} (Type: ${child.type})`);

            const grandChildren = allCats.filter(c => c.parent_id === child.id);
            grandChildren.forEach(gc => {
                console.log(`      -> GRANDCHILD [${gc.id}] ${gc.name}`);
            });
        });
    }

    process.exit(0);
}

debugBakery();
