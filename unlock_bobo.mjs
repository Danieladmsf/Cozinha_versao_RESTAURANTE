import { db } from './lib/firebase.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

async function unlockBobo() {
    const recipeId = "KriQMHylcZ1xQSLiBdq4";
    console.log(`🔓 Desbloqueando receita Bobó ID: ${recipeId}...`);

    const docRef = doc(db, 'Recipe', recipeId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedPreparations = data.preparations.map(prep => ({
            ...prep,
            ingredients: (prep.ingredients || []).map(ing => {
                const newIng = { ...ing };
                delete newIng.locked;
                return newIng;
            })
        }));

        await updateDoc(docRef, {
            preparations: updatedPreparations
        });
        console.log("✅ Bobó desbloqueado!");
    }
    process.exit(0);
}

unlockBobo().catch(err => {
    console.error(err);
    process.exit(1);
});
