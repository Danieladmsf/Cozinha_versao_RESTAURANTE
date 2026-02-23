const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { db } = require('./firebase_admin'); // Firebase Integration

const DB_CONFIG = {
    host: '10.110.65.232',
    port: 8745,
    database: 'vr',
    user: 'postgres',
    password: 'VrPost@Server'
};

const OUTPUT_DIR = path.join(__dirname, 'dados_pedidos');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

function md5(str) {
    return crypto.createHash('md5').update(str, 'binary').digest('hex');
}

// Helper to chunk array
function chunkArray(myArray, chunk_size) {
    var results = [];
    while (myArray.length) {
        results.push(myArray.splice(0, chunk_size));
    }
    return results;
}

async function uploadToFirestore(collectionName, data) {
    if (!data || data.length === 0) return;

    console.log(`[Firebase] Uploading ${data.length} items to '${collectionName}'...`);

    // Firestore batch limit is 500 operations
    // We clone data to avoid mutation issues with splice if reused (though here we don't reuse)
    const dataClone = [...data];
    const chunks = chunkArray(dataClone, 500);

    let batchCount = 0;
    for (const chunk of chunks) {
        const batch = db.batch();
        const collectionRef = db.collection(collectionName);

        chunk.forEach(item => {
            // Use a composite key or auto-ID? 
            // Better to use auto-ID to avoid hotspots unless we have a unique natural key
            // item.id is usually unique per table, but might duplicate across stores?
            // Let's use auto-ID for simplicity in this history dump
            // Or create a deterministic ID: item.id + '_' + item.id_loja?
            // If we re-run, we want to OVERWRITE, not duplicate.
            // So identifying a unique ID is important.
            // data usually has 'id'. 
            // Sales (from aggregation) doesn't have a single ID, it's aggregated by product/day.
            // Quebra/Perda has ID.

            let docRef;
            if (item.id) {
                docRef = collectionRef.doc(item.id.toString());
            } else if (item.id_produto && item.data) {
                // For Aggregated Sales: Date_Loja_Product
                const docId = `${item.data}_${item.id_loja}_${item.id_produto}`;
                docRef = collectionRef.doc(docId);
            } else {
                docRef = collectionRef.doc();
            }

            batch.set(docRef, item);
        });

        await batch.commit();
        batchCount++;
        if (batchCount % 10 === 0) process.stdout.write('.'); // Progress dot
    }
    console.log(`\n[Firebase] Finished uploading '${collectionName}'.`);
}

async function runQuery() {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(120000); // 2 mins timeout
        socket.connect(DB_CONFIG.port, DB_CONFIG.host);

        let buffer = Buffer.alloc(0);
        let step = 'startup';
        let columns = [];
        let rows = [];
        let querySent = false;
        let queryQueue = [
            {
                name: 'historico_vendas',
                collection: 'historico_vendas',
                sql: `
                    SELECT 
                        id_loja, 
                        id_produto, 
                        data, 
                        SUM(quantidade) as qtd_total 
                    FROM venda 
                    WHERE data >= CURRENT_DATE - INTERVAL '90 days' 
                    GROUP BY id_loja, id_produto, data
                `
            },
            {
                name: 'historico_perdas',
                collection: 'historico_perdas',
                sql: `
                    SELECT * 
                    FROM perda 
                    WHERE data >= CURRENT_DATE - INTERVAL '90 days'
                `
            },
            {
                name: 'historico_quebras',
                collection: 'historico_quebras',
                sql: `
                    SELECT * 
                    FROM quebra 
                    WHERE data >= CURRENT_DATE - INTERVAL '90 days'
                `
            }
        ];

        let currentQuery = null;

        function processQueue() {
            if (queryQueue.length === 0) {
                console.log('Todas as extrações e uploads concluídos!');
                socket.end();
                resolve();
                return;
            }
            currentQuery = queryQueue.shift();
            console.log(`\nExtraindo ${currentQuery.name}...`);

            rows = [];
            columns = [];
            querySent = false;

            const query = Buffer.from(currentQuery.sql + '\0');
            const msg = Buffer.alloc(1 + 4 + query.length);
            msg[0] = 0x51;
            msg.writeInt32BE(4 + query.length, 1);
            query.copy(msg, 5);
            socket.write(msg);
            querySent = true;
        }

        socket.on('connect', () => {
            console.log('Conectado ao DB...');
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

        socket.on('data', async (data) => {
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
                            processQueue();
                        } else if (querySent) {
                            // Save file
                            const filepath = path.join(OUTPUT_DIR, `${currentQuery.name}.json`);
                            fs.writeFileSync(filepath, JSON.stringify(rows, null, 2));
                            console.log(`  Salvo ${rows.length} registros em ${filepath}`);

                            // Upload to Firebase
                            // Pause socket processing? No, async nature.
                            // But we are in a 'data' handler.
                            // We should probably await upload before processQueue() to avoid flooding or race conditions if we close socket.
                            // Wait, 'rows' is full result set for this query.
                            try {
                                await uploadToFirestore(currentQuery.collection, rows);
                            } catch (err) {
                                console.error('  [Firebase Error]', err);
                            }

                            processQueue();
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

runQuery().catch(console.error);
