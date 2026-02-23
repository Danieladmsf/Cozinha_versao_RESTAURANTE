import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';

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

// Keywords explicitly requested by the user, expanding "carnes" into its sub-types
// carnes, pimentão, salsinha, batata, brocolis, mussarela, cenoura, presunto, pepino, repolho, calabresa, paio, couve flor, beterraba, mandioca, couve, vagem, berinjela.
const PRE_PREPARO_KEYWORDS = [
    // Carnes e Proteínas expandidas
    'carne', 'frango', 'porco', 'peixe', 'patinho', 'músculo', 'musculo', 'costela',
    'coxão', 'coxao', 'peito', 'isca', 'filé', 'file', 'salmão', 'salmao', 'tilápia', 'tilapia',
    'lombo', 'bacon', 'linguiça', 'linguica', 'camarão', 'camarao', 'soja',
    'hambúrguer', 'hamburguer', 'pernil', 'alcatra', 'calabresa', 'paio',

    // Demais itens solicitados
    'pimentão', 'pimentao', 'salsinha', 'batata', 'brócolis', 'brocolis',
    'mussarela', 'cenoura', 'presunto', 'pepino', 'repolho',
    'couve-flor', 'couve flor', 'beterraba', 'mandioca', 'couve', 'vagem', 'berinjela'
];

function containsKeyword(name, keywords) {
    const lowerName = name.toLowerCase();
    // Use word boundaries for "couve" so it doesn't accidentally match inside another word if it existed, but simple includes is usually fine since "couve" is a distinct word. We'll use includes for safety.
    // Actually, "couve" is a substring of "couve flor" and "couve-flor", so if we match "couve", it matches the others too, which is fine since they are all requested.
    return keywords.some(kw => {
        // Para evitar falsos positivos com "couve", vamos checar se a string "couve" não está grudada em outra coisa, 
        // mas dado o contexto de ingredientes culinários, includes é suficiente.
        return lowerName.includes(kw);
    });
}

async function runUpdate() {
    console.log("Iniciando varredura das receitas em 'Recipe' para PRÉ-PREPARO...");
    const snapshot = await getDocs(collection(db, 'Recipe'));

    const batch = writeBatch(db);
    let batchAssigments = 0;

    snapshot.forEach(docSnap => {
        const recipe = docSnap.data();
        if (!recipe.preparations || recipe.preparations.length === 0) return;

        let changed = false;
        const newPreparations = JSON.parse(JSON.stringify(recipe.preparations));

        newPreparations.forEach((prep) => {
            if (!prep.ingredients) return;

            prep.ingredients.forEach((ing) => {
                if (!ing.name) return;

                const currentTypes = Array.isArray(ing.task_type) ? [...ing.task_type] : (ing.task_type ? [ing.task_type] : []);

                if (containsKeyword(ing.name, PRE_PREPARO_KEYWORDS)) {
                    if (!currentTypes.includes('pre_preparo')) {
                        currentTypes.push('pre_preparo');
                        ing.task_type = currentTypes;
                        changed = true;
                    }
                }
            });
        });

        if (changed) {
            batch.update(docSnap.ref, { preparations: newPreparations });
            batchAssigments++;
            console.log(`Receita atualizada (Pré-preparo adicionado): ${recipe.name} (${docSnap.id})`);
        }
    });

    if (batchAssigments > 0) {
        console.log(`Aplicando ${batchAssigments} modificações no Firestore...`);
        await batch.commit();
        console.log("Sucesso! Banco atualizado para pré-preparo.");
    } else {
        console.log("Nenhuma receita precisou de mudanças.");
    }
    process.exit(0);
}

runUpdate().catch(console.error);
