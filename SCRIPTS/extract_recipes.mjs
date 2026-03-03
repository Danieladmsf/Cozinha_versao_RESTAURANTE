import fs from 'fs';
import { db } from '../lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function main() {
    console.log("🛠️ EXTRAINDO TODAS AS RECEITAS 🛠️");

    // 1. Map to hold category -> recipes
    const recipesByCategory = {};

    // 2. Fetch all categories to map Names from category_id
    const categorySnap = await getDocs(collection(db, 'CategoryTree'));
    const categoryNames = {};
    categorySnap.forEach(doc => {
        categoryNames[doc.id] = doc.data().name;
    });

    // 3. Fetch all Recipes
    const recipeSnap = await getDocs(collection(db, 'Recipe'));
    let recipeCount = 0;

    recipeSnap.forEach(doc => {
        const data = doc.data();
        const catId = data.category_id;
        const catName = (catId && categoryNames[catId]) ? categoryNames[catId].toUpperCase() : "SEM CATEGORIA";

        const recipeCode = String(data.code || doc.id).trim(); // Or some valid identifier if they don't have code
        const recipeName = data.name;

        if (!recipesByCategory[catName]) {
            recipesByCategory[catName] = [];
        }

        recipesByCategory[catName].push({
            code: recipeCode,
            name: recipeName
        });
        recipeCount++;
    });

    // 4. Sort and Generate the Text
    let outputText = "";

    // Sort categories alphabetically
    const sortedCategories = Object.keys(recipesByCategory).sort();

    for (const cat of sortedCategories) {
        outputText += `${cat}\n`;

        // Sort recipes by name inside category
        recipesByCategory[cat].sort((a, b) => a.name.localeCompare(b.name));

        for (const rec of recipesByCategory[cat]) {
            // Keep the exact visual format: 8480 | 008480 - NOME DO PRODUTO
            // Se "code" for diferente do que está no nome, we just put it first
            outputText += `${rec.code} | ${rec.name}\n`;
        }

        outputText += `\n`;
    }

    fs.writeFileSync('C:\\Users\\Administrador\\Desktop\\COZINHA RESTAURANTE\\SCRIPTS\\Relatorio_Receitas_Geradas.txt', outputText, 'utf8');

    console.log(`\n🎉 EXTRAÇÃO CONCLUÍDA! ${recipeCount} Receitas exportadas.`);
    console.log(`Verifique: C:\\Users\\Administrador\\Desktop\\COZINHA RESTAURANTE\\SCRIPTS\\Relatorio_Receitas_Geradas.txt`);

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
