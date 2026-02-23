import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
    try {
        const matrizId = '2Ub3ONFSJqb5hkso17uq';
        const matrizRef = doc(db, 'Recipe', matrizId);
        const matrizSnap = await getDoc(matrizRef);

        if (!matrizSnap.exists()) {
            return NextResponse.json({ error: 'Matrix not found' });
        }

        let matrizData = matrizSnap.data();
        let preps = matrizData.preparations || [];

        if (preps.length > 0 && preps[0].ingredients) {
            preps[0].ingredients = preps[0].ingredients.map(ing => {
                const name = ing.name || '';

                // Remove ghost values
                if (ing.weight_pre_cooking === undefined && ing.weight_raw) {
                    ing.weight_pre_cooking = ing.weight_raw;
                    ing.weight_raw = '';
                }

                if (name.includes('Alho')) {
                    ing.weight_pre_cooking = '0.010';
                    ing.weight_cooked = '0.010';
                    ing.weight_raw = '';
                    ing.weight_thawed = '';
                    ing.weight_frozen = '';
                } else if (name.includes('Ervilha')) {
                    ing.weight_pre_cooking = '0.200';
                    ing.weight_cooked = '0.200';
                    ing.weight_raw = '';
                } else if (name.includes('Milho')) {
                    ing.weight_pre_cooking = '0.200';
                    ing.weight_cooked = '0.200';
                    ing.weight_raw = '';
                } else if (name.includes('Passa')) {
                    ing.weight_pre_cooking = '0.200';
                    ing.weight_cooked = '0.200';
                    ing.weight_raw = '';
                } else if (name.includes('Cenoura')) {
                    ing.weight_pre_cooking = '0.085';
                    ing.weight_cooked = '0.07333333333333335';
                    ing.weight_raw = '0.085'; // keeps clean/raw if intentional
                } else if (name.includes('Água')) {
                    ing.weight_pre_cooking = '0.200';
                    ing.weight_cooked = '0.200';
                    ing.weight_raw = '';
                } else if (name.includes('Arroz')) {
                    ing.weight_pre_cooking = '1.000';
                    ing.weight_cooked = '2.700';
                    ing.weight_raw = '1.000';
                } else if (name.includes('Pimentão')) {
                    ing.weight_pre_cooking = '0.180';
                    ing.weight_cooked = '0.160';
                    ing.weight_raw = '0.180';
                } else if (name.includes('Cebola')) {
                    ing.weight_pre_cooking = '0.043';
                    ing.weight_cooked = '0.035';
                    ing.weight_raw = '0.043';
                } else if (name.includes('Óleo')) {
                    ing.weight_pre_cooking = '0.020';
                    ing.weight_cooked = '0.020';
                    ing.weight_raw = '';
                } else if (name.includes('Sal')) {
                    ing.weight_pre_cooking = '0.015';
                    ing.weight_cooked = '0.015';
                    ing.weight_raw = '';
                }

                return ing;
            });

            await updateDoc(matrizRef, { preparations: preps });
            console.log('Fantasmas removidos!');
        }

        return NextResponse.json({ success: true, message: 'Fantasmas exterminados da Matriz com sucesso!' });
    } catch (err) {
        return NextResponse.json({ error: err.message });
    }
}
