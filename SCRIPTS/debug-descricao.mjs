import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';

const sa = JSON.parse(readFileSync('.venv/cozinha-afeto-2026-firebase-adminsdk-fbsvc-ab856b85c0.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snapshot = await db.collection('ferramentas').get();
let output = '';

for (const doc of snapshot.docs) {
    const data = doc.data();
    output += `\n=== ${data.nome || 'SEM NOME'} ===\n`;
    output += `DESCRICAO RAW:\n${data.descricao || '(vazio)'}\n`;
    output += `DESCRICAO JSON:\n${JSON.stringify(data.descricao)}\n`;
    output += '---\n';
}

console.log(output);
process.exit(0);
