import { db } from './lib/firebase.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

async function unlockRecipe() {
    const recipeId = "nik1j6PJemkSyTKxWVim";
    console.log(`🔓 Desbloqueando receita ID: ${recipeId}...`);

    const docRef = doc(db, 'Recipe', recipeId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        console.error("❌ Receita não encontrada!");
        process.exit(1);
    }

    const data = docSnap.data();
    const updatedPreparations = data.preparations.map(prep => ({
        ...prep,
        ingredients: (prep.ingredients || []).map(ing => {
            const newIng = { ...ing };
            delete newIng.locked; // Remover o campo que bloqueia a edição no frontend
            return newIng;
        })
    }));

    await updateDoc(docRef, {
        preparations: updatedPreparations
    });

    console.log("✅ Receita desbloqueada com sucesso!");
    process.exit(0);
}

unlockRecipe().catch(err => {
    console.error(err);
    process.exit(1);
});
