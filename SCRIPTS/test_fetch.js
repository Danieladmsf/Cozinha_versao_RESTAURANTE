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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
    try {
        console.log("Fetching...");
        const sn = await getDocs(collection(db, 'recipes'));
        console.log("Got", sn.size, "records.");

        // Exibir primeira receita apenas
        sn.forEach(d => {
            const recipe = d.data();
            console.log("RECIPE:", recipe.name);
            process.exit(0); // Exit after first print to not flood log
        });

    } catch (e) {
        console.error("ERRO FIREBASE:", e);
    }
}
test();
