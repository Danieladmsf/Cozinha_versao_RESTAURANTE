
import { db } from '../../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    Timestamp
} from 'firebase/firestore';
import { ensureCategoryHierarchy } from './category_router.js';

async function seedCakeRecipes() {
    console.log("👨‍🍳 Baking Professional Cakes (Multi-Stage Setup)...");

    try {
        // 1. HELPERS
        const upsertCategoryIngredient = async (name) => {
            const q = query(collection(db, "Category"), where("name", "==", name));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) return { id: snapshot.docs[0].id, name };
            const docRef = await addDoc(collection(db, "Category"), {
                name, parentId: null, type: 'ingredient', level: 0, active: true, createdAt: Timestamp.now()
            });
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
            return { id: docRef.id, company_name, supplier_code: code };
        };

        const ensureIngredient = async (name, price, unit, categoryName = "Despensa", supplierName = "Fornecedor Local") => {
            const q = query(collection(db, "Ingredient"), where("name", "==", name));
            const snap = await getDocs(q);
            if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

            const category = await upsertCategoryIngredient(categoryName);
            const supplier = await upsertSupplier(supplierName);

            const newRef = await addDoc(collection(db, "Ingredient"), {
                name,
                current_price: price,
                unit,
                active: true,
                category_id: category.id, category: category.name,
                supplier_id: supplier.id, main_supplier: supplier.company_name, supplier_code: supplier.supplier_code,
                brand: "Genérica",
                updatedAt: Timestamp.now(), createdAt: Timestamp.now()
            });
            console.log(`✅ [Ingredient] Created: ${name}`);
            return { id: newRef.id, name, current_price: price, unit };
        };

        // 2. GET FULL PANTRY
        console.log("🛒 Stocking Pantry...");
        const flour = await ensureIngredient("Farinha de Trigo", 4.50, "kg", "Despensa", "Atacadão");
        const sugar = await ensureIngredient("Açúcar Refinado", 3.80, "kg", "Despensa", "Atacadão");
        const eggs = await ensureIngredient("Ovo Vermelho Grande", 18.00, "dz", "Laticínios", "Granja Local"); // 18/12 = 1.50 ea or ~30.00/kg? Let's use kg price in recipe.
        const milk = await ensureIngredient("Leite Integral", 4.50, "L", "Laticínios", "Laticínios Serra");
        const oil = await ensureIngredient("Óleo de Soja", 7.50, "L", "Despensa", "Atacadão");
        const butter = await ensureIngredient("Manteiga Sem Sal", 45.00, "kg", "Laticínios", "Laticínios Serra");
        const bakingPowder = await ensureIngredient("Fermento Químico", 25.00, "kg", "Despensa", "Atacadão");
        const cocoa = await ensureIngredient("Cacau em Pó 100%", 45.00, "kg", "Despensa", "Empório do Chef");
        const salt = await ensureIngredient("Sal Refinado", 2.00, "kg", "Despensa", "Atacadão");

        // Specifics
        const carrot = await ensureIngredient("Cenoura", 4.50, "kg", "Hortifruti", "Feira Local");
        const cornmeal = await ensureIngredient("Fubá Mimoso", 3.50, "kg", "Despensa", "Atacadão");
        const orange = await ensureIngredient("Laranja Pera", 3.00, "kg", "Hortifruti", "Feira Local");
        const cream = await ensureIngredient("Creme de Leite", 12.00, "kg", "Laticínios", "Laticínios Serra");
        const chocolateBar = await ensureIngredient("Chocolate Meio Amargo", 55.00, "kg", "Despensa", "Empório do Chef");
        const condensedMilk = await ensureIngredient("Leite Condensado", 18.00, "kg", "Despensa", "Atacadão"); // For toppings

        // 3. RECIPES
        const categoryData = await ensureCategoryHierarchy("Confeitária");

        const commonProps = {
            category: categoryData.name,
            category_id: categoryData.id,
            type: categoryData.recipeType, // receita_-_base = Produto
            yield_type: "portion",
            status: "active",
            active: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        // ==========================================
        // RECIPE 1: Bolo de Chocolate (THE REAL ONE)
        // ==========================================
        const chocolateCakeData = {
            name: "Bolo de Chocolate Tradicional",
            description: "Bolo de chocolate úmido com calda de chocolate.",
            ...commonProps,
            preparations: [
                {
                    title: "1ª Etapa: Massa do Bolo",
                    processes: ['cooking'],
                    notes: [{ title: "Dica", content: "Peneirar secos.", createdAt: Timestamp.now() }],
                    ingredients: [
                        // DRY
                        { ingredient_id: flour.id, name: flour.name, unit: "kg", current_price: flour.current_price, weight_raw: "0.350", weight_cooked: "0.350", weight_clean: "0.350" },
                        { ingredient_id: sugar.id, name: sugar.name, unit: "kg", current_price: sugar.current_price, weight_raw: "0.300", weight_cooked: "0.300", weight_clean: "0.300" },
                        { ingredient_id: cocoa.id, name: cocoa.name, unit: "kg", current_price: cocoa.current_price, weight_raw: "0.100", weight_cooked: "0.100", weight_clean: "0.100" },
                        { ingredient_id: bakingPowder.id, name: bakingPowder.name, unit: "kg", current_price: bakingPowder.current_price, weight_raw: "0.015", weight_cooked: "0.015", weight_clean: "0.015" },
                        { ingredient_id: salt.id, name: salt.name, unit: "kg", current_price: salt.current_price, weight_raw: "0.002", weight_cooked: "0.002", weight_clean: "0.002" },
                        // WET
                        { ingredient_id: eggs.id, name: eggs.name, unit: "kg", current_price: 36.00, weight_raw: "0.200", weight_clean: "0.200", weight_cooked: "0.170" }, // -15%
                        { ingredient_id: milk.id, name: milk.name, unit: "L", current_price: milk.current_price, weight_raw: "0.240", weight_clean: "0.240", weight_cooked: "0.200" }, // -16%
                        { ingredient_id: oil.id, name: oil.name, unit: "L", current_price: oil.current_price, weight_raw: "0.120", weight_clean: "0.120", weight_cooked: "0.110" }  // -8%
                    ],
                    assembly_config: { container_type: 'assadeira', total_weight: "1.247", units_quantity: '1' } // Massa only
                },
                {
                    title: "2ª Etapa: Cobertura Ganache",
                    processes: ['cooking'],
                    ingredients: [
                        { ingredient_id: chocolateBar.id, name: chocolateBar.name, unit: "kg", current_price: chocolateBar.current_price, weight_raw: "0.200", weight_cooked: "0.200", weight_clean: "0.200" },
                        { ingredient_id: cream.id, name: cream.name, unit: "kg", current_price: cream.current_price, weight_raw: "0.200", weight_cooked: "0.180", weight_clean: "0.200" }
                    ],
                    assembly_config: { container_type: 'pote', total_weight: "0.380", units_quantity: '1' }
                }
            ]
        };

        // ==========================================
        // RECIPE 2: Bolo de Cenoura (FULL)
        // ==========================================
        const carrotCakeData = {
            name: "Bolo de Cenoura com Chocolate",
            description: "Bolo de cenoura clássico com cobertura de brigadeiro.",
            ...commonProps,
            preparations: [
                {
                    title: "1ª Etapa: Massa de Cenoura",
                    processes: ['cleaning', 'cooking'],
                    ingredients: [
                        { ingredient_id: carrot.id, name: carrot.name, unit: "kg", current_price: carrot.current_price, weight_raw: "0.450", weight_clean: "0.380", weight_cooked: "0.320" },
                        { ingredient_id: eggs.id, name: eggs.name, unit: "kg", current_price: 36.00, weight_raw: "0.200", weight_clean: "0.200", weight_cooked: "0.170" },
                        { ingredient_id: oil.id, name: oil.name, unit: "L", current_price: oil.current_price, weight_raw: "0.200", weight_clean: "0.200", weight_cooked: "0.190" },
                        { ingredient_id: sugar.id, name: sugar.name, unit: "kg", current_price: sugar.current_price, weight_raw: "0.350", weight_clean: "0.350", weight_cooked: "0.350" },
                        { ingredient_id: flour.id, name: flour.name, unit: "kg", current_price: flour.current_price, weight_raw: "0.400", weight_clean: "0.400", weight_cooked: "0.400" },
                        { ingredient_id: bakingPowder.id, name: bakingPowder.name, unit: "kg", current_price: bakingPowder.current_price, weight_raw: "0.015", weight_clean: "0.015", weight_cooked: "0.015" }
                    ],
                    assembly_config: { container_type: 'assadeira', total_weight: "1.445", units_quantity: '1' }
                },
                {
                    title: "2ª Etapa: Cobertura de Brigadeiro",
                    processes: ['cooking'],
                    ingredients: [
                        { ingredient_id: condensedMilk.id, name: condensedMilk.name, unit: "kg", current_price: condensedMilk.current_price, weight_raw: "0.395", weight_clean: "0.395", weight_cooked: "0.320" },
                        { ingredient_id: cocoa.id, name: cocoa.name, unit: "kg", current_price: cocoa.current_price, weight_raw: "0.040", weight_clean: "0.040", weight_cooked: "0.040" },
                        { ingredient_id: butter.id, name: butter.name, unit: "kg", current_price: butter.current_price, weight_raw: "0.020", weight_clean: "0.020", weight_cooked: "0.015" }
                    ],
                    assembly_config: { container_type: 'pote', total_weight: "0.375", units_quantity: '1' }
                }
            ]
        };

        // ==========================================
        // RECIPE 3: Bolo de Fubá (FULL)
        // ==========================================
        const cornCakeData = {
            name: "Bolo de Fubá Cremoso",
            description: "Bolo de fubá cremoso com queijo e coco.",
            ...commonProps,
            preparations: [
                {
                    title: "1ª Etapa: Massa Única",
                    processes: ['cooking'],
                    ingredients: [
                        { ingredient_id: cornmeal.id, name: cornmeal.name, unit: "kg", current_price: cornmeal.current_price, weight_raw: "0.250", weight_clean: "0.250", weight_cooked: "0.250" },
                        { ingredient_id: flour.id, name: flour.name, unit: "kg", current_price: flour.current_price, weight_raw: "0.100", weight_clean: "0.100", weight_cooked: "0.100" },
                        { ingredient_id: sugar.id, name: sugar.name, unit: "kg", current_price: sugar.current_price, weight_raw: "0.300", weight_clean: "0.300", weight_cooked: "0.300" },
                        { ingredient_id: eggs.id, name: eggs.name, unit: "kg", current_price: 36.00, weight_raw: "0.150", weight_clean: "0.150", weight_cooked: "0.130" },
                        { ingredient_id: milk.id, name: milk.name, unit: "L", current_price: milk.current_price, weight_raw: "0.500", weight_clean: "0.500", weight_cooked: "0.420" },
                        { ingredient_id: oil.id, name: oil.name, unit: "L", current_price: oil.current_price, weight_raw: "0.100", weight_clean: "0.100", weight_cooked: "0.095" },
                        { ingredient_id: bakingPowder.id, name: bakingPowder.name, unit: "kg", current_price: bakingPowder.current_price, weight_raw: "0.015", weight_clean: "0.015", weight_cooked: "0.015" }
                    ],
                    assembly_config: { container_type: 'assadeira', total_weight: "1.310", units_quantity: '1' }
                }
            ]
        };

        // ==========================================
        // RECIPE 4: Bolo de Laranja (FULL)
        // ==========================================
        const orangeCakeData = {
            name: "Bolo de Laranja Molhadinho",
            description: "Bolo amanteigado de laranja com calda cítrica.",
            ...commonProps,
            preparations: [
                {
                    title: "1ª Etapa: Massa Amanteigada",
                    processes: ['cleaning', 'cooking'],
                    ingredients: [
                        { ingredient_id: flour.id, name: flour.name, unit: "kg", current_price: flour.current_price, weight_raw: "0.300", weight_clean: "0.300", weight_cooked: "0.300" },
                        { ingredient_id: sugar.id, name: sugar.name, unit: "kg", current_price: sugar.current_price, weight_raw: "0.250", weight_clean: "0.250", weight_cooked: "0.250" }, // Less sugar in batter
                        { ingredient_id: eggs.id, name: eggs.name, unit: "kg", current_price: 36.00, weight_raw: "0.200", weight_clean: "0.200", weight_cooked: "0.170" },
                        { ingredient_id: butter.id, name: butter.name, unit: "kg", current_price: butter.current_price, weight_raw: "0.150", weight_clean: "0.150", weight_cooked: "0.130" },
                        { ingredient_id: bakingPowder.id, name: bakingPowder.name, unit: "kg", current_price: bakingPowder.current_price, weight_raw: "0.015", weight_clean: "0.015", weight_cooked: "0.015" }
                    ],
                    assembly_config: { container_type: 'assadeira', total_weight: "0.865", units_quantity: '1' }
                },
                {
                    title: "2ª Etapa: Calda Cítrica",
                    processes: ['cleaning', 'cooking'],
                    ingredients: [
                        { ingredient_id: orange.id, name: orange.name, unit: "kg", current_price: orange.current_price, weight_raw: "0.600", weight_clean: "0.300", weight_cooked: "0.250" }, // Juice
                        { ingredient_id: sugar.id, name: sugar.name, unit: "kg", current_price: sugar.current_price, weight_raw: "0.050", weight_clean: "0.050", weight_cooked: "0.050" }
                    ],
                    assembly_config: { container_type: 'pote', total_weight: "0.300", units_quantity: '1' }
                }
            ]
        };

        // SAVE ALL
        const recipes = [chocolateCakeData, carrotCakeData, cornCakeData, orangeCakeData];

        for (const recipeData of recipes) {
            const docRef = await addDoc(collection(db, "Recipe"), recipeData);
            console.log(`✅ Recipe Created: ${recipeData.name} (ID: ${docRef.id}, Type: ${recipeData.type})`);
        }

        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

seedCakeRecipes();
