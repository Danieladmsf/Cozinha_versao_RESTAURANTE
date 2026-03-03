
import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function main() {
    console.log("=========================================");
    console.log("🌲 RELATÓRIO COMPLETO DE CATEGORIAS 🌲");
    console.log("=========================================\n");

    try {
        // --- 1. CategoryType ---
        console.log("=== 1. Tabela: CategoryType (Abas Superiores) ===");
        const typeSnap = await getDocs(collection(db, 'CategoryType'));
        typeSnap.docs.forEach(d => {
            const data = d.data();
            console.log(`- ID: ${d.id} | Label: ${data.label} | Value: ${data.value}`);
        });
        console.log(`(Total: ${typeSnap.size} tipos)\n`);

        // --- 2. Category ---
        console.log("=== 2. Tabela: Category (Categorias Raiz Oficiais) ===");
        const catSnap = await getDocs(collection(db, 'Category'));

        // Agrupar por type
        const catGroup = {};
        catSnap.docs.forEach(d => {
            const t = d.data().type || 'Outros';
            if (!catGroup[t]) catGroup[t] = [];
            catGroup[t].push({ name: d.data().name, active: d.data().active });
        });

        for (const type in catGroup) {
            console.log(`  🔹 Tipo: ${type.toUpperCase()}`);
            catGroup[type].sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
                console.log(`     - ${c.name} (Ativo: ${c.active})`);
            });
        }
        console.log(`(Total: ${catSnap.size} categorias cadastradas)\n`);

        // --- 3. CategoryTree ---
        console.log("=== 3. Tabela: CategoryTree (Árvore de Exibição / Níveis) ===");
        const treeSnap = await getDocs(collection(db, 'CategoryTree'));

        // Agrupar por type
        const treeGroup = {};
        treeSnap.docs.forEach(d => {
            const t = d.data().type || 'Outros';
            if (!treeGroup[t]) treeGroup[t] = [];
            treeGroup[t].push({
                name: d.data().name,
                level: d.data().level,
                parent: d.data().parent_id ? "Sim" : "Nulo (Raiz)"
            });
        });

        for (const type in treeGroup) {
            console.log(`  🔹 Tipo: ${type.toUpperCase()}`);
            treeGroup[type].sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
                console.log(`     - [Lvl ${c.level}] ${c.name} | Pai: ${c.parent}`);
            });
        }
        console.log(`(Total: ${treeSnap.size} nós na árvore)`);


    } catch (err) {
        console.error("Erro na leitura do BD:", err);
    }

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
