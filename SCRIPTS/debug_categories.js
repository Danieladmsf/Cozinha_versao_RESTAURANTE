// Debug script to check category tree structure
import { db } from '../lib/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function debug() {
    console.log("=== Checking Category Tree ===\n");

    // Get all categories
    const catSnap = await getDocs(collection(db, 'CategoryTree'));
    const categories = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`Total categories in CategoryTree: ${categories.length}\n`);

    // Find PROCESSADOS FLV
    const processadosFLV = categories.find(c => c.name === 'PROCESSADOS FLV');
    console.log("PROCESSADOS FLV:", processadosFLV ? { id: processadosFLV.id, level: processadosFLV.level } : "NOT FOUND");

    // Find PROCESSADOS (child of FLV)
    const processados = categories.find(c => c.name === 'PROCESSADOS');
    console.log("PROCESSADOS:", processados ? { id: processados.id, parent_id: processados.parent_id, level: processados.level } : "NOT FOUND");

    // Find 3rd level categories
    const frutas = categories.find(c => c.name === 'FRUTAS PROCESSADAS');
    const legumes = categories.find(c => c.name === 'LEGUMES PROCESSADAS');
    const bebidas = categories.find(c => c.name === 'BEBIDAS PROCESSADAS');

    console.log("\n=== 3rd Level Categories ===");
    console.log("FRUTAS PROCESSADAS:", frutas ? { id: frutas.id, parent_id: frutas.parent_id, level: frutas.level } : "NOT FOUND");
    console.log("LEGUMES PROCESSADAS:", legumes ? { id: legumes.id, parent_id: legumes.parent_id, level: legumes.level } : "NOT FOUND");
    console.log("BEBIDAS PROCESSADAS:", bebidas ? { id: bebidas.id, parent_id: bebidas.parent_id, level: bebidas.level } : "NOT FOUND");

    // Check if parent_id of 3rd level matches PROCESSADOS id
    if (processados && frutas) {
        console.log("\n=== Parent-Child Relationship Check ===");
        console.log(`PROCESSADOS id: ${processados.id}`);
        console.log(`FRUTAS parent_id: ${frutas.parent_id}`);
        console.log(`Match: ${processados.id === frutas.parent_id}`);
    }

    process.exit(0);
}

debug().catch(e => { console.error(e); process.exit(1); });
