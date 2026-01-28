
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

async function inspectOrder() {
    // Vamos checar o pedido de uma data que sabemos que tem venda: 13/01/2026 (Terça)
    // O ID gerado foi 'import-2026-01-13-rotisseria'
    const orderId = 'import-2026-01-13-rotisseria';

    console.log(`🔍 Inspecionando pedido: ${orderId}`);
    const docRef = doc(db, 'Order', orderId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('✅ Documento encontrado!');
        console.log('--- CAMPOS PRINCIPAIS ---');
        console.log(`Customer ID: ${data.customer_id}`);
        console.log(`Date: ${data.date}`);
        console.log(`Year: ${data.year}`);
        console.log(`Week: ${data.week_number}`);
        console.log(`Day of Week: ${data.day_of_week}`);

        console.log('\n--- ITENS (Amostra) ---');
        if (data.items && data.items.length > 0) {
            // Procurar nosso item problemático 7877
            const targetItem = data.items.find(i => i.imported_vr_code == 7877 || i.recipe_name.includes('CHINESA'));
            if (targetItem) {
                console.log('🎯 Item 7877 ENCONTRADO:');
                console.log(JSON.stringify(targetItem, null, 2));
            } else {
                console.log('⚠️ Item 7877 NÃO ENCONTRADO neste pedido.');
                console.log('Primeiro item da lista:', data.items[0]);
            }
        }
    } else {
        console.log('❌ Pedido não encontrado.');
    }
    process.exit(0);
}

inspectOrder();
