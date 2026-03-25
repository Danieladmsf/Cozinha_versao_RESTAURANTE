import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

/**
 * Script para corrigir as receitas que usam "Arroz Tipo 1" (sem ingredient_id)
 * para apontar para o ingrediente correto "Arroz Branco T1" (ID: G0yDb6fy22MzkEsUUUsL)
 * 
 * Receitas afetadas (encontradas no script de diagnóstico):
 * - Arroz à Grega (Cc0cyKOKAOZQFp6fASr3)
 * - Arroz Carreteiro (oPkpKjmRiqWx42PSzcTa)
 * - Charuto (KW4aQKQwqYcoFUDBioSA)
 * - Rotisseria Arroz A Grega Bendito Kg (rec_SxQfoFIzvREMbWUce04P_1772574276300)
 * - Rotisseria Arroz Carreteiro Bendito Kg (rec_Ul19G41iWbVT1Bpjg7Uz_1772574277029)
 * - Rotisseria Charuto Bendito Kg (rec_jf4UnLgwNQHbVVvNRJmq_1772574281946)
 */

const CORRECT_INGREDIENT_ID = 'G0yDb6fy22MzkEsUUUsL';
const CORRECT_INGREDIENT_NAME = 'Arroz Branco T1';
const OLD_NAME = 'Arroz Tipo 1';

const DRY_RUN = false; // ← Aplicando alterações!

async function run() {
    console.log('====================================================');
    console.log('   CORREÇÃO: "Arroz Tipo 1" → "Arroz Branco T1"');
    console.log(`   MODO: ${DRY_RUN ? '🔍 DRY RUN (apenas simulação)' : '⚠️  APLICANDO ALTERAÇÕES!'}`);
    console.log('====================================================\n');

    const recipeSnap = await getDocs(collection(db, 'Recipe'));
    let fixCount = 0;

    for (const recipeDoc of recipeSnap.docs) {
        const data = recipeDoc.data();
        const recipeName = data.name || 'Sem Nome';
        let needsUpdate = false;
        const updatedPreparations = JSON.parse(JSON.stringify(data.preparations || []));

        // Verificar em preparations[].ingredients
        for (let pi = 0; pi < updatedPreparations.length; pi++) {
            const prep = updatedPreparations[pi];
            const ingredients = prep.ingredients || [];

            for (let ii = 0; ii < ingredients.length; ii++) {
                const ing = ingredients[ii];
                const ingName = (ing.name || '').trim();

                if (ingName.toLowerCase() === OLD_NAME.toLowerCase()) {
                    console.log(`\n📌 RECEITA: "${recipeName}" (${recipeDoc.id})`);
                    console.log(`   Etapa: "${prep.title || 'sem título'}"`);
                    console.log(`   ANTES: name="${ing.name}" | ingredient_id="${ing.ingredient_id || 'N/A'}"`);

                    // Corrigir nome e adicionar ingredient_id
                    updatedPreparations[pi].ingredients[ii].name = CORRECT_INGREDIENT_NAME;
                    updatedPreparations[pi].ingredients[ii].ingredient_id = CORRECT_INGREDIENT_ID;

                    console.log(`   DEPOIS: name="${CORRECT_INGREDIENT_NAME}" | ingredient_id="${CORRECT_INGREDIENT_ID}"`);
                    needsUpdate = true;
                    fixCount++;
                }
            }
        }

        // Verificar também em top-level ingredients[] (se existir)
        const updatedIngredients = JSON.parse(JSON.stringify(data.ingredients || []));
        for (let ii = 0; ii < updatedIngredients.length; ii++) {
            const ing = updatedIngredients[ii];
            const ingName = (ing.name || '').trim();

            if (ingName.toLowerCase() === OLD_NAME.toLowerCase()) {
                console.log(`\n📌 RECEITA: "${recipeName}" (${recipeDoc.id})`);
                console.log(`   Local: ingredients[] (top-level)`);
                console.log(`   ANTES: name="${ing.name}" | ingredient_id="${ing.ingredient_id || 'N/A'}"`);

                updatedIngredients[ii].name = CORRECT_INGREDIENT_NAME;
                updatedIngredients[ii].ingredient_id = CORRECT_INGREDIENT_ID;

                console.log(`   DEPOIS: name="${CORRECT_INGREDIENT_NAME}" | ingredient_id="${CORRECT_INGREDIENT_ID}"`);
                needsUpdate = true;
                fixCount++;
            }
        }

        // Aplicar update se necessário
        if (needsUpdate && !DRY_RUN) {
            const updateData = {};
            if (updatedPreparations.length > 0) updateData.preparations = updatedPreparations;
            if (updatedIngredients.length > 0) updateData.ingredients = updatedIngredients;

            await updateDoc(doc(db, 'Recipe', recipeDoc.id), updateData);
            console.log(`   ✅ ATUALIZADO no Firebase!`);
        }
    }

    console.log('\n====================================================');
    console.log(`   RESULTADO: ${fixCount} ingrediente(s) encontrados para correção`);
    if (DRY_RUN) {
        console.log('   ⚠️  Nenhuma alteração foi aplicada (DRY RUN)');
        console.log('   Para aplicar, altere DRY_RUN = false no script');
    } else {
        console.log(`   ✅ ${fixCount} ingrediente(s) corrigidos no Firebase!`);
    }
    console.log('====================================================\n');

    process.exit(0);
}

run().catch(e => { console.error('Erro:', e); process.exit(1); });
