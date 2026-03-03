
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("📥 Extraindo estrutura exata de CategoryTree e CategoryType...");

    const backupData = {
        CategoryType: [],
        CategoryTree: []
    };

    // Extrair CategoryType
    const typeSnap = await getDocsFromServer(collection(db, "CategoryType"));
    typeSnap.forEach(d => {
        backupData.CategoryType.push({
            id: d.id,
            data: d.data()
        });
    });
    console.log(`✅ ${backupData.CategoryType.length} CategoryTypes extraídos.`);

    // Extrair CategoryTree
    const treeSnap = await getDocsFromServer(collection(db, "CategoryTree"));
    treeSnap.forEach(d => {
        backupData.CategoryTree.push({
            id: d.id,
            data: d.data()
        });
    });
    console.log(`✅ ${backupData.CategoryTree.length} CategoryTrees extraídos.`);

    const outputPath = 'C:\\Users\\Administrador\\Desktop\\Backup_CategoryTree_Type.json';
    fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2), 'utf8');

    console.log(`\n🎉 EXTRAÇÃO CONCLUÍDA!`);
    console.log(`   Arquivo salvo em: ${outputPath}`);

    // Imprimir o conteúdo para confirmação rápida
    console.log("\n--- CONTEÚDO EXTRAÍDO (CategoryType) ---");
    backupData.CategoryType.forEach(t => console.log(`- [${t.id}] ${t.data.name || t.data.description || 'S/NOME'}`));

    console.log("\n--- CONTEÚDO EXTRAÍDO (CategoryTree) ---");
    backupData.CategoryTree.forEach(t => console.log(`- [${t.id}] ${t.data.name || t.data.description || 'S/NOME'}`));

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
