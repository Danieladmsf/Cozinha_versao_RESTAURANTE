import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function findCorruptedExports() {
    console.log("Baixando todas as receitas do banco de dados...");
    const snap = await getDocs(collection(db, 'Recipe'));
    const recipes = new Map();

    snap.forEach(d => {
        recipes.set(d.id, { id: d.id, ...d.data() });
    });

    console.log(`Total de registros no banco: ${recipes.size}`);

    const corruptedProducts = [];

    // Iterar sobre todos os produtos
    for (const [id, recipe] of recipes) {
        if (recipe.type !== 'produtos') continue;

        const preps = recipe.preparations || [];
        let hasCorruption = false;
        const corruptedIssues = [];

        preps.forEach((prep, idx) => {
            if (prep.origin_id) {
                const originRecipe = recipes.get(prep.origin_id);

                // Se a origem não existir mais, ou pior: Se a origem for do tipo 'produtos'
                if (!originRecipe) {
                    hasCorruption = true;
                    corruptedIssues.push(`Etapa ${idx + 1} ('${prep.title}') aponta para ID inexistente: ${prep.origin_id}`);
                } else if (originRecipe.type === 'produtos') {
                    hasCorruption = true;
                    corruptedIssues.push(`Etapa ${idx + 1} ('${prep.title}') importou PRODUTO ('${originRecipe.name}') ao invés de MATRIZ. origin_id: ${prep.origin_id}`);
                }
            }
        });

        if (hasCorruption) {
            corruptedProducts.push({
                productName: recipe.name,
                productId: recipe.id,
                issues: corruptedIssues
            });
        }
    }

    console.log("\n================ RESULTADO DA ANÁLISE ================");
    if (corruptedProducts.length === 0) {
        console.log("Nenhum produto corrompido foi encontrado! Seu banco está limpo.");
    } else {
        console.log(`ATENÇÃO: Foram encontrados ${corruptedProducts.length} produtos com importação incorreta.\n`);
        corruptedProducts.forEach((cp, i) => {
            console.log(`[${i + 1}] Produto: ${cp.productName}`);
            console.log(`    Link do Produto: /receitas/${cp.productId}`);
            cp.issues.forEach(issue => console.log(`    -> ERRO: ${issue}`));
            console.log("------------------------------------------------------");
        });

        fs.writeFileSync('corrupted_products_report.json', JSON.stringify(corruptedProducts, null, 2));
        console.log("\nUm relatório completo foi salvo em 'corrupted_products_report.json'.");
    }
}

findCorruptedExports().then(() => process.exit(0)).catch(console.error);
