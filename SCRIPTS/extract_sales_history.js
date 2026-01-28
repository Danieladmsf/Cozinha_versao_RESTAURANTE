
import fs from 'fs';
import path from 'path';

// Configuração
const API_URL = 'http://localhost:5005/vendas/produtos/periodo';
const RECIPES_FILE = 'ROTISSERIA_CODES.json';
const OUTPUT_FILE = 'SALES_HISTORY_30DAYS.json';
const DAYS_LOOKBACK = 30;

const baseDir = process.cwd();

async function main() {
    console.log('🚀 Iniciando extração de histórico de vendas...');

    // 1. Ler códigos dos produtos
    const recipesPath = path.join(baseDir, RECIPES_FILE);
    if (!fs.existsSync(recipesPath)) {
        console.error(`❌ Arquivo de receitas não encontrado: ${recipesPath}`);
        return;
    }

    const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
    const codes = recipes.map(r => parseInt(r.code)).filter(c => !isNaN(c));

    console.log(`📦 Carregados ${codes.length} códigos de produtos.`);

    // 2. Definir período (últimos 30 dias)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - DAYS_LOOKBACK);

    const formatDate = (d) => d.toISOString().split('T')[0];

    const payload = {
        codigos: codes,
        data_inicio: formatDate(startDate),
        data_fim: formatDate(endDate)
    };

    console.log(`📅 Consultando período: ${payload.data_inicio} a ${payload.data_fim}`);

    // 3. Chamar API
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Erro API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        console.log(`✅ Sucesso! Dados recebidos.`);
        console.log(`📊 Produtos encontrados na API: ${data.produtos.filter(p => p.quantidade_total > 0).length}`);

        // 4. Salvar resultado
        const outputPath = path.join(baseDir, OUTPUT_FILE);
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

        console.log(`💾 Histórico salvo em: ${OUTPUT_FILE}`);

        // Preview
        console.log('\n👀 Top 5 Mais Vendidos:');
        const sorted = data.produtos.sort((a, b) => b.quantidade_total - a.quantidade_total).slice(0, 5);
        sorted.forEach(p => {
            console.log(`   - ${p.nome} (Cod: ${p.codigo}): ${p.quantidade_total.toFixed(2)} vendas`);
        });

    } catch (error) {
        console.error('❌ Falha na extração:', error.message);
        if (error.cause) console.error(error.cause);
    }
}

main();
