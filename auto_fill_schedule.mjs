
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer, setDoc, doc, serverTimestamp } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Reconstruindo Programação do Cardápio (Semana 2026-W10) via Script...");

    const dumpStr = fs.readFileSync('menus_dump.json', 'utf8');
    const dumpData = JSON.parse(dumpStr);
    const targetWeekKey = "2026-W10";

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

    console.log(`- Carregadas ${Object.keys(validRecipes).length} receitas atuais do banco.`);

    let idToNameMap = {};
    if (fs.existsSync('diff8.txt')) {
        const diffStr = fs.readFileSync('diff8.txt', 'utf8');
        const lines = diffStr.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('id:')) {
                const idMatch = lines[i].match(/id:\s*['"]([^'"]+)['"]/);
                if (idMatch && idMatch[1]) {
                    const id = idMatch[1];
                    let name = "Desconhecido";
                    for (let j = Math.max(0, i - 15); j < Math.min(lines.length, i + 15); j++) {
                        if (lines[j].includes('name:')) {
                            const nameMatch = lines[j].match(/name:\s*['"]([^'"]+)['"]/);
                            if (nameMatch && nameMatch[1]) { name = nameMatch[1]; break; }
                        } else if (lines[j].includes('"name":')) {
                            const nameMatch = lines[j].match(/"name":\s*['"]([^'"]+)['"]/);
                            if (nameMatch && nameMatch[1]) { name = nameMatch[1]; break; }
                        }
                    }
                    if (name !== 'Desconhecido') idToNameMap[id] = name;
                }
            }
        }
    }

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

    const sourceWeek = dumpData.find(w => w.week_key === '2026-W8' && w.menu_data);
    if (!sourceWeek) {
        console.log("❌ Semana de Dump 2026-W8 não encontrada.");
        process.exit(1);
    }

    const newMenuData = {};
    let matchedCount = 0;
    let missedCount = 0;

    Object.keys(sourceWeek.menu_data).forEach(groupId => {
        newMenuData[groupId] = {};

        // Ensure dayNum iteration skips anything that isn't an object mapping
        const groupDays = sourceWeek.menu_data[groupId];
        if (!groupDays || typeof groupDays !== 'object') return;

        Object.keys(groupDays).forEach(dayNum => {
            newMenuData[groupId][dayNum] = {};
            const cats = groupDays[dayNum];

            if (!cats || typeof cats !== 'object') return;

            Object.keys(cats).forEach(catId => {
                newMenuData[groupId][dayNum][catId] = [];

                let itemsList = [];
                if (Array.isArray(cats[catId])) {
                    itemsList = cats[catId];
                } else if (cats[catId] && typeof cats[catId] === 'object') {
                    itemsList = Object.values(cats[catId]);
                }

                itemsList.forEach(item => {
                    if (item && item.recipe_id) {
                        const oldId = item.recipe_id;
                        const originalName = idToNameMap[oldId] || oldGhostIds[oldId];

                        if (originalName) {
                            const matchKey = norm(originalName);
                            let match = validRecipes[matchKey];

                            // Fuzzy fallback:
                            if (!match) {
                                const possibleKeys = Object.keys(validRecipes).filter(k => k.includes(matchKey) || matchKey.includes(k));
                                if (possibleKeys.length > 0) {
                                    match = validRecipes[possibleKeys[0]];
                                }
                            }

                            if (match) {
                                newMenuData[groupId][dayNum][catId].push({
                                    recipe_id: match.id,
                                    locations: item.locations || []
                                });
                                matchedCount++;
                            } else {
                                missedCount++;
                            }
                        } else {
                            missedCount++;
                        }
                    }
                });
            });
        });
    });

    console.log(`\n✅ Resumo do Mapeamento:`);
    console.log(`   - Encontrados Novos IDs Compatíveis: ${matchedCount}`);
    console.log(`   - Não Mapeados (Nomes Perdidios/Nenhuma Ficha Real Mapeada): ${missedCount}`);

    const weekId = targetWeekKey;
    const menuRef = doc(db, "WeeklyMenu", weekId);

    const ws = new Date();
    ws.setDate(ws.getDate() - ws.getDay() + 1);
    ws.setHours(0, 0, 0, 0);

    // Salvando os dias achatados pro fallback do App
    const flatDays = newMenuData['group-2R8RbsGcor7voWuG8ouI-1771271583966'] || newMenuData['group-x3lLCsradGvncKDNXgEF-1769948050195'] || {};

    // Se o flatDays estiver vazio, pegamos a primeira chave disponivel no menu_data
    let finalDays = flatDays;
    if (Object.keys(finalDays).length === 0) {
        const firstGroup = Object.keys(newMenuData)[0];
        if (firstGroup) {
            finalDays = newMenuData[firstGroup];
        }
    }

    await setDoc(menuRef, {
        id: weekId,
        week_key: targetWeekKey,
        menu_data: newMenuData,
        days: finalDays,
        active: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        user_id: "system-restore",
        week_start: ws
    }, { merge: true });

    console.log(`\n🚀 Cardápio Restaurado injetado no Firebase (Semana ${targetWeekKey})!`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
