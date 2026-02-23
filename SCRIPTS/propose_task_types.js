import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Inicialização do Firebase Admin
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

let app;
try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    app = initializeApp({
        credential: cert(serviceAccount)
    });
} catch (error) {
    console.error("Erro ao ler credenciais do Firebase:", error.message);
    process.exit(1);
}

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

async function analyzeRecipes() {
    console.log("Obtendo receitas do Firestore...");
    const recipesSnapshot = await db.collection('recipes').get();

    let logs = [];
    let updatedCount = 0;

    recipesSnapshot.forEach(doc => {
        const recipe = doc.data();
        if (!recipe.preparations || recipe.preparations.length === 0) return;

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

        let recipeLog = `\n--- RECEITA: ${recipe.name.toUpperCase()} (ID: ${doc.id}) ---\n`;
        recipeLog += `Modo: ${recipeHasYieldItems ? 'RENDIMENTO (Apenas itens rendosos selecionados)' : 'PROTAGONISTA ÚNICO (Sem rendimento, marcando chefia)'}\n`;

        let changed = false;

        recipe.preparations.forEach((prep, pIdx) => {
            if (!prep.ingredients) return;

            prep.ingredients.forEach((ing, iIdx) => {
                if (!ing.name) return;

                const oldTypes = Array.isArray(ing.task_type) ? ing.task_type.join(',') : (ing.task_type || '');
                let newTypes = [];
                let action = '';

                if (recipeHasYieldItems) {
                    if (containsKeyword(ing.name, YIELD_KEYWORDS)) {
                        newTypes = ['rendimento'];
                        action = 'MARCADO COMO RENDIMENTO';
                    } else {
                        newTypes = null;
                        action = 'LIMPO';
                    }
                } else {
                    if (containsKeyword(ing.name, PROTAGONIST_KEYWORDS) && !containsKeyword(ing.name, IGNORE_KEYWORDS)) {
                        newTypes = ['processamento'];
                        action = 'MARCADO COMO PROTAGONISTA (Processamento)';
                    } else {
                        newTypes = null;
                        action = 'LIMPO';
                    }
                }

                const newTypesStr = newTypes ? newTypes.join(',') : '[]';
                if (oldTypes !== newTypesStr) {
                    changed = true;
                    recipeLog += ` - [${prep.title || 'Prep'}] ${ing.name}: ${oldTypes || '[]'} -> ${newTypesStr} (${action})\n`;
                }
            });
        });

        if (changed) {
            logs.push(recipeLog);
            updatedCount++;
        }
    });

    const outputStr = `Total de receitas a serem atualizadas: ${updatedCount}\n\n` + logs.join('');
    const outputFilePath = path.join(__dirname, 'proposed_task_types.txt');
    fs.writeFileSync(outputFilePath, outputStr);
    console.log(`Análise concluída. Verifique ${outputFilePath} para as mudanças em ${updatedCount} receitas.`);
}

analyzeRecipes().catch(console.error);
