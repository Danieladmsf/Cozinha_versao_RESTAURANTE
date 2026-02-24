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

        // Let's get columns of produtocomplemento
        const colRes = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'produtocomplemento'
        `);
        console.log("Colunas em produtocomplemento:", colRes.rows.map(r => r.column_name).join(', '));

        // Let's get the record for product 8336
        // Usually the foreign key is id_produto
        const prodRes = await client.query(`
            SELECT * FROM produtocomplemento WHERE id_produto = 8336
        `);
        console.log("\nRegistro para o produto 8336:");
        console.log(prodRes.rows);

    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await client.end();
    }
}

run();
