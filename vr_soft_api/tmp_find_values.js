const net = require('net');
const crypto = require('crypto');

const DB_CONFIG = { host: '10.110.65.232', port: 8745, database: 'vr', user: 'postgres', password: 'VrPost@Server' };

function md5(str) { return crypto.createHash('md5').update(str, 'binary').digest('hex'); }

async function runQuery(sql) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(60000);
        socket.connect(DB_CONFIG.port, DB_CONFIG.host);
        let buffer = Buffer.alloc(0), step = 'startup', columns = [], rows = [], querySent = false;

        socket.on('connect', () => {
            const params = Buffer.concat([Buffer.from('user\0'), Buffer.from(DB_CONFIG.user + '\0'), Buffer.from('database\0'), Buffer.from(DB_CONFIG.database + '\0'), Buffer.from('\0')]);
            const length = 4 + 4 + params.length;
            const startup = Buffer.alloc(length);
            startup.writeInt32BE(length, 0); startup.writeInt32BE(196608, 4); params.copy(startup, 8);
            socket.write(startup);
        });

        socket.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);
            while (buffer.length >= 5) {
                const type = String.fromCharCode(buffer[0]);
                const len = buffer.readInt32BE(1);
                if (buffer.length < len + 1) break;
                const payload = buffer.slice(5, len + 1); buffer = buffer.slice(len + 1);

                if (type === 'R' && payload.readInt32BE(0) === 5) {
                    const salt = payload.slice(4, 8);
                    const hash1 = md5(DB_CONFIG.password + DB_CONFIG.user);
                    const hash2 = 'md5' + md5(Buffer.concat([Buffer.from(hash1), salt]));
                    const passMsg = Buffer.alloc(1 + 4 + hash2.length + 1);
                    passMsg[0] = 0x70; passMsg.writeInt32BE(4 + hash2.length + 1, 1); passMsg.write(hash2 + '\0', 5);
                    socket.write(passMsg);
                } else if (type === 'Z' && step === 'startup') {
                    step = 'ready'; const query = Buffer.from(sql + '\0');
                    const msg = Buffer.alloc(1 + 4 + query.length);
                    msg[0] = 0x51; msg.writeInt32BE(4 + query.length, 1); query.copy(msg, 5);
                    socket.write(msg); querySent = true;
                } else if (type === 'Z' && querySent) {
                    socket.end(); resolve({ columns, rows });
                } else if (type === 'T') {
                    columns = []; const numFields = payload.readInt16BE(0); let offset = 2;
                    for (let i = 0; i < numFields; i++) {
                        const nameEnd = payload.indexOf(0, offset);
                        columns.push(payload.slice(offset, nameEnd).toString());
                        offset = nameEnd + 1 + 18;
                    }
                } else if (type === 'D') {
                    const numCols = payload.readInt16BE(0); let pos = 2; const row = {};
                    for (let i = 0; i < numCols; i++) {
                        const colLen = payload.readInt32BE(pos); pos += 4;
                        if (colLen === -1) row[columns[i]] = null;
                        else { row[columns[i]] = payload.slice(pos, pos + colLen).toString(); pos += colLen; }
                    }
                    rows.push(row);
                } else if (type === 'E') {
                    console.log('Error:', payload.toString());
                }
            }
        });
    });
}

(async () => {
    try {
        console.log("== HUNTING EXACT VALUES ==");
        
        // Let's get the raw data from venda for ALL stores, for mercadologico 17, and group by id_loja, and data
        const q1 = `
            SELECT id_loja::text, data::text, sum(valortotal) as val
            FROM venda v JOIN produto p ON p.id = v.id_produto
            WHERE v.data >= '2026-04-01' AND v.data <= '2026-04-08' AND p.mercadologico1 = 17
            GROUP BY id_loja, data ORDER BY data, id_loja;
        `;
        const r1 = await runQuery(q1);
        console.table(r1.rows);

        // Can we find 6025.85 somehow?
        // sum venda_dia = 6025.85?
        // what if it's the sum of a specific date?
    } catch(e) { console.error(e); }
})();
