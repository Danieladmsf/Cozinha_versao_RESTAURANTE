
import { db } from '../../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    Timestamp
} from 'firebase/firestore';

async function seedPorkRecipe() {
    console.log("Creating Complex Recipe: Costela Suína ao Barbecue de Goiabada...");

    try {
        // 1. HELPERS
        const ensureIngredient = async (name, price, unit) => {
            const q = query(collection(db, "Ingredient"), where("name", "==", name));
            const snap = await getDocs(q);
            if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

            const newRef = await addDoc(collection(db, "Ingredient"), {
                name, current_price: price, unit, active: true,
                createdAt: Timestamp.now(), updatedAt: Timestamp.now()
            });
            console.log(`✅ Created Helper Ingredient: ${name}`);
            return { id: newRef.id, name, current_price: price, unit };
        };

        // 2. GET INGREDIENTS
        // Stage 1: Costela
        const costela = await ensureIngredient("Costela Suína Peça", 28.90, "kg");
        const dryRub = await ensureIngredient("Dry Rub Casa", 45.00, "kg"); // Mix of spices

        // Stage 2: BBQ Goiabada
        const goiabada = await ensureIngredient("Goiabada Cascão", 12.00, "kg");
        const ketchup = await ensureIngredient("Catchup Tradicional", 15.00, "kg");
        const vinegar = await ensureIngredient("Vinagre de Maçã", 8.00, "L");
        const worcestershire = await ensureIngredient("Molho Inglês", 22.00, "L");

        // Stage 3: Apple Puree
        const apple = await ensureIngredient("Maçã Verde", 14.00, "kg");
        const butter = await ensureIngredient("Manteiga Sem Sal", 45.00, "kg");
        const lemon = await ensureIngredient("Limão Taiti", 6.00, "kg");


        // 3. RECIPE STRUCTURE
        const recipeData = {
            name: "Costela Suína BBQ Goiabada (Completa)",
            description: "Costela assada lentamente com barbecue artesanal de goiabada e purê rústico de maçã verde.",
            category: "Pratos Principais",
            yield_type: "portion",
            status: "active",
            preparations: [
                // --- STAGE 1: COSTELA (Slow Cooking) ---
                {
                    title: "1º Etapa: Assar Costela",
                    processes: ['defrosting', 'cleaning', 'cooking'],
                    notes: [
                        {
                            title: "Remoção da Membrana",
                            content: "Retirar a membrana dos ossos antes de temperar para melhor absorção e textura.",
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now()
                        },
                        {
                            title: "Tempo de Forno",
                            content: "Assar coberto por 3h a 160ºC, depois descobrir para dourar.",
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now()
                        }
                    ],
                    ingredients: [
                        {
                            ingredient_id: costela.id,
                            name: costela.name,
                            unit: costela.unit,
                            current_price: costela.current_price,
                            // 10kg Block
                            weight_frozen: "10.000",
                            weight_thawed: "9.500", // 5% defrost loss
                            weight_clean: "8.550", // 10% trim/membrane loss
                            weight_cooked: "5.985", // 30% bone/fat render loss
                            locked: false
                        },
                        {
                            ingredient_id: dryRub.id,
                            name: dryRub.name,
                            unit: dryRub.unit,
                            current_price: dryRub.current_price,
                            weight_frozen: "0.300",
                            weight_thawed: "0.300",
                            weight_clean: "0.300",
                            weight_cooked: "0.300", // Crust remains
                            locked: false
                        }
                    ],
                    instructions: "1. Descongelar e limpar.\n2. Esfregar Dry Rub.\n3. Assar lentamente.",
                    assembly_config: {
                        container_type: 'gn_1_1',
                        total_weight: "6.285", // 5.985 + 0.300
                        units_quantity: '1'
                    }
                },

                // --- STAGE 2: BBQ GOIABADA (Reduction) ---
                {
                    title: "2º Etapa: BBQ Goiabada",
                    processes: ['cooking'],
                    notes: [
                        {
                            title: "Ponto de Derretimento",
                            content: "Derreter a goiabada com vinagre antes de adicionar o resto para não queimar.",
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now()
                        }
                    ],
                    ingredients: [
                        {
                            ingredient_id: goiabada.id,
                            name: goiabada.name,
                            unit: goiabada.unit,
                            current_price: goiabada.current_price,
                            weight_raw: "1.000",
                            weight_cooked: "1.000", // Melts, doesn't lose much weight, becomes sauce base
                            locked: false
                        },
                        {
                            ingredient_id: ketchup.id,
                            name: ketchup.name,
                            unit: ketchup.unit,
                            current_price: ketchup.current_price,
                            weight_raw: "0.500",
                            weight_cooked: "0.450", // Slight reduction (10%)
                            locked: false
                        },
                        {
                            ingredient_id: vinegar.id,
                            name: vinegar.name,
                            unit: vinegar.unit,
                            current_price: vinegar.current_price,
                            weight_raw: "0.200",
                            weight_cooked: "0.100", // 50% Reduction (acid concentration)
                            locked: false
                        },
                        {
                            ingredient_id: worcestershire.id,
                            name: worcestershire.name,
                            unit: worcestershire.unit,
                            current_price: worcestershire.current_price,
                            weight_raw: "0.100",
                            weight_cooked: "0.080", // 20% Reduction
                            locked: false
                        }
                    ],
                    instructions: "1. Derreter goiabada com vinagre.\n2. Adicionar resto e reduzir.",
                    assembly_config: {
                        container_type: 'panela',
                        total_weight: "1.630", // 1.0 + 0.45 + 0.1 + 0.08
                        units_quantity: '1'
                    }
                },

                // --- STAGE 3: APPLE PUREE ---
                {
                    title: "3º Etapa: Purê de Maçã Verde",
                    processes: ['cleaning', 'cooking'],
                    notes: [],
                    ingredients: [
                        {
                            ingredient_id: apple.id,
                            name: apple.name,
                            unit: apple.unit,
                            current_price: apple.current_price,
                            weight_raw: "2.000",
                            weight_clean: "1.600", // 20% Peel/Core
                            weight_pre_cooking: "1.600",
                            weight_cooked: "1.400", // Cooked down/mashed loss
                            locked: false
                        },
                        {
                            ingredient_id: butter.id,
                            name: butter.name,
                            unit: butter.unit,
                            current_price: butter.current_price,
                            weight_raw: "0.100",
                            weight_clean: "0.100", // No cleaning loss
                            weight_cooked: "0.100", // Incorporated
                            locked: false
                        },
                        {
                            ingredient_id: lemon.id,
                            name: lemon.name,
                            unit: lemon.unit,
                            current_price: lemon.current_price,
                            weight_raw: "0.100",
                            weight_clean: "0.050", // Juice only (50% yield)
                            weight_pre_cooking: "0.050",
                            weight_cooked: "0.040", // Some evap
                            locked: false
                        }
                    ],
                    instructions: "1. Cozinhar maçãs descascadas com manteiga e limão até desmanchar.",
                    assembly_config: {
                        container_type: 'gn_1_3',
                        total_weight: "1.540",
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

seedPorkRecipe();
