/**
 * Script para padronizar TODOS os nomes de Product e Recipe no banco.
 * Aplica Title Case: "ROTISSERIA MACARRAO" → "Rotisseria Macarrão"
 *                    "rotisseria macarrão" → "Rotisseria Macarrão"
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig, 'normalize-names');
const db = getFirestore(app);

const SMALL_WORDS = new Set(['de', 'do', 'da', 'dos', 'das', 'com', 'e', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'ao', 'à', 'os', 'as', 'um', 'uma']);

// Palavras que devem manter formato especial
const PRESERVE_WORDS = {
    'kg': 'Kg',
    'un': 'Un',
    'c/': 'c/',
    'c/cheddar': 'c/Cheddar',
    'sku:': 'SKU:',
    'rot.': 'Rot.',
    'rot': 'Rot',
    'ass.': 'Ass.',
};

function toTitleCase(text) {
    if (!text || typeof text !== 'string') return text || '';

    return text
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            if (!word) return word;

            // Verificar palavras especiais
            const lower = word.toLowerCase();
            if (PRESERVE_WORDS[lower]) return PRESERVE_WORDS[lower];

            // Tratar palavras com "/" no meio (c/cheddar → c/Cheddar)
            if (word.includes('/') && !word.startsWith('/')) {
                const parts = word.split('/');
                return parts.map((p, i) => {
                    if (!p) return p;
                    if (i > 0) return p.charAt(0).toUpperCase() + p.slice(1);
                    return p;
                }).join('/');
            }

            // Primeira palavra sempre com maiúscula
            if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
            // Palavras pequenas ficam minúsculas (exceto no início)
            if (SMALL_WORDS.has(word)) return word;
            // Demais: primeira letra maiúscula
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

async function normalizeCollection(collectionName) {
    console.log(`\n📦 Normalizando ${collectionName}...`);

    const snap = await getDocs(collection(db, collectionName));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    let changed = 0;
    let skipped = 0;

    for (const item of docs) {
        const originalName = item.name || '';
        const normalizedName = toTitleCase(originalName);

        if (normalizedName === originalName) {
            skipped++;
            continue;
        }

        console.log(`   "${originalName}" → "${normalizedName}"`);
        await updateDoc(doc(db, collectionName, item.id), {
            name: normalizedName,
            updatedAt: new Date()
        });
        changed++;
    }

    console.log(`   ✅ ${changed} alterados | ${skipped} já corretos`);
    return changed;
}

async function run() {
    console.log('🔤 Padronizando nomes no banco de dados...');

    const p = await normalizeCollection('Product');
    const r = await normalizeCollection('Recipe');

    console.log(`\n🎯 Total: ${p + r} nomes normalizados.`);
}

run()
    .then(() => { console.log('✅ Finalizado.'); process.exit(0); })
    .catch(err => { console.error('❌', err); process.exit(1); });
