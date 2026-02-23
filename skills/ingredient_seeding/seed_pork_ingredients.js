
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

const PORK_INGREDIENTS = [
    // 1. COSTELA (Protein)
    {
        category: { name: "Suínos", parent: "Proteínas", type: "ingredient" },
        supplier: {
            company_name: "Frigorífico Pampeano Sul",
            cnpj: "45.123.456/0001-88",
            vendor_name: "Carlos Tche",
            vendor_phone: "(51) 99888-1111",
            email: "vendas@pampeano.com.br",
            address: "Estada do Sul, 500, Porto Alegre - RS",
            notes: "Entregas semanais às quartas-feiras.",
            active: true
        },
        brand: { name: "Pampeano", manufacturer: "Pampeano Alimentos", preferred: true, active: true },
        ingredient: {
            name: "Costela Suína Peça",
            unit: "kg", minimum_stock: 15, current_price: 28.90,
            notes: "Peça inteira com osso, ideal para assados longos.",
            history: [{ date: '2024-01-05', price: 27.50 }, { date: '2024-01-20', price: 28.90 }]
        }
    },
    // 2. DRY RUB (Spice)
    {
        category: { name: "Temperos Secos", parent: "Mercearia", type: "ingredient" },
        supplier: {
            company_name: "Casa dos Temperos",
            cnpj: "11.222.333/0001-44",
            vendor_name: "Dona Maria",
            vendor_phone: "(11) 97777-6666",
            email: "pedidos@casadostemperos.com",
            address: "Mercado Municipal, Box 42",
            notes: "Produto granel, alta qualidade.",
            active: true
        },
        brand: { name: "Próprio", manufacturer: "Interno", preferred: true, active: true },
        ingredient: {
            name: "Dry Rub Casa",
            unit: "kg", minimum_stock: 2, current_price: 45.00,
            notes: "Mix secreto da casa (Páprica, Sal, Açúcar Mascavo, Alho, Cebola).",
            history: [{ date: '2024-01-01', price: 42.00 }, { date: '2024-01-20', price: 45.00 }]
        }
    },
    // 3. GOIABADA (Sweet)
    {
        category: { name: "Doces e Conservas", parent: "Mercearia", type: "ingredient" },
        supplier: {
            company_name: "Distribuidora Doce Sabor",
            cnpj: "55.666.777/0001-99",
            vendor_name: "Julia Sweet",
            vendor_phone: "(31) 99999-0000",
            email: "julia@docesabor.com.br",
            address: "Av Contorno, MG",
            notes: "Goiabada cascão artesanal.",
            active: true
        },
        brand: { name: "Zélia", manufacturer: "Doces Zélia", preferred: true, active: true },
        ingredient: {
            name: "Goiabada Cascão",
            unit: "kg", minimum_stock: 5, current_price: 12.00,
            notes: "Bloco de 1kg ou mais.",
            history: [{ date: '2023-12-01', price: 10.50 }, { date: '2024-01-15', price: 12.00 }]
        }
    },
    // 4. CONDIMENTS (Ketchup, Vinegar, Worcestershire)
    {
        category: { name: "Condimentos", parent: "Mercearia", type: "ingredient" },
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
        brand: { name: "Heinz", manufacturer: "Kraft Heinz", preferred: true, active: true },
        ingredient: {
            name: "Catchup Tradicional",
            unit: "kg", minimum_stock: 10, current_price: 15.00,
            notes: "Galão de 3kg ou mais.",
            history: [{ date: '2024-01-20', price: 15.00 }]
        }
    },
    {
        category: { name: "Condimentos", parent: "Mercearia", type: "ingredient" },
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
        brand: { name: "Castelo", manufacturer: "Castelo Alimentos", preferred: true, active: true },
        ingredient: {
            name: "Vinagre de Maçã",
            unit: "L", minimum_stock: 6, current_price: 8.00,
            notes: "Acidez 4%.",
            history: [{ date: '2024-01-20', price: 8.00 }]
        }
    },
    {
        category: { name: "Condimentos", parent: "Mercearia", type: "ingredient" },
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
        brand: { name: "Lea & Perrins", manufacturer: "Kraft Heinz", preferred: true, active: true },
        ingredient: {
            name: "Molho Inglês",
            unit: "L", minimum_stock: 2, current_price: 22.00,
            notes: "Original.",
            history: [{ date: '2024-01-20', price: 22.00 }]
        }
    },
    // 5. PRODUCE (Apple, Lemon)
    {
        category: { name: "Frutas", parent: "Hortifruti", type: "ingredient" },
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
        brand: { name: "Importada", manufacturer: "Global Fruit", preferred: false, active: true },
        ingredient: {
            name: "Maçã Verde",
            unit: "kg", minimum_stock: 5, current_price: 14.00,
            notes: "Granny Smith.",
            history: [{ date: '2024-01-18', price: 13.50 }, { date: '2024-01-20', price: 14.00 }]
        }
    },
    {
        category: { name: "Frutas", parent: "Hortifruti", type: "ingredient" },
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
            name: "Limão Taiti",
            unit: "kg", minimum_stock: 3, current_price: 6.00,
            notes: "Casca fina, muito caldo.",
            history: [{ date: '2024-01-20', price: 6.00 }]
        }
    }
];

// --- HELPERS (Reused from seed_full.js) ---

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

async function seedPorkIngredients() {
    console.log("Starting Pork Recipe Ingredients Seeding...");
    try {
        for (const data of PORK_INGREDIENTS) {
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
        console.log("\n✅ Pork Ingredients Seeding Completed!");
        setTimeout(() => process.exit(0), 1000);
    } catch (error) {
        console.error("❌ Seed Failed:", error);
        process.exit(1);
    }
}

seedPorkIngredients();
