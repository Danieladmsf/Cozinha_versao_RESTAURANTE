import { db } from '../lib/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function auditCookedWeights() {
    console.log('Fetching Products...');
    const q = query(collection(db, 'Recipe'), where('type', '==', 'produtos'));
    const qs = await getDocs(q);
    console.log('Found', qs.docs.length, 'products.');

    let discrepanciesFound = 0;
    let okCount = 0;

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

            let sumCooked = 0;
            let lastProcess = 'raw';
            const procs = targetPrep.processes || [];
            if (procs.includes('defrosting')) lastProcess = 'thawed';
            if (procs.includes('cleaning')) lastProcess = 'clean';
            if (procs.includes('cooking')) lastProcess = 'cooked';
            if (procs.includes('portioning')) lastProcess = 'portioned';

            for (const ing of (targetPrep.ingredients || [])) {
                if (ing.is_note_row) continue;
                const fieldName = 'weight_' + lastProcess;
                const w = parseFloat(ing[fieldName]?.toString().replace(',', '.') || ing.quantity || '0');
                sumCooked += w;
            }

            const diff = Math.abs(sumCooked - targetWeight);
            if (diff > 0.003) {
                hasError = true;
                report.push(`   - [${targetPrep.title}] Target: ${targetWeight.toFixed(3)}kg | Sum: ${sumCooked.toFixed(3)}kg | Diff: ${diff.toFixed(3)}kg`);
            }
        }

        if (hasError) {
            console.log(`\n❌ ERROR IN: ${recipe.name}`);
            for (const r of report) console.log(r);
            discrepanciesFound++;
        } else {
            okCount++;
        }
    }

    console.log('\n=============================================');
    console.log(`✅ OK: ${okCount} products`);
    console.log(`❌ Discrepancies: ${discrepanciesFound} products`);
    if (discrepanciesFound === 0) {
        console.log('ALL MATRICES MATCH ASSEMBLY WEIGHTS!');
    }

    process.exit(0);
}

setTimeout(() => {
    console.log('TIMEOUT: Force exiting.');
    process.exit(1);
}, 30000);

auditCookedWeights();
