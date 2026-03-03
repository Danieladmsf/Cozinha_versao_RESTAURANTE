
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer, setDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';

const gid = () => String(Date.now() + Math.random());

class RecipeFactory {
    constructor() {
        this.ingredientsMap = {};
        this.recipesMap = {};
    }

    async loadDB() {
        const ingSnap = await getDocsFromServer(collection(db, "Ingredient"));
        ingSnap.forEach(d => {
            this.ingredientsMap[d.data().name.trim()] = { id: d.id, price: d.data().current_price || 0, unit: d.data().unit };
        });
        const recSnap = await getDocsFromServer(collection(db, "Recipe"));
        recSnap.forEach(d => {
            this.recipesMap[d.data().name.trim()] = { id: d.id, data: d.data() };
        });
    }

    parseNum(val) {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (typeof val === 'string') {
            const p = parseFloat(val.replace(/[^\d.,-]/g, '').replace(',', '.'));
            return isNaN(p) ? 0 : p;
        }
        return 0;
    }

    createNoteRow(text) {
        return { id: gid(), name: text, is_note_row: true, current_price: 0, weight_raw: 0, weight_cooked: 0, yield_weight: 0, ingredient_id: null };
    }

    importMatrixRecipeAsStage(stepNum, recipeName, targetWeightKg) {
        const source = this.recipesMap[recipeName];
        if (!source) {
            console.warn(`[WARN] Receita Matriz não encontrada: "${recipeName}"`);
            return null;
        }

        const basePreps = source.data.preparations || [];
        let totalOriginalYield = 0;
        let allIngredients = [];
        let allProcesses = new Set();
        let allNotes = [];

        basePreps.forEach(prep => {
            if (prep.processes?.includes('assembly') || prep.processes?.includes('portioning')) return;
            (prep.processes || []).forEach(p => allProcesses.add(p));
            (prep.notes || []).forEach(n => allNotes.push(n));
            (prep.ingredients || []).forEach(ing => {
                if (ing.is_note_row || ing.is_header) {
                    allIngredients.push({ ...ing, id: gid() });
                    return;
                }
                const ingFinalWeight = this.parseNum(ing.weight_cooked) || this.parseNum(ing.weight_clean) || this.parseNum(ing.weight_raw);
                totalOriginalYield += ingFinalWeight;
                allIngredients.push({ ...ing, id: gid(), locked: true });
            });
        });

        const factor = (targetWeightKg > 0 && totalOriginalYield > 0) ? (targetWeightKg / totalOriginalYield) : 1;
        const scale = (val) => {
            let num = this.parseNum(val);
            if (num > 0) return String(parseFloat((num * factor).toFixed(5)));
            return String(val || 0);
        };

        if (Math.abs(factor - 1) > 0.001) {
            allIngredients = allIngredients.map(ing => {
                if (ing.is_note_row || ing.is_header) return ing;
                return {
                    ...ing,
                    quantity: scale(ing.quantity),
                    weight_frozen: scale(ing.weight_frozen),
                    weight_raw: scale(ing.weight_raw),
                    weight_thawed: scale(ing.weight_thawed),
                    weight_clean: scale(ing.weight_clean),
                    weight_pre_cooking: scale(ing.weight_pre_cooking),
                    weight_cooked: scale(ing.weight_cooked),
                    weight_portioned: scale(ing.weight_portioned),
                    assembly_weight_kg: scale(ing.assembly_weight_kg),
                    yield_weight: scale(ing.yield_weight)
                };
            });
        }

        allNotes.forEach(note => {
            if (note.content && note.content.trim()) allIngredients.push(this.createNoteRow(note.content));
        });

        const finalProcesses = allProcesses.size > 0 ? Array.from(allProcesses) : ['cooking'];

        return {
            id: gid(),
            title: `${stepNum}ª Etapa: ${recipeName}`,
            processes: finalProcesses,
            ingredients: allIngredients,
            instructions: `Importado da receita base: ${recipeName}`,
            notes: [],
            origin_id: source.id,
            _targetWeight: targetWeightKg
        };
    }

    createPortioningStage(stepNum, importedStages, containerType = 'unidade', unitsQuantity = '1') {
        const subComponents = importedStages.map(s => ({
            id: gid(),
            name: s.title,
            type: 'preparation',
            source_id: s.id,
            assembly_weight_kg: String(s._targetWeight || 0),
            isPackaging: s.processes?.includes('packaging') || false
        }));

        return {
            id: gid(),
            title: `${stepNum}ª Etapa: Porcionamento`,
            processes: ['portioning'],
            ingredients: [],
            sub_components: subComponents,
            notes: [],
            assembly_config: { container_type: containerType, total_weight: '0', units_quantity: unitsQuantity }
        };
    }

    cleanTempFields(preps) {
        return preps.map(p => {
            const cleanPrep = { ...p };
            delete cleanPrep._targetWeight;
            return cleanPrep;
        });
    }
}

const macarraoList = [
    { base: 'Espaguete à Bolonhesa', name: 'Rot.espaguete a Bolonhesa + Polpetone Recheado Bendito', weight: 0.350, extra: { base: 'Polpetone Recheado', weight: 0.150 } },
    { base: 'Macarrão c/ Brócolis e Bacon', name: 'Rotisseria Macarrao C/brocolis e Bacon KG', weight: 0.500 },
    { base: 'Macarrão c/ Calabresa Molho Rosé', name: 'Rotisseria Macarrao C/calabresa Molho Rose Bendito KG', weight: 0.500 },
    { base: 'Macarrão c/ Cheddar e Bacon', name: 'Rotisseria Macarrao C/cheddar e Bacon', weight: 0.500 },
    { base: 'Macarrão Caprese', name: 'Rotisseria Macarrao Caprese KG', weight: 0.500 },
    { base: 'Macarronada à Bolonhesa', name: 'ROTISSERIA MACARRAO ESPECIAL BENDITO KG', weight: 0.350, extra: { base: 'Polpetone Recheado', weight: 0.150 } },
    { base: 'Macarronada à Bolonhesa', name: 'Rotisseria Macarronada a Bolonhesa Bendito KG', weight: 0.500 },
    { base: 'Yakissoba', name: 'Rotisseria Yakissoba Bendito KG', weight: 0.500 },
];

async function main() {
    console.log("🛠️ Limpando antigos itens em coleção Product...");
    const prodSnap = await getDocsFromServer(collection(db, "Product"));
    for (const p of prodSnap.docs) {
        const data = p.data();
        if (macarraoList.some(m => m.name === data.name)) {
            console.log(`  🗑️ Deletando Product velho: ${data.name}`);
            await deleteDoc(p.ref);
        }
    }

    console.log("\n🛠️ Carregando Base para Montagem...");
    const factory = new RecipeFactory();
    await factory.loadDB();

    for (const item of macarraoList) {
        console.log(`\n🍝 Montando Refeição: ${item.name}`);

        let preps = [];

        // 1. Base (Macarrão)
        const baseStage = factory.importMatrixRecipeAsStage(1, item.base, item.weight);
        if (!baseStage) {
            console.error(`  ❌ FALHA AO IMPORTAR BASE: ${item.base}. Pulando...`);
            continue;
        }
        preps.push(baseStage);

        let stagesToPortion = [baseStage];

        // 2. Extra (Polpetone)
        if (item.extra) {
            const extraStage = factory.importMatrixRecipeAsStage(2, item.extra.base, item.extra.weight);
            if (extraStage) {
                preps.push(extraStage);
                stagesToPortion.push(extraStage);
            } else {
                console.error(`  ❌ FALHA AO IMPORTAR EXTRA: ${item.extra.base}`);
            }
        }

        // 3. Portioning
        const stepNum = preps.length + 1;
        const portioningStage = factory.createPortioningStage(stepNum, stagesToPortion, 'unidade', '1');
        preps.push(portioningStage);

        preps = factory.cleanTempFields(preps);

        const recipeId = String(Date.now() + Math.random()).replace('.', '');

        const recipeData = {
            id: recipeId,
            name: item.name,
            type: 'produtos',
            category: 'MACARRÃO (ALMOÇO)',
            category_id: '9PNVdAlz11zrp9wbcrFP',
            preparations: preps,
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            production_time_minutes: 5,
            validity_days: 3,
            version: 1,
            unit: 'un'
        };

        await setDoc(doc(db, "Recipe", recipeId), recipeData);
        console.log(`  ✅ Criada com sucesso na coleção Recipe! (${recipeId})`);
    }

    console.log("\n🚀 Todas as marmitas de macarrão recriadas perfeitamente!");
    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
