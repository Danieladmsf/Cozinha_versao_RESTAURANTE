const net = require('net');
const crypto = require('crypto');

const DB_CONFIG = {
    host: '10.110.65.232',
    port: 8745,
    database: 'vr',
    user: 'postgres',
    password: 'VrPost@Server'
};

function md5(str) {
    return crypto.createHash('md5').update(str, 'binary').digest('hex');
}

async function runQuery(sql) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(30000);
        socket.connect(DB_CONFIG.port, DB_CONFIG.host);

        let buffer = Buffer.alloc(0);
        let step = 'startup';
        let columns = [];
        let rows = [];
        let querySent = false;

        socket.on('connect', () => {
            const user = Buffer.from(DB_CONFIG.user + '\\0');
            const database = Buffer.from(DB_CONFIG.database + '\\0');
            const params = Buffer.concat([
                Buffer.from('user\\0'), user,
                Buffer.from('database\\0'), database,
                Buffer.from('\\0')
            ]);
            const length = 4 + 4 + params.length;
            const startup = Buffer.alloc(length);
            startup.writeInt32BE(length, 0);
            startup.writeInt32BE(196608, 4);
            params.copy(startup, 8);
            socket.write(startup);
        });

        socket.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);
            while (buffer.length >= 5) {
                const type = String.fromCharCode(buffer[0]);
                const len = buffer.readInt32BE(1);
                if (buffer.length < len + 1) break;
                const payload = buffer.slice(5, len + 1);
                buffer = buffer.slice(len + 1);

                switch (type) {
                    case 'R':
                        const authType = payload.readInt32BE(0);
                        if (authType === 5) {
                            const salt = payload.slice(4, 8);
                            const hash1 = md5(DB_CONFIG.password + DB_CONFIG.user);
                            const hash2 = 'md5' + md5(Buffer.concat([Buffer.from(hash1), salt]));
                            const passMsg = Buffer.alloc(1 + 4 + hash2.length + 1);
                            passMsg[0] = 0x70;
                            passMsg.writeInt32BE(4 + hash2.length + 1, 1);
                            passMsg.write(hash2 + '\\0', 5);
                            socket.write(passMsg);
                        }
                        break;
                    case 'Z':
                        if (step === 'startup') {
                            step = 'ready';
                            if (!querySent) {
                                const query = Buffer.from(sql + '\\0');
                                const msg = Buffer.alloc(1 + 4 + query.length);
                                msg[0] = 0x51;
                                msg.writeInt32BE(4 + query.length, 1);
                                query.copy(msg, 5);
                                socket.write(msg);
                                querySent = true;
                            }
                        } else if (querySent) {
                            socket.end();
                            resolve(rows);
                        }
                        break;
                    case 'T':
                        columns = [];
                        const numFields = payload.readInt16BE(0);
                        let offset = 2;
                        for (let i = 0; i < numFields; i++) {
                            const nameEnd = payload.indexOf(0, offset);
                            columns.push(payload.slice(offset, nameEnd).toString());
                            offset = nameEnd + 1 + 18;
                        }
                        break;
                    case 'D':
                        const numCols = payload.readInt16BE(0);
                        let pos = 2;
                        const row = {};
                        for (let i = 0; i < numCols; i++) {
                            const colLen = payload.readInt32BE(pos);
                            pos += 4;
                            if (colLen === -1) {
                                row[columns[i]] = null;
                            } else {
                                row[columns[i]] = payload.slice(pos, pos + colLen).toString();
                                pos += colLen;
                            }
                        }
                        rows.push(row);
                        break;
                    case 'E':
                        console.error('Error:', payload.toString());
                        break;
                }
            }
        });
    });
}

(async () => {
    console.log("=== PRODUTO ===");
    const prod = await runQuery("SELECT * FROM produto LIMIT 1");
    if(prod.length > 0) console.log(Object.keys(prod[0]).filter(k => k.includes('mercadologico') || k.includes('secao') || k.includes('grupo') || k.includes('departamento')));
    
    console.log("\\n=== NOTASAIDAITEM ===");
    const nsi = await runQuery("SELECT * FROM notasaidaitem LIMIT 1");
    if(nsi.length > 0) console.log(Object.keys(nsi[0]).filter(k => k.includes('valor') || k.includes('preco') || k.includes('total')));
})();
