import { db } from '../lib/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function auditCookedWeightsSafely() {
    console.log('Fetching Products...');
    const q = query(collection(db, 'Recipe'), where('type', '==', 'produtos'));
    const qs = await getDocs(q);

    let discrepanciesFound = 0;

    for (const document of qs.docs) {
        const recipe = document.data();
        const mPreps = recipe.preparations || [];
        const assemblyPrep = mPreps.find(p => p.sub_components && p.sub_components.length > 0 && p.title && p.title.toLowerCase().includes('porcionamento'));

        if (!assemblyPrep) continue;

        let report = [];
        let hasError = false;

        for (const sc of assemblyPrep.sub_components) {
            if (sc.isPackaging) continue;

            const targetWeight = parseFloat(sc.assembly_weight_kg?.toString().replace(',', '.') || sc.input_yield_weight?.toString().replace(',', '.') || '0');
            if (targetWeight <= 0) continue;

            const targetPrep = mPreps.find(p => p.id === sc.source_id);
            if (!targetPrep) continue;
            // Ignore montagens (no ingredients)
            if (!targetPrep.ingredients || targetPrep.ingredients.filter(i => !i.is_note_row).length === 0) continue;

            let sumCooked = 0;
            let lastProcess = 'raw';
            if (targetPrep.processes && targetPrep.processes.includes('defrosting')) lastProcess = 'thawed';
            if (targetPrep.processes && targetPrep.processes.includes('cleaning')) lastProcess = 'clean';
            if (targetPrep.processes && targetPrep.processes.includes('cooking')) lastProcess = 'cooked';
            if (targetPrep.processes && targetPrep.processes.includes('portioning')) lastProcess = 'portioned';

            for (const ing of (targetPrep.ingredients || [])) {
                if (ing.is_note_row) continue;

                const isExcluded = ing.name && (
                    ing.name.toLowerCase().includes('(fritura)') ||
                    ing.name.toLowerCase().includes('(imers') ||
                    ing.name.toLowerCase().includes('(marinada)')
                );

                if (!isExcluded) {
                    const w = parseFloat(ing['weight_' + lastProcess]?.toString().replace(',', '.') || ing.quantity || '0');
                    sumCooked += w;
                }
            }

            const diff = Math.abs(sumCooked - targetWeight);
            if (diff > 0.005) { // 5g tolerance for floating point rounding in oil-less sums
                hasError = true;
                report.push(`   - [${targetPrep.title}] Target: ${targetWeight.toFixed(3)}kg | Sum (No-Oil): ${sumCooked.toFixed(3)}kg | Diff: ${diff.toFixed(3)}kg`);
            }
        }

        if (hasError) {
            console.log('\n❌ ERROR IN:', recipe.name);
            report.forEach(r => console.log(r));
            discrepanciesFound++;
        }
    }

    console.log('\n=============================================');
    if (discrepanciesFound === 0) {
        console.log('✅ ALL MATRICES MATCH ASSEMBLY WEIGHTS (EXCLUDING OIL)!');
    } else {
        console.log('Total Products with math discrepancies:', discrepanciesFound);
    }
    process.exit(0);
}

setTimeout(() => {
    console.log('TIMEOUT: Force exiting.');
    process.exit(1);
}, 30000);

auditCookedWeightsSafely();
