
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function main() {
    console.log("🚨 INICIANDO BACKUP DE EMERGÊNCIA (RECIPES E PRODUCTS) 🚨");

    const snapR = await getDocs(collection(db, 'Recipe'));
    const recipes = [];
    snapR.forEach(d => recipes.push({ id: d.id, ...d.data() }));

    const snapP = await getDocs(collection(db, 'Product'));
    const products = [];
    snapP.forEach(d => products.push({ id: d.id, ...d.data() }));

    const backupData = {
        Recipe: recipes,
        Product: products,
        timestamp: new Date().toISOString()
    };

    const filePath = 'C:\\Users\\Administrador\\Desktop\\Backup_Recipe_Product_Emergencia.json';
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

    console.log(`\n💾 BACKUP SALVO COM SUCESSO NO DESKTOP!`);
    console.log(`- Receitas (Fichas Técnicas): ${recipes.length}`);
    console.log(`- Produtos (SKUs/Vitrine): ${products.length}`);
    console.log(`Caminho: ${filePath}`);

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
