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
        socket.setTimeout(60000);
        socket.connect(DB_CONFIG.port, DB_CONFIG.host);

        let buffer = Buffer.alloc(0);
        let step = 'startup';
        let columns = [];
        let rows = [];
        let querySent = false;

        socket.on('connect', () => {
            const user = Buffer.from(DB_CONFIG.user + '\0');
            const database = Buffer.from(DB_CONFIG.database + '\0');
            const params = Buffer.concat([
                Buffer.from('user\0'), user,
                Buffer.from('database\0'), database,
                Buffer.from('\0')
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
                            passMsg.write(hash2 + '\0', 5);
                            socket.write(passMsg);
                        }
                        break;
                    case 'Z':
                        if (step === 'startup') {
                            step = 'ready';
                            if (!querySent) {
                                const query = Buffer.from(sql + '\0');
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

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

(async () => {
    // Configurações do Relatório
    const DATA_INICIO = '2026-03-01';
    const DATA_FIM = '2026-03-27';
    const ULTIMO_DIA = '2026-03-27';

    const METAS = {
        'Rotisseria': 225000.00,
        'Granel': 43075.25,
        'Padaria': 130000.00,
        'FLV PROCESSADOS': 19683.38
    };

    const sql = `
        SELECT 
            CASE 
                WHEN p.mercadologico1 = 17 THEN 'Rotisseria'
                WHEN p.mercadologico1 = 13 THEN 'Granel'
                WHEN p.mercadologico1 = 14 AND p.mercadologico2 = 1 AND p.mercadologico3 = 1 THEN 'Padaria'
                WHEN p.mercadologico1 = 8 AND p.mercadologico2 = 3 AND p.mercadologico3 = 1 THEN 'FLV PROCESSADOS'
                ELSE 'Outros'
            END as setor,
            SUM(CASE WHEN v.data = '${ULTIMO_DIA}' THEN v.valortotal ELSE 0 END) as venda_dia,
            SUM(v.valortotal) as venda_acumulada
        FROM venda v
        JOIN produto p ON p.id = v.id_produto
        WHERE v.data >= '${DATA_INICIO}' AND v.data <= '${DATA_FIM}'
        AND (
            p.mercadologico1 = 17 
            OR p.mercadologico1 = 13 
            OR (p.mercadologico1 = 14 AND p.mercadologico2 = 1 AND p.mercadologico3 = 1)
            OR (p.mercadologico1 = 8 AND p.mercadologico2 = 3 AND p.mercadologico3 = 1)
        )
        GROUP BY 1
        ORDER BY 3 DESC;
    `;

    try {
        const results = await runQuery(sql);

        console.log(`MARÇO 01/03/2026 A 27/03/2026`);
        console.log('');

        // Ordem forçada pelo cliente
        const order = ['Rotisseria', 'Granel', 'Padaria', 'FLV PROCESSADOS'];
        
        for (const name of order) {
            const row = results.find(r => r.setor === name);
            if (row) {
                const meta = METAS[name] || 0;
                
                // Formatação exata requisitada
                console.log(`*${name.padEnd(28, '.')}* ${formatCurrency(row.venda_dia)}`);
                console.log(`*Venda Acumula${'.'.repeat(15)}* ${formatCurrency(row.venda_acumulada)}`);
                console.log(`*Meta${name === 'Rotisseria' ? ' Venda' : ''}${'.'.repeat(name === 'Rotisseria' ? 18 : 24)}* ${formatCurrency(meta)}`);
                console.log('');
            }
        }

    } catch(e) {
        console.error("Falha:", e);
    }
})();
