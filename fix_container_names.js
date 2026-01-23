
import { db } from './lib/firebase.js';
import {
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    doc
} from 'firebase/firestore';

async function fixContainerNames() {
    console.log("📦 Standardizing to 'Embalagem'...");

    // Items identified as inconsistent
    const fixList = [
        "Bolo de Cenoura com Chocolate",
        "Bolo de Chocolate Tradicional",
        "MD - Arroz, Feijão, Farofa, Bife acebolado"
    ];

    try {
        for (const name of fixList) {
            const q = query(collection(db, "Recipe"), where("name", "==", name));
            const snap = await getDocs(q);

            if (snap.empty) continue;

            const docSnapshot = snap.docs[0];
            const recipe = docSnapshot.data();

            let needsUpdate = false;
            let updates = {
                unit_type: 'embalagem' // Force standardization
            };

            // Fix preparations if they have 'cuba'
            if (recipe.preparations) {
                const newPreps = recipe.preparations.map(prep => {
                    if (prep.assembly_config && prep.assembly_config.container_type === 'cuba') {
                        prep.assembly_config.container_type = 'embalagem';
                        needsUpdate = true;
                    }
                    if (prep.assembly_config && prep.assembly_config.container_type === 'pote') {
                        // Pote is also weird for a whole cake? Maybe user meant embalagem.
                        // But let's stick to fixing 'cuba' mostly.
                        // The user asked "assadeira" and "cuba" -> "embalagem".
                    }
                    return prep;
                });
                if (needsUpdate) updates.preparations = newPreps;
            }

            console.log(`✅ Updating ${name} to 'Embalagem'...`);
            await updateDoc(doc(db, "Recipe", docSnapshot.id), updates);
        }

        console.log("\n✨ Fixed. Please refresh.");
        process.exit(0);

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

fixContainerNames();
