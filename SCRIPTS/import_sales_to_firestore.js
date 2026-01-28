
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

// --- CONFIGURAÇÃO FIREBASE ---
// (Certifique-se que o arquivo firebase.json ou similar tenha as credenciais ou use as públicas se estiver em modo dev/emulador)
// Para este script, vou assumir uso de credenciais que o usuário deve fornecer ou que estão no ambiente.
// Como não tenho as credenciais aqui, vou ler do arquivo firebase.js do projeto se possível, ou pedir para o usuário configurar.
// VOU USAR UMA ABORDAGEM HÍBRIDA: Ler o firebase.js é difícil pois tem imports.
// Vou usar um placeholder e pedir para o usuário rodar no ambiente dele que já deve ter acesso se configurado.

// MAS, como estou rodando no terminal do usuário, preciso das credenciais.
// Vou tentar ler o opencode.json ou usar a config pública que geralmente está exposta no frontend.
// Vou ler o `lib/firebase.js` para tentar extrair a config.

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

// --- LEITURA DO ARQUIVO FIREBASE DO PROJETO PARA EXTRAIR CONFIG ---
// (Estratégia mais robusta)
const projectFirebasePath = path.join(process.cwd(), 'lib/firebase.js');
let extractedConfig = {};

try {
    const content = fs.readFileSync(projectFirebasePath, 'utf8');
    const match = content.match(/const firebaseConfig = ({[\s\S]*?});/);
    if (match && match[1]) {
        // Tentar parsear o objeto JS (que não é JSON estrito)
        // Substituir process.env por strings vazias ou tentar ler do .env.local
        const configStr = match[1]
            .replace(/process\.env\.([A-Z_]+)/g, (_, key) => `"${process.env[key] || ''}"`);
        // Isso é arriscado. Melhor abordagem: ler .env.local

    }
} catch (e) {
    console.log("⚠️ Não foi possível ler lib/firebase.js automaticamente.");
}

// Ler .env.local
try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) process.env[key.trim()] = val.trim().replace(/"/g, '');
        });
    }
} catch (e) { }

// Atualizar config com env vars
firebaseConfig.apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfig.apiKey;
firebaseConfig.authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain;
firebaseConfig.projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfig.projectId;

if (!firebaseConfig.apiKey) {
    console.error("❌ ERRO: Variáveis de ambiente Firebase não encontradas em .env.local");
    process.exit(1);
}

// --- INICIALIZAÇÃO ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DAILY_SALES_FILE = 'DAILY_SALES_30DAYS.json';
const CUSTOMER_ID = '1BOCkWBaHAUp8icfPCOu'; // Descontão
const RECIPES_FILE = 'ROTISSERIA_CODES.json';

async function main() {
    console.log('🚀 Iniciando Importação para Firestore...');

    // 1. Carregar Receitas do Firestore para Mapping
    console.log('📦 Carregando receitas do banco...');
    const recipesSnap = await getDocs(collection(db, 'Recipe'));
    const recipesMap = new Map(); // VR_CODE -> Recipe Data

    recipesSnap.forEach(doc => {
        const data = doc.data();
        if (data.name) {
            // Tentar extrair código do nome (Formato: "12345 - NOME PRODUTO")
            const parts = data.name.split(' - ');
            if (parts.length >= 2) {
                const code = parseInt(parts[0]);
                if (!isNaN(code)) {
                    recipesMap.set(code, { id: doc.id, ...data });
                }
            }

            // Também guardar o nome exato para fallback
            recipesMap.set(normalizeName(data.name), { id: doc.id, ...data });
            // E o nome sem o código
            if (parts.length >= 2) {
                recipesMap.set(normalizeName(parts.slice(1).join(' - ')), { id: doc.id, ...data });
            }
        }
    });
    console.log(`   ✅ ${recipesMap.size} chaves de mapeamento geradas.`);

    // 2. Carregar Dados de Vendas
    const salesPath = path.join(process.cwd(), DAILY_SALES_FILE);
    const dailyData = JSON.parse(fs.readFileSync(salesPath, 'utf8'));
    console.log(`📅 Processando ${dailyData.length} dias de vendas.`);

    // 3. Processar Dia a Dia
    let totalImported = 0;

    for (const dayEntry of dailyData) {
        const dateStr = dayEntry.date;
        const sales = dayEntry.sales;

        const orderItems = [];
        let totalMeals = 0; // Estimativa baseada em qtd? Difícil. Vamos fixar ou calcular.

        // Mapear produtos
        for (const sale of sales) {
            // TENTATIVA 1: Mapear pelo CÓDIGO (Mais seguro)
            let recipe = recipesMap.get(parseInt(sale.codigo));

            // TENTATIVA 2: Mapear pelo NOME (Fallback)
            if (!recipe) {
                const normalizedSaleName = normalizeName(sale.nome);
                recipe = recipesMap.get(normalizedSaleName);
            }

            if (recipe) {
                // Tenta mapear unidade
                // Venda vem em KG ou UN. Receita tem unit_type.

                orderItems.push({
                    recipe_id: recipe.id,
                    recipe_name: recipe.name,
                    category: recipe.category || 'Marmita',
                    unit_type: recipe.unit_type || 'unid.',
                    base_quantity: parseFloat(sale.quantidade_total),
                    quantity: parseFloat(sale.quantidade_total), // Assumindo sem ajuste
                    adjustment_percentage: 0,
                    imported_vr_code: sale.codigo
                });
            } else {
                if (Math.random() < 0.005) console.log(`   ⚠️ Não mapeado: [${sale.codigo}] "${sale.nome}"`);
            }
        }

        if (orderItems.length > 0) {
            // Criar ID determinístico para evitar duplicação
            const orderId = `import-${dateStr}-rotisseria`;

            // Dados da Ordem
            const orderData = {
                id: orderId,
                customer_id: CUSTOMER_ID,
                customer_name: "Rotisseria (Histórico Importado)",
                date: dateStr, // YYYY-MM-DD
                status: 'delivered', // Considerar entregue

                // Campos de data para query
                year: parseInt(dateStr.split('-')[0]),
                week_number: getWeekNumber(new Date(dateStr + 'T12:00:00')),
                day_of_week: new Date(dateStr + 'T12:00:00').getDay() || 7, // 1-7

                items: orderItems,

                // Metadados
                total_items: orderItems.length,
                total_ue: 0, // Não calculado
                total_value: 0,
                imported_at: new Date().toISOString(),
                total_meals_expected: 100 // VALOR ARBITRÁRIO PARA CÁLCULO DE MÉDIA (será o denominador)
                // Se o cliente informar 100 refeições hoje, e a média for 100g/pessoa (baseado nesse 100),
                // o cálculo se ajusta. O importante é a proporção.
            };

            await setDoc(doc(db, 'Order', orderId), orderData);
            console.log(`   ✅ Importado: ${dateStr} com ${orderItems.length} itens.`);
            totalImported++;
        }
    }

    console.log(`\n🎉 Concluído! ${totalImported} pedidos históricos criados.`);
    process.exit(0);
}

function normalizeName(name) {
    if (!name) return '';
    return name.toString().toUpperCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/\s+/g, ' '); // Remove espaços extras
}

function getWeekNumber(d) {
    // Garantir que a data baseada em string YYYY-MM-DD não sofra shift de fuso
    // Se d for criado apenas com YYYY-MM-DD, pode ser UTC 00:00 que vira dia anterior no Brasil
    // Mas aqui 'd' já vem instanciado. Vamos assumir que quem chama já tratou ou tratar aqui.
    // Melhor tratar quem chama.

    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

main().catch(console.error);
