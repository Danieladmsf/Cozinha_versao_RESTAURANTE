import { initializeApp as initClientApp } from "firebase/app";
import { getFirestore as getClientFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { DemandCalculator } from "./lib/production-engine/DemandCalculator.js";
import { RecipeEngine } from "./lib/recipe-engine/RecipeEngine.js";

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initClientApp(firebaseConfig);
const db = getClientFirestore(app);

async function run() {
  console.log("Fetching Recipes...");
  const recipesSnap = await getDocs(collection(db, "Recipe"));
  const allRecipes = recipesSnap.docs.map(d => ({id: d.id, ...d.data()}));
  
  const targetRecipes = [
     "Refeicao: Arroz, Farofa, Purê de Batata e Tirinha Carne Chinesa Bendito Un",
     "Rotisseria Arroz Branco Bendito Kg",
     "Refeicao File Frango Grelhado Acebolado Bendito"
  ];

  targetRecipes.forEach(title => {
     const r = allRecipes.find(x => x.name && x.name.toLowerCase().includes(title.toLowerCase()));
     if (r) {
        const yieldWeight = DemandCalculator.getRecipeYieldWeight(r, allRecipes);
        console.log(`\nRecipe: ${r.name}`);
        console.log(`  yieldWeight: ${yieldWeight}`);
     }
  });

}

run().catch(console.error);
