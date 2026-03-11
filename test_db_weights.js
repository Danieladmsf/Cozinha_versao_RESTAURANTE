import { initializeApp as initClientApp } from "firebase/app";
import { getFirestore as getClientFirestore, collection, getDocs, query, where } from "firebase/firestore";

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
        console.log(`\nFound: ${r.name}`);
        const prep = r.preparations && r.preparations[0];
        if (prep) {
           const arrozIng = prep.ingredients && prep.ingredients.find(i => i.name && i.name.toLowerCase().includes("arroz tipo 1"));
           if (arrozIng) {
              console.log(`  Arroz Tipo 1 weights:`);
              console.log(`    weight_raw: ${arrozIng.weight_raw}`);
              console.log(`    weight_thawed: ${arrozIng.weight_thawed}`);
              console.log(`    weight_clean: ${arrozIng.weight_clean}`);
              console.log(`    weight_pre_cooking: ${arrozIng.weight_pre_cooking}`);
              console.log(`    quantity: ${arrozIng.quantity}`);
           } else {
              console.log("  Arroz Tipo 1 not found in prep 0");
           }
        }
     } else {
        console.log(`Not found: ${title}`);
     }
  });

  // Also check the "Arroz Branco" base recipe
  const baseArroz = allRecipes.find(x => x.name === "Arroz Branco");
  if(baseArroz) {
      console.log(`\nBase Recipe: Arroz Branco`);
      const arrozIng = baseArroz.preparations?.[0]?.ingredients?.find(i => i.name.toLowerCase().includes("arroz tipo 1"));
      if(arrozIng) {
          console.log(`  Arroz Tipo 1 weights in Base Recipe:`);
          console.log(`    weight_raw: ${arrozIng.weight_raw}`);
          console.log(`    weight_pre_cooking: ${arrozIng.weight_pre_cooking}`);
      }
  }

}

run().catch(console.error);
