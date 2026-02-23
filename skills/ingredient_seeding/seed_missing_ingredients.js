
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

const MISSING_INGREDIENTS = [
    // --- FROM MAMINHA RECIPE & SHARED ---
    {
        category: { name: "Hortifruti", parent: "Perecíveis", type: "ingredient" },
        supplier: {
            company_name: "Hortifruti Central",
            cnpj: "77.111.222/0001-33",
            vendor_name: "Seu José",
            vendor_phone: "(11) 91234-5678",
            email: "jose@horti.com",
            address: "CEAGESP",
            notes: "Produtos frescos diariamente.",
            active: true
        },
        brand: { name: "Nacional", manufacturer: "Local", preferred: true, active: true },
        ingredient: {
            name: "Cebola Roxa",
            unit: "kg", minimum_stock: 10, current_price: 6.50,
            notes: "Preferência por tamanhos médios.",
            history: [{ date: '2024-01-20', price: 6.50 }]
        }
    },
    {
        category: { name: "Hortifruti", parent: "Perecíveis", type: "ingredient" },
        supplier: {
            company_name: "Hortifruti Central",
            cnpj: "77.111.222/0001-33",
            vendor_name: "Seu José",
            vendor_phone: "(11) 91234-5678",
            email: "jose@horti.com",
            address: "CEAGESP",
            notes: "Produtos frescos diariamente.",
            active: true
        },
        brand: { name: "Nacional", manufacturer: "Local", preferred: true, active: true },
        ingredient: {
            name: "Alho Descascado",
            unit: "kg", minimum_stock: 2, current_price: 25.00,
            notes: "Embalagem de 1kg a vácuo.",
            history: [{ date: '2024-01-20', price: 25.00 }]
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
            address: "Rua do Leite, 100",
            notes: "Produto fresco.",
            active: true
        },
        brand: { name: "Aviação", manufacturer: "Laticínios Aviação", preferred: true, active: true },
        ingredient: {
            name: "Manteiga Sem Sal",
            unit: "kg", minimum_stock: 5, current_price: 45.00,
            notes: "Bloco de 5kg ou tabletes de 200g.",
            history: [{ date: '2024-01-20', price: 45.00 }]
        }
    },
    {
        category: { name: "Bebidas", parent: "Bar", type: "ingredient" },
        supplier: {
            company_name: "Adega Global",
            cnpj: "88.999.000/0001-55",
            vendor_name: "Sommelier Carlos",
            vendor_phone: "(11) 95555-4444",
            email: "carlos@adega.com",
            address: "Rua do Vinho, 20",
            notes: "Vinhos para cozinha.",
            active: true
        },
        brand: { name: "Pérgola", manufacturer: "Vinícola Campestre", preferred: true, active: true },
        ingredient: {
            name: "Vinho Tinto Seco",
            unit: "L", minimum_stock: 12, current_price: 32.00,
            notes: "Garrafão 4L ou Garrafa 750ml.",
            history: [{ date: '2024-01-20', price: 32.00 }]
        }
    },
    {
        category: { name: "Óleos e Gorduras", parent: "Mercearia", type: "ingredient" },
        supplier: {
            company_name: "Atacadão Foods",
            cnpj: "99.888.777/0001-22",
            vendor_name: "Sistema Automatizado",
            vendor_phone: "0800-123-456",
            email: "sac@atacadao.com",
            address: "Via Expressa, km 10",
            notes: "Compra em volume.",
            active: true
        },
        brand: { name: "Gallo", manufacturer: "Gallo", preferred: true, active: true },
        ingredient: {
            name: "Azeite de Oliva",
            unit: "L", minimum_stock: 5, current_price: 45.00,
            notes: "Tipo único ou virgem.",
            history: [{ date: '2024-01-20', price: 45.00 }]
        }
    },
    {
        category: { name: "Bovinos", parent: "Proteínas", type: "ingredient" },
        supplier: {
            company_name: "Frigorífico Boi d'Ouro Ltda",
            cnpj: "12.345.678/0001-90",
            vendor_name: "Roberto Silva",
            vendor_phone: "(11) 99999-8888",
            email: "vendas@boidouro.com.br",
            address: "Taboão da Serra - SP",
            notes: "Entregas terças e quintas.",
            active: true
        },
        brand: { name: "Friboi", manufacturer: "JBS", preferred: true, active: true },
        ingredient: {
            name: "Alcatra Peça",
            unit: "kg", minimum_stock: 10, current_price: 39.90,
            notes: "Peça inteira limpa.",
            history: [{ date: '2024-01-20', price: 39.90 }]
        }
    },
    {
        category: { name: "Temperos Secos", parent: "Mercearia", type: "ingredient" },
        supplier: {
            company_name: "Atacadão Foods",
            cnpj: "99.888.777/0001-22",
            vendor_name: "Loja",
            vendor_phone: "0800",
            email: "sac@atacadao.com",
            address: "Local",
            notes: "Granel",
            active: true
        },
        brand: { name: "Cisne", manufacturer: "Refinaria", preferred: true, active: true },
        ingredient: {
            name: "Sal Refinado",
            unit: "kg", minimum_stock: 20, current_price: 2.50,
            notes: "Saco 1kg.",
            history: [{ date: '2024-01-20', price: 2.50 }]
        }
    }
];

// --- HELPERS (Reused) ---

async function upsertCategory(catData) {
    let parentId = null;
    if (catData.parent) {
        const parentQ = query(collection(db, "Category"), where("name", "==", catData.parent));
        const parentSnap = await getDocs(parentQ);
        if (parentSnap.empty) {
            const parentRef = await addDoc(collection(db, "Category"), {
                name: catData.parent, type: catData.type, level: 0, active: true, createdAt: Timestamp.now()
            });
            parentId = parentRef.id;
        } else {
            parentId = parentSnap.docs[0].id;
        }
    }

    const q = query(collection(db, "Category"), where("name", "==", catData.name));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        if (docData.data().parentId !== parentId) await updateDoc(doc(db, "Category", docData.id), { parentId, level: parentId ? 1 : 0 });
        return { id: docData.id, name: catData.name };
    } else {
        const docRef = await addDoc(collection(db, "Category"), {
            name: catData.name, parentId, type: catData.type, level: parentId ? 1 : 0, active: true, createdAt: Timestamp.now()
        });
        return { id: docRef.id, name: catData.name };
    }
}

async function upsertSupplier(supData) {
    let q;
    if (supData.cnpj) q = query(collection(db, "Supplier"), where("cnpj", "==", supData.cnpj));
    else q = query(collection(db, "Supplier"), where("company_name", "==", supData.company_name));

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        await updateDoc(doc(db, "Supplier", docData.id), { ...supData, updatedAt: Timestamp.now() });
        return { id: docData.id, ...supData, supplier_code: docData.data().supplier_code };
    } else {
        const code = supData.company_name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000);
        const docRef = await addDoc(collection(db, "Supplier"), { ...supData, supplier_code: code, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        return { id: docRef.id, ...supData, supplier_code: code };
    }
}

async function upsertBrand(brandData) {
    const q = query(collection(db, "Brand"), where("name", "==", brandData.name));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return { id: snapshot.docs[0].id, ...brandData };
    const docRef = await addDoc(collection(db, "Brand"), { ...brandData, createdAt: Timestamp.now() });
    return { id: docRef.id, ...brandData };
}

async function seedMissingIngredients() {
    console.log("Starting Missing Ingredients Seeding...");
    try {
        for (const data of MISSING_INGREDIENTS) {
            console.log(`\nProcessing ${data.ingredient.name}...`);
            const category = await upsertCategory(data.category);
            const supplier = await upsertSupplier(data.supplier);
            const brand = await upsertBrand(data.brand);

            const ingQ = query(collection(db, "Ingredient"), where("name", "==", data.ingredient.name));
            const ingSnap = await getDocs(ingQ);

            const ingredientPayload = {
                name: data.ingredient.name,
                unit: data.ingredient.unit,
                category_id: category.id, category: category.name,
                supplier_id: supplier.id, main_supplier: supplier.company_name, supplier_code: supplier.supplier_code,
                brand_id: brand.id, brand: brand.name,
                current_price: data.ingredient.current_price,
                min_stock: data.ingredient.minimum_stock || 0,
                notes: data.ingredient.notes,
                active: true,
                last_update: new Date().toISOString().split('T')[0],
                updatedAt: Timestamp.now()
            };

            let ingredientId;
            if (!ingSnap.empty) {
                ingredientId = ingSnap.docs[0].id;
                await updateDoc(doc(db, "Ingredient", ingredientId), ingredientPayload);
                console.log(`[INGREDIENT] Updated Full: ${data.ingredient.name}`);
            } else {
                const docRef = await addDoc(collection(db, "Ingredient"), { ...ingredientPayload, createdAt: Timestamp.now() });
                ingredientId = docRef.id;
                console.log(`[INGREDIENT] Created Full: ${data.ingredient.name}`);
            }

            if (data.ingredient.history) {
                for (const hist of data.ingredient.history) {
                    await addDoc(collection(db, "PriceHistory"), {
                        ingredient_id: ingredientId, price: hist.price, supplier_id: supplier.id, supplier: supplier.company_name, date: Timestamp.fromDate(new Date(hist.date)), createdAt: Timestamp.now()
                    });
                }
                console.log(`[HISTORY] Added ${data.ingredient.history.length} records.`);
            }
        }
        console.log("\n✅ Missing Ingredients Seeding Completed!");
        setTimeout(() => process.exit(0), 1000);
    } catch (error) {
        console.error("❌ Seed Failed:", error);
        process.exit(1);
    }
}

seedMissingIngredients();
