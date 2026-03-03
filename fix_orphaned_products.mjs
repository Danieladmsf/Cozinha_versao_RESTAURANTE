
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

async function main() {
    console.log("🛠️ CONSERTANDO OS IDS ÓRFÃOS DE PRODUTOS RESTAURADOS (CASE INSENSITIVE) 🛠️");

    // 1. Ler o Backup Original para pegar os nomes dos IDs velhos
    const backupPath = 'C:\\Users\\Administrador\\Desktop\\Backup_CategoryTree_Type.json';
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    const oldIdToNameMap = {};
    for (const treeItem of backupData.CategoryTree) {
        // Grava a chave do ID toda em UPPERCASE para bater com o report!
        oldIdToNameMap[treeItem.id.toUpperCase()] = treeItem.data.name;
    }
    console.log(`📥 Carregadas ${Object.keys(oldIdToNameMap).length} categorias antigas do Backup.`);

    // 2. Carregar a Nova CategoryTree atual do Firebase
    const currentTreeSnap = await getDocs(collection(db, 'CategoryTree'));
    const currentNameMap = {}; // name.toLowerCase() -> id

    currentTreeSnap.docs.forEach(d => {
        currentNameMap[d.data().name.toLowerCase().trim()] = d.id;
    });

    // 3. Varrer a tabela Product
    const snapProducts = await getDocs(collection(db, 'Product'));
    let fixedCount = 0;

    for (const pSnap of snapProducts.docs) {
        const pData = pSnap.data();
        const oldCatId = (pData.category_id || "").toUpperCase(); // Uppercase para pesquisa

        let realCategoryName = oldIdToNameMap[oldCatId];

        if (realCategoryName) {
            let newCatId = currentNameMap[realCategoryName.toLowerCase().trim()];

            // Se essa categoria sumiu e nós não a criamos na restauração
            if (!newCatId) {
                const newCatRef = doc(collection(db, "Category"));
                newCatId = newCatRef.id;
                await setDoc(newCatRef, {
                    name: realCategoryName,
                    type: 'produtos',
                    active: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                await setDoc(doc(db, "CategoryTree", newCatId), {
                    name: realCategoryName,
                    type: 'produtos', // MUITO IMPORTANTE: Precisa ser 'produtos' pra UI ler nas tabs corretas!!!
                    active: true,
                    level: 1,
                    parent_id: null,
                    order: 10,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                currentNameMap[realCategoryName.toLowerCase().trim()] = newCatId;
                console.log(`   + Categoria de Produto recriada na Árvore: ${realCategoryName}`);
            }

            // Agora, vamos atualizar o Produto com o novo ID Válido e o Nome em Texto
            await setDoc(doc(db, 'Product', pSnap.id), {
                category_id: newCatId,
                category: realCategoryName
            }, { merge: true });

            console.log(`   ✅ SKU Fixado: [${pData.name}] -> Categoria: ${realCategoryName}`);
            fixedCount++;
        } else {
            console.log(`   ⚠️ SKU Ignorado (ID Antigo não achado: ${oldCatId}): ${pData.name}`);
        }
    }

    console.log(`\n🎉 PRODUTOS FINALMENTE ALINHADOS COM A ÁRVORE! Total: ${fixedCount}`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
