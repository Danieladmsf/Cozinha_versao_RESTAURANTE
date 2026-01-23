
import { db } from '../../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    Timestamp
} from 'firebase/firestore';

async function seedComplexRecipe() {
    console.log("Creating Complex Recipe: Maminha ao Molho Rústico...");

    try {
        // 1. HELPERS (Robust Creation Logic)
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

        // Enhanced ensureIngredient with dependencies
        const ensureIngredient = async (name, price, unit, categoryName = "Açougue", supplierName = "Fornecedor Local") => {
            const q = query(collection(db, "Ingredient"), where("name", "==", name));
            const snap = await getDocs(q);
            if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

            // Create Dependencies first
            const category = await upsertCategory(categoryName);
            const supplier = await upsertSupplier(supplierName);

            const newRef = await addDoc(collection(db, "Ingredient"), {
                name,
                current_price: price,
                unit,
                active: true,
                // Linked Data
                category_id: category.id, category: category.name,
                supplier_id: supplier.id, main_supplier: supplier.company_name, supplier_code: supplier.supplier_code,
                brand: "Genérica",
                updatedAt: Timestamp.now(), createdAt: Timestamp.now()
            });
            console.log(`✅ [Ingredient] Created Complete: ${name}`);
            return { id: newRef.id, name, current_price: price, unit };
        };

        // 2. GET INGREDIENTS (With Category/Supplier Context)
        const alcatra = await ensureIngredient("Alcatra Peça", 39.90, "kg", "Bovinos", "Frigorífico Boi d'Ouro");
        const salt = await ensureIngredient("Sal Refinado", 2.50, "kg", "Despensa", "Atacadão");
        const oil = await ensureIngredient("Azeite de Oliva", 45.00, "L", "Despensa", "Atacadão");
        // Sauce Ingredients
        const onion = await ensureIngredient("Cebola Roxa", 6.50, "kg", "Hortifruti", "Feira Local");
        const garlic = await ensureIngredient("Alho Descascado", 25.00, "kg", "Hortifruti", "Feira Local");
        const butter = await ensureIngredient("Manteiga Sem Sal", 45.00, "kg", "Laticínios", "Laticínios Serra");
        const wine = await ensureIngredient("Vinho Tinto Seco", 32.00, "L", "Bebidas", "Adega Central");

        // 3. RECIPE STRUCTURE
        const recipeData = {
            name: "Maminha ao Molho Rústico (Completa)",
            description: "Receita avançada com duas etapas independentes (Carne + Molho) e notas de instrução.",
            category: "Pratos Principais",
            yield_type: "portion",
            status: "active",
            preparations: [
                // --- STAGE 1: MEAT ---
                {
                    title: "1º Etapa: Preparo da Carne",
                    processes: ['defrosting', 'cleaning', 'cooking'],
                    notes: [
                        {
                            title: "Descongelamento",
                            content: "A perda de descongelamento (5%) é crítica para manter a suculência. Não forçar descongelamento em água.",
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now()
                        }
                    ],
                    ingredients: [
                        {
                            ingredient_id: alcatra.id,
                            name: alcatra.name,
                            unit: alcatra.unit,
                            current_price: alcatra.current_price,
                            // 10kg Block -> 6.056kg Cooked
                            weight_frozen: "10.000",
                            weight_thawed: "9.500",
                            weight_clean: "8.075",
                            weight_cooked: "6.056",
                            locked: false
                        },
                        {
                            ingredient_id: salt.id,
                            name: salt.name,
                            unit: salt.unit,
                            current_price: salt.current_price,
                            weight_frozen: "0.150",
                            weight_thawed: "0.150",
                            weight_clean: "0.150",
                            weight_cooked: "0.150",
                            locked: false
                        },
                        {
                            ingredient_id: oil.id,
                            name: oil.name,
                            unit: oil.unit,
                            current_price: oil.current_price,
                            weight_frozen: "0.100",
                            weight_thawed: "0.100",
                            weight_clean: "0.100",
                            weight_cooked: "0.080", // 20% loss
                            locked: false
                        }
                    ],
                    instructions: "1. Seguir rigorosamente o descongelamento.\n2. Selar a carne em fogo muito alto.",
                    assembly_config: {
                        container_type: 'gn_1_1',
                        total_weight: "6.286", // 6.056 + 0.150 + 0.080
                        units_quantity: '1' // 1 GN Full of meat
                    }
                },

                // --- STAGE 2: SAUCE (Reduction) ---
                {
                    title: "2º Etapa: Molho Rústico",
                    processes: ['cleaning', 'cooking'],
                    notes: [
                        {
                            title: "Redução do Vinho",
                            content: "O Vinho deve reduzir em fogo baixo até ponto de nappe (aprox. 60% de perda).",
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now()
                        },
                        {
                            title: "Cuidado com a Manteiga",
                            content: "A Manteiga entra no início para refogar. Atenção para não queimar durante o processo de dourar a cebola.",
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now()
                        }
                    ],
                    ingredients: [
                        {
                            // Onion: Peeling loss (10%) -> Cooking reduction (40% loss due to sautéing)
                            ingredient_id: onion.id,
                            name: onion.name,
                            unit: onion.unit,
                            current_price: onion.current_price,
                            weight_raw: "2.000", // Start
                            weight_clean: "1.800", // Peel
                            weight_pre_cooking: "1.800", // Into pan
                            weight_cooked: "1.080", // Reduced/Sautéed
                            locked: false
                        },
                        {
                            // Garlic: Use direct (no peel loss registered here, assume peeled bought) -> Sautéed
                            ingredient_id: garlic.id,
                            name: garlic.name,
                            unit: garlic.unit,
                            current_price: garlic.current_price,
                            weight_raw: "0.200",
                            weight_clean: "0.200",
                            weight_pre_cooking: "0.200",
                            weight_cooked: "0.150",
                            locked: false
                        },
                        {
                            // Butter: Melting loss (minimal)
                            ingredient_id: butter.id,
                            name: butter.name,
                            unit: butter.unit,
                            current_price: butter.current_price,
                            weight_raw: "0.500",
                            weight_cooked: "0.450", // Clarification loss?
                            locked: false
                        },
                        {
                            // Wine: REDUCTION (High loss)
                            ingredient_id: wine.id,
                            name: wine.name,
                            unit: wine.unit,
                            current_price: wine.current_price,
                            weight_raw: "1.000", // 1 Liter
                            weight_cooked: "0.400", // Reduced to glaze (60% loss)
                            locked: false
                        }
                    ],
                    instructions: "1. Refogar cebola e alho na manteiga.\n2. Adicionar vinho e reduzir até ponto de nappe.",
                    assembly_config: {
                        container_type: 'panela',
                        total_weight: "2.080", // 1.080 + 0.150 + 0.450 + 0.400
                        units_quantity: '1'
                    }
                }
            ],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        // 4. SAVE
        const recQ = query(collection(db, "Recipe"), where("name", "==", recipeData.name));
        const recSnap = await getDocs(recQ);

        if (!recSnap.empty) {
            console.log("⚠️ Recipe exists. Creating new version.");
            recipeData.name = `${recipeData.name} (v${new Date().getTime().toString().slice(-4)})`;
        }

        const docRef = await addDoc(collection(db, "Recipe"), recipeData);
        console.log(`✅ Complex Recipe Created: ${recipeData.name} (ID: ${docRef.id})`);

        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

seedComplexRecipe();
