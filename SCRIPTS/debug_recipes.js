/**
 * Script de Debug: Ver dados de uma receita
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

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

async function main() {
    // Buscar receita "Arroz Branco" (pai)
    const parentSnap = await getDoc(doc(db, 'Recipe', 'SKID7otZeRBwCnoJvPGy'));
    const parent = parentSnap.data();

    console.log('\n🍚 RECEITA PAI: Arroz Branco');
    console.log('='.repeat(60));

    (parent.preparations || []).forEach((prep, i) => {
        console.log(`\nPreparação ${i + 1}: ${prep.title}`);
        (prep.ingredients || []).forEach(ing => {
            console.log(`  - ${ing.name}: peso_bruto=${ing.weight_raw}, peso_cozido=${ing.weight_cooked}, preço=${ing.price}`);
        });
    });

    // Buscar receita filha "Bife Grelhado acebolado"
    const childSnap = await getDoc(doc(db, 'Recipe', 'G3rSZWqlIq7WgBq9o0oa'));
    const child = childSnap.data();

    console.log('\n\n🥩 RECEITA FILHA: Bife Grelhado acebolado');
    console.log('='.repeat(60));

    (child.preparations || []).forEach((prep, i) => {
        console.log(`\nPreparação ${i + 1}: ${prep.title}`);
        console.log(`  source_recipe_id: ${prep.source_recipe_id || '(não definido)'}`);
        (prep.ingredients || []).forEach(ing => {
            console.log(`  - ${ing.name}: peso_bruto=${ing.weight_raw}, peso_cozido=${ing.weight_cooked}, preço=${ing.price}`);
            console.log(`    source_ingredient_id: ${ing.source_ingredient_id || '(não definido)'}`);
        });
    });

    process.exit(0);
}

main().catch(err => {
    console.error('Erro:', err);
    process.exit(1);
});
