/**
 * Script de Verificação: Ler dados brutos do Firestore
 * 
 * Verifica se weight_pre_cooking está sendo salvo corretamente.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
    console.log('🔍 Verificando receita Arroz Branco...');
    const docRef = doc(db, 'Recipe', 'SKID7otZeRBwCnoJvPGy');
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
        console.error('❌ Receita não encontrada');
        return;
    }

    const data = snap.data();
    console.log(`Nome: ${data.name}`);

    (data.preparations || []).forEach((prep, i) => {
        console.log(`\nPreparação ${i + 1}: ${prep.title}`);
        (prep.ingredients || []).forEach(ing => {
            console.log(`  - ${ing.name}`);
            console.log(`    raw: ${ing.weight_raw}`);
            console.log(`    clean: ${ing.weight_clean}`);
            console.log(`    pre_cook: ${ing.weight_pre_cooking} (Type: ${typeof ing.weight_pre_cooking})`);
            console.log(`    cooked: ${ing.weight_cooked}`);

            // Check for potential typo keys
            if (ing.pre_cooking_weight !== undefined) console.log(`    ⚠️ pre_cooking_weight: ${ing.pre_cooking_weight}`);
        });
    });

    process.exit(0);
}

main();
