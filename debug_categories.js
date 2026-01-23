
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';

async function listCategories() {
    console.log("🔍 Checking Categories...");

    try {
        // 1. Find "Receitas - Base" root category
        const qBase = query(collection(db, "Category"), where("name", "==", "Receitas - Base"));
        const snapBase = await getDocs(qBase);

        if (snapBase.empty) {
            console.error("❌ Root category 'Receitas - Base' NOT FOUND.");

            // Allow debugging: list all root categories?
            console.log("Listing all categories to help debug:");
            const all = await getDocs(collection(db, "Category"));
            all.forEach(doc => {
                const d = doc.data();
                console.log(`- [${doc.id}] ${d.name} (Parent: ${d.parentId || 'null'})`);
            });
            process.exit(0);
        }

        const baseDoc = snapBase.docs[0];
        console.log(`✅ Found 'Receitas - Base' (ID: ${baseDoc.id})`);

        // 2. Find Children
        const qChildren = query(collection(db, "Category"),
            where("parentId", "==", baseDoc.id)
        );
        const snapChildren = await getDocs(qChildren);

        if (snapChildren.empty) {
            console.log("⚠️ 'Receitas - Base' has no sub-categories.");
        } else {
            console.log("📂 Sub-categories of 'Receitas - Base':");
            snapChildren.forEach(doc => {
                console.log(`   - "${doc.data().name}" (ID: ${doc.id})`);
            });
        }

        // 3. Check where "Sobremesas" went
        const qSobremesas = query(collection(db, "Category"), where("name", "==", "Sobremesas"));
        const snapSobremesas = await getDocs(qSobremesas);
        if (!snapSobremesas.empty) {
            snapSobremesas.forEach(doc => {
                const d = doc.data();
                console.log(`Found existing 'Sobremesas' category: ID=${doc.id}, ParentID=${d.parentId}, Type=${d.type}`);
            });
        } else {
            console.log("ℹ️ Category 'Sobremesas' does not exist in the collection.");
        }

        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

listCategories();
