const { Pool } = require('pg');

const DB_CONFIG = {
    host: '10.110.65.232',
    port: 8745,
    database: 'vr',
    user: 'postgres',
    password: 'VrPost@Server'
};

const pool = new Pool(DB_CONFIG);

async function findSale() {
    const client = await pool.connect();
    try {
        console.log('Searching 0.390 kg...');
        const QTY = 0.390;

        // 1. venda022026
        try {
            const res = await client.query(`SELECT id_produto, data, quantidade FROM venda022026 WHERE quantidade = ${QTY} LIMIT 1`);
            if (res.rows.length > 0) console.log(`[MATCH] venda022026: Found! ${JSON.stringify(res.rows[0])}`);
            else console.log(`[NO_MATCH] venda022026`);
        } catch (e) { console.log(`[ERR] venda: ${e.message}`); }

        // 2. logestoque
        try {
            const res = await client.query(`SELECT id_produto, datahora, quantidade FROM logestoque WHERE quantidade = ${QTY} LIMIT 1`);
            if (res.rows.length > 0) console.log(`[MATCH] logestoque: Found! ${JSON.stringify(res.rows[0])}`);
            else console.log(`[NO_MATCH] logestoque`);
        } catch (e) { console.log(`[ERR] logestoque: ${e.message}`); }

    } catch (err) {
        console.error('Global Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

findSale();
