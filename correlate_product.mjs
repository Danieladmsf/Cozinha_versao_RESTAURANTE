
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer, doc, setDoc, serverTimestamp } from 'firebase/firestore';

async function main() {
    console.log("🔍 Analisando possibilidade de restauração via `Product` collection...");

    // 1. Pega todas as Receitas válidas para mapear (Nome -> ID Novo)
    const recSnap = await getDocsFromServer(collection(db, "Recipe"));
    const validRecipes = {};
    const norm = (str) => {
        return (str || "").toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/rotisseria/g, '')
            .replace(/bendito/g, '')
            .replace(/kg/g, '')
            .replace(/unidade/g, '')
            .replace(/un/g, '')
            .replace(/  /g, ' ')
            .trim();
    };
    recSnap.forEach(d => {
        validRecipes[norm(d.data().name)] = {
            id: d.id,
            category_id: d.data().category_id
        };
    });

    // 2. Pega todos os Produtos antigos (ID Antigo -> Nome)
    const prodSnap = await getDocsFromServer(collection(db, "Product"));
    const productsMap = {};
    prodSnap.forEach(d => {
        productsMap[d.id] = d.data().name;
    });
    console.log(`- Carregados ${Object.keys(productsMap).length} itens da coleção Product.`);

    // 3. Fake Ghost map from diff8 (Para os que sumiram até do Product)
    const oldGhostIds = {
        'Jj87AaREF6dtHyM9VAYc': 'Rotisseria Feijao Bendito KG',
        'cebIcHnAeytdjhu2zMSe': 'Rotisseria Arroz Branco Bendito KG',
        'A2a59EsZCQZrvdfnHd1X': 'Rotisseria Arroz a Grega Bendito KG',
        'YkC8PIOVjb7qnlG4umuo': 'Rotisseria Macarrao Alho e Oleo Bendito KG',
        'EX8KN1gj8Tllwe5LIxcJ': 'Rotisseria Macarrao ao Sugo Bendito KG',
        'G1srvd4IuXjlVyjFxl0j': 'Rotisseria Couve Flor Empanada Bendito KG',
        'KeKBEaPa4DcUFYFDrLGv': 'Rotisseria Polenta ao Molho Carne Moida Bendito KG',
        '7KpmaqOh0chO1O6DNmmP': 'Rotisseria Batata Assada Bendito KG',
        'xNgjBuy4CeSVvtm8sW9U': 'Rotisseria Bife a Role Bendito KG',
        'qC5PydN8xlngSNqJTIhP': 'Rotisseria Strogonoff de Carne Bendito KG',
        'XM4Pm2eAhNNbBcbkkVJt': 'Rotisseria Lasanha a Bolonhesa Bendito  KG',
        'xCdZqqhgInSq6gGZ5xFl': 'Rotisseria Frango Xadrez Bendito KG',
        'P3McQwWqNtiDSF6qT9Rh': 'Rotisseria Medalhao Frango Bendito KG',
        'Vg2n7r31RmQYvjeStgg3': 'Rotisseria Pure de Batata Bendito KG',
        'Aoad5AIHaLVC40LeJFd9': 'Rotisseria Creme de Milho Bendito KG',
        'WyoM854HivDYEx3TMdtE': 'Rotisseria Legumes Bendito KG',
        '51SWmvzycOLNTeDHyyRZ': 'Rotisseria Abobrinha Gratinada Bendito Kg',
        '6KkPyob9GF7C4zOZd3aq': 'Rotisseria Isca de Frango a Milanesa Bendito KG',
        'mMgLYJ43UCi3k8YBERPx': 'Rotisseria File Sobrecoxa Assada Bendito kg'
    };

    // 4. Lendo o Dump da Semana 8
    const dumpStr = fs.readFileSync('menus_dump.json', 'utf8');
    const dumpData = JSON.parse(dumpStr);
    const sourceWeek = dumpData.find(w => w.week_key === '2026-W8' && w.menu_data);

    let totalItems = 0;
    let foundInProduct = 0;
    let foundInGhost = 0;
    let totallyLost = 0;
    let successfullyMigrated = 0;

    const newMenuData = {};
    const validGroupPrefixes = ['group-'];

    Object.keys(sourceWeek.menu_data).forEach(groupId => {
        if (!validGroupPrefixes.some(prefix => groupId.startsWith(prefix))) return;
        newMenuData[groupId] = {};
        const groupDays = sourceWeek.menu_data[groupId];

        Object.keys(groupDays).forEach(dayNum => {
            if (!/^[0-6]$/.test(dayNum)) return;
            newMenuData[groupId][dayNum] = {};
            const cats = groupDays[dayNum];

            Object.keys(cats).forEach(catId => {
                newMenuData[groupId][dayNum][catId] = [];
                let itemsList = Array.isArray(cats[catId]) ? cats[catId] : [];

                itemsList.forEach(item => {
                    if (item && item.recipe_id) {
                        totalItems++;
                        const oldId = item.recipe_id;
                        let originalName = null;

                        // Tenta achar o nome:
                        if (productsMap[oldId]) {
                            originalName = productsMap[oldId];
                            foundInProduct++;
                        } else if (oldGhostIds[oldId]) {
                            originalName = oldGhostIds[oldId];
                            foundInGhost++;
                        } else {
                            totallyLost++;
                            console.log(`❌ ID 100% Perdido (Nem no Product, nem no log): ${oldId}`);
                        }

                        // Se achou o nome, tenta achar a Ficha Técnica Real
                        if (originalName) {
                            const matchKey = norm(originalName);
                            let match = validRecipes[matchKey];

                            if (!match) {
                                // Fuzzy match
                                const possibleKeys = Object.keys(validRecipes).filter(k => k.includes(matchKey) || matchKey.includes(k));
                                if (possibleKeys.length > 0) match = validRecipes[possibleKeys[0]];
                            }

                            if (match) {
                                successfullyMigrated++;
                                newMenuData[groupId][dayNum][catId].push({
                                    recipe_id: match.id,
                                    locations: item.locations || []
                                });
                            }
                        }
                    }
                });

                if (newMenuData[groupId][dayNum][catId].length === 0) delete newMenuData[groupId][dayNum][catId];
            });
            if (Object.keys(newMenuData[groupId][dayNum]).length === 0) delete newMenuData[groupId][dayNum];
        });
    });

    console.log(`\n📊 DIAGNÓSTICO DO DUMP (Semana 8)`);
    console.log(`   🔸 Total de itens agendados: ${totalItems}`);
    console.log(`   ✅ IDs encontrados na coleção PRODUCT: ${foundInProduct}`);
    console.log(`   ✅ IDs salvos pelo meu Log Fantasma: ${foundInGhost}`);
    console.log(`   🚫 IDs completamente perdidos (irrecuperáveis): ${totallyLost}`);
    console.log(`   -------------------------------------------------`);
    console.log(`   🌟 Destes, convertidos com sucesso para NOVAS RECEITAS: ${successfullyMigrated}`);


    // If it's highly successful, lets inject it to week 10 again!
    if (successfullyMigrated > 50) {
        console.log(`\nInjetando a recuperação mágica na Semana W10 e W09 de novo para garantir...`);
        let finalFlatDays = {};
        const groups = Object.keys(newMenuData);
        let biggestGroup = groups[0];
        let maxItems = 0;
        groups.forEach(g => {
            let count = 0;
            Object.keys(newMenuData[g]).forEach(d => {
                Object.keys(newMenuData[g][d]).forEach(c => { count += newMenuData[g][d][c].length; });
            });
            if (count > maxItems) { maxItems = count; biggestGroup = g; }
        });
        finalFlatDays = biggestGroup ? newMenuData[biggestGroup] : {};

        // Injeta W10
        await setDoc(doc(db, "WeeklyMenu", "2026-W10"), {
            id: "2026-W10", week_key: "2026-W10", menu_data: newMenuData, days: finalFlatDays, updatedAt: serverTimestamp(), createdAt: serverTimestamp(), active: true, user_id: "system-restore", week_start: new Date("2026-03-02T00:00:00.000-03:00")
        });

        // Injeta W09
        await setDoc(doc(db, "WeeklyMenu", "2026-W09"), {
            id: "2026-W09", week_key: "2026-W09", menu_data: newMenuData, days: finalFlatDays, updatedAt: serverTimestamp(), createdAt: serverTimestamp(), active: true, user_id: "system-restore", week_start: new Date("2026-02-23T00:00:00.000-03:00")
        });
    }

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
