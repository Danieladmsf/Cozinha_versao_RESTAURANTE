
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, doc, deleteDoc, getDocsFromServer, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

async function main() {
    console.log("🛠️ RESTAURANDO CATEGORYTREE DE PRODUTOS (Marmitas, etc) 🛠️");

    const backupFile = 'C:\\Users\\Administrador\\Desktop\\Backup_CategoryTree_Type.json';
    if (!fs.existsSync(backupFile)) {
        console.error("Backup não encontrado!");
        process.exit(1);
    }

    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    const fixTimestamp = (field) => {
        if (!field) return serverTimestamp();
        if (field.seconds !== undefined) return Timestamp.fromDate(new Date(field.seconds * 1000));
        return serverTimestamp();
    };

    const fixData = (data) => {
        const newData = { ...data };
        if (newData.createdAt) newData.createdAt = fixTimestamp(newData.createdAt);
        if (newData.updatedAt) newData.updatedAt = fixTimestamp(newData.updatedAt);
        return newData;
    };

    // Filtramos TODAS as árvores que eram do tipo "produtos" (Essas são as "Marmitas", "Mono Arroz", etc) e "ingredientes" / "contas"
    // Na verdade, para não ter erro de hierarquia solta, vamos restaurar a árvore COMPLETA do backup, exceto as que eram tipo 'receitas'.
    // E as 'receitas' oficiais (Bovino, etc) nós já injetamos lá. E vamos limpá-las aqui pra garantir que ficaremos só com as exatas.

    const treesToRestore = backupData.CategoryTree.filter(t => t.data.type !== 'receitas');

    console.log(`📥 Encontradas ${treesToRestore.length} categorias não-receita no backup (Produtos, Ingredientes, etc)`);

    // Limpar as velhas cópias erradas da Tabela que criamos por engano antes (refeições / produtos)
    // Precisamos excluir da base de dados atual tudo que tiver o type 'produtos'
    const snapCategoryTree = await getDocsFromServer(collection(db, "CategoryTree"));
    for (const d of snapCategoryTree.docs) {
        if (d.data().type === 'produtos') {
            await deleteDoc(doc(db, "CategoryTree", d.id));
            console.log(`   🧹 Limpando ${d.data().name} que estava errada`);
        }
    }

    // Agora Injetar Do Backup
    console.log("\n🌱 Restaurando a Árvore hierárquica completa...");
    for (const t of treesToRestore) {
        const fixedTreeData = fixData(t.data);
        await setDoc(doc(db, "CategoryTree", t.id), fixedTreeData);

        // Elas também precisam estar na tabela ROOT (Category) para os Dropdowns funcionarem
        // As receitas puras nós não mexemos, continuam as 11 intocadas
        await setDoc(doc(db, "Category", t.id), {
            name: fixedTreeData.name || fixedTreeData.description || 'S/ Nome',
            type: fixedTreeData.type,
            active: fixedTreeData.active !== false,
            createdAt: fixedTreeData.createdAt || serverTimestamp(),
            updatedAt: fixedTreeData.updatedAt || serverTimestamp()
        }, { merge: true });

        console.log(`   ✅ Restaurado na Árvore e Cadastro: [${fixedTreeData.type}] ${fixedTreeData.name}`);
    }

    console.log("\n🎉 ESTRUTURA HIERÁRQUICA RESTAURADA E SEPARADA!");
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
