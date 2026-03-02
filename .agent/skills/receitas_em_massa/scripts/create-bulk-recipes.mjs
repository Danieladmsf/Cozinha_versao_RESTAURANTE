
/**
 * PADRÃO CONSOLIDADO DE PREPARAÇÃO DE RECEITAS (NO GHOST FIELDS)
 * 
 * Este script deve ser usado como boilerplate para inserção/migração 
 * em lote de receitas no sistema.
 */
import { db } from '../lib/firebase.js'; // Ajustar caminho relativo se rodar da raiz
import { collection, getDocsFromServer, updateDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';

const gid = () => String(Date.now() + Math.random());

export class RecipeFactory {
    constructor() {
        this.ingredientsMap = {}; // { "Arroz Branco": { id, price, unit } }
        this.recipesMap = {};     // { "Arroz Branco": { id, data } }
    }

    async loadDB() {
        console.log("📥 Carregando ingredientes e receitas...");
        const ingSnap = await getDocsFromServer(collection(db, "Ingredient"));
        ingSnap.forEach(d => {
            this.ingredientsMap[d.data().name.trim()] = {
                id: d.id,
                price: d.data().current_price || 0,
                unit: d.data().unit
            };
        });

        const recSnap = await getDocsFromServer(collection(db, "Recipe"));
        recSnap.forEach(d => {
            this.recipesMap[d.data().name.trim()] = {
                id: d.id,
                data: d.data()
            };
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

    /** 
     * Retorna a estrutura PERFEITA de um ingrediente simples sem criar campos fantasmas 
     */
    createIngredient(name, weightRaw, weightClean, weightCooked) {
        const item = this.ingredientsMap[name];
        if (!item) {
            console.warn(`[WARN] Ingrediente bruto não encontrado: "${name}"`);
            return null;
        }

        const raw = String(weightRaw);
        const clean = String(weightClean || weightRaw);
        const cooked = String(weightCooked || clean);

        return {
            id: gid(),
            ingredient_id: item.id,
            name: name,
            unit: item.unit,
            quantity: raw,
            current_price: item.price,
            weight_raw: raw,
            weight_clean: clean,
            weight_cooked: cooked,
            weight_frozen: 0,
            weight_thawed: 0,
            weight_pre_cooking: clean,
            weight_portioned: 0,
            yield_weight: 0,
            cost_raw: 0,
            cost_clean: 0,
            cost_cooked: 0,
            locked: false
        };
    }

    /** 
     * Retorna a estrutura PERFEITA para uma nota/linha de instrução interpolada 
     */
    createNoteRow(text) {
        return {
            id: gid(),
            name: text,
            is_note_row: true,
            current_price: 0,
            weight_raw: 0,
            weight_cooked: 0,
            yield_weight: 0,
            ingredient_id: null
        };
    }

    /**
     * Importa uma receita matriz existente (ex: "Arroz Branco") como uma Sub-Etapa (Imported Stage).
     * Essa função garante a correta escala dos ingredientes para o `targetWeightKg`.
     */
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

        // Coleta tudo da receita base
        basePreps.forEach(prep => {
            if (prep.processes?.includes('assembly') || prep.processes?.includes('portioning')) return;

            (prep.processes || []).forEach(p => allProcesses.add(p));
            (prep.notes || []).forEach(n => allNotes.push(n));

            (prep.ingredients || []).forEach(ing => {
                if (ing.is_note_row || ing.is_header) {
                    allIngredients.push({ ...ing, id: gid() }); // keep structural notes
                    return;
                }

                // Determina o Yield real original deste ingrediente
                const ingFinalWeight = this.parseNum(ing.weight_cooked) || this.parseNum(ing.weight_clean) || this.parseNum(ing.weight_raw);
                totalOriginalYield += ingFinalWeight;

                allIngredients.push({ ...ing, id: gid(), locked: true });
            });
        });

        // Aplicar o Scaling Factor (Fator de Escala)
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

        // Intercalar notas como linhas
        allNotes.forEach(note => {
            if (note.content && note.content.trim()) {
                allIngredients.push(this.createNoteRow(note.content));
            }
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
            _targetWeight: targetWeightKg // Campo temp para o porcionamento
        };
    }

    /**
     * Cria a etapa de porcionamento consolidada apontando para todas as sub-etapas (assembly)
     */
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
            assembly_config: {
                container_type: containerType,
                total_weight: '0',
                units_quantity: unitsQuantity
            }
        };
    }

    /**
     * Finaliza a limpeza de campos temporários (como _targetWeight) das etapas
     */
    cleanTempFields(preps) {
        return preps.map(p => {
            const cleanPrep = { ...p };
            delete cleanPrep._targetWeight;
            return cleanPrep;
        });
    }
}

// ==========================================
// EXEMPLO DE USO EM SCRIPTS
// ==========================================
/*
async function ex() {
    const factory = new RecipeFactory();
    await factory.loadDB();

    // 1. Criando uma receita simples
    const arrozIngs = [
        factory.createIngredient('Arroz Branco', 1, 1, 2.5),
        factory.createIngredient('Água', 1.8, 1.8, 0)
    ];

    // 2. Criando uma Refeição (Montagem de Matrizes)
    const arrozStage = factory.importMatrixRecipeAsStage(1, 'Arroz Branco', 0.160);
    const feijaoStage = factory.importMatrixRecipeAsStage(2, 'Feijão', 0.100);
    
    let preps = [arrozStage, feijaoStage];
    
    const portioningStage = factory.createPortioningStage(3, preps, 'unidade', '1');
    preps.push(portioningStage);
    
    preps = factory.cleanTempFields(preps);

    console.log(JSON.stringify(preps, null, 2));
}
// ex();
*/
