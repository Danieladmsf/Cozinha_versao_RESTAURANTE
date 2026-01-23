
import { db } from '../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    Timestamp
} from 'firebase/firestore';

// Função auxiliar para criar/encontrar documentos
async function findOrCreate(collectionName, field, value, data) {
    const q = query(collection(db, collectionName), where(field, "==", value));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        console.log(`[EXISTING] ${collectionName}: ${value}`);
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } else {
        const docRef = await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        console.log(`[CREATED] ${collectionName}: ${value}`);
        return { id: docRef.id, ...data };
    }
}

async function seed() {
    console.log("Starting seed process...");

    try {
        // 1. Categorias
        console.log("\n--- Seeding Categories ---");
        const proteinCat = await findOrCreate("Category", "name", "Proteínas", {
            name: "Proteínas",
            type: "ingredient",
            active: true,
            level: 0
        });

        const beefCat = await findOrCreate("Category", "name", "Bovinos", {
            name: "Bovinos",
            parentId: proteinCat.id,
            type: "ingredient",
            active: true,
            level: 1
        });

        const chickenCat = await findOrCreate("Category", "name", "Aves", {
            name: "Aves",
            parentId: proteinCat.id,
            type: "ingredient",
            active: true,
            level: 1
        });

        const porkCat = await findOrCreate("Category", "name", "Suínos", {
            name: "Suínos",
            parentId: proteinCat.id,
            type: "ingredient",
            active: true,
            level: 1
        });

        // 2. Fornecedores
        console.log("\n--- Seeding Suppliers ---");
        const supplierBoi = await findOrCreate("Supplier", "name", "Frigorífico Boi d'Ouro", { name: "Frigorífico Boi d'Ouro", active: true });
        const supplierAve = await findOrCreate("Supplier", "name", "Granja Avícola", { name: "Granja Avícola", active: true });
        const supplierPig = await findOrCreate("Supplier", "name", "Distribuidora Suína", { name: "Distribuidora Suína", active: true });

        // 3. Marcas
        console.log("\n--- Seeding Brands ---");
        const brandFriboi = await findOrCreate("Brand", "name", "Friboi", { name: "Friboi", active: true });
        const brandSadia = await findOrCreate("Brand", "name", "Sadia", { name: "Sadia", active: true });
        const brandPerdigao = await findOrCreate("Brand", "name", "Perdigão", { name: "Perdigão", active: true });

        // 4. Ingredientes
        console.log("\n--- Seeding Ingredients ---");

        // Lista de ingredientes a criar
        const ingredientsToCreate = [
            {
                name: "Alcatra Peça",
                category_id: beefCat.id,
                supplier_id: supplierBoi.id,
                main_supplier: supplierBoi.name,
                brand: brandFriboi.name,
                brand_id: brandFriboi.id,
                current_price: 39.90,
                unit: "kg",
                type: "ingredient",
                history: [
                    { date: new Date('2023-11-20'), price: 38.00 },
                    { date: new Date('2023-12-20'), price: 42.00 },
                    { date: new Date('2024-01-20'), price: 39.90 }
                ]
            },
            {
                name: "Peito de Frango",
                category_id: chickenCat.id,
                supplier_id: supplierAve.id,
                main_supplier: supplierAve.name,
                brand: brandSadia.name,
                brand_id: brandSadia.id,
                current_price: 22.00,
                unit: "kg",
                type: "ingredient",
                history: [
                    { date: new Date('2023-11-20'), price: 18.00 },
                    { date: new Date('2023-12-20'), price: 19.50 },
                    { date: new Date('2024-01-20'), price: 22.00 }
                ]
            },
            {
                name: "Costelinha",
                category_id: porkCat.id,
                supplier_id: supplierPig.id,
                main_supplier: supplierPig.name,
                brand: brandPerdigao.name,
                brand_id: brandPerdigao.id,
                current_price: 26.50,
                unit: "kg",
                type: "ingredient",
                history: [
                    { date: new Date('2023-11-20'), price: 25.00 },
                    { date: new Date('2023-12-20'), price: 24.00 },
                    { date: new Date('2024-01-20'), price: 26.50 }
                ]
            }
        ];

        for (const item of ingredientsToCreate) {
            // Find category name for denormalization
            let categoryName = "";
            if (item.category_id === beefCat.id) categoryName = beefCat.name;
            else if (item.category_id === chickenCat.id) categoryName = chickenCat.name;
            else if (item.category_id === porkCat.id) categoryName = porkCat.name;

            // Cria ou busca o ingrediente
            const ingredient = await findOrCreate("Ingredient", "name", item.name, {
                name: item.name,
                category_id: item.category_id,
                category: categoryName, // Denormalized name for UI
                supplier_id: item.supplier_id,
                main_supplier: item.main_supplier,
                brand: item.brand,
                brand_id: item.brand_id, // Pode ser útil ter o ID também
                current_price: item.current_price,
                unit: item.unit,
                item_type: item.type,
                active: true,
                last_update: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                updatedAt: Timestamp.now()
            });

            // Seeding Price History
            console.log(`Adding price history for ${item.name}...`);
            for (const hist of item.history) {
                // Verifica se já existe histórico nessa data para não duplicar excessivamente
                // (Nota: Numa implementação real verificariamos mais criteriosamente, aqui é simples)
                await addDoc(collection(db, "PriceHistory"), {
                    ingredient_id: ingredient.id,
                    price: hist.price,
                    supplier_id: item.supplier_id,
                    date: Timestamp.fromDate(hist.date),
                    createdAt: Timestamp.now()
                });
            }
        }

        console.log("\nSeed completed successfully! Press Ctrl+C to exit if it doesn't close automatically.");

        // Pequeno delay para garantir logs
        setTimeout(() => {
            process.exit(0);
        }, 2000);

    } catch (error) {
        console.error("Seed failed:", error);
        process.exit(1);
    }
}

seed();
