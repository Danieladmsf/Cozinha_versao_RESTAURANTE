
import { db } from '../../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    Timestamp,
    updateDoc,
    doc
} from 'firebase/firestore';

async function populateBifeAcebolado() {
    console.log("🥘 Finding and Populating 'Bife Grelhado acebolado'...");

    try {
        // --- HELPERS ---
        const upsertCategory = async (name) => {
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

        // --- 1. FIND RECIPE ---
        const recipeName = "Bife Grelhado acebolado";
        const q = query(collection(db, "Recipe"), where("name", "==", recipeName));
        const qSnap = await getDocs(q);

        if (qSnap.empty) {
            console.warn(`⚠️ Recipe '${recipeName}' NOT FOUND. Creating it now...`);
            // Fallback: Create if not exists, though user said it does.
        } else {
            console.log(`✅ Found Recipe: '${recipeName}' (ID: ${qSnap.docs[0].id})`);
        }

        const recipeId = qSnap.empty ? null : qSnap.docs[0].id;

        // --- 2. PREPARE INGREDIENTS ---
        // Contra Filé (Steak)
        const steak = await ensureIngredient("Contra Filé Peça", 58.00, "kg", "Bovinos", "Boi d'Ouro");
        // Onions
        const onion = await ensureIngredient("Cebola Branca", 4.50, "kg", "Hortifruti", "Ceagesp");
        // Oil
        const oil = await ensureIngredient("Óleo de Soja", 8.00, "L", "Despensa", "Atacadão");
        // Salt
        const salt = await ensureIngredient("Sal Refinado", 2.00, "kg", "Despensa", "Atacadão");

        // --- 3. DEFINE DATA ---
        // Scenario:
        // Steak: 0.250kg Raw -> Clean (loss of fat/nerve 10%) -> Cooked (Medium 15% loss)
        // Onion: 0.150kg Raw -> Peel (10%) -> Caramelized (40% loss due to water evap)

        const preparations = [
            {
                title: "Bife e Cebola",
                processes: ['cleaning', 'cooking'],
                notes: [
                    {
                        title: "Ponto da Carne",
                        content: "Grelhar em fogo alto. A cebola entra na mesma frigideira para pegar o fundo (deglacê).",
                        createdAt: Timestamp.now(), updatedAt: Timestamp.now()
                    }
                ],
                ingredients: [
                    {
                        ingredient_id: steak.id, name: steak.name, unit: steak.unit, current_price: steak.current_price, locked: false,
                        weight_raw: "0.250",
                        weight_clean: "0.225", // 10% trim
                        weight_cooked: "0.190", // ~15% cook loss
                    },
                    {
                        ingredient_id: onion.id, name: onion.name, unit: onion.unit, current_price: onion.current_price, locked: false,
                        weight_raw: "0.150",
                        weight_clean: "0.135", // 10% peel
                        weight_cooked: "0.080", // High loss sautéing
                    },
                    {
                        ingredient_id: oil.id, name: oil.name, unit: oil.unit, current_price: oil.current_price, locked: false,
                        weight_raw: "0.020",
                        weight_clean: "0.020", // No cleaning loss
                        weight_cooked: "0.015", // Some absorption/evap
                    },
                    {
                        ingredient_id: salt.id, name: salt.name, unit: salt.unit, current_price: salt.current_price, locked: false,
                        weight_raw: "0.005",
                        weight_clean: "0.005", // No cleaning loss
                        weight_cooked: "0.005",
                    }
                ],
                instructions: "1. Temperar os bifes.\n2. Grelhar ao ponto.\n3. Refogar cebolas na mesma panela.",
                assembly_config: {
                    container_type: 'prato',
                    total_weight: "0.290", // 0.190 (meat) + 0.080 (onion) + 0.015 + 0.005
                    units_quantity: '1'
                }
            }
        ];

        const updateData = {
            description: "Clássico bife de contra filé com cebolas douradas.",
            category: "Pratos Executivos",
            preparations: preparations,
            updatedAt: Timestamp.now(),
            status: "active" // Ensure it's active
        };

        // --- 4. EXECUTE UPDATE ---
        if (recipeId) {
            const recipeRef = doc(db, "Recipe", recipeId);
            await updateDoc(recipeRef, updateData);
            console.log(`✅ Recipe Updated Successfully!`);
        } else {
            // Create if missing
            const newRef = await addDoc(collection(db, "Recipe"), {
                name: recipeName,
                ...updateData,
                createdAt: Timestamp.now()
            });
            console.log(`✅ Recipe Created (was missing): ${newRef.id}`);
        }

        console.log(`   > Final Plated Weight: ${preparations[0].assembly_config.total_weight} kg`);

        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

populateBifeAcebolado();
