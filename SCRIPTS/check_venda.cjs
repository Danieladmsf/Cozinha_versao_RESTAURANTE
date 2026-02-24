const { Client } = require('pg');

const client = new Client({
    host: '10.110.65.232',
    port: 8745,
    database: 'vr',
    user: 'postgres',
    password: 'VrPost@Server'
});

async function run() {
    try {
        await client.connect();

        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'pdv'
        `);
        console.log("Tabelas no schema 'pdv':", tablesRes.rows.map(r => r.table_name).join(', '));

        // Provavelmente é pdv.vendaitem ou pdv.itemvenda ou algo assim
        // Vou logo testar pdv.vendaitem
        if (tablesRes.rows.find(r => r.table_name === 'vendaitem')) {
            const vendaItemSearch = await client.query(`
                SELECT vi.id_produto, p.descricaocompleta, vi.quantidade, vi.precovenda, vi.valortotal 
                FROM pdv.vendaitem vi
                JOIN public.produto p ON p.id = vi.id_produto
                WHERE vi.id_venda = 5064150
            `);
            console.log("\nItens da Venda 5064150:", vendaItemSearch.rows);
        } else {
            console.log("\nTabela pdv.vendaitem não encontrada.");
        }

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

run();
