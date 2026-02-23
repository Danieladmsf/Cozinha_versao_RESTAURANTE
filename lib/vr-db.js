
import pkg from 'pg';
const { Pool } = pkg;

// Configuração do Banco VR (PostgreSQL)
// Dados extraídos de scripts de manutenção (extrair_dados.js)
const DB_CONFIG = {
    host: '10.110.65.232',
    port: 8745,
    database: 'vr',
    user: 'postgres',
    password: 'VrPost@Server',
    // Configurações de pool para robustez
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

// Singleton pool
let pool;

function getPool() {
    if (!pool) {
        pool = new Pool(DB_CONFIG);

        pool.on('error', (err, client) => {
            console.error('❌ [VrDb] Unexpected error on idle client', err);
            // Don't exit, just log. Pool re-creates clients.
        });
    }
    return pool;
}

/**
 * Executa uma query SQL no banco VR
 * @param {string} text - SQL Query
 * @param {Array} params - Parâmetros ($1, $2...)
 * @returns {Promise<Array>} Linhas retornadas
 */
export async function query(text, params) {
    const start = Date.now();
    const p = getPool();
    try {
        const res = await p.query(text, params);
        // console.log(`✅ [VrDb] Query executed in ${Date.now() - start}ms: ${text.substring(0, 50)}...`);
        return res.rows;
    } catch (error) {
        console.error(`❌ [VrDb] Query Error (${Date.now() - start}ms):`, error.message);
        throw error;
    }
}

/**
 * Fecha o pool de conexões (usar ao desligar servidor)
 */
export async function close() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
