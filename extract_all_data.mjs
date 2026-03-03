
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer, doc, getDoc } from 'firebase/firestore';

async function main() {
    console.log("Extraindo dados do Firebase...");

    // Mapa de Categorias para pegar os nomes se estiverem só com ID
    const catSnap = await getDocsFromServer(collection(db, "Category"));
    const categoryMap = {};
    catSnap.forEach(d => {
        categoryMap[d.id] = d.data().name;
    });

    const getCatName = (catIdOrName) => {
        if (!catIdOrName) return "SEM CATEGORIA";
        return categoryMap[catIdOrName] || catIdOrName;
    };

    let report = "=================================================\n";
    report += "          RELATÓRIO DE RECEITAS ATIVAS\n";
    report += "=================================================\n\n";

    const recipeSnap = await getDocsFromServer(collection(db, "Recipe"));
    let recipeCount = 0;

    // Sort logic
    const recipes = [];
    recipeSnap.forEach(d => {
        const data = d.data();
        recipes.push({
            name: data.name || "Sem Nome",
            category: getCatName(data.category || data.category_id)
        });
    });

    recipes.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

    let currentCategory = "";
    recipes.forEach(r => {
        if (r.category !== currentCategory) {
            report += `\n[ ${r.category.toUpperCase()} ]\n`;
            currentCategory = r.category;
        }
        report += `- ${r.name}\n`;
        recipeCount++;
    });

    report += `\nTotal de Receitas (Recipe): ${recipeCount}\n\n`;

    report += "=================================================\n";
    report += "          RELATÓRIO DE PRODUTOS\n";
    report += "=================================================\n\n";

    const productSnap = await getDocsFromServer(collection(db, "Product"));
    let productCount = 0;

    const products = [];
    productSnap.forEach(d => {
        const data = d.data();
        products.push({
            name: data.name || "Sem Nome",
            code: data.code || data.id_vr || "S/ CODIGO",
            category: getCatName(data.category_id || data.category)
        });
    });

    products.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

    currentCategory = "";
    products.forEach(p => {
        if (p.category !== currentCategory) {
            report += `\n[ ${p.category.toUpperCase()} ]\n`;
            currentCategory = p.category;
        }
        report += `- Código: ${p.code.padEnd(6)} | ${p.name}\n`;
        productCount++;
    });

    report += `\nTotal de Produtos (Product): ${productCount}\n`;

    const outputPath = 'C:\\Users\\Administrador\\Desktop\\Relatorio_Receitas_e_Produtos.txt';
    fs.writeFileSync(outputPath, report, 'utf8');

    console.log(`\n✅ Relatório gerado com sucesso!`);
    console.log(`   Salvo em: ${outputPath}`);

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
