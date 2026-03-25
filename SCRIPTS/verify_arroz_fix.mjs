import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

async function run() {
    console.log('====================================================');
    console.log('   VERIFICAÇÃO PÓS-CORREÇÃO — ARROZ NO FIREBASE');
    console.log('====================================================\n');

    // 1) Verificar ingredientes com "arroz" no cadastro
    console.log('─── 1. INGREDIENTES CADASTRADOS COM "ARROZ" ───\n');
    const ingSnap = await getDocs(collection(db, 'Ingredient'));
    let arrozCount = 0;
    ingSnap.forEach(d => {
        const data = d.data();
        if ((data.name || '').toLowerCase().includes('arroz')) {
            console.log(`  ✅ ID: ${d.id} | Nome: "${data.name}" | Cat: ${data.category || 'N/A'}`);
            arrozCount++;
        }
    });
    console.log(`\n  Total: ${arrozCount} ingrediente(s) com "arroz"\n`);

    // 2) Verificar se "Arroz Branco Tipo 1" (97aLEH4kmKHhFusa1aKQ) foi removido
    console.log('─── 2. INGREDIENTE ÓRFÃO "ARROZ BRANCO TIPO 1" ───\n');
    const orphanRef = await getDoc(doc(db, 'Ingredient', '97aLEH4kmKHhFusa1aKQ'));
    if (orphanRef.exists()) {
        console.log('  ❌ AINDA EXISTE! Não foi removido.');
    } else {
        console.log('  ✅ Removido com sucesso! Não existe mais no banco.');
    }

    // 3) Verificar se alguma receita ainda usa "Arroz Tipo 1"
    console.log('\n─── 3. RECEITAS QUE AINDA USAM "ARROZ TIPO 1" ───\n');
    const recipeSnap = await getDocs(collection(db, 'Recipe'));
    let problemCount = 0;

    recipeSnap.forEach(d => {
        const data = d.data();
        // Checar preparations
        for (const prep of (data.preparations || [])) {
            for (const ing of (prep.ingredients || [])) {
                if ((ing.name || '').toLowerCase() === 'arroz tipo 1') {
                    console.log(`  ❌ RECEITA: "${data.name}" (${d.id}) → Etapa: "${prep.title}" → "${ing.name}"`);
                    problemCount++;
                }
            }
        }
        // Checar top-level
        for (const ing of (data.ingredients || [])) {
            if ((ing.name || '').toLowerCase() === 'arroz tipo 1') {
                console.log(`  ❌ RECEITA: "${data.name}" (${d.id}) → ingredients[] → "${ing.name}"`);
                problemCount++;
            }
        }
    });

    if (problemCount === 0) {
        console.log('  ✅ Nenhuma receita usa "Arroz Tipo 1" — Todas corrigidas!');
    } else {
        console.log(`\n  ❌ ${problemCount} receita(s) ainda com problema!`);
    }

    // 4) Verificar receitas que usam "Arroz Branco T1" corretamente
    console.log('\n─── 4. RECEITAS QUE USAM "ARROZ BRANCO T1" (CORRETO) ───\n');
    let correctCount = 0;

    recipeSnap.forEach(d => {
        const data = d.data();
        for (const prep of (data.preparations || [])) {
            for (const ing of (prep.ingredients || [])) {
                if ((ing.name || '') === 'Arroz Branco T1') {
                    const hasId = ing.ingredient_id === 'G0yDb6fy22MzkEsUUUsL';
                    console.log(`  ${hasId ? '✅' : '⚠️'} "${data.name}" → "${prep.title}" → ${ing.name} (ingredient_id: ${ing.ingredient_id || 'N/A'})`);
                    correctCount++;
                }
            }
        }
    });
    console.log(`\n  Total: ${correctCount} receita(s) usando "Arroz Branco T1" corretamente`);

    // 5) Resumo final
    console.log('\n====================================================');
    console.log('   RESUMO FINAL');
    console.log('====================================================');
    console.log(`  Ingrediente órfão removido: ${!orphanRef.exists() ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`  Receitas com "Arroz Tipo 1": ${problemCount === 0 ? '✅ ZERO (tudo corrigido)' : `❌ ${problemCount} restante(s)`}`);
    console.log(`  Receitas usando "Arroz Branco T1": ✅ ${correctCount}`);
    console.log('====================================================\n');

    process.exit(0);
}

run().catch(e => { console.error('Erro:', e); process.exit(1); });
