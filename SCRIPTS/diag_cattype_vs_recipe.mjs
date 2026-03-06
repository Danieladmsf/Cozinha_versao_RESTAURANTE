import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig, 'diag-cattype');
const db = getFirestore(app);

async function run() {
    // Check CategoryType values
    const catTypeSnap = await getDocs(collection(db, 'CategoryType'));
    console.log('=== CategoryType Collection ===');
    catTypeSnap.docs.forEach(d => {
        const data = d.data();
        console.log(`  ID: ${d.id} | value: "${data.value}" | label: "${data.label}" | order: ${data.order}`);
    });

    // Check Recipe type distribution
    const recipeSnap = await getDocs(collection(db, 'Recipe'));
    const types = {};
    recipeSnap.docs.forEach(d => {
        const t = d.data().type || '(undefined)';
        types[t] = (types[t] || 0) + 1;
    });
    console.log('\n=== Recipe type distribution ===');
    Object.entries(types).forEach(([t, c]) => console.log(`  type="${t}": ${c} receitas`));
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
