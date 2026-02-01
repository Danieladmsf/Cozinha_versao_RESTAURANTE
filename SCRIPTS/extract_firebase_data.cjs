/**
 * Script para extrair receitas e categorias do Firebase
 * Execução: node SCRIPTS/extract_firebase_data.cjs
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '../.venv/cozinha-afeto-2026-firebase-adminsdk-fbsvc-ab856b85c0.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function extractData() {
    console.log('='.repeat(80));
    console.log('EXTRAÇÃO DE DADOS DO FIREBASE');
    console.log('Projeto: cozinha-afeto-2026');
    console.log('Data:', new Date().toLocaleString('pt-BR'));
    console.log('='.repeat(80));

    // 1. Extrair CategoryTree (estrutura de categorias)
    console.log('\n📂 CATEGORYTREE (Estrutura de Categorias):');
    console.log('-'.repeat(60));

    const categoryTreeSnap = await db.collection('CategoryTree').get();
    const categories = [];

    categoryTreeSnap.forEach(doc => {
        const data = doc.data();
        categories.push({
            id: doc.id,
            name: data.name,
            type: data.type,
            level: data.level,
            parent_id: data.parent_id,
            active: data.active
        });
    });

    // Ordenar por type e level
    categories.sort((a, b) => {
        if (a.type !== b.type) return a.type?.localeCompare(b.type);
        return (a.level || 0) - (b.level || 0);
    });

    console.log(`Total: ${categories.length} categorias\n`);

    // Agrupar por type
    const byType = {};
    categories.forEach(cat => {
        const type = cat.type || 'sem_tipo';
        if (!byType[type]) byType[type] = [];
        byType[type].push(cat);
    });

    for (const [type, cats] of Object.entries(byType)) {
        console.log(`\n  [${type.toUpperCase()}] - ${cats.length} categorias:`);
        cats.forEach(cat => {
            const indent = '    '.repeat(cat.level || 1);
            console.log(`${indent}• ${cat.name} (level: ${cat.level}, id: ${cat.id})`);
        });
    }

    // 2. Extrair CategoryTypes
    console.log('\n\n📋 CATEGORYTYPES (Tipos de Categoria):');
    console.log('-'.repeat(60));

    const categoryTypesSnap = await db.collection('CategoryType').get();
    console.log(`Total: ${categoryTypesSnap.size} tipos\n`);

    categoryTypesSnap.forEach(doc => {
        const data = doc.data();
        console.log(`  • ${data.label || data.value} (value: "${data.value}", order: ${data.order})`);
    });

    // 3. Extrair Receitas
    console.log('\n\n🍳 RECEITAS:');
    console.log('-'.repeat(60));

    const recipesSnap = await db.collection('recipes').get();
    const recipes = [];

    recipesSnap.forEach(doc => {
        const data = doc.data();
        recipes.push({
            id: doc.id,
            name: data.name,
            category: data.category,
            subCategory: data.subCategory,
            active: data.active
        });
    });

    // Ordenar por nome
    recipes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    console.log(`Total: ${recipes.length} receitas\n`);

    recipes.forEach(recipe => {
        const cat = recipe.category || 'Sem categoria';
        const subCat = recipe.subCategory ? ` > ${recipe.subCategory}` : '';
        console.log(`  • ${recipe.name}`);
        console.log(`      Categoria: ${cat}${subCat}`);
    });

    // 4. Salvar em arquivo JSON
    const outputPath = path.join(__dirname, '../SCRIPTS/firebase_data_export.json');
    const exportData = {
        extractedAt: new Date().toISOString(),
        categoryTree: categories,
        categoryTypes: categoryTypesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        recipes: recipes
    };

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
    console.log(`\n\n✅ Dados exportados para: ${outputPath}`);

    console.log('\n' + '='.repeat(80));
    console.log('EXTRAÇÃO CONCLUÍDA');
    console.log('='.repeat(80));
}

extractData()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erro:', err);
        process.exit(1);
    });
