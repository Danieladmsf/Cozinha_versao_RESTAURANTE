import { db } from './lib/firebase.js';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

async function createFishRecipe() {
    console.log("🚀 Criando receita 'Tiras de Peixe Empanada'...");

    const prep1Id = generateId();
    const prep2Id = generateId();

    const recipeData = {
        name: "Tiras de Peixe Empanada",
        category: "Peixe",
        type: "receitas",
        yield_weight: 1.000,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        preparations: [
            {
                id: prep1Id,
                title: "1ª Etapa: Corte e Tempero",
                processes: ["cleaning", "cooking"],
                ingredients: [
                    {
                        ingredient_id: "VgEvFYz9KajGSS8xHhFb", // Pangasius (Peixe)
                        name: "Pangasius (Peixe)",
                        unit: "kg",
                        quantity: 1.150,
                        weight_raw: "1.150",
                        weight_clean: "1.000",
                        weight_cooked: "0.800", // Pós tempero/marina (antes de empanar)
                        current_price: 25,
                        locked: true
                    },
                    {
                        ingredient_id: "bpBfEm9oUwz8t73sPIv2", // Sal Refinado
                        name: "Sal Refinado",
                        unit: "kg",
                        quantity: 0.005,
                        weight_raw: "0.005",
                        weight_clean: "0.005",
                        weight_cooked: "0.005",
                        current_price: 2.5,
                        locked: true
                    },
                    {
                        ingredient_id: "6H030l0kK8XGKEUKJbu3", // Alho (Generic/Approximated from common searches)
                        name: "Alho",
                        unit: "kg",
                        quantity: 0.002,
                        weight_raw: "0.002",
                        weight_clean: "0.002",
                        weight_cooked: "0.002",
                        current_price: 20,
                        locked: true
                    },
                    {
                        ingredient_id: "YTznaYk0eBt25ky0tl0z", // Limão
                        name: "Limão",
                        unit: "kg",
                        quantity: 0.050,
                        weight_raw: "0.050",
                        weight_clean: "0.050",
                        weight_cooked: "0.050",
                        current_price: 6,
                        locked: true
                    }
                ],
                notes: [
                    {
                        title: "Modo de Preparo",
                        content: "1. Corte o Pangasius em tiras uniformes.\n2. Tempere com sal, alho amassado e suco de limão.\n3. Deixe marinar por pelo menos 30 minutos em refrigeração."
                    },
                    {
                        title: "PCC",
                        content: "Manter peixe refrigerado abaixo de 5°C. Evitar contaminação cruzada."
                    }
                ]
            },
            {
                id: prep2Id,
                title: "2ª Etapa: Empanamento",
                processes: ["cooking"],
                ingredients: [
                    {
                        ingredient_id: "yV6W85yySjlNFbSbARCn", // Farinha de Trigo (common ID pattern)
                        name: "Farinha de Trigo",
                        unit: "kg",
                        quantity: 0.100,
                        weight_raw: "0.100",
                        weight_clean: "0.100",
                        weight_cooked: "0.100",
                        current_price: 5.5,
                        locked: true
                    },
                    {
                        ingredient_id: "udu4K2vcjKv3PEwI1uJo", // Farinha de Rosca
                        name: "Farinha de Rosca",
                        unit: "kg",
                        quantity: 0.150,
                        weight_raw: "0.150",
                        weight_clean: "0.150",
                        weight_cooked: "0.150",
                        current_price: 8.9,
                        locked: true
                    }
                ],
                notes: [
                    {
                        title: "Modo de Preparo",
                        content: "1. Passe as tiras temperadas primeiro na farinha de trigo.\n2. Em seguida, passe na farinha de rosca, pressionando levemente para aderir bem."
                    }
                ]
            }
        ]
    };

    const docRef = await addDoc(collection(db, 'Recipe'), recipeData);
    console.log(`✅ Receita criada com sucesso! ID: ${docRef.id}`);
    process.exit(0);
}

createFishRecipe().catch(err => {
    console.error(err);
    process.exit(1);
});
