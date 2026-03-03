
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

// =============================================
// SEED: Carne Vermelha Patinho + Audit sem preço
// =============================================

const NEW_INGREDIENTS = [
    {
        category: { name: "Bovinos", parent: "Proteínas", type: "ingredient" },
        supplier: {
            company_name: "Açougue",
            cnpj: "",
            vendor_name: "",
            vendor_phone: "",
            email: "",
            address: "",
            notes: "Fornecedor de carnes vermelhas.",
            active: true
        },
        brand: { name: "Nacional", manufacturer: "Local", preferred: true, active: true },
        ingredient: {
            name: "Carne Vermelha Patinho",
            unit: "kg",
            minimum_stock: 5,
            current_price: 34.90,
            notes: "Patinho peça ou bifes, carne magra.",
            history: [{ date: '2026-02-28', price: 34.90 }]
        }
    }
];

// --- HELPERS (Reused from skill) ---

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

async function seedNewIngredients() {
    console.log("🥩 Starting: Carne Vermelha Patinho Seeding...\n");
    try {
        for (const data of NEW_INGREDIENTS) {
            console.log(`Processing ${data.ingredient.name}...`);
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
                console.log(`  [INGREDIENT] Updated: ${data.ingredient.name}`);
            } else {
                const docRef = await addDoc(collection(db, "Ingredient"), { ...ingredientPayload, createdAt: Timestamp.now() });
                ingredientId = docRef.id;
                console.log(`  [INGREDIENT] Created: ${data.ingredient.name} (ID: ${ingredientId})`);
            }

            if (data.ingredient.history) {
                for (const hist of data.ingredient.history) {
                    await addDoc(collection(db, "PriceHistory"), {
                        ingredient_id: ingredientId, price: hist.price, supplier_id: supplier.id, supplier: supplier.company_name, date: Timestamp.fromDate(new Date(hist.date)), createdAt: Timestamp.now()
                    });
                }
                console.log(`  [HISTORY] Added ${data.ingredient.history.length} price records.`);
            }
        }

        // =============================================
        // AUDIT: Ingredients without price
        // =============================================
        console.log("\n\n📊 === AUDITORIA: Ingredientes SEM PREÇO === 📊\n");

        const allIngredients = await getDocs(collection(db, "Ingredient"));
        const withoutPrice = [];

        allIngredients.forEach(docSnap => {
            const data = docSnap.data();
            const price = data.current_price;
            if (price === undefined || price === null || price === 0 || price === '' || price === '0') {
                withoutPrice.push({
                    id: docSnap.id,
                    name: data.name || '(sem nome)',
                    unit: data.unit || '?',
                    category: data.category || 'Sem categoria',
                    supplier: data.main_supplier || 'S/ Fornecedor'
                });
            }
        });

        if (withoutPrice.length === 0) {
            console.log("✅ Todos os ingredientes possuem preço cadastrado!");
        } else {
            console.log(`⚠️  ${withoutPrice.length} ingredientes encontrados SEM PREÇO:\n`);
            console.log("  #  | Nome                              | Unidade | Categoria        | Fornecedor");
            console.log("  ---|-----------------------------------|---------|------------------|------------------");
            withoutPrice.forEach((ing, idx) => {
                const num = String(idx + 1).padStart(3, ' ');
                const name = ing.name.padEnd(35, ' ');
                const unit = ing.unit.padEnd(7, ' ');
                const cat = (ing.category || '').padEnd(16, ' ');
                console.log(`  ${num}| ${name}| ${unit} | ${cat} | ${ing.supplier}`);
            });
        }

        console.log("\n✅ Seed + Audit Completed!");
        setTimeout(() => process.exit(0), 1500);
    } catch (error) {
        console.error("❌ Seed Failed:", error);
        process.exit(1);
    }
}

seedNewIngredients();
