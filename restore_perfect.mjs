
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';

async function main() {
    console.log("🔥 INICIANDO AUTO-RESTAURAÇÃO PERFEITA 🔥");

    // 1. Apagar Recipe e Product (começar limpo)
    console.log("🧹 1. Limpando tabelas...");
    const toDelete = ['Recipe', 'Product'];
    for (const col of toDelete) {
        const snap = await getDocs(collection(db, col));
        let count = 0;
        for (const d of snap.docs) {
            await deleteDoc(doc(db, col, d.id));
            count++;
        }
        console.log(`   - Deletados ${count} documentos de ${col}`);
    }

    // 2. Sincronizar 'Category' com 'CategoryTree' para garantir que os nomes exatos como MARMITAS existam na raiz
    console.log("🌳 2. Sincronizando CategoryTree para Category base...");
    const treeSnap = await getDocs(collection(db, 'CategoryTree'));
    const categoryNameMap = {}; // name.toLowerCase() -> id
    const categoryIdMap = {};   // id -> name

    // Primeiro, limpamos a tabela Category atual
    const catSnap = await getDocs(collection(db, 'Category'));
    for (const d of catSnap.docs) {
        await deleteDoc(doc(db, 'Category', d.id));
    }

    let syncedCats = 0;
    for (const treeDoc of treeSnap.docs) {
        const data = treeDoc.data();
        await setDoc(doc(db, 'Category', treeDoc.id), {
            name: data.name,
            type: data.type || 'produtos',
            active: data.active !== false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        categoryNameMap[data.name.toLowerCase().trim()] = treeDoc.id;
        categoryIdMap[treeDoc.id.toLowerCase().trim()] = data.name;
        syncedCats++;
    }
    console.log(`   🔸 ${syncedCats} Categorias da Árvore transportadas para a raiz.`);

    // 3. Restaurar lendo o Relatório exato
    console.log("\n📖 3. Processando Relatorio_Receitas_e_Produtos.txt...");
    const reportPath = 'C:\\Users\\Administrador\\Desktop\\COZINHA RESTAURANTE\\SCRIPTS\\Relatorio_Receitas_e_Produtos.txt';
    const lines = fs.readFileSync(reportPath, 'utf8').split('\n');

    let currentMode = "NONE";
    let currentBlockHeader = "";

    let restoredRecipes = 0;
    let restoredProducts = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.includes('RELATÓRIO DE RECEITAS ATIVAS')) currentMode = "RECIPE";
        else if (line.includes('RELATÓRIO DE PRODUTOS')) currentMode = "PRODUCT";

        if (line.startsWith('[') && line.endsWith(']')) {
            currentBlockHeader = line.substring(1, line.length - 1).trim();
            continue;
        }

        if (line.startsWith('- ') && !line.includes('Total de')) {
            if (currentMode === "RECIPE") {
                const recipeName = line.replace('- ', '').trim();

                // Procurar ID pelo nome exato do bloco (ex: MARMITA 3 DIVISORIAS)
                let catId = categoryNameMap[currentBlockHeader.toLowerCase()];
                let catNameText = currentBlockHeader; // Valor padrão é o Header

                // Se não achou na árvore, vamos criar uma nova categoria on-the-fly?
                if (!catId) {
                    const newCatRef = doc(collection(db, "Category"));
                    catId = newCatRef.id;
                    await setDoc(newCatRef, {
                        name: currentBlockHeader,
                        type: 'receitas', // Assumiremos receitas para items novos em RECIPES
                        active: true,
                    });

                    // Salvar também na CategoryTree para não sumir da UI
                    await setDoc(doc(db, "CategoryTree", catId), {
                        name: currentBlockHeader,
                        type: 'receitas',
                        active: true,
                        level: 1,
                        parent_id: null
                    });

                    categoryNameMap[currentBlockHeader.toLowerCase()] = catId;
                    categoryIdMap[catId.toLowerCase()] = currentBlockHeader;
                    console.log(`   + Categoria criada no banco: ${currentBlockHeader} (${catId})`);
                } else {
                    catNameText = categoryIdMap[catId.toLowerCase()];
                }

                await addDoc(collection(db, "Recipe"), {
                    name: recipeName,
                    category_id: catId,
                    category: catNameText,
                    active: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    components: [],
                    yield_kg: 1
                });
                restoredRecipes++;
            }
            else if (currentMode === "PRODUCT") {
                const parts = line.split('|');
                if (parts.length === 2) {
                    const codePart = parts[0].replace('- Código:', '').trim();
                    const prodName = parts[1].trim();
                    const finalCode = codePart === "S/ CODIGO" ? "" : codePart;

                    // Para Produtos, o Cabeçalho é EXATAMENTE o ID Categoria. Ex: IK5K9SU5JWTNQ4BXBX8Q
                    let catId = currentBlockHeader;
                    let catNameText = "PRODUTO";

                    // Qual o nome dessa categoria ID?
                    if (categoryIdMap[catId.toLowerCase()]) {
                        catNameText = categoryIdMap[catId.toLowerCase()];
                    } else {
                        // Se esse ID estranho não existir na CategoryTree...
                        console.log(`   ⚠️ ALERTA: Produto '${prodName}' tem um CatID (${catId}) que não está na Árvore. Salvo mesmo assim.`);
                    }

                    await addDoc(collection(db, "Product"), {
                        name: prodName,
                        code: finalCode,
                        id_vr: finalCode,
                        category_id: catId,
                        category: catNameText,
                        active: true,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        price: 0
                    });
                    restoredProducts++;
                }
            }
        }
    }

    console.log(`\n🎉 RESTAURAÇÃO PERFEITA CONCLUÍDA!`);
    console.log(`   🔹 Receitas Salvas: ${restoredRecipes}`);
    console.log(`   🔹 Produtos (SKU) Salvos: ${restoredProducts}`);

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
