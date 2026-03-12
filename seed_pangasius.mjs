import { db } from './lib/firebase.js';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';

async function seedPangasius() {
    console.log("🚀 Criando ingrediente 'Pangasius (Peixe)'...");

    // 1. Verificar categoria (usar PESCADOS ou CARNES)
    // Se não existir PESCADOS em ingredientes, vamos criar.
    let catId = 'XbrktxH9HAAsC9NItU3X'; // CARNES default
    const catQ = query(collection(db, "Category"), where("name", "==", "PESCADOS"), where("type", "==", "ingredientes"));
    const catSnap = await getDocs(catQ);
    
    if (catSnap.empty) {
        console.log("Category PESCADOS not found, creating...");
        const catRef = await addDoc(collection(db, "Category"), {
            name: "PESCADOS",
            type: "ingredientes",
            level: 0,
            active: true,
            createdAt: Timestamp.now()
        });
        catId = catRef.id;
    } else {
        catId = catSnap.docs[0].id;
    }

    const ingredientData = {
        name: "Pangasius (Peixe)",
        unit: "kg",
        category_id: catId,
        category: "PESCADOS",
        current_price: 25.00, // Preço estimado
        min_stock: 5,
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        last_update: new Date().toISOString().split('T')[0]
    };

    const docRef = await addDoc(collection(db, 'Ingredient'), ingredientData);
    console.log(`✅ Ingrediente criado com sucesso! ID: ${docRef.id}`);
    process.exit(0);
}

seedPangasius().catch(err => {
    console.error(err);
    process.exit(1);
});
