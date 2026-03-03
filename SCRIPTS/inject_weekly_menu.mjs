import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import existing initialized Firebase connection
import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';

async function run() {
    try {
        console.log("Fetching recipes, products and customers...");

        const recipesSnapshot = await getDocs(collection(db, 'Recipe'));
        const productsSnapshot = await getDocs(collection(db, 'Product'));
        const customerSnapshot = await getDocs(collection(db, 'Customer'));

        const recipes = recipesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const products = productsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const items = [...recipes, ...products];

        const customers = customerSnapshot.docs.map(d => d.id);

        // Read parsed file
        const filePath = path.join(__dirname, '..', 'public', 'Cardapio_Recuperado.txt');
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        const dayMap = {
            'Domingo:': 0,
            'Segunda:': 1,
            'Terça:': 2,
            'Quarta:': 3,
            'Quinta:': 4,
            'Sexta:': 5,
            'Sábado:': 6
        };

        // Output array for the WeeklyMenu structure
        const menuData = {};
        for (let i = 0; i < 7; i++) menuData[i] = {};

        let currentDayIdx = -1;
        let matchedCount = 0;
        let missedCount = 0;

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            if (dayMap[line] !== undefined) {
                currentDayIdx = dayMap[line];
            } else if (line.startsWith('-')) {
                const rawName = line.substring(1).trim();

                let foundItem = null;

                // 1. Exact match attempt
                foundItem = items.find(i => i.name.toLowerCase() === rawName.toLowerCase());

                // 2. Contains match
                if (!foundItem) {
                    const pureName = rawName.replace('Rotisseria', '').replace('Bendito KG', '').replace('Bendito Kg', '').replace('Bendito kg', '').trim();
                    foundItem = items.find(i => i.name.toLowerCase().includes(pureName.toLowerCase()));
                }

                // 3. Super aggressive match for Refeicao
                if (!foundItem && rawName.toLowerCase().includes('refei')) {
                    foundItem = items.find(i => {
                        const safeItem = i.name.toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                        const safeRaw = rawName.toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                        return safeItem === safeRaw;
                    });

                    if (!foundItem && rawName.includes('Kafta')) {
                        foundItem = items.find(i => i.name.includes('Kafta'));
                    }
                    if (!foundItem && rawName.includes('Pernil ao Molho')) {
                        foundItem = items.find(i => i.name.includes('Pernil') && i.name.includes('Molho'));
                    }
                }

                if (foundItem) {
                    matchedCount++;
                    // Group by category!
                    const catId = foundItem.category_id || foundItem.category;

                    if (catId) {
                        if (!menuData[currentDayIdx][catId]) {
                            menuData[currentDayIdx][catId] = [];
                        }

                        menuData[currentDayIdx][catId].push({
                            recipe_id: foundItem.id,
                            locations: customers // Select all locations by default
                        });
                    } else {
                        console.log("ITEM FOUND BUT HAS NO CATEGORY:", foundItem.name);
                    }
                } else {
                    console.log("NOT FOUND IN FIREBASE:", rawName);
                    missedCount++;
                }
            }
        }

        console.log(`Matched: ${matchedCount}, Missed: ${missedCount}`);

        const weekDate = "2026-02-22T00:00:00.000Z"; // 22/02/2026 is Sunday, the start of Week 9

        // Find existing doc or create
        const q = query(collection(db, 'WeeklyMenu'), where('week_start', '==', weekDate));
        const snap = await getDocs(q);

        let docId = snap.empty ? `menu_${Date.now()}` : snap.docs[0].id;
        const docRef = doc(db, 'WeeklyMenu', docId);

        let existingData = snap.empty ? {} : snap.docs[0].data();

        console.log("Found existing WeeklyMenu doc?", !snap.empty);

        // Get the active main tab group
        const confSnap = await getDocs(collection(db, 'MenuConfig'));
        const config = confSnap.docs[0]?.data();
        const mainMealType = config?.category_groups?.[0]?.id || 'default';

        console.log("Using Main Tab Group ID:", mainMealType);

        // The structure needs to be merge-friendly. We overwrite existingData.menu_data[mainMealType]
        if (!existingData.menu_data) existingData.menu_data = {};
        if (!existingData.menu_data[mainMealType]) existingData.menu_data[mainMealType] = {};

        for (let i = 0; i < 7; i++) {
            if (!existingData.menu_data[mainMealType][i]) existingData.menu_data[mainMealType][i] = {};

            Object.keys(menuData[i]).forEach(catId => {
                existingData.menu_data[mainMealType][i][catId] = menuData[i][catId];
            });
        }

        await setDoc(docRef, {
            ...existingData,
            week_start: weekDate,
            updatedAt: new Date().toISOString(),
            createdAt: existingData.createdAt || new Date().toISOString()
        }, { merge: true });

        console.log(`WeeklyMenu populated successfully for Week 9 (Starting 2026-02-22)!`);
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
