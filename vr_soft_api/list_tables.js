const pkg = require('pg');
const { Pool } = pkg;

const DB_CONFIG = {
    host: '10.110.65.232',
    port: 8745,
    database: 'vr',
    user: 'postgres',
    password: 'VrPost@Server'
};

const pool = new Pool(DB_CONFIG);

async function listTables() {
    try {
        console.log('🔌 Connecting...');
        const client = await pool.connect();

        const sql = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name ILIKE '%cupom%' OR table_name ILIKE '%venda%' OR table_name ILIKE '%item%')
            ORDER BY table_name;
        `;

        const res = await client.query(sql);
        console.table(res.rows);

        client.release();
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

listTables();
