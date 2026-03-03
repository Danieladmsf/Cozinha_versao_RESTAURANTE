
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, doc, deleteDoc, getDocsFromServer, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

async function main() {
    console.log("🛠️ INICIANDO RESTAURAÇÃO DE EMERGÊNCIA DAS CATEGORIAS 🛠️");

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

    // 1. Limpar todas CategoryType erradas
    console.log("🧹 1. Limpando CategoryType...");
    const snapType = await getDocsFromServer(collection(db, "CategoryType"));
    for (const d of snapType.docs) {
        await deleteDoc(doc(db, "CategoryType", d.id));
    }

    // 2. Restaurar CategoryType EXATAMENTE como no backup
    console.log("📥 2. Restaurando CategoryType original...");
    for (const t of backupData.CategoryType) {
        await setDoc(doc(db, "CategoryType", t.id), fixData(t.data));
        console.log(`   ✅ Tipo restaurado: ${t.data.label}`);
    }

    // 3. Limpar CategoryTree erradas
    console.log("🧹 3. Limpando CategoryTree quebrada...");
    const snapTree = await getDocsFromServer(collection(db, "CategoryTree"));
    for (const d of snapTree.docs) {
        await deleteDoc(doc(db, "CategoryTree", d.id));
    }

    // 4. Restaurar CategoryTree E Category para os tipos "ingredientes" e "contas" perdidos
    console.log("🌱 4. Restaurando Árvore e Categorias de Ingredientes/Contas perdidas...");
    const lostTrees = backupData.CategoryTree.filter(t => t.data.type !== 'receitas' && t.data.type !== 'produtos');

    // Além disso, também tinha categorias Mestre (MÃE) em CategoryTree de "produtos" que precisamos (Aquelas root sem parent_id da árvore de Embalagens, Laticínios, etc). Ops, Laticínios=ingredientes.
    // Pra ficar super seguro, vamos voltar TUDO de 'ingredientes', 'contas', e qualquer um que era root de ingredientes!
    for (const t of lostTrees) {
        const fixedTreeData = fixData(t.data);
        await setDoc(doc(db, "CategoryTree", t.id), fixedTreeData);

        await setDoc(doc(db, "Category", t.id), {
            name: fixedTreeData.name || fixedTreeData.description || 'S/ Nome',
            type: fixedTreeData.type,
            active: fixedTreeData.active !== false,
            createdAt: fixedTreeData.createdAt || serverTimestamp(),
            updatedAt: fixedTreeData.updatedAt || serverTimestamp()
        }, { merge: true });

        console.log(`   ✅ Restaurado Orig. Ingrediente/Conta: ${fixedTreeData.name}`);
    }

    // 5. Re-injetar as 11 novas categorias de 'Receitas / Produtos' no CategoryTree CORRETAMENTE
    console.log("🔧 5. Sincronizando novas categorias de Receitas (com level: 1)...");
    const newCatsSnap = await getDocsFromServer(collection(db, 'Category'));

    let orderCounter = 1;
    for (const d of newCatsSnap.docs) {
        const catData = d.data();

        // Só injetamos os recém criados
        if (catData.type === 'receitas' || catData.type === 'produtos') {
            const newTreeData = {
                name: catData.name,
                active: catData.active !== false,
                type: catData.type,
                parent_id: null,
                level: 1,
                order: orderCounter++,
                createdAt: catData.createdAt || serverTimestamp(),
                updatedAt: catData.updatedAt || serverTimestamp()
            };
            await setDoc(doc(db, "CategoryTree", d.id), newTreeData);
            console.log(`   ✅ Sincronizado: ${catData.name} (level: 1)`);
        }
    }

    console.log("\n🎉 INTERFACE E ESTRUTURA RESTAURADAS!");
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
