
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';

async function inspectContainers() {
    console.log("🔍 Inspecting Container Types...");

    const checkList = [
        "Bolo de Cenoura com Chocolate",
        "Bolo de Chocolate Tradicional",
        "MD - Arroz, Feijão, Farofa, Bife acebolado"
    ];

    try {
        for (const name of checkList) {
            const q = query(collection(db, "Recipe"), where("name", "==", name));
            const snap = await getDocs(q);

            if (snap.empty) {
                console.log(`❌ Recipe not found: ${name}`);
                continue;
            }

            const recipe = snap.docs[0].data();
            console.log(`\n📦 ${name}:`);
            console.log(`   unit_type: ${recipe.unit_type}`);
            console.log(`   cuba_weight: ${recipe.cuba_weight}`);

            if (recipe.preparations) {
                recipe.preparations.forEach((prep, idx) => {
                    if (prep.assembly_config) {
                        console.log(`   Prep ${idx} container: ${prep.assembly_config.container_type}`);
                    }
                });
            }
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

inspectContainers();
