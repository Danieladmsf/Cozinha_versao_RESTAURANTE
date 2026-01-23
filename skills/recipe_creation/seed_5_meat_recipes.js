
import { db } from '../../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    Timestamp
} from 'firebase/firestore';

async function seedMeatRecipes() {
    console.log("🍖 Starting Seeding of 5 Meat Recipes with Varied Yield Analysis...");

    try {
        // --- HELPERS (Robust Data Creation) ---
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

        const ensureIngredient = async (name, price, unit, categoryName = "Açougue", supplierName = "Fornecedor Local") => {
            const q = query(collection(db, "Ingredient"), where("name", "==", name));
            const snap = await getDocs(q);
            if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

            const category = await upsertCategory(categoryName);
            const supplier = await upsertSupplier(supplierName);

            const newRef = await addDoc(collection(db, "Ingredient"), {
                name, current_price: price, unit, active: true,
                category_id: category.id, category: category.name,
                supplier_id: supplier.id, main_supplier: supplier.company_name, supplier_code: supplier.supplier_code,
                brand: "Genérica", createdAt: Timestamp.now(), updatedAt: Timestamp.now()
            });
            console.log(`✅ [Ingredient] Created: ${name}`);
            return { id: newRef.id, name, current_price: price, unit };
        };

        // --- 1. ENSURE INGREDIENTS ---
        console.log("\n📦 Verification/Creation of Base Ingredients...");
        // Helpers
        const salt = await ensureIngredient("Sal Grosso", 3.00, "kg", "Despensa", "Atacadão");
        const pepper = await ensureIngredient("Pimenta do Reino em Grãos", 80.00, "kg", "Temperos", "Zona Cerealista");
        const oliveOil = await ensureIngredient("Azeite de Oliva Extra Virgem", 55.00, "L", "Despensa", "Importadora Bella");
        const butter = await ensureIngredient("Manteiga sem Sal", 48.00, "kg", "Laticínios", "Laticínios Serra");
        const cream = await ensureIngredient("Creme de Leite Fresco", 35.00, "L", "Laticínios", "Laticínios Serra");
        const greenPepper = await ensureIngredient("Pimenta Verde em Conserva", 90.00, "kg", "Temperos", "Hemmer");
        const bbqSauce = await ensureIngredient("Molho Barbecue", 25.00, "kg", "Molhos", "Heinz");
        const herbs = await ensureIngredient("Ervas Frescas (Alecrim/Tomilho)", 120.00, "kg", "Hortifruti", "Ceagesp");

        // Meats
        const picanha = await ensureIngredient("Picanha Peça A", 89.90, "kg", "Bovinos", "Boi d'Ouro");
        const fileMignon = await ensureIngredient("Filé Mignon Peça Limpa", 65.00, "kg", "Bovinos", "Boi d'Ouro"); // Though we might buy with cordão for this test effectively
        const ribs = await ensureIngredient("Costela Suína", 29.90, "kg", "Suínos", "Frigorífico Suíno");
        const rackLamb = await ensureIngredient("Carré de Cordeiro French Rack", 140.00, "kg", "Ovinos", "Importadora Uruguay");
        const cupim = await ensureIngredient("Cupim Bovino", 32.00, "kg", "Bovinos", "Boi d'Ouro");


        const recipesToCreate = [
            // --- RECIPE 1: PICANHA NA BRASA ---
            {
                name: "Picanha na Brasa (Grelhada)",
                description: "Corte nobre com capa de gordura. Foco na perda por renderização de gordura na grelha.",
                category: "Churrasco",
                yield_type: "portion",
                preparations: [{
                    title: "Preparo Grelha",
                    processes: ['cleaning', 'cooking'], // Assuming fresh meat, no defrost
                    notes: [
                        { title: "Limpeza da Picanha", content: "Retirar apenas o excesso de 'pele' prateada do lado da carne. Não mexer na gordura.", createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
                    ],
                    ingredients: [
                        {
                            ingredient_id: picanha.id, name: picanha.name, unit: picanha.unit, current_price: picanha.current_price, locked: false,
                            // Scenario: 1.5kg piece.
                            weight_raw: "1.500",
                            weight_clean: "1.350", // 10% trim (silverskin/nerves)
                            weight_cooked: "1.080", // 20% cooking loss (heavy fat rendering)
                        },
                        {
                            ingredient_id: salt.id, name: salt.name, unit: salt.unit, current_price: salt.current_price, locked: false,
                            weight_raw: "0.050", weight_cooked: "0.030", // Some falls off grid
                        }
                    ],
                    instructions: "1. Limpar espelho da carne.\n2. Salgar e levar à grelha alta com gordura para cima.",
                    assembly_config: {
                        container_type: 'tabua',
                        total_weight: "1.110",
                        units_quantity: '1'
                    }
                }]
            },

            // --- RECIPE 2: FILÉ MIGNON AO POIVRE ---
            {
                name: "Filé Mignon ao Poivre",
                description: "Clássico francês. Foco na limpeza pesada do cordão e aproveitamento nobre.",
                category: "Pratos Principais",
                yield_type: "portion",
                preparations: [{
                    title: "Medalhões e Molho",
                    processes: ['cleaning', 'cooking'],
                    notes: [
                        { title: "Limpeza do Filé", content: "Remoção total do cordão e cabeça para medalhões perfeitos. As aparas vão para Strogonoff (outra receita).", createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
                    ],
                    ingredients: [
                        {
                            ingredient_id: fileMignon.id, name: fileMignon.name, unit: fileMignon.unit, current_price: fileMignon.current_price, locked: false,
                            // High cleaning loss scenario if bought with chain, or minimal if purchased 'Limpa' but user wants 'Tournedos' only
                            weight_raw: "2.000",
                            weight_clean: "1.400", // 30% loss to get perfect center cut medallions
                            weight_cooked: "1.190", // 15% cooking loss (fast sear)
                        },
                        {
                            ingredient_id: butter.id, name: butter.name, unit: butter.unit, current_price: butter.current_price, locked: false,
                            weight_raw: "0.100", weight_cooked: "0.080",
                        },
                        {
                            ingredient_id: cream.id, name: cream.name, unit: cream.unit, current_price: cream.current_price, locked: false,
                            weight_raw: "0.400", weight_cooked: "0.300", // Reduction
                        },
                        {
                            ingredient_id: greenPepper.id, name: greenPepper.name, unit: greenPepper.unit, current_price: greenPepper.current_price, locked: false,
                            weight_raw: "0.050", weight_cooked: "0.050",
                        }
                    ],
                    instructions: "1. Limpar filé deixando apenas o centro.\n2. Selar medalhões.\n3. Deglacear com pimenta e creme.",
                    assembly_config: {
                        container_type: 'prato',
                        total_weight: "1.620",
                        units_quantity: '1'
                    }
                }]
            },

            // --- RECIPE 3: COSTELA SUÍNA BBQ ---
            {
                name: "Costela Suína BBQ (Slow Cooked)",
                description: "Cozimento lento. Perda óssea vs Perda cocção.",
                category: "Churrasco",
                yield_type: "portion",
                preparations: [{
                    title: "Assado Lento",
                    processes: ['cleaning', 'cooking'],
                    ingredients: [
                        {
                            ingredient_id: ribs.id, name: ribs.name, unit: ribs.unit, current_price: ribs.current_price, locked: false,
                            weight_raw: "1.200", // Rack
                            weight_clean: "1.150", // Membrane removal
                            weight_cooked: "0.750", // High loss (35%) due to long cook time + fat render. Bone weight remains included in serving.
                        },
                        {
                            ingredient_id: bbqSauce.id, name: bbqSauce.name, unit: bbqSauce.unit, current_price: bbqSauce.current_price, locked: false,
                            weight_raw: "0.200", weight_cooked: "0.180", // Glaze
                        }
                    ],
                    instructions: "1. Retirar membrana.\n2. Assar a 140C por 4 horas.\n3. Finalizar com BBQ.",
                    assembly_config: {
                        container_type: 'tabua',
                        total_weight: "0.930",
                        units_quantity: '1'
                    }
                }]
            },

            // --- RECIPE 4: CARRÉ DE CORDEIRO (FRENCH RACK) ---
            {
                name: "Carré de Cordeiro (French Rack)",
                description: "Corte de altíssimo valor agregado. Perda extrema na limpeza (Frenching).",
                category: "Cordeiro",
                yield_type: "portion",
                preparations: [{
                    title: "Limpeza e Grelha",
                    processes: ['cleaning', 'cooking'],
                    notes: [
                        { title: "Frenching", content: "Raspar os ossos perfeitamente. Guardar aparas para molho.", createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
                    ],
                    ingredients: [
                        {
                            ingredient_id: rackLamb.id, name: rackLamb.name, unit: rackLamb.unit, current_price: rackLamb.current_price, locked: false,
                            weight_raw: "0.800", // 2 racks
                            weight_clean: "0.520", // 35% loss (cleaning bones)
                            weight_cooked: "0.440", // 15% cooking loss (served rare/pink)
                        },
                        {
                            ingredient_id: herbs.id, name: herbs.name, unit: herbs.unit, current_price: herbs.current_price, locked: false,
                            weight_raw: "0.020", weight_cooked: "0.010", // Crust
                        },
                        {
                            ingredient_id: oliveOil.id, name: oliveOil.name, unit: oliveOil.unit, current_price: oliveOil.current_price, locked: false,
                            weight_raw: "0.050", weight_cooked: "0.040",
                        }
                    ],
                    instructions: "1. Fazer o Frenching nos ossos.\n2. Fazer crosta de ervas.\n3. Assar rapidamente.",
                    assembly_config: {
                        container_type: 'travessa',
                        total_weight: "0.490",
                        units_quantity: '1'
                    }
                }]
            },

            // --- RECIPE 5: CUPIM ASSADO (BUTTER) ---
            {
                name: "Cupim Assado na Manteiga",
                description: "Carne com muita fibra e gordura entremeada. Encolhimento extremo.",
                category: "Assados",
                yield_type: "portion",
                preparations: [{
                    title: "Assado de Panela/Forno",
                    processes: ['cooking'], // Buying clean usually
                    notes: [
                        { title: "Encolhimento", content: "O cupim reduz quase pela metade devido ao colágeno/gordura.", createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
                    ],
                    ingredients: [
                        {
                            ingredient_id: cupim.id, name: cupim.name, unit: cupim.unit, current_price: cupim.current_price, locked: false,
                            weight_raw: "2.500", // Large piece
                            weight_clean: "2.400", // Minor trimming
                            weight_cooked: "1.450", // ~40% loss!
                        },
                        {
                            ingredient_id: butter.id, name: butter.name, unit: butter.unit, current_price: butter.current_price, locked: false,
                            weight_raw: "0.200", weight_cooked: "0.150", // Basting
                        }
                    ],
                    instructions: "1. Furar a carne.\n2. Assar envolto em papel alumínio com manteiga por 6 horas.",
                    assembly_config: {
                        container_type: 'gn_1_2',
                        total_weight: "1.600",
                        units_quantity: '1'
                    }
                }]
            }
        ];

        // --- EXECUTE CREATION ---
        console.log("\n🚀 Creating Recipes...");
        for (const r of recipesToCreate) {
            // Check existence logic
            const recQ = query(collection(db, "Recipe"), where("name", "==", r.name));
            const recSnap = await getDocs(recQ);
            if (!recSnap.empty) {
                // simple versioning
                r.name = `${r.name} (v${Date.now().toString().slice(-4)})`;
            }

            // Base timestamps
            r.createdAt = Timestamp.now();
            r.updatedAt = Timestamp.now();
            r.status = "active";

            const ref = await addDoc(collection(db, "Recipe"), r);
            console.log(`✅ [Recipe] Created: "${r.name}" (ID: ${ref.id})`);
            console.log(`   > Output Weight: ${r.preparations[0].assembly_config.total_weight} kg`);
        }

        console.log("\n✨ All 5 Meat Recipes seeded successfully!");
        setTimeout(() => process.exit(0), 2000);

    } catch (error) {
        console.error("❌ Fatal Error:", error);
        process.exit(1);
    }
}

seedMeatRecipes();
