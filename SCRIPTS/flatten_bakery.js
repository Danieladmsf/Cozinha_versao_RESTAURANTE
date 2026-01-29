
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";

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

async function flattenBakery() {
    console.log("Flattening 'PRODUCAO' category...");

    const targetParentId = "eAIlDLUs00JFbEzwq620"; // This IS the ID of PRODUCAO based on previous output? 
    // Wait, let's re-read output:
    // ROOT [7w8...] PADARIA E INDUSTRIALIZADOS
    //   -> CHILD [eAIlDLUs00JFbEzwq620] PRODUCAO

    // So we want to move children OF [eAIlDLUs00JFbEzwq620] TO [7w8...] (The parent of eAIlDLUs00JFbEzwq620)

    // Let's dynamically find them to be safe.
    const q1 = query(collection(db, "CategoryTree"), where("name", "==", "PRODUCAO"));
    const s1 = await getDocs(q1);

    // Find the one that has parent "PADARIA E INDUSTRIALIZADOS"
    // Fetch all padaria roots
    const q2 = query(collection(db, "CategoryTree"), where("name", "==", "PADARIA E INDUSTRIALIZADOS"));
    const s2 = await getDocs(q2);

    let padariaRoot = null;
    let producaoNode = null;

    // Filter relevant ones (receitas_-_base)
    for (const doc of s2.docs) {
        if (doc.data().type === 'receitas_-_base') {
            padariaRoot = { id: doc.id, ...doc.data() };
            break;
        }
    }

    if (!padariaRoot) {
        console.error("PADARIA root not found.");
        process.exit(1);
    }
    console.log(`Target Parent: ${padariaRoot.name} (${padariaRoot.id})`);

    // Find PRODUCAO that is child of padariaRoot
    for (const doc of s1.docs) {
        if (doc.data().parent_id === padariaRoot.id) {
            producaoNode = { id: doc.id, ...doc.data() };
            break;
        }
    }

    if (!producaoNode) {
        console.error("PRODUCAO child node not found.");
        process.exit(1);
    }
    console.log(`Node to Flatten: ${producaoNode.name} (${producaoNode.id})`);

    // Find children of PRODUCAO
    const q3 = query(collection(db, "CategoryTree"), where("parent_id", "==", producaoNode.id));
    const s3 = await getDocs(q3);

    console.log(`Moving ${s3.size} children to new parent...`);

    const movePromises = s3.docs.map(docSnapshot => {
        const docRef = doc(db, "CategoryTree", docSnapshot.id);
        console.log(`- Moving ${docSnapshot.data().name} (${docSnapshot.id}) -> ${padariaRoot.name}`);
        return updateDoc(docRef, {
            parent_id: padariaRoot.id,
            level: 2 // Assuming root is level 1, child is 2. PRODUCAO was 2, children were 3. Now children become 2.
        });
    });

    await Promise.all(movePromises);

    // Verify if empty before delete? No, user asked to delete.
    console.log("Deleting 'PRODUCAO' node...");
    await deleteDoc(doc(db, "CategoryTree", producaoNode.id));

    console.log("Done.");
    process.exit(0);
}

flattenBakery();
