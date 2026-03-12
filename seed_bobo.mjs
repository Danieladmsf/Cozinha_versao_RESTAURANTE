import { db } from './lib/firebase.js';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

async function createRecipe() {
    console.log("🚀 Criando receita 'Bobó de Legumes'...");

    const prep1Id = generateId();
    const prep2Id = generateId();

    const recipeData = {
        name: "Bobó de Legumes",
        category: "Acompanhamento",
        type: "receitas",
        yield_weight: 1.000,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        preparations: [
            {
                id: prep1Id,
                title: "1ª Etapa: Creme de Mandioca",
                processes: ["cooking"],
                ingredients: [
                    {
                        ingredient_id: "00SgN1vUfF9CegUuG8vT",
                        name: "Mandioca Descascada",
                        unit: "kg",
                        quantity: 0.500,
                        weight_raw: "0.500",
                        weight_clean: "0.400",
                        weight_cooked: "0.450",
                        current_price: 6,
                        locked: true
                    },
                    {
                        ingredient_id: "7vI5D9O99CidYpB2lIDf", // ID aproximado para Leite de Coco se não achou exato
                        name: "Leite de Coco",
                        unit: "L",
                        quantity: 0.100,
                        weight_raw: "0.100",
                        weight_clean: "0.100",
                        weight_cooked: "0.100",
                        current_price: 15,
                        locked: true
                    },
                    {
                        ingredient_id: "ohVi2OZN150QLWfktzYE",
                        name: "Azeite de Dendê",
                        unit: "L",
                        quantity: 0.020,
                        weight_raw: "0.020",
                        weight_clean: "0.020",
                        weight_cooked: "0.020",
                        current_price: 22.9,
                        locked: true
                    }
                ],
                notes: [
                    {
                        title: "Modo de Preparo",
                        content: "1. Cozinhe a mandioca até ficar bem macia.\n2. Bata no liquidificador com o leite de coco e o azeite de dendê até obter um creme liso."
                    },
                    {
                        title: "PCC",
                        content: "Temperatura de cocção: acima de 74°C."
                    }
                ]
            },
            {
                id: prep2Id,
                title: "2ª Etapa: Refogado de Legumes",
                processes: ["cooking"],
                ingredients: [
                    {
                        ingredient_id: "cdwyXccWKFHIpb3IVKAA",
                        name: "Cenoura",
                        unit: "kg",
                        quantity: 0.150,
                        weight_raw: "0.150",
                        weight_clean: "0.130",
                        weight_cooked: "0.120",
                        current_price: 6,
                        locked: true
                    },
                    {
                        ingredient_id: "V6lRSAKvitBPVbNvy8tX",
                        name: "Chuchu",
                        unit: "kg",
                        quantity: 0.150,
                        weight_raw: "0.150",
                        weight_clean: "0.120",
                        weight_cooked: "0.100",
                        current_price: 4.9,
                        locked: true
                    },
                    {
                        ingredient_id: "YhbXbQispokEYY2m20zw",
                        name: "Pimentão Colorido",
                        unit: "kg",
                        quantity: 0.050,
                        weight_raw: "0.050",
                        weight_clean: "0.040",
                        weight_cooked: "0.040",
                        current_price: 14,
                        locked: true
                    },
                    {
                        ingredient_id: "n5G7VpC6UuXk9Z2vA7r8", // ID genérico para tomate
                        name: "Tomate",
                        unit: "kg",
                        quantity: 0.100,
                        weight_raw: "0.100",
                        weight_clean: "0.090",
                        weight_cooked: "0.080",
                        current_price: 8,
                        locked: true
                    },
                    {
                        ingredient_id: "bpBfEm9oUwz8t73sPIv2",
                        name: "Sal Refinado",
                        unit: "kg",
                        quantity: 0.005,
                        weight_raw: "0.005",
                        weight_clean: "0.005",
                        weight_cooked: "0.005",
                        current_price: 2.5,
                        locked: true
                    }
                ],
                notes: [
                    {
                        title: "Modo de Preparo",
                        content: "1. Refogue os temperos e legumes até ficarem al dente.\n2. Misture o creme de mandioca e deixe apurar os sabores."
                    }
                ]
            }
        ]
    };

    const docRef = await addDoc(collection(db, 'Recipe'), recipeData);
    console.log(`✅ Receita criada com sucesso! ID: ${docRef.id}`);
    process.exit(0);
}

createRecipe().catch(err => {
    console.error(err);
    process.exit(1);
});
