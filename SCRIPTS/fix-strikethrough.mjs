// Script para limpar formatação de riscado (strikethrough) das descrições
// Execução: node SCRIPTS/fix-strikethrough.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Carregar credenciais de serviço
const serviceAccount = JSON.parse(
    readFileSync('.venv/cozinha-afeto-2026-firebase-adminsdk-fbsvc-ab856b85c0.json', 'utf8')
);

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

// Remove tags de strikethrough do HTML
function removeStrikethrough(html) {
    if (!html) return html;
    return html
        .replace(/<s>/gi, '')
        .replace(/<\/s>/gi, '')
        .replace(/<del>/gi, '')
        .replace(/<\/del>/gi, '')
        .replace(/<strike>/gi, '')
        .replace(/<\/strike>/gi, '');
}

async function fixStrikethrough() {
    try {
        console.log('🔍 Buscando documentos na coleção ferramentas...');

        const snapshot = await db.collection('ferramentas').get();
        let fixedCount = 0;

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            let needsUpdate = false;
            const updates = {};

            // Verificar descrição
            if (data.descricao && (
                data.descricao.includes('<s>') ||
                data.descricao.includes('<del>') ||
                data.descricao.includes('<strike>')
            )) {
                updates.descricao = removeStrikethrough(data.descricao);
                needsUpdate = true;
                console.log(`  📝 Corrigindo descrição: ${data.nome}`);
            }

            // Verificar outros campos HTML
            ['especificacoes', 'materiais', 'manutencao', 'precaucoes'].forEach(field => {
                if (data[field] && (
                    data[field].includes('<s>') ||
                    data[field].includes('<del>') ||
                    data[field].includes('<strike>')
                )) {
                    updates[field] = removeStrikethrough(data[field]);
                    needsUpdate = true;
                    console.log(`  📝 Corrigindo ${field}: ${data.nome}`);
                }
            });

            if (needsUpdate) {
                await db.collection('ferramentas').doc(docSnap.id).update(updates);
                fixedCount++;
            }
        }

        console.log(`\n✅ Concluído! ${fixedCount} documentos corrigidos.`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

fixStrikethrough();
