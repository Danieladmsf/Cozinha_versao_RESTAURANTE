/**
 * Script para inspecionar o banco de dados VR Soft via API Python
 * Objetivo: Encontrar tabelas de produtos e vendas
 */

const API_URL = 'http://localhost:8000';
const AUTH = Buffer.from('admin:VrSoft@2026').toString('base64');
const HEADERS = {
    'Authorization': `Basic ${AUTH}`,
    'Content-Type': 'application/json'
};

async function inspect() {
    console.log('🔍 Iniciando inspeção do banco VR Soft...\n');

    try {
        // 1. Listar todas as tabelas
        console.log('📂 Buscando lista de tabelas...');
        try {
            const tablesResponse = await fetch(`${API_URL}/database/tables`, { headers: HEADERS });

            if (!tablesResponse.ok) {
                throw new Error(`Erro ao conectar na API: ${tablesResponse.status} ${tablesResponse.statusText}`);
            }

            const tables = await tablesResponse.json();
            console.log(`✅ ${tables.length} tabelas encontradas.`);

            // Filtra tabelas que parecem relevantes
            const keywords = ['prod', 'item', 'vend', 'categ', 'grupo', 'prec'];
            const interestingTables = tables.filter(t => keywords.some(k => t.toLowerCase().includes(k)));

            console.log('\n🌟 Tabelas Potencialmente Relevantes:');
            console.log(interestingTables.join(', '));

            // 2. Tentar Inspecionar Estrutura de 'produtos' ou similar
            const productTable = tables.find(t => t.toLowerCase() === 'produto' || t.toLowerCase() === 'produtos' || t.toLowerCase() === 'tb_produto') || interestingTables[0];

            if (productTable) {
                console.log(`\n🕵️‍♀️ Inspecionando tabela: ${productTable}`);
                const schemaResponse = await fetch(`${API_URL}/database/tables/${productTable}/schema`, { headers: HEADERS });
                const schema = await schemaResponse.json();
                console.table(schema.map(c => ({ Coluna: c.column_name, Tipo: c.data_type })));

                // Tentar pegar 5 registros de exemplo
                console.log(`\n📊 Dados de exemplo de ${productTable}:`);
                const dataResponse = await fetch(`${API_URL}/database/tables/${productTable}/data?limit=5`, { headers: HEADERS });
                const data = await dataResponse.json();
                console.log(JSON.stringify(data, null, 2));
            } else {
                console.log('\n⚠️ Nenhuma tabela óbvia de produtos encontrada para inspeção detalhada.');
            }

        } catch (fetchError) {
            if (fetchError.cause && fetchError.cause.code === 'ECONNREFUSED') {
                throw new Error('ECONNREFUSED');
            }
            throw fetchError;
        }

    } catch (error) {
        if (error.message === 'ECONNREFUSED') {
            console.error('\n❌ ERRO DE CONEXÃO:');
            console.error('A API Python não está rodando na porta 8000 ou foi recusada.');
            console.error('👉 PASSO 1: Abra um NOVO terminal');
            console.error('👉 PASSO 2: Rode "python api_vrsoft.py"');
            console.error('👉 PASSO 3: Tente rodar este script novamente.');
        } else {
            console.error('\n❌ Erro:', error.message);
        }
    }
}

inspect();
