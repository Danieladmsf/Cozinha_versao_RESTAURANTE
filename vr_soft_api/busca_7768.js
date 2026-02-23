/**
 * Script limpo para buscar produto 7768 em QUALQUER tabela relevante
 * Sem filtros, sem limitações
 */
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');

const DB_CONFIG = {
    host: '10.110.65.232',
    port: 8745,
    database: 'vr',
    user: 'postgres',
    password: 'VrPost@Server'
};

const PRODUCT_ID = 7768;
const results = [];

// Queries para testar em diferentes tabelas
const QUERIES = [
    // 1. Tabela pai "venda" (herda de partições)
    { name: 'venda_parent', sql: `SELECT * FROM venda WHERE id_produto = ${PRODUCT_ID} ORDER BY data DESC LIMIT 20` },

    // 2. Partições específicas de 2026
    { name: 'venda022026', sql: `SELECT * FROM venda022026 WHERE id_produto = ${PRODUCT_ID} LIMIT 20` },
    { name: 'venda012026', sql: `SELECT * FROM venda012026 WHERE id_produto = ${PRODUCT_ID} LIMIT 20` },

    // 3. Tabelas de cupom/nota que podem ter horário
    { name: 'notasaidaitem_7768', sql: `SELECT nsi.*, ns.datahoraemissao FROM notasaidaitem nsi JOIN notasaida ns ON ns.id = nsi.id_notasaida WHERE nsi.id_produto = ${PRODUCT_ID} ORDER BY ns.datahoraemissao DESC LIMIT 20` },

    // 4. Busca genérica em tabelas que podem conter vendas recentes (hoje)
    { name: 'venda_hoje', sql: `SELECT * FROM venda WHERE data = CURRENT_DATE LIMIT 50` },
];

let queryIndex = 0;
let socket;
let buffer = Buffer.alloc(0);
let authenticated = false;
let readyForQuery = false;

function md5(str) {
    return crypto.createHash('md5').update(str, 'binary').digest('hex');
}

function createStartupMessage() {
    const params = [
        'user', DB_CONFIG.user,
        'database', DB_CONFIG.database,
        'client_encoding', 'UTF8'
    ];
    let body = Buffer.alloc(4);
    body.writeInt32BE(196608, 0); // protocol version 3.0
    for (const p of params) {
        body = Buffer.concat([body, Buffer.from(p + '\0')]);
    }
    body = Buffer.concat([body, Buffer.from('\0')]);
    const len = body.length + 4;
    const msg = Buffer.alloc(4);
    msg.writeInt32BE(len, 0);
    return Buffer.concat([msg, body]);
}

function sendQuery(sql) {
    const buf = Buffer.concat([
        Buffer.from('Q'),
        Buffer.alloc(4),
        Buffer.from(sql + '\0')
    ]);
    buf.writeInt32BE(sql.length + 5, 1);
    socket.write(buf);
}

function processNextQuery() {
    if (queryIndex >= QUERIES.length) {
        console.log('\n=== RESULTADO FINAL ===');
        for (const r of results) {
            console.log(`\n[${r.name}]: ${r.count} registros`);
            if (r.count > 0 && r.sample) {
                console.log('Colunas:', r.columns.join(', '));
                console.log('Amostra:', JSON.stringify(r.sample, null, 2));
            }
        }

        // Salva em arquivo
        fs.writeFileSync('busca_7768_resultado.json', JSON.stringify(results, null, 2));
        console.log('\nResultados salvos em busca_7768_resultado.json');
        socket.end();
        return;
    }

    const q = QUERIES[queryIndex];
    console.log(`\nExecutando: ${q.name}...`);
    readyForQuery = false;
    sendQuery(q.sql);
}

let currentResult = { columns: [], rows: [] };

function handleMessage(type, data) {
    switch (type) {
        case 'R': // Authentication
            const authType = data.readInt32BE(0);
            if (authType === 0) {
                authenticated = true;
                console.log('Autenticado!');
            } else if (authType === 5) {
                const salt = data.slice(4, 8);
                const hash1 = md5(DB_CONFIG.password + DB_CONFIG.user);
                const hash2 = 'md5' + md5(Buffer.concat([Buffer.from(hash1), salt]));
                const passLen = hash2.length + 1;
                const passMsg = Buffer.alloc(1 + 4 + passLen);
                passMsg[0] = 0x70;
                passMsg.writeInt32BE(4 + passLen, 1);
                passMsg.write(hash2 + '\0', 5);
                socket.write(passMsg);
            }
            break;

        case 'T': // RowDescription
            const numFields = data.readInt16BE(0);
            let offset = 2;
            currentResult.columns = [];
            for (let i = 0; i < numFields; i++) {
                let end = data.indexOf(0, offset);
                const colName = data.slice(offset, end).toString('utf8');
                currentResult.columns.push(colName);
                offset = end + 19;
            }
            break;

        case 'D': // DataRow
            const numCols = data.readInt16BE(0);
            let off = 2;
            const row = {};
            for (let i = 0; i < numCols; i++) {
                const len = data.readInt32BE(off);
                off += 4;
                if (len === -1) {
                    row[currentResult.columns[i]] = null;
                } else {
                    row[currentResult.columns[i]] = data.slice(off, off + len).toString('utf8');
                    off += len;
                }
            }
            currentResult.rows.push(row);
            break;

        case 'C': // CommandComplete
            break;

        case 'Z': // ReadyForQuery
            if (authenticated && queryIndex < QUERIES.length) {
                const q = QUERIES[queryIndex];
                results.push({
                    name: q.name,
                    count: currentResult.rows.length,
                    columns: currentResult.columns,
                    sample: currentResult.rows.length > 0 ? currentResult.rows[0] : null,
                    allRows: currentResult.rows
                });
                console.log(`  -> ${currentResult.rows.length} registros encontrados`);

                currentResult = { columns: [], rows: [] };
                queryIndex++;
                processNextQuery();
            }
            break;

        case 'E': // Error
            let errOff = 0;
            let errMsg = '';
            while (errOff < data.length) {
                const fieldType = String.fromCharCode(data[errOff]);
                errOff++;
                if (fieldType === '\0') break;
                const end = data.indexOf(0, errOff);
                const val = data.slice(errOff, end).toString('utf8');
                if (fieldType === 'M') errMsg = val;
                errOff = end + 1;
            }
            console.log(`  ERRO: ${errMsg}`);
            // Continua para próxima query mesmo com erro
            results.push({
                name: QUERIES[queryIndex].name,
                count: 0,
                error: errMsg
            });
            break;
    }
}

function parseBuffer() {
    while (buffer.length >= 5) {
        const type = String.fromCharCode(buffer[0]);
        const len = buffer.readInt32BE(1);
        if (buffer.length < len + 1) break;
        const data = buffer.slice(5, len + 1);
        buffer = buffer.slice(len + 1);
        handleMessage(type, data);
    }
}

// Conectar
console.log(`Conectando a ${DB_CONFIG.host}:${DB_CONFIG.port}...`);
socket = net.createConnection(DB_CONFIG.port, DB_CONFIG.host, () => {
    console.log('Conectado! Enviando startup...');
    socket.write(createStartupMessage());
});

socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    parseBuffer();
});

socket.on('error', (err) => {
    console.error('Erro de conexão:', err.message);
});

socket.on('close', () => {
    console.log('\nConexão fechada.');
});
