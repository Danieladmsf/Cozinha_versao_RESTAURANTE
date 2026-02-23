import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Keywords para "Rendimento" (Grãos, Massas, que dobram de tamanho)
const YIELD_KEYWORDS = [
    'arroz', 'feijão', 'feijao', 'macarrão', 'macarrao', 'massa', 'espaguete',
    'penne', 'fusilli', 'nhoque', 'quinoa', 'lentilha', 'grão de bico', 'grao de bico',
    'cuscuz', 'fettuccine', 'linguine', 'talharim'
];

// Keywords para "Protagonistas" (Carnes, Vegetais principais, Bases de Torta)
const PROTAGONIST_KEYWORDS = [
    // Carnes e Proteínas
    'frango', 'carne', 'patinho', 'músculo', 'musculo', 'costela', 'coxão', 'coxao',
    'peito', 'isca', 'filé', 'file', 'peixe', 'salmão', 'salmao', 'tilápia', 'tilapia',
    'porco', 'lombo', 'calabresa', 'bacon', 'linguiça', 'linguica', 'camarão', 'camarao',
    'soja', 'hambúrguer', 'hamburguer', 'carne moída', 'carne moida', 'pernil', 'alcatra',
    // Vegetais principais / Bases
    'abobrinha', 'berinjela', 'brócolis', 'brocolis', 'couve-flor', 'cogumelo',
    'shimeji', 'shitake', 'palmito', 'mandioca', 'batata', 'cenoura', 'abóbora', 'abobora',
    // Produtos chave
    'panqueca', 'torta', 'quiche', 'queijo', 'presunto', 'mussarela'
];

// Termos a ignorar se não tivermos escolha melhor
const IGNORE_KEYWORDS = [
    'sal', 'azeite', 'óleo', 'oleo', 'pimenta', 'alho', 'cebola', 'água', 'agua',
    'caldo', 'corante', 'tempero', 'ervas', 'salsa', 'cebolinha', 'vinagre', 'limão', 'limao',
    'manteiga', 'margarina', 'açúcar', 'acucar', 'colorau', 'louro'
];

function containsKeyword(name, keywords) {
    const lowerName = name.toLowerCase();
    return keywords.some(kw => lowerName.includes(kw));
}

async function runReset() {
    console.log("Iniciando varredura das receitas em 'Recipe'...");
    const snapshot = await getDocs(collection(db, 'Recipe'));

    let updatedCount = 0;
    const batch = writeBatch(db);
    let batchAssigments = 0;

    snapshot.forEach(docSnap => {
        const recipe = docSnap.data();
        if (!recipe.preparations || recipe.preparations.length === 0) return;

        // Fase 1: Checar se a receita tem itens de rendimento
        let recipeHasYieldItems = false;
        for (const prep of recipe.preparations) {
            if (!prep.ingredients) continue;
            for (const ing of prep.ingredients) {
                if (!ing.name) continue;
                if (containsKeyword(ing.name, YIELD_KEYWORDS)) {
                    recipeHasYieldItems = true;
                    break;
                }
            }
            if (recipeHasYieldItems) break;
        }

        let changed = false;

        // Cópia profunda para mutação segura
        const newPreparations = JSON.parse(JSON.stringify(recipe.preparations));

        newPreparations.forEach((prep) => {
            if (!prep.ingredients) return;

            prep.ingredients.forEach((ing) => {
                if (!ing.name) return;

                const oldTypes = Array.isArray(ing.task_type) ? ing.task_type.join(',') : (ing.task_type || '');
                let newTypes = [];

                if (recipeHasYieldItems) {
                    // Tem rendimento real -> marca só eles
                    if (containsKeyword(ing.name, YIELD_KEYWORDS)) {
                        newTypes = ['rendimento'];
                    } else {
                        newTypes = null;
                    }
                } else {
                    // Não tem rendimento -> marca os protagonistas do prato
                    if (containsKeyword(ing.name, PROTAGONIST_KEYWORDS) && !containsKeyword(ing.name, IGNORE_KEYWORDS)) {
                        // OBS: O USUÁRIO CONFIRMOU QUE A COLUNA TAMBÉM É "RENDIMENTO" NESSE CASO!
                        newTypes = ['rendimento'];
                    } else {
                        newTypes = null;
                    }
                }

                const newTypesStr = newTypes ? newTypes.join(',') : '';
                // Se era '[]' nos dados e newTypesStr é '', eles são equivalentes no banco na prática pois geralmente passamos null ou não existe a key se for nulo, mas para simplificar vamos comparar com segurança:
                const oldStrNormalized = oldTypes === '[]' || oldTypes === 'null' || !oldTypes ? '' : oldTypes;

                if (oldStrNormalized !== newTypesStr) {
                    changed = true;
                    ing.task_type = newTypes; // Muta localmente
                }
            });
        });

        if (changed) {
            batch.update(docSnap.ref, { preparations: newPreparations });
            updatedCount++;
            batchAssigments++;
            console.log(`Receita atualizada: ${recipe.name} (${docSnap.id}) [HasYield: ${recipeHasYieldItems}]`);
        }
    });

    if (batchAssigments > 0) {
        console.log(`Aplicando ${batchAssigments} modificações no Firestore...`);
        await batch.commit();
        console.log("Sucesso! Banco atualizado.");
    } else {
        console.log("Nenhuma receita precisou de mudanças.");
    }
    process.exit(0);
}

runReset().catch(console.error);
