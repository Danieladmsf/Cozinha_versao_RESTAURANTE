import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';

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

// Keywords that shouldn't have been marked by the "soja" or other broad substring matches
const FIX_KEYWORDS = ['óleo', 'oleo', 'molho de soja', 'shoyu'];

async function runUpdate() {
    console.log("Iniciando varredura para corrigir ÓLEO DE SOJA...");
    const snapshot = await getDocs(collection(db, 'Recipe'));

    const batch = writeBatch(db);
    let batchAssigments = 0;

    snapshot.forEach(docSnap => {
        const recipe = docSnap.data();
        if (!recipe.preparations || recipe.preparations.length === 0) return;

        let changed = false;
        const newPreparations = JSON.parse(JSON.stringify(recipe.preparations));

        newPreparations.forEach((prep) => {
            if (!prep.ingredients) return;

            prep.ingredients.forEach((ing) => {
                if (!ing.name) return;

                const lowerName = ing.name.toLowerCase();
                const needsFix = FIX_KEYWORDS.some(kw => lowerName.includes(kw));

                if (needsFix) {
                    const currentTypes = Array.isArray(ing.task_type) ? [...ing.task_type] : (ing.task_type ? [ing.task_type] : []);
                    const idx = currentTypes.indexOf('pre_preparo');
                    if (idx !== -1) {
                        currentTypes.splice(idx, 1);
                        ing.task_type = currentTypes.length > 0 ? currentTypes : null;
                        changed = true;
                    }
                }
            });
        });

        if (changed) {
            batch.update(docSnap.ref, { preparations: newPreparations });
            batchAssigments++;
            console.log(`Receita corrigida (Óleo/Molho desmarcado): ${recipe.name} (${docSnap.id})`);
        }
    });

    if (batchAssigments > 0) {
        console.log(`Corrigindo ${batchAssigments} receitas no Firestore...`);
        await batch.commit();
        console.log("Sucesso! Óleo de Soja corrigido.");
    } else {
        console.log("Nenhuma receita precisou de correção.");
    }
    process.exit(0);
}

runUpdate().catch(console.error);
