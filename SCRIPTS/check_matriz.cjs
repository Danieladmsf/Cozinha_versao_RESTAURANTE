const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkDatabase() {
    try {
        const querySnapshot = await getDocs(collection(db, 'Recipe'));
        const recipes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const arrozGrega = recipes.filter(r => r.name && r.name.toLowerCase().includes('arroz à grega'));

        console.log("Receitas Encontradas:", arrozGrega.length);

        arrozGrega.forEach(r => {
            console.log("\n---", r.name, "---");
            console.log("ID:", r.id);
            console.log("Tipo:", r.type);
            console.log("É Matriz?", r.is_matrix);

            const prep1 = r.preparations && r.preparations.length > 0 ? r.preparations[0] : null;
            if (prep1) {
                console.log("Primeiro Ingrediente da Preparaçao 1:");
                if (prep1.ingredients && prep1.ingredients.length > 0) {
                    const ing = prep1.ingredients[0];
                    console.log("- " + ing.name + " | input_raw_weight: " + ing.input_raw_weight + " | current_price: " + ing.current_price);
                } else {
                    console.log("Nenhum ingrediente.");
                }
            }
        });

        process.exit(0);
    } catch (error) {
        console.error("Erro:", error);
        process.exit(1);
    }
}

checkDatabase();
