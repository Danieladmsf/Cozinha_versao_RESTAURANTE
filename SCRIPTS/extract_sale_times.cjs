const { Client } = require('pg');
const fs = require('fs');

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

        console.log("Coletando os horários de vendas dos últimos 30 dias para os produtos...");

        // Vamos extrair a quantidade de vendas de cada produto por HORA do dia (0 a 23)
        // Isso ajuda a montar um "mapa de calor" de quando o produto sai mais.
        const query = `
            SELECT 
                vi.id_produto,
                EXTRACT(HOUR FROM v.horainicio) as hora_venda,
                COUNT(*) as qtd_cupons,
                SUM(vi.quantidade) as qtd_vendida
            FROM pdv.venda v
            JOIN pdv.vendaitem vi ON v.id = vi.id_venda
            WHERE v.data >= CURRENT_DATE - INTERVAL '30 days'
            AND v.cancelado = false
            GROUP BY vi.id_produto, EXTRACT(HOUR FROM v.horainicio)
            ORDER BY vi.id_produto, hora_venda
        `;

        const res = await client.query(query);
        console.log(`Foram encontrados ${res.rows.length} registros de horários agregados.`);

        // Agrupar por produto
        const mapProdutos = {};
        for (const row of res.rows) {
            const id = row.id_produto;
            if (!mapProdutos[id]) {
                mapProdutos[id] = { id_produto: id, horarios: [] };
            }
            mapProdutos[id].horarios.push({
                hora: row.hora_venda,
                qtd_cupons: Number(row.qtd_cupons),
                qtd_vendida: Number(row.qtd_vendida)
            });
        }

        const filePath = 'C:\\Users\\sddes\\.gemini\\antigravity\\brain\\31c3b955-f4b5-4f7f-83fb-92a1007bfa51\\horarios_venda.json';
        fs.writeFileSync(filePath, JSON.stringify(Object.values(mapProdutos), null, 2));

        console.log("Arquivo de mapa de calor salvo em:", filePath);

        // Imprimir exemplo para os 3 produtos do cupom 329
        const produtosDoCupom = [22508, 8932, 93051];
        for (const p of produtosDoCupom) {
            if (mapProdutos[p]) {
                console.log(`\nHorários do Produto ${p} (Bolo/Refri/Energetico):`);
                mapProdutos[p].horarios.forEach(h => {
                    console.log(` - ${h.hora}h: ${h.qtd_cupons} cupons, total ${h.qtd_vendida} uni/kg`);
                });
            }
        }

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

run();
