import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Initialize Firebase Admin
let serviceAccount;
try {
    serviceAccount = JSON.parse(fs.readFileSync('C:/APP COZINHA/cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json', 'utf8'));
} catch (e) {
    console.error("Could not load service account key");
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function analyzeRecipes() {
    console.log("Fetching recipes from database...");
    const recipesSnapshot = await db.collection("recipes").get();

    let total = 0;
    let trueRecipes = 0; // isProduct is undefined or false
    let withStages = 0;

    let sampleRecipe = null;

    recipesSnapshot.forEach(doc => {
        total++;
        const data = doc.data();

        // We only want actual recipes, not products registered as recipes
        if (data.isProduct !== true) {
            trueRecipes++;

            if (data.stages && Array.isArray(data.stages) && data.stages.length > 0) {
                withStages++;
                if (!sampleRecipe) sampleRecipe = { id: doc.id, ...data };
            }
        }
    });

    console.log(`\n=== RECIPE DATABASE ANALYSIS ===`);
    console.log(`Total items in 'recipes' collection: ${total}`);
    console.log(`True Recipes (isProduct != true): ${trueRecipes}`);
    console.log(`Recipes with 'stages' array populated: ${withStages}`);
    console.log(`Percentage of True Recipes with stages: ${trueRecipes > 0 ? Math.round((withStages / trueRecipes) * 100) : 0}%\n`);

    if (sampleRecipe) {
        console.log(`Sample of a Recipe WITH stages (${sampleRecipe.name}):`);
        console.log(`Number of stages: ${sampleRecipe.stages.length}`);
        console.log(`First stage name: ${sampleRecipe.stages[0]?.name}`);
        console.log(`Does it have ingredients inside stages? ${sampleRecipe.stages[0]?.ingredients?.length > 0 ? 'Yes' : 'No'}`);
    } else {
        console.log("No recipes found with populated stages array.");
    }
}

analyzeRecipes().catch(console.error);
