
import { db } from '../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    Timestamp
} from 'firebase/firestore';

/**
 * Script para criar a receita "Arroz Branco"
 * Seguindo o padrão "Chef Profissional" da skill recipe_creation
 * 
 * Características:
 * - Tipo: Receitas - Base (guarnição, não vendida diretamente)
 * - Etapa única: Cocção do arroz
 * - Perda de cocção: O arroz GANHA peso ao absorver água (~3x)
 */

async function seedArrozBranco() {
    console.log("🍚 Criando Receita: Arroz Branco...\n");

    try {
        // ========== FUNÇÕES AUXILIARES ==========

        const upsertCategory = async (name) => {
            const q = query(collection(db, "Category"), where("name", "==", name));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) return { id: snapshot.docs[0].id, name };
            const docRef = await addDoc(collection(db, "Category"), {
                name, parentId: null, type: 'ingredient', level: 0, active: true, createdAt: Timestamp.now()
            });
            console.log(`✅ [Category] Criada: ${name}`);
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
            console.log(`✅ [Supplier] Criado: ${company_name}`);
            return { id: docRef.id, company_name, supplier_code: code };
        };

        const ensureIngredient = async (name, price, unit, categoryName = "Despensa", supplierName = "Fornecedor Geral") => {
            const q = query(collection(db, "Ingredient"), where("name", "==", name));
            const snap = await getDocs(q);
            if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

            // Create Dependencies
            const category = await upsertCategory(categoryName);
            const supplier = await upsertSupplier(supplierName);

            const newRef = await addDoc(collection(db, "Ingredient"), {
                name, current_price: price, unit, active: true,
                category_id: category.id, category: category.name,
                supplier_id: supplier.id, main_supplier: supplier.company_name, supplier_code: supplier.supplier_code,
                brand: "Genérica",
                createdAt: Timestamp.now(), updatedAt: Timestamp.now()
            });
            console.log(`✅ [Ingredient] Criado: ${name}`);
            return { id: newRef.id, name, current_price: price, unit };
        };

        // ========== INGREDIENTES ==========
        console.log("📦 Verificando/Criando Ingredientes...\n");

        const arroz = await ensureIngredient("Arroz Branco Tipo 1", 5.50, "kg", "Grãos e Cereais", "Atacadão");
        const sal = await ensureIngredient("Sal Refinado", 2.50, "kg", "Despensa", "Atacadão");
        const oleo = await ensureIngredient("Óleo de Soja", 8.90, "L", "Despensa", "Atacadão");
        const alho = await ensureIngredient("Alho Fresco", 35.00, "kg", "Hortifruti", "Ceasa");
        const cebola = await ensureIngredient("Cebola Branca", 6.50, "kg", "Hortifruti", "Ceasa");
        const agua = await ensureIngredient("Água Filtrada", 0.00, "L", "Despensa", "Interno");

        // ========== CÁLCULOS DE PESO ==========
        /**
         * Rendimento: 5kg de arroz cozido (pronto para servir)
         * 
         * Proporção padrão: 1 arroz : 2 água (absorção)
         * Arroz cru: 1.500 kg
         * Água: 3.000 L (absorvida pelo arroz)
         * 
         * Perdas:
         * - Cebola: 10% de limpeza (casca)
         * - Alho: 15% de limpeza (casca)
         * - Evaporação: ~10% da água durante cocção
         * 
         * Peso final ≈ Arroz cru (1.5) + Água absorvida (2.7) + Óleo (0.05) = ~4.25kg
         * (pequena evaporação do arroz compensada)
         */

        const arrozCru = 1.500;       // kg
        const aguaTotal = 3.000;       // L (litros = kg para água)
        const aguaAbsorvida = 2.700;   // L após evaporação (~10% perde)

        const oleoQtd = 0.050;         // 50ml

        const cebolaRaw = 0.100;       // 100g
        const cebolaClean = 0.090;     // 90g (10% perda casca)
        const cebolaCooked = 0.050;    // 50g (reduz na cocção)

        const alhoRaw = 0.030;         // 30g
        const alhoClean = 0.025;       // 25g (15% perda casca)
        const alhoCooked = 0.015;      // 15g (reduz na cocção)

        const salQtd = 0.025;          // 25g (1 colher de sopa cheia)

        const pesoFinal = (arrozCru + aguaAbsorvida + oleoQtd + cebolaCooked + alhoCooked + salQtd).toFixed(3);

        // ========== RECEITA ==========
        console.log("\n📝 Montando Ficha Técnica...\n");

        const recipeData = {
            name: "Arroz Branco",
            description: "Arroz branco soltinho, refogado com alho e cebola. Base essencial para acompanhamentos.",
            type: "receitas",  // Receita - Base (não vendida diretamente)
            category: "Guarnições",
            yield_type: "portion",
            status: "active",
            preparations: [
                {
                    title: "1ª Etapa: Preparo do Arroz",
                    processes: ['cleaning', 'cooking'],
                    ingredients: [
                        {
                            ingredient_id: arroz.id,
                            name: arroz.name,
                            unit: arroz.unit,
                            current_price: arroz.current_price,
                            weight_raw: arrozCru.toString(),
                            weight_clean: arrozCru.toString(),  // Arroz não tem perda de limpeza
                            weight_cooked: (arrozCru + aguaAbsorvida).toFixed(3),  // Absorve água
                            locked: false
                        },
                        {
                            ingredient_id: agua.id,
                            name: agua.name,
                            unit: agua.unit,
                            current_price: agua.current_price,
                            weight_raw: aguaTotal.toString(),
                            weight_clean: aguaTotal.toString(),
                            weight_cooked: "0.000",  // Toda água é absorvida ou evapora
                            locked: false
                        },
                        {
                            ingredient_id: oleo.id,
                            name: oleo.name,
                            unit: oleo.unit,
                            current_price: oleo.current_price,
                            weight_raw: oleoQtd.toString(),
                            weight_clean: oleoQtd.toString(),
                            weight_cooked: oleoQtd.toString(),  // Incorpora ao arroz
                            locked: false
                        },
                        {
                            ingredient_id: cebola.id,
                            name: cebola.name,
                            unit: cebola.unit,
                            current_price: cebola.current_price,
                            weight_raw: cebolaRaw.toString(),
                            weight_clean: cebolaClean.toString(),  // Remove casca
                            weight_cooked: cebolaCooked.toString(),  // Reduz no refogado
                            locked: false
                        },
                        {
                            ingredient_id: alho.id,
                            name: alho.name,
                            unit: alho.unit,
                            current_price: alho.current_price,
                            weight_raw: alhoRaw.toString(),
                            weight_clean: alhoClean.toString(),  // Remove casca
                            weight_cooked: alhoCooked.toString(),  // Reduz no refogado
                            locked: false
                        },
                        {
                            ingredient_id: sal.id,
                            name: sal.name,
                            unit: sal.unit,
                            current_price: sal.current_price,
                            weight_raw: salQtd.toString(),
                            weight_clean: salQtd.toString(),
                            weight_cooked: salQtd.toString(),  // Dissolve completamente
                            locked: false
                        }
                    ],
                    notes: [
                        {
                            title: "Preparo Inicial",
                            content: "Lavar o arroz em água corrente até a água sair clara (opcional, remove excesso de amido). Descascar e picar a cebola em cubos pequenos. Descascar e picar o alho finamente.",
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        },
                        {
                            title: "Refogado",
                            content: "Aquecer o óleo em panela grossa. Refogar cebola até dourar levemente (~2 min). Adicionar alho e refogar por mais 30 segundos (não deixar queimar).",
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        },
                        {
                            title: "Cocção",
                            content: "Adicionar o arroz e mexer bem, tostando levemente (~1 min). Adicionar a água FERVENTE e o sal. Tampar e cozinhar em fogo BAIXO por 15-18 minutos.",
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        },
                        {
                            title: "Finalização",
                            content: "Desligar o fogo e deixar descansar tampado por 5 minutos. Soltar com garfo antes de servir.",
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    ],
                    assembly_config: {
                        container_type: 'cuba',
                        total_weight: pesoFinal,
                        units_quantity: '1'
                    }
                }
            ],
            // Informações de rendimento
            yield_info: {
                total_weight_kg: parseFloat(pesoFinal),
                portion_size_g: 150,
                portions_per_batch: Math.floor((parseFloat(pesoFinal) * 1000) / 150),
                notes: "Rende aproximadamente 28 porções de 150g"
            },
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        // ========== SALVAR NO FIREBASE ==========
        console.log("💾 Salvando no Firebase...\n");

        // Verificar se já existe
        const recQ = query(collection(db, "Recipe"), where("name", "==", recipeData.name));
        const recSnap = await getDocs(recQ);

        if (!recSnap.empty) {
            console.log("⚠️ Receita com este nome já existe. Criando nova versão.");
            recipeData.name = `${recipeData.name} (v${new Date().getTime().toString().slice(-4)})`;
        }

        const docRef = await addDoc(collection(db, "Recipe"), recipeData);
        console.log(`✅ Receita Criada: ${recipeData.name} (ID: ${docRef.id})`);

        // ========== RESUMO ==========
        console.log("\n" + "=".repeat(50));
        console.log("📊 RESUMO DA FICHA TÉCNICA");
        console.log("=".repeat(50));
        console.log(`📛 Nome: ${recipeData.name}`);
        console.log(`📂 Categoria: ${recipeData.category}`);
        console.log(`⚖️ Peso Total: ${pesoFinal} kg`);
        console.log(`🍽️ Porções (150g): ${recipeData.yield_info.portions_per_batch}`);
        console.log("\n📦 Ingredientes:");
        recipeData.preparations[0].ingredients.forEach(ing => {
            console.log(`   • ${ing.name}: ${ing.weight_raw}${ing.unit === 'kg' ? ' kg' : ' L'}`);
        });
        console.log("=".repeat(50));

        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Erro ao criar receita:", error);
        process.exit(1);
    }
}

seedArrozBranco();
