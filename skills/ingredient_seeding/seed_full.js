
import { db } from '../../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
    Timestamp
} from 'firebase/firestore';

// --- DATASET COMPLETO ---
const MOCK_DATA = [
    {
        category: { name: "Bovinos", parent: "Proteínas", type: "ingredient" },
        supplier: {
            company_name: "Frigorífico Boi d'Ouro Ltda",
            cnpj: "12.345.678/0001-90",
            vendor_name: "Roberto Silva",
            vendor_phone: "(11) 99999-8888",
            email: "vendas@boidouro.com.br",
            address: "Rodovia BR 116, Km 400, Taboão da Serra - SP",
            notes: "Entregas terças e quintas. Pagamento 28 dias.",
            active: true
        },
        brand: {
            name: "Friboi",
            manufacturer: "JBS",
            preferred: true,
            active: true
        },
        ingredient: {
            name: "Alcatra Peça (Maturada)",
            unit: "kg",
            min_stock: 5,
            current_price: 39.90,
            notes: "Peça inteira maturada, verificar validade.",
            history: [
                { date: '2023-11-20', price: 38.00 },
                { date: '2023-12-20', price: 42.00 },
                { date: '2024-01-20', price: 39.90 }
            ]
        }
    },
    {
        category: { name: "Laticínios", parent: "Perecíveis", type: "ingredient" },
        supplier: {
            company_name: "Laticínios da Serra",
            cnpj: "98.765.432/0001-10",
            vendor_name: "Mariana Costa",
            vendor_phone: "(35) 98888-7777",
            email: "comercial@laticiniosserra.com.br",
            address: "Rua do Leite, 100, Poços de Caldas - MG",
            notes: "Produto fresco, validade curta.",
            active: true
        },
        brand: {
            name: "Piracanjuba",
            manufacturer: "Laticínios Bela Vista",
            preferred: true,
            active: true
        },
        ingredient: {
            name: "Creme de Leite Fresco",
            unit: "L",
            min_stock: 2,
            current_price: 28.50,
            notes: "Manter refrigerado entre 2°C e 5°C",
            history: [
                { date: '2023-11-15', price: 25.00 },
                { date: '2023-12-15', price: 29.00 },
                { date: '2024-01-15', price: 28.50 }
            ]
        }
    }
];

// --- HELPERS ---

async function upsertCategory(catData) {
    // 1. Busca ou cria o PAI se existir
    let parentId = null;
    if (catData.parent) {
        const parentQ = query(collection(db, "Category"), where("name", "==", catData.parent));
        const parentSnap = await getDocs(parentQ);

        if (parentSnap.empty) {
            const parentRef = await addDoc(collection(db, "Category"), {
                name: catData.parent,
                type: catData.type,
                level: 0,
                active: true,
                createdAt: Timestamp.now()
            });
            parentId = parentRef.id;
            console.log(`[CATEGORY] Created Parent: ${catData.parent}`);
        } else {
            parentId = parentSnap.docs[0].id;
        }
    }

    // 2. Busca ou cria a categoria alvo
    const q = query(collection(db, "Category"), where("name", "==", catData.name));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        // Se precisar atualizar o pai ou tipo
        if (docData.data().parentId !== parentId) {
            await updateDoc(doc(db, "Category", docData.id), {
                parentId,
                level: parentId ? 1 : 0
            });
        }
        return { id: docData.id, name: catData.name };
    } else {
        const docRef = await addDoc(collection(db, "Category"), {
            name: catData.name,
            parentId,
            type: catData.type,
            level: parentId ? 1 : 0,
            active: true,
            createdAt: Timestamp.now()
        });
        console.log(`[CATEGORY] Created: ${catData.name}`);
        return { id: docRef.id, name: catData.name };
    }
}

async function upsertSupplier(supData) {
    // Busca por CNPJ (preferencial) ou Nome
    let q;
    if (supData.cnpj) {
        q = query(collection(db, "Supplier"), where("cnpj", "==", supData.cnpj));
    } else {
        q = query(collection(db, "Supplier"), where("company_name", "==", supData.company_name));
    }

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        const existingData = docData.data();
        // Atualiza dados faltantes
        await updateDoc(doc(db, "Supplier", docData.id), {
            ...supData,
            updatedAt: Timestamp.now()
        });
        console.log(`[SUPPLIER] Updated: ${supData.company_name}`);
        return { id: docData.id, ...supData, supplier_code: existingData.supplier_code };
    } else {
        // Gera código se não tiver (lógica simplificada aqui)
        const code = supData.company_name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000);
        const docRef = await addDoc(collection(db, "Supplier"), {
            ...supData,
            supplier_code: code,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        console.log(`[SUPPLIER] Created: ${supData.company_name}`);
        return { id: docRef.id, ...supData, supplier_code: code };
    }
}

async function upsertBrand(brandData) {
    const q = query(collection(db, "Brand"), where("name", "==", brandData.name));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...brandData };
    } else {
        const docRef = await addDoc(collection(db, "Brand"), {
            ...brandData,
            createdAt: Timestamp.now()
        });
        console.log(`[BRAND] Created: ${brandData.name}`);
        return { id: docRef.id, ...brandData };
    }
}

async function seedFull() {
    console.log("Starting COMPLETE seed process...");

    try {
        for (const data of MOCK_DATA) {
            console.log(`\nProcessing ${data.ingredient.name}...`);

            // 1. Resolve Dependencies
            const category = await upsertCategory(data.category);
            const supplier = await upsertSupplier(data.supplier);
            const brand = await upsertBrand(data.brand);

            // 2. Resolve Ingredient
            const ingQ = query(collection(db, "Ingredient"), where("name", "==", data.ingredient.name));
            const ingSnap = await getDocs(ingQ);

            let ingredientId;

            const ingredientPayload = {
                name: data.ingredient.name,
                unit: data.ingredient.unit,

                // VINCULOS COMPLETOS
                category_id: category.id,
                category: category.name, // Denormalizado para UI

                supplier_id: supplier.id,
                main_supplier: supplier.company_name, // Denormalizado
                supplier_code: supplier.supplier_code,

                brand_id: brand.id,
                brand: brand.name, // Denormalizado

                current_price: data.ingredient.current_price,
                min_stock: data.ingredient.min_stock,
                notes: data.ingredient.notes,
                active: true,
                last_update: new Date().toISOString().split('T')[0],
                updatedAt: Timestamp.now()
            };

            if (!ingSnap.empty) {
                ingredientId = ingSnap.docs[0].id;
                await updateDoc(doc(db, "Ingredient", ingredientId), ingredientPayload);
                console.log(`[INGREDIENT] Updated Full: ${data.ingredient.name}`);
            } else {
                const docRef = await addDoc(collection(db, "Ingredient"), {
                    ...ingredientPayload,
                    createdAt: Timestamp.now()
                });
                ingredientId = docRef.id;
                console.log(`[INGREDIENT] Created Full: ${data.ingredient.name}`);
            }

            // 3. Price History
            if (data.ingredient.history) {
                for (const hist of data.ingredient.history) {
                    // Check for existing history to avoid dups (optional but good)
                    // Simplified: just add
                    await addDoc(collection(db, "PriceHistory"), {
                        ingredient_id: ingredientId,
                        price: hist.price,
                        supplier_id: supplier.id,
                        supplier: supplier.company_name,
                        date: Timestamp.fromDate(new Date(hist.date)),
                        createdAt: Timestamp.now()
                    });
                }
                console.log(`[HISTORY] Added ${data.ingredient.history.length} records.`);
            }
        }

        console.log("\n✅ Full Seed Completed via Skill Tool!");
        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Seed Failed:", error);
        process.exit(1);
    }
}

seedFull();
