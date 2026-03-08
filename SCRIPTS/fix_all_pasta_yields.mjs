import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

async function fixPastaYields() {
    console.log("🍝 Buscando receitas com macarrão/espaguete...");
    const s = await getDocs(collection(db, 'Recipe'));
    let count = 0;

    for (const d of s.docs) {
        const r = d.data();
        const preps = r.preparations || [];
        let rUpdated = false;

        const newPreps = preps.map(p => {
            const ings = p.ingredients || [];

            // Verifica se a etapa DE FATO contém macarrão
            const hasPasta = ings.some(ing => {
                const n = String(ing.name || '').toLowerCase();
                return n.includes('macarr') || n.includes('espaguete') || n.includes('penne') || n.includes('fettuccine');
            });

            if (!hasPasta) return p;

            let stageDirty = false;
            const newIngs = ings.map(ing => {
                const n = String(ing.name || '').toLowerCase();
                const pre = parseFloat(ing.weight_pre_cooking) || 0;

                // 1) Ajustar macarrão para 200% (dobro do cru)
                if (n.includes('macarr') || n.includes('espaguete') || n.includes('penne') || n.includes('fettuccine')) {
                    if (pre > 0) {
                        const expectedCooked = (pre * 2).toFixed(4);
                        if (ing.weight_cooked !== expectedCooked) {
                            console.log(`  [${r.name}] Corrigindo Macarrão: ${ing.name} | ${ing.weight_cooked} -> ${expectedCooked}`);
                            stageDirty = true;
                            return { ...ing, weight_cooked: expectedCooked };
                        }
                    }
                }

                // 2) Ajustar água para 0% (evapora/escorre) 
                //    Mas APENAS nesta mesma etapa onde tem macarrão.
                if (n === 'agua' || n === 'água') {
                    if (ing.weight_cooked !== '0' && ing.weight_cooked !== 0 && ing.weight_cooked !== '0.0000') {
                        console.log(`  [${r.name}] Corrigindo Água: ${ing.name} | ${ing.weight_cooked} -> 0`);
                        stageDirty = true;
                        return { ...ing, weight_cooked: '0' };
                    }
                }

                return ing;
            });

            if (stageDirty) {
                rUpdated = true;
                return { ...p, ingredients: newIngs };
            }
            return p;
        });

        if (rUpdated) {
            console.log(`  🔄 Atualizando receita: ${d.id} (${r.name})`);
            await updateDoc(doc(db, 'Recipe', d.id), {
                preparations: newPreps,
                updatedAt: serverTimestamp()
            });
            count++;
        }
    }

    console.log(`\n🎉 Finalizado! ${count} receitas corrigidas.`);
    setTimeout(() => process.exit(0), 1000);
}

fixPastaYields().catch(e => {
    console.error(e);
    process.exit(1);
});
