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

const OUTPUT_FILE = path.join(__dirname, 'dados_pedidos', 'vendas_monitoradas.json');
const INTERVAL_MS = 30000; // 30 seconds

// State tracking
let lastLogEstoqueId = 0;

function md5(str) {
    return crypto.createHash('md5').update(str, 'binary').digest('hex');
}

async function checkDatabase() {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(20000);
        socket.connect(DB_CONFIG.port, DB_CONFIG.host);

        let buffer = Buffer.alloc(0);
        let step = 'startup';
        let columns = [];
        let rows = [];
        let querySent = false;

        let queries = [];

        if (lastLogEstoqueId === 0) {
            queries = [
                { name: 'max_logestoque', sql: 'SELECT MAX(id::bigint) as max_id FROM logestoque' }
            ];
        } else {
            // Get new movements related to sales
            queries = [
                {
                    name: 'new_movements',
                    sql: `
                        SELECT 
                            id, 
                            id_produto, 
                            quantidade, 
                            to_char(datahora, 'YYYY-MM-DD HH24:MI:SS') as data_hora_db,
                            id_venda 
                        FROM logestoque 
                        WHERE id::bigint > ${lastLogEstoqueId} 
                        AND id_venda IS NOT NULL 
                        LIMIT 100
                    `
                }
            ];
        }

        let currentQuery = null;
        let newItems = [];

        function processQueue() {
            if (queries.length === 0) {
                socket.end();
                resolve(newItems);
                return;
            }
            currentQuery = queries.shift();
            // Silence verbose logging per 30s to keep output clean, unless items found
            // console.log(`Checking ${currentQuery.name}...`);

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
            const user = Buffer.from(DB_CONFIG.user + '\0');
            const database = Buffer.from(DB_CONFIG.database + '\0');
            const params = Buffer.concat([Buffer.from('user\0'), user, Buffer.from('database\0'), database, Buffer.from('\0')]);
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
                            processQueue();
                        } else if (querySent) {
                            if (currentQuery.name === 'max_logestoque') {
                                const maxId = rows.length > 0 ? rows[0].max_id : 0;
                                console.log(`  Initial Max LogEstoque: ${maxId}`);
                                lastLogEstoqueId = maxId;
                            } else {
                                if (rows.length > 0) {
                                    console.log(`  Found ${rows.length} new movements!`);
                                    newItems.push(...rows);

                                    const max = rows.reduce((acc, r) => Math.max(acc, parseInt(r.id)), lastLogEstoqueId);
                                    lastLogEstoqueId = max;
                                }
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
                }
            }
        });
    });
}

async function uploadToFirebase(items) {
    if (!items || items.length === 0) return;

    const batch = db.batch();
    const collectionRef = db.collection('vendas_monitoradas');

    // Process items
    // Use batch for efficiency if multiple items

    // Note: Firestore Batch limit is 500. We limit query to 100, so safe.
    let count = 0;

    for (const item of items) {
        // Create a new doc ref
        const docRef = collectionRef.doc(); // Auto-ID
        batch.set(docRef, {
            ...item,
            uploaded_at: new Date().toISOString() // add upload timestamp
        });
        count++;
    }

    try {
        await batch.commit();
        console.log(`  [Firebase] Successfully uploaded ${count} items.`);
    } catch (error) {
        console.error('  [Firebase] Upload Error:', error);
    }
}

async function saveNewItems(items) {
    if (items.length === 0) return;

    // 1. Process timestamps
    const now = new Date().toISOString();
    items.forEach(i => {
        i.detected_at = now;
        if (i.data_hora_db) i.venda_hora = i.data_hora_db;
    });

    // 2. Upload to Firebase
    await uploadToFirebase(items);

    // 3. Save Local File (Backup)
    let history = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        try { history = JSON.parse(fs.readFileSync(OUTPUT_FILE)); } catch (e) { }
    }
    history = [...history, ...items];
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(history, null, 2));
    console.log(`  [Local] Appended to JSON file.`);
}

async function loop() {
    console.log(`Starting Monitor Loop (Interval: ${INTERVAL_MS}ms) + Firebase Upload`);
    console.log(`Monitoring Table: logestoque (Movements with id_venda)`);
    while (true) {
        try {
            // console.log(`\nChecking...`); 
            const newItems = await checkDatabase();
            if (newItems && newItems.length > 0) {
                await saveNewItems(newItems);
            }
        } catch (e) {
            console.error('Monitor loop error:', e.message);
        }
        await new Promise(r => setTimeout(r, INTERVAL_MS));
    }
}

loop();
