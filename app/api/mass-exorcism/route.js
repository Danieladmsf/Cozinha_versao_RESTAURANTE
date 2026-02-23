import { NextResponse } from 'next/server';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
    try {
        const recipesRef = collection(db, 'Recipe');
        const snapshot = await getDocs(recipesRef);

        let recipesFixed = 0;

        // Using for...of so we can await the updateDoc calls sequentially
        for (const recipeDoc of snapshot.docs) {
            let data = recipeDoc.data();
            let preps = data.preparations || [];
            let recipeModified = false;

            preps.forEach((prep) => {
                const hasCooking = prep.processes?.includes('cooking');
                const hasCleaning = prep.processes?.includes('cleaning');
                const hasDefrosting = prep.processes?.includes('defrosting');
                const hasPortioning = prep.processes?.includes('portioning');

                if (prep.ingredients) {
                    prep.ingredients.forEach((ing) => {
                        // Fix 1: Missing Prev-Cooking but has Cooking & Raw
                        if (hasCooking && !ing.weight_pre_cooking && (ing.weight_raw || ing.weight_clean)) {
                            ing.weight_pre_cooking = ing.weight_clean || ing.weight_raw;
                            if (!hasCleaning) {
                                ing.weight_raw = ''; // Delete raw if we don't have cleaning (move it to pre-cooking)
                                ing.weight_clean = '';
                            }
                            recipeModified = true;
                        }

                        // Fix 2: Clean up dead fields using the exact same rules as the frontend sanitize-on-save
                        if (!hasDefrosting && (ing.weight_frozen || ing.weight_thawed)) {
                            ing.weight_frozen = '';
                            ing.weight_thawed = '';
                            recipeModified = true;
                        }
                        if (!hasCleaning && ing.weight_clean) {
                            ing.weight_clean = '';
                            recipeModified = true;
                        }
                        if (!hasCooking && (ing.weight_pre_cooking || ing.weight_cooked)) {
                            ing.weight_pre_cooking = '';
                            ing.weight_cooked = '';
                            recipeModified = true;
                        }
                        if (!hasPortioning && ing.weight_portioned) {
                            ing.weight_portioned = '';
                            recipeModified = true;
                        }
                    });
                }
            });

            if (recipeModified) {
                const docRef = doc(db, 'Recipe', recipeDoc.id);
                await updateDoc(docRef, { preparations: preps });
                recipesFixed++;
            }
        }

        return NextResponse.json({
            totalRecipesScanned: snapshot.size,
            totalRecipesFixed: recipesFixed,
            message: 'O exorcismo em massa foi concluido com sucesso!'
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
