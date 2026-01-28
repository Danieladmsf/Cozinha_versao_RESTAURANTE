
import fs from 'fs';
import path from 'path';

// Configuração
const BASE_API_URL = 'http://localhost:5005/vendas/ruptura/'; // + YYYY-MM-DD
const OUTPUT_FILE = 'DAILY_SALES_30DAYS.json';
const DAYS_LOOKBACK = 30;

const baseDir = process.cwd();

async function main() {
    console.log('🚀 Iniciando extração DIÁRIA de vendas...');

    const dailyData = [];
    const endDate = new Date();

    // Iterar pelos últimos 30 dias
    for (let i = 0; i < DAYS_LOOKBACK; i++) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);

        const dateStr = date.toISOString().split('T')[0];
        const apiUrl = `${BASE_API_URL}${dateStr}`;

        console.log(`📅 [${i + 1}/${DAYS_LOOKBACK}] Consultando: ${dateStr}`);

        try {
            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.produtos && data.produtos.length > 0) {
                    dailyData.push({
                        date: dateStr,
                        sales: data.produtos
                    });
                    console.log(`   ✅ Encontrados ${data.produtos.length} produtos vendidos.`);
                } else {
                    console.log(`   ⚠️ Sem vendas registradas.`);
                }
            } else {
                console.log(`   ❌ Erro API: ${response.status}`);
            }
        } catch (e) {
            console.log(`   ❌ Erro Conexão: ${e.message}`);
        }

        // Pequena pausa para não sobrecarregar
        await new Promise(r => setTimeout(r, 200));
    }

    // Salvar
    const outputPath = path.join(baseDir, OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(dailyData, null, 2));

    console.log(`\n💾 Histórico Diário salvo em: ${OUTPUT_FILE}`);
    console.log(`📊 Dias com vendas: ${dailyData.length}`);
}

main();
