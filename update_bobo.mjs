import { db } from './lib/firebase.js';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

const INGREDIENTS = {
    ABOBRINHA: { id: "zFFTdu5RuuNVoDVMD4Na", name: "Abobrinha", unit: "kg" },
    CENOURA: { id: "cdwyXccWKFHIpb3IVKAA", name: "Cenoura", unit: "kg" },
    PIMENTAO_VERDE: { id: "Rb6m85yySjlNFbSbARCn", name: "Pimentão Verde", unit: "kg" },
    PIMENTAO_COLORIDO: { id: "YhbXbQispokEYY2m20zw", name: "Pimentão Colorido", unit: "kg" }, // Para o amarelo
    CEBOLA: { id: "xFkqVKNgWYfBxXmhC3hH", name: "Cebola", unit: "kg" },
    TOMATE: { id: "n04Z067fDYJh9p8VVBmb", name: "Tomate", unit: "kg" },
    AZEITE: { id: "KQupCrgjHFaEov1OjDhK", name: "Azeite de Oliva", unit: "L" },
    CREME_LEITE: { id: "TJe2aB3NEjmUuuwBcINl", name: "Creme de Leite", unit: "kg" },
    LEITE_COCO: { id: "MH8Lwosgurx6zZlKEu9t", name: "Leite de Coco", unit: "L" },
    MOLHO_TOMATE: { id: "BsP6KopEvEhfcJ4v2VDt", name: "Molho de Tomate", unit: "kg" }
};

const MOLHO_BASE_ID = "jVsq1Ph8ujrgeLy4yCKx"; // Molho de Tomate Rústico (assado)

async function updateBobo() {
    console.log("🚀 Atualizando 'Bobó de Legumes' (KriQMHylcZ1xQSLiBdq4)...");

    const prep1Id = generateId();
    const prep2Id = generateId();

    const preparations = [
        {
            id: prep1Id,
            title: "1ª Etapa: Refogado de Legumes",
            processes: ["cleaning", "cooking"],
            ingredients: [
                {
                    ingredient_id: INGREDIENTS.ABOBRINHA.id,
                    name: INGREDIENTS.ABOBRINHA.name,
                    unit: INGREDIENTS.ABOBRINHA.unit,
                    quantity: 0.300,
                    weight_raw: "0.300",
                    weight_clean: "0.270",
                    weight_cooked: "0.240",
                    current_price: 6,
                    locked: true
                },
                {
                    ingredient_id: INGREDIENTS.CENOURA.id,
                    name: INGREDIENTS.CENOURA.name,
                    unit: INGREDIENTS.CENOURA.unit,
                    quantity: 0.200,
                    weight_raw: "0.200",
                    weight_clean: "0.170",
                    weight_cooked: "0.150",
                    current_price: 6,
                    locked: true
                },
                {
                    ingredient_id: INGREDIENTS.PIMENTAO_VERDE.id,
                    name: INGREDIENTS.PIMENTAO_VERDE.name,
                    unit: INGREDIENTS.PIMENTAO_VERDE.unit,
                    quantity: 0.050,
                    weight_raw: "0.050",
                    weight_clean: "0.040",
                    weight_cooked: "0.035",
                    current_price: 12,
                    locked: true
                },
                {
                    ingredient_id: INGREDIENTS.PIMENTAO_COLORIDO.id,
                    name: "Pimentão Amarelo", // Ajustado nome conforme pedido
                    unit: INGREDIENTS.PIMENTAO_COLORIDO.unit,
                    quantity: 0.050,
                    weight_raw: "0.050",
                    weight_clean: "0.040",
                    weight_cooked: "0.035",
                    current_price: 15,
                    locked: true
                },
                {
                    ingredient_id: INGREDIENTS.CEBOLA.id,
                    name: INGREDIENTS.CEBOLA.name,
                    unit: INGREDIENTS.CEBOLA.unit,
                    quantity: 0.100,
                    weight_raw: "0.100",
                    weight_clean: "0.090",
                    weight_cooked: "0.070",
                    current_price: 5,
                    locked: true
                },
                {
                    ingredient_id: INGREDIENTS.TOMATE.id,
                    name: INGREDIENTS.TOMATE.name,
                    unit: INGREDIENTS.TOMATE.unit,
                    quantity: 0.150,
                    weight_raw: "0.150",
                    weight_clean: "0.140",
                    weight_cooked: "0.110",
                    current_price: 8,
                    locked: true
                },
                {
                    ingredient_id: INGREDIENTS.AZEITE.id,
                    name: INGREDIENTS.AZEITE.name,
                    unit: INGREDIENTS.AZEITE.unit,
                    quantity: 0.020,
                    weight_raw: "0.020",
                    weight_clean: "0.020",
                    weight_cooked: "0.020",
                    current_price: 45,
                    locked: true
                }
            ],
            notes: [
                {
                    title: "Modo de Preparo",
                    content: "1. Higienize e corte todos os legumes em cubos médios.\n2. Em uma panela, aqueça o azeite e refogue a cebola.\n3. Adicione a cenoura e os pimentões, refogue por alguns minutos.\n4. Acrescente a abobrinha e o tomate, e cozinhe até os legumes ficarem 'al dente'."
                },
                {
                    title: "PCC",
                    content: "Garantir cocção acima de 74°C. Evitar contaminação cruzada entre legumes crus e cozidos."
                }
            ]
        },
        {
            id: prep2Id,
            title: "2ª Etapa: Molho Rosé de Coco",
            processes: ["cooking"],
            origin_id: MOLHO_BASE_ID, // Importa a receita base de molho
            ingredients: [
                {
                    ingredient_id: INGREDIENTS.CREME_LEITE.id,
                    name: INGREDIENTS.CREME_LEITE.name,
                    unit: INGREDIENTS.CREME_LEITE.unit,
                    quantity: 0.100,
                    weight_raw: "0.100",
                    weight_clean: "0.100",
                    weight_cooked: "0.100",
                    current_price: 25,
                    locked: true
                },
                {
                    ingredient_id: INGREDIENTS.LEITE_COCO.id,
                    name: INGREDIENTS.LEITE_COCO.name,
                    unit: INGREDIENTS.LEITE_COCO.unit,
                    quantity: 0.100,
                    weight_raw: "0.100",
                    weight_clean: "0.100",
                    weight_cooked: "0.100",
                    current_price: 15,
                    locked: true
                },
                {
                    ingredient_id: INGREDIENTS.MOLHO_TOMATE.id,
                    name: "Molho de Tomate (Extra para Rosé)",
                    unit: INGREDIENTS.MOLHO_TOMATE.unit,
                    quantity: 0.050,
                    weight_raw: "0.050",
                    weight_clean: "0.050",
                    weight_cooked: "0.050",
                    current_price: 10,
                    locked: true
                }
            ],
            notes: [
                {
                    title: "Modo de Preparo",
                    content: "1. Adicione o molho de tomate rústico aos legumes refogados.\n2. Acrescente o leite de coco e o creme de leite.\n3. Adicione o molho de tomate extra para atingir a coloração rosé desejada.\n4. Deixe apurar em fogo baixo por 5 a 10 minutos."
                },
                {
                    title: "Armazenamento",
                    content: "Manter sob refrigeração se não for consumido imediatamente. Validade: 3 dias sob refrigeração."
                }
            ]
        }
    ];

    const recipeRef = doc(db, 'Recipe', 'KriQMHylcZ1xQSLiBdq4');
    await updateDoc(recipeRef, {
        preparations: preparations,
        updatedAt: Timestamp.now()
    });

    console.log("✅ Receita 'Bobó de Legumes' atualizada com sucesso!");
    process.exit(0);
}

updateBobo().catch(console.error);
