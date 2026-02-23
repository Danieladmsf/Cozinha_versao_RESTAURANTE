import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
    try {
        const recipesRef = collection(db, 'Recipe');
        const snapshot = await getDocs(recipesRef);

        const ghosts = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const preps = data.preparations || [];

            preps.forEach((prep, prepIndex) => {
                // Check if this preparation actually has a cooking process
                const hasCooking = prep.processes?.includes('cooking');
                // Check if this preparation has cleaning
                const hasCleaning = prep.processes?.includes('cleaning');

                if (prep.ingredients) {
                    prep.ingredients.forEach((ing, ingIndex) => {
                        const raw = parseFloat(String(ing.weight_raw || '').replace(',', '.')) || 0;
                        const pre = parseFloat(String(ing.weight_pre_cooking || '').replace(',', '.')) || 0;
                        const clean = parseFloat(String(ing.weight_clean || '').replace(',', '.')) || 0;

                        let isGhost = false;
                        let reason = '';

                        // Situation 1: Has Cooking, has raw/clean weight, but NO pre_cooking weight
                        if (hasCooking && pre === 0 && (raw > 0 || clean > 0)) {
                            isGhost = true;
                            reason = 'Faltando Pré-Cocção (mas tem Peso Bruto ou Limpo)';
                        }

                        // Situation 2: Has Cleaning, has raw weight, but NO clean weight
                        if (hasCleaning && clean === 0 && raw > 0) {
                            isGhost = true;
                            reason = 'Faltando Peso Limpo (mas tem Peso Bruto)';
                        }

                        if (isGhost) {
                            ghosts.push({
                                recipeId: doc.id,
                                recipeName: data.name || data.title || 'Receita Desconhecida',
                                prepName: prep.title || `Etapa ${prepIndex + 1}`,
                                ingredientName: ing.name || 'Ingrediente Desconhecido',
                                issue: reason,
                                values: {
                                    raw: ing.weight_raw || 'vazio',
                                    clean: ing.weight_clean || 'vazio',
                                    pre: ing.weight_pre_cooking || 'vazio',
                                    cooked: ing.weight_cooked || 'vazio'
                                }
                            });
                        }
                    });
                }
            });
        });

        return NextResponse.json({
            totalRecipesChecked: snapshot.size,
            ghostsFound: ghosts.length,
            ghostDetails: ghosts
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
