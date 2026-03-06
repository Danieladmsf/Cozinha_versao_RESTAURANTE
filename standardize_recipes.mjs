import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import { doc, updateDoc } from 'firebase/firestore';

const DRY_RUN = true;

async function standardizeRecipes() {
    console.log(`🚀 Inciando Padronização de Receitas (DRY_RUN: ${DRY_RUN})\n`);

    try {
        const snapshot = await getDocs(collection(db, "Recipe"));
        let countNeedsUpdate = 0;
        let countOk = 0;
        let countErrors = 0;

        console.log(`Encontradas ${snapshot.size} receitas na coleção.\n`);

        const globalUpdatePromises = [];

        snapshot.forEach(docSnapshot => {
            const recipe = docSnapshot.data();
            const id = docSnapshot.id;
            let needsUpdate = false;
            let updates = {};

            // O peso que queremos encontrar e garantir que está na raiz
            let portionWeight = 0;
            let expectedUnitType = recipe.unit_type || recipe.container_type || "kg";
            let innerPortionWeight = 0;

            // Lógica de descoberta do peso real da Porção/Embalagem
            if (recipe.preparations && recipe.preparations.length > 0) {
                const lastPrep = recipe.preparations[recipe.preparations.length - 1];
                if (lastPrep.sub_components && lastPrep.sub_components.length > 0) {
                    innerPortionWeight = lastPrep.sub_components.reduce((sum, sub) => {
                        const name = (sub.name || '').toLowerCase();
                        const type = (sub.type || '').toLowerCase();

                        // Ignora itens explicitly como embalagem para não somar 1.0 ou 2.0 à comida
                        if (name.includes('embalagem') || type.includes('embalagem') || type === 'packaging') {
                            return sum;
                        }

                        const w = parseFloat(String(sub.assembly_weight_kg).replace(',', '.')) || 0;
                        return sum + w;
                    }, 0);
                }
                if (lastPrep.assembly_config) {
                    expectedUnitType = lastPrep.assembly_config.unit_type || lastPrep.assembly_config.container_type || expectedUnitType;
                }
            }

            // Descobrindo weight bruto se ele já existir em outro campo
            // Aqui voltamos ao padrão sem filtro < 1, porque já limpamos as embalagens acima
            if (recipe.portion_weight_calculated && recipe.portion_weight_calculated > 0) {
                portionWeight = recipe.portion_weight_calculated;
            } else if (recipe.cuba_weight && Number(recipe.cuba_weight) > 0) {
                portionWeight = Number(recipe.cuba_weight);
            } else if (recipe.yield_weight && Number(recipe.yield_weight) > 0) {
                portionWeight = Number(recipe.yield_weight);
            } else if (innerPortionWeight > 0) {
                portionWeight = innerPortionWeight;
            }

            // Proteção especial para receitas configuradas por Unidade/Cuba que salvam o peso total no yield
            // Utilizamos innerPortionWeight calculada agora de forma higienizada
            if (innerPortionWeight > 0 && innerPortionWeight !== portionWeight) {
                portionWeight = innerPortionWeight;
            }

            // Normalizando unit_type
            if (expectedUnitType === 'porção' || expectedUnitType === 'porcao' || expectedUnitType === 'un' || expectedUnitType === 'unidades') {
                expectedUnitType = 'unidade';
            } else if (expectedUnitType === 'quilo') {
                expectedUnitType = 'kg';
            }

            // Verifica se o documento atual precisa de alteração
            if (Number(recipe.portion_weight_calculated) !== Number(portionWeight) && portionWeight > 0) {
                needsUpdate = true;
                updates.portion_weight_calculated = portionWeight;
            }
            if ((recipe.unit_type || '').toLowerCase() !== expectedUnitType.toLowerCase()) {
                needsUpdate = true;
                updates.unit_type = expectedUnitType.toLowerCase();
            }

            if (needsUpdate) {
                countNeedsUpdate++;
                console.log(`⚠️  [UPDATE] Receita: "${recipe.name}" (${id})`);
                console.log(`    De: portion_weight_calculated=${recipe.portion_weight_calculated}, unit_type=${recipe.unit_type}`);
                console.log(`    Para: portion_weight_calculated=${updates.portion_weight_calculated || recipe.portion_weight_calculated}, unit_type=${updates.unit_type || recipe.unit_type}`);

                if (!DRY_RUN) {
                    const docRef = doc(db, "Recipe", id);
                    const updatePromise = updateDoc(docRef, updates)
                        .then(() => console.log(`    ✅ Atualizado com sucesso.`))
                        .catch(err => {
                            console.error(`    ❌ Erro ao atualizar:`, err);
                            countErrors++;
                        });
                    // Aguardar execução num array ou rodar sequencial
                    // Por simplicidade do script, vamos fazer await dentro de um loop for..of ou via Promise.all
                    // Como estamos dentro do `snapshot.forEach`, não podemos usar await diretamente. 
                    // Vamos ajustar para salvar a promessa
                    globalUpdatePromises.push(updatePromise);
                }
            } else {
                countOk++;
            }
        });

        if (!DRY_RUN) {
            console.log(`\nAguardando ${globalUpdatePromises.length} atualizações no servidor...`);
            await Promise.all(globalUpdatePromises);
        }

        console.log(`\n================================`);
        console.log(`Resumo:`);
        console.log(`Total de Receitas Verificadas: ${snapshot.size}`);
        console.log(`Receitas Atualizadas: ${countNeedsUpdate}`);
        console.log(`Erros de Atualização: ${countErrors}`);
        console.log(`Receitas que já estavam OK: ${countOk}`);
        console.log(`================================\n`);

    } catch (error) {
        console.error("❌ Erro ao rodar script de padronização:", error);
    }

    process.exit(0);
}

standardizeRecipes();
