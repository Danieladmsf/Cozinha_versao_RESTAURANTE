/**
 * Script para extrair dados do Firebase - Versão corrigida
 * Execução: node SCRIPTS/extract_firebase_data_v2.cjs
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../.venv/cozinha-afeto-2026-firebase-adminsdk-fbsvc-ab856b85c0.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    console.log('='.repeat(80));
    console.log('EXTRAÇÃO DE DADOS - VERSÃO CORRIGIDA');
    console.log('='.repeat(80));

    // 1. CategoryTree
    console.log('\n📂 CATEGORYTREE:');
    const catTreeSnap = await db.collection('CategoryTree').get();
    console.log(`Total: ${catTreeSnap.size} documentos`);

    const byType = {};
    catTreeSnap.forEach(doc => {
        const data = doc.data();
        const type = data.type || 'sem_tipo';
        if (!byType[type]) byType[type] = [];
        byType[type].push({ id: doc.id, name: data.name, level: data.level });
    });

    for (const [type, cats] of Object.entries(byType)) {
        console.log(`\n  [${type}]: ${cats.length} categorias`);
        cats.slice(0, 5).forEach(c => console.log(`    - ${c.name} (level ${c.level})`));
        if (cats.length > 5) console.log(`    ... e mais ${cats.length - 5}`);
    }

    // 2. Recipe (R maiúsculo - correto)
    console.log('\n\n🍳 RECIPE (coleção correta):');
    const recipeSnap = await db.collection('Recipe').get();
    console.log(`Total: ${recipeSnap.size} documentos`);

    const recipeCategories = {};
    recipeSnap.forEach(doc => {
        const data = doc.data();
        const cat = data.category || 'SEM CATEGORIA';
        if (!recipeCategories[cat]) recipeCategories[cat] = 0;
        recipeCategories[cat]++;
    });

    console.log('\n  Receitas por categoria:');
    for (const [cat, count] of Object.entries(recipeCategories)) {
        console.log(`    - ${cat}: ${count} receitas`);
    }

    // 3. recipes (r minúsculo - errado, mas verificar se tem dados)
    console.log('\n\n🍳 recipes (minúsculo - verificando):');
    const recipesMinSnap = await db.collection('recipes').get();
    console.log(`Total: ${recipesMinSnap.size} documentos`);

    if (recipesMinSnap.size > 0) {
        console.log('  ⚠️ ATENÇÃO: Existem receitas na coleção "recipes" (minúsculo)!');
        const minCategories = {};
        recipesMinSnap.forEach(doc => {
            const data = doc.data();
            const cat = data.category || 'SEM CATEGORIA';
            if (!minCategories[cat]) minCategories[cat] = 0;
            minCategories[cat]++;
        });

        for (const [cat, count] of Object.entries(minCategories)) {
            console.log(`    - ${cat}: ${count} receitas`);
        }
    }

    console.log('\n' + '='.repeat(80));
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erro:', err);
        process.exit(1);
    });
