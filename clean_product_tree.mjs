
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, doc, deleteDoc, getDocsFromServer, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

async function main() {
    console.log("🛠️ RESTAURANDO APENAS AS CATEGORYTREE ESTRITAS DE MONTAGEM (PRODUTOS) 🛠️");

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

    // A lista EXATA de categorias estruturais que a foto/descrição do usuário precisava
    const allowedProductTrees = [
        "MARMITA 3 DIVISORIAS (ALMOÇO)",
        "MACARRÃO (ALMOÇO)",
        "MONO ARROZ (ALMOÇO)",
        "MONO FEIJÃO (ALMOÇO)",
        "MONO GUARNIÇÃO (ALMOÇO)",
        "MONO PROTEINAS (ALMOÇO)",
        "MASSAS (TARDE)",
        "SALADAS COZIDAS (TARDE)",
        "MOLHOS (TARDE)",
        "PATES (TARDE)",
        "PRODUTOS" // Nó mestre pai deles!
    ];

    const treesToRestore = backupData.CategoryTree.filter(t =>
        (t.data.type === 'produtos' && allowedProductTrees.includes(t.data.name)) ||
        t.data.type === 'ingredientes' ||
        t.data.type === 'contas'
    );

    console.log(`📥 Filtradas ${treesToRestore.length} categorias corretas do backup (Excluindo lixos antigos de produtos)`);

    // Limpar DE NOVO toda a Tabela CategoryTree atual de tipos "produtos", para inserir a lista limpa
    const snapCategoryTree = await getDocsFromServer(collection(db, "CategoryTree"));
    for (const d of snapCategoryTree.docs) {
        if (d.data().type === 'produtos') {
            await deleteDoc(doc(db, "CategoryTree", d.id));

            // Vou apagar também da coleção principal de Category para não poluir o dropdown!
            // Mas não podemos apagar acidentalmente o PRODUTOS mestre ou alguma outra coisa crítica.
            if (!allowedProductTrees.includes(d.data().name)) {
                await deleteDoc(doc(db, "Category", d.id));
            }
            console.log(`   🧹 Limpando errada do BD: ${d.data().name}`);
        }
    }

    // Agora Injetar Do Backup Apenas as Corretas
    console.log("\n🌱 Restaurando a Árvore hierárquica estrita...");
    for (const t of treesToRestore) {
        const fixedTreeData = fixData(t.data);
        await setDoc(doc(db, "CategoryTree", t.id), fixedTreeData);

        await setDoc(doc(db, "Category", t.id), {
            name: fixedTreeData.name || fixedTreeData.description || 'S/ Nome',
            type: fixedTreeData.type,
            active: fixedTreeData.active !== false,
            createdAt: fixedTreeData.createdAt || serverTimestamp(),
            updatedAt: fixedTreeData.updatedAt || serverTimestamp()
        }, { merge: true });

        console.log(`   ✅ Restaurado na Árvore: [${fixedTreeData.type}] ${fixedTreeData.name}`);
    }

    console.log("\n🎉 LIMPEZA DE LIXOS ANINHADOS CONCLUÍDA!");
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
