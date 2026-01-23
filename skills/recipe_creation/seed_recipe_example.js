
import { db } from '../../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    Timestamp
} from 'firebase/firestore';

async function seedRecipe() {
    console.log("Creating Recipe with Detailed Yield Logic...");

    try {
        // 1. Find Ingredient "Alcatra Peça" (created in previous skill)
        const ingQ = query(collection(db, "Ingredient"), where("name", "==", "Alcatra Peça"));
        const ingSnap = await getDocs(ingQ);

        if (ingSnap.empty) {
            console.error("❌ Ingredient 'Alcatra Peça' not found. Run ingredient seeding first.");
            process.exit(1);
        }

        const alcatra = { id: ingSnap.docs[0].id, ...ingSnap.docs[0].data() };
        console.log(`✅ Found Ingredient: ${alcatra.name} (${alcatra.unit})`);

        // 1.a Find or Create Ancillary Ingredients (Salt, Oil)
        // 1.a Find or Create Ancillary Ingredients (Salt, Oil) - ROBUST
        const upsertCategory = async (name) => {
            const q = query(collection(db, "Category"), where("name", "==", name));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) return { id: snapshot.docs[0].id, name };
            const docRef = await addDoc(collection(db, "Category"), {
                name, parentId: null, type: 'ingredient', level: 0, active: true, createdAt: Timestamp.now()
            });
            console.log(`✅ [Category] Created: ${name}`);
            return { id: docRef.id, name };
        };

        const upsertSupplier = async (company_name) => {
            const q = query(collection(db, "Supplier"), where("company_name", "==", company_name));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) return { id: snapshot.docs[0].id, company_name, supplier_code: snapshot.docs[0].data().supplier_code };

            const code = company_name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000);
            const docRef = await addDoc(collection(db, "Supplier"), {
                company_name, supplier_code: code, active: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now()
            });
            console.log(`✅ [Supplier] Created: ${company_name}`);
            return { id: docRef.id, company_name, supplier_code: code };
        };

        const ensureIngredient = async (name, price, unit, categoryName = "Despensa", supplierName = "Fornecedor Geral") => {
            const q = query(collection(db, "Ingredient"), where("name", "==", name));
            const snap = await getDocs(q);
            if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

            // Create Dependencies
            const category = await upsertCategory(categoryName);
            const supplier = await upsertSupplier(supplierName);

            const newRef = await addDoc(collection(db, "Ingredient"), {
                name, current_price: price, unit, active: true,
                // Linked Data
                category_id: category.id, category: category.name,
                supplier_id: supplier.id, main_supplier: supplier.company_name, supplier_code: supplier.supplier_code,
                brand: "Genérica",
                createdAt: Timestamp.now(), updatedAt: Timestamp.now()
            });
            console.log(`✅ [Ingredient] Created Complete: ${name}`);
            return { id: newRef.id, name, current_price: price, unit };
        };

        const salt = await ensureIngredient("Sal Refinado", 2.50, "kg", "Despensa", "Atacadão");
        const oil = await ensureIngredient("Azeite de Oliva", 45.00, "L", "Despensa", "Atacadão");

        // 2. Define Weights for "Chain of Losses"
        // Scenario:
        // Frozen Block: 10.000 kg
        // After Thawing (5% loss): 9.500 kg
        // After Cleaning (15% loss): 8.075 kg
        // After Cooking (25% loss): 6.056 kg

        const wFrozen = 10.000;
        const wThawed = 9.500;
        const wClean = 8.075;
        const wCooked = 6.056;

        // 3. Prepare Receipt Object
        const recipeData = {
            name: "Maminha Grelhada (Demo Perdas)",
            description: "Receita demonstrativa com fluxo completo de perdas: Descongelamento -> Limpeza -> Cocção",
            category: "Pratos Principais",
            yield_type: "portion", // or 'unit'
            status: "active",
            preparations: [
                {
                    title: "1º Etapa: Preparo da Carne",
                    processes: ['defrosting', 'cleaning', 'cooking'],
                    ingredients: [
                        {
                            // MAIN ITEM (Losses applied)
                            ingredient_id: alcatra.id,
                            name: alcatra.name,
                            unit: alcatra.unit,
                            current_price: alcatra.current_price,
                            weight_frozen: wFrozen.toString(),
                            weight_thawed: wThawed.toString(),
                            weight_clean: wClean.toString(),
                            weight_cooked: wCooked.toString(),
                            locked: false
                        },
                        {
                            // SEASONING (No defrost/clean loss, consumed in cooking)
                            ingredient_id: salt.id,
                            name: salt.name,
                            unit: salt.unit,
                            current_price: salt.current_price,
                            // Salt added during cleaning/cooking, so we repeat weight to show no loss till usage
                            weight_frozen: "0.150",
                            weight_thawed: "0.150",
                            weight_clean: "0.150",
                            weight_cooked: "0.150", // Remains in the dish
                            locked: false
                        },
                        {
                            // OIL (Used in cooking)
                            ingredient_id: oil.id,
                            name: oil.name,
                            unit: oil.unit,
                            current_price: oil.current_price,
                            weight_frozen: "0.100",
                            weight_thawed: "0.100",
                            weight_clean: "0.100",
                            weight_cooked: "0.080", // Some evaporation/residue loss (20%)
                            locked: false
                        }
                    ],
                    instructions: "1. Descongelar a peça em refrigerador.\n2. Limpar aparas, mantendo padrão.\n3. Temperar com sal. \n4. Grelhar com azeite até o ponto desejado.",
                    assembly_config: {
                        container_type: 'cuba',
                        total_weight: (wCooked + 0.150 + 0.080).toFixed(3),
                        units_quantity: '1'
                    }
                }
            ],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        // 4. Create or Update Recipe
        const recQ = query(collection(db, "Recipe"), where("name", "==", recipeData.name));
        const recSnap = await getDocs(recQ);

        if (!recSnap.empty) {
            console.log("⚠️ Recipe with this name already exists. Creating a new version.");
            recipeData.name = `${recipeData.name} (v${new Date().getTime().toString().slice(-4)})`;
        }

        const docRef = await addDoc(collection(db, "Recipe"), recipeData);
        console.log(`✅ Recipe Created: ${recipeData.name} (ID: ${docRef.id})`);

        console.log("\nYield Logic Verified:");
        console.log(`Input (Frozen Meat): ${wFrozen} kg`);
        console.log(`Input (Helpers): 0.250 kg`);
        console.log(`Output (Total Cooked): ${recipeData.preparations[0].assembly_config.total_weight} kg`);

        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Error creating recipe:", error);
        process.exit(1);
    }
}

seedRecipe();
