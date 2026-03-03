
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer, setDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';

const catsToMigrate = [
    'MONO ARROZ (ALMOÇO)',
    'MONO FEIJÃO (ALMOÇO)',
    'MONO GUARNIÇÃO (ALMOÇO)',
    'MONO PROTEINAS (ALMOÇO)',
    'MASSAS (TARDE)'
];

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

function findBaseRecipe(productName, availableRecipes) {
    const pn = productName.toLowerCase().replace('rotisseria', '').replace('bendito', '').replace('kg', '').replace('unidade', '').trim();

    const manualMap = {
        'feijao': 'Feijão',
        'arroz branco': 'Arroz Branco',
        'arroz carreteiro': 'Arroz Carreteiro',
        'arroz a grega': 'Arroz à Grega',
        'bife a role': 'Bife à Rolê',
        'batata assada': 'Batata Assada',
        'pure de batata': 'Purê de Batata',
        'carne de panela': 'Carne de Panela',
        'creme de milho': 'Creme de Milho',
        'couve flor empanada': 'Couve-flor Empanada',
        'cupim assado molho alho': 'Cupim Assado',
        'ass.frango metade': 'Frango Metade',
        'linguica recheada assada': 'Linguiça Recheada',
        'file sobrecoxa assada': 'Filé Sobrecoxa Assada',
        'maminha assada': 'Maminha Assada',
        'banana': 'Banana Frita',
        'tulipa bufalo wings': 'Tulipa Buffalo Wings',
        'purê de cabotia': 'Purê de Cabotiá',
        'dobradinha': 'Dobradinha',
        'coxa sobrecoxa assada': 'Coxa Sobrecoxa Assada',
        'lagarto ao molho madeira': 'Lagarto M. Madeira',
        'isca de frango a milanesa': 'Isca Frango Milanesa',
        'jilo frito': 'Jiló Frito',
        'nhoque ao molho sugo': 'Nhoque Sugo',
        'sobrecoxa recheada': 'Sobrecoxa Recheada',
        'joelho porco assado': 'Joelho de Porco',
        'lasanha a bolonhesa': 'Lasanha',
        'charuto': 'Charuto',
        'polenta ao molho carne moida': 'Polenta Carne Moída',
        'strogonoff de frango': 'Strogonoff de Frango',
        'canelone pre/queijo e m.branco': 'Canelone',
        'escondidinho frango': 'Escondidinho',
        'escondidinho de carne seca': 'Escondidinho',
        'escondidinho de calabresa': 'Escondidinho',
        'linguica assada': 'Linguiça Assada',
        'bife de pernil ao molho barbecue': 'Pernil Molho Ferrugem',
        'abobrinha gratinada': 'Padrão',
        'ass.frango bendito inteiro': 'Frango Inteiro',
        'farofa': 'Farofa',
        'batata/recheada  brocolis e bacon': 'Batata Recheada',
        'medalhao frango': 'Medalhão de Frango',
        'legumes': 'Legumes',
        'berinjela pizzaola': 'Berinjela Pizzaiola',
        'strogonoff de carne': 'Strogonoff Beef',
        'frango xadrez': 'Frango Xadrez',
        'file frango parmegiana': 'Filé Parmegiana',
        'quibe assado': 'Quibe Assado',
        'panqueca de carne ao pomodoro': 'Panquecas',
        'panqueca presunto e mussarela': 'Panquecas',
        'rondele frango requeijao': 'Rodelli',
        'panqueca frango c requeijao': 'Panquecas'
    };

    for (const [key, val] of Object.entries(manualMap)) {
        if (pn.includes(key) || key.includes(pn)) {
            return val;
        }
    }

    return null;
}

async function main() {
    console.log("🛠️ Iniciando Migração de Produtos Fantasmas para Refeições...");

    // Get Categories ID Map
    const catSnap = await getDocsFromServer(collection(db, "CategoryTree"));
    const catMap = {};
    catSnap.forEach(d => {
        catMap[d.data().name] = d.id;
    });

    const factory = new RecipeFactory();
    await factory.loadDB();

    const prodSnap = await getDocsFromServer(collection(db, "Product"));

    let migratedCount = 0;

    for (const p of prodSnap.docs) {
        const data = p.data();
        if (catsToMigrate.includes(data.category)) {
            const baseRecipeName = findBaseRecipe(data.name, factory.recipesMap);

            if (!baseRecipeName || !factory.recipesMap[baseRecipeName]) {
                console.log(`⚠️ Skiping ${data.name} (Cat: ${data.category}) - RECEITA BASE NÃO ENCONTRADA (${baseRecipeName})`);
                continue;
            }

            console.log(`\n📦 Migrando: ${data.name} (Baseada em: ${baseRecipeName})`);

            let preps = [];
            const baseStage = factory.importMatrixRecipeAsStage(1, baseRecipeName, 0.400); // generic 400g per KG/tray

            if (baseStage) {
                preps.push(baseStage);
                const portioningStage = factory.createPortioningStage(2, [baseStage], 'unidade', '1');
                preps.push(portioningStage);
                preps = factory.cleanTempFields(preps);
            }

            const recipeId = String(Date.now() + Math.random()).replace('.', '');
            const newRecipe = {
                id: recipeId,
                name: data.name,
                type: 'produtos',
                category: data.category,
                category_id: catMap[data.category] || data.category_id,
                preparations: preps,
                active: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                production_time_minutes: 5,
                validity_days: data.shelf_life_days || 3,
                version: 1,
                unit: data.unit_type || 'un',
                code: data.code || null,
                id_vr: data.id_vr || null
            };

            await setDoc(doc(db, "Recipe", recipeId), newRecipe);
            await deleteDoc(p.ref);

            console.log(`  ✅ Criado como Recipe (${recipeId}) e Produto antigo deletado.`);
            migratedCount++;
        }
    }

    console.log(`\n🎉 Migração Finalizada! ${migratedCount} itens migrados com sucesso para Ficha Técnica.`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
