import admin from 'firebase-admin';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Inicializar Firebase Admin
try {
    // Ajuste o caminho se necessário, assumindo que está na raiz ou SCRIPTS
    const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    console.error('Erro ao inicializar Firebase:', e);
    process.exit(1);
}

const db = admin.firestore();

async function checkConfigs() {
    console.log('🔍 Buscando TODOS os documentos MenuConfig...');

    try {
        const snapshot = await db.collection('MenuConfig').get();

        if (snapshot.empty) {
            console.log('❌ Nenhum documento MenuConfig encontrado.');
            return;
        }

        console.log(`✅ Encontrados ${snapshot.size} documentos.`);

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`\n📄 ID: ${doc.id}`);
            console.log(`   User: ${data.user_id}`);
            console.log(`   IsDefault: ${data.is_default}`);

            if (data.category_groups && data.category_groups.length > 0) {
                console.log('   📂 Category Groups:');
                data.category_groups.forEach(g => {
                    console.log(`      - [${g.id}] ${g.name}`);
                });
            } else {
                console.log('   ⚪ Category Groups: (vazio ou undefined)');
            }
        });

    } catch (error) {
        console.error('Erro ao buscar configs:', error);
    }
}

checkConfigs();
