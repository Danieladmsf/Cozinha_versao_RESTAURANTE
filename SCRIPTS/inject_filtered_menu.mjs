import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    try {
        console.log("Fetching recipes and products...");
        const recipesSnapshot = await getDocs(collection(db, 'Recipe'));
        const productsSnapshot = await getDocs(collection(db, 'Product'));
        const customerSnapshot = await getDocs(collection(db, 'Customer'));

        const recipes = recipesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const products = productsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const customers = customerSnapshot.docs.map(d => d.id);

        // ===== SEPARAR ITENS EM DOIS GRUPOS BLINDADOS =====
        const allItems = [...recipes, ...products];
        const refeicaoItems = allItems.filter(i => {
            const n = i.name.toLowerCase();
            return n.includes('refeicao') || n.includes('refeição');
        });
        const normalItems = allItems.filter(i => {
            const n = i.name.toLowerCase();
            return !n.includes('refeicao') && !n.includes('refeição');
        });

        console.log(`Refeições no banco: ${refeicaoItems.length}`);
        console.log(`Itens normais no banco: ${normalItems.length}`);

        // UI Category Bucket IDs
        const MARMITA = "iK5k9sU5JwTNq4bXbx8q";
        const MACARRAO = "9PNVdAlz11zrp9wbcrFP";
        const ARROZ = "5DZfjeRbthB9M61rFRBz";
        const FEIJAO = "mA2f1y8BAUVSePKCcWBz";
        const GUARNICAO = "48oBEp6CJ1Rnb5H30Ekd";
        const PROTEINAS = "rk84ZnLG98NHUTtVFrsC";
        const MASSAS = "4ejQXrpLX6uB9jVcSIHR";
        const SALADAS = "3iVU8Nnm8hsHrx87ySeE";
        const MOLHOS = "4YVodckUHVLA1OWeS4rj";
        const PATES = "4UPuSfNW88qWmbrekG9y";
        const CARNES_ASSADAS = "qjtXmabkTGnu0D5VGnLA";

        // Helper to clean DB names from "008480 - " prefixes
        const clean = (name) => name.toLowerCase().replace(/^\d+\s*-\s*/, '').trim();

        // Router for NORMAL items (nunca refeição!)
        function getBucketForNormal(name) {
            const n = name.toLowerCase();
            if (n.includes('macarrao') || n.includes('macarronada') || n.includes('yakissoba')) return MACARRAO;
            if (n.includes('arroz')) return ARROZ;
            if (n.includes('feijao') || n.includes('feijoada')) return FEIJAO;
            if (n.includes('lasanha') || n.includes('nhoque') || n.includes('escondidinho') || n.includes('rondele') || n.includes('panqueca') || n.includes('polenta') || n.includes('canelone')) return MASSAS;
            if (n.includes('pate') || n.includes('patê')) return PATES;
            if (n.includes('molho') || n.includes('geleia') || n.includes('pesto')) return MOLHOS;
            if (n.includes('maionese') || n.includes('caponata') || n.includes('salada') || n.includes('tabule') || n.includes('sunomono')) return SALADAS;
            if (n.includes('batata assada') || n.includes('banana') || n.includes('creme de milho') || n.includes('pure de batata') || n.includes('purê') ||
                n.includes('couve flor') || n.includes('farofa') || n.includes('jilo') || n.includes('legumes') ||
                n.includes('berinjela') || n.includes('abobrinha') || n.includes('couve refogada') || n.includes('ervilha')) {
                return GUARNICAO;
            }
            if (n.includes('cupim') || n.includes('maminha') || n.includes('costelinha') || n.includes('joelho') || n.includes('frango inteiro') || n.includes('frango metade')) return CARNES_ASSADAS;
            // Fallback: proteinas
            return PROTEINAS;
        }

        // Find normal item by fuzzy name
        function findNormalItem(searchText) {
            const raw = searchText.toLowerCase();
            // 1. Exact match (cleaning prefixes)
            let found = normalItems.find(i => clean(i.name) === raw);
            if (found) return found;

            // 2. Partial match (strip rotisseria/bendito)
            const pureName = raw.replace('rotisseria ', '').replace(' bendito kg', '').replace(' bendito', '').trim();
            found = normalItems.find(i => clean(i.name).includes(pureName));
            if (found) return found;

            // 3. Even more aggressive - strip "rot " etc
            const agg = pureName.replace('rot ', '').replace('rot.', '').trim();
            found = normalItems.find(i => clean(i.name).includes(agg));
            return found || null;
        }

        // Find refeição by fuzzy name
        function findRefeicaoItem(searchText) {
            const raw = searchText.toLowerCase();
            // 1. Exact
            let found = refeicaoItems.find(i => i.name.toLowerCase() === raw);
            if (found) return found;

            // 2. Normalized comparison (strip accents and special chars)
            const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
            const rawNorm = normalize(raw);
            found = refeicaoItems.find(i => normalize(i.name.toLowerCase()) === rawNorm);
            if (found) return found;

            // 3. Keyword-based match for hard cases
            if (raw.includes('kafta')) found = refeicaoItems.find(i => i.name.toLowerCase().includes('kafta'));
            if (!found && raw.includes('pernil')) found = refeicaoItems.find(i => i.name.toLowerCase().includes('pernil'));
            if (!found && raw.includes('linguiça') || raw.includes('linguica')) found = refeicaoItems.find(i => i.name.toLowerCase().includes('lingui'));
            if (!found && raw.includes('sobre-coxa') || raw.includes('sobrecoxa')) found = refeicaoItems.find(i => i.name.toLowerCase().includes('sobre'));
            if (!found && raw.includes('tirinha')) found = refeicaoItems.find(i => i.name.toLowerCase().includes('tirinha'));
            if (!found && raw.includes('isca') && raw.includes('acebolada')) found = refeicaoItems.find(i => i.name.toLowerCase().includes('acebolada'));

            return found || null;
        }

        // ===== PARSE FILE =====
        const filePath = path.join(__dirname, '..', 'public', 'Cardapio_Recuperado.txt');
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        const dayMap = {
            'Domingo:': 0, 'Segunda:': 1, 'Terça:': 2, 'Quarta:': 3,
            'Quinta:': 4, 'Sexta:': 5, 'Sábado:': 6
        };

        // Initialize menu_data with empty arrays per category per day
        const menuData = {};
        const allBuckets = [MARMITA, MACARRAO, ARROZ, FEIJAO, GUARNICAO, PROTEINAS, MASSAS, SALADAS, MOLHOS, PATES, CARNES_ASSADAS];
        for (let i = 0; i < 7; i++) {
            menuData[i] = {};
            allBuckets.forEach(b => { menuData[i][b] = []; });
        }

        let currentDayIdx = -1;
        let matched = 0, missed = 0;

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            if (dayMap[line] !== undefined) {
                currentDayIdx = dayMap[line];
                continue;
            }

            if (!line.startsWith('-') || currentDayIdx === -1) continue;

            const rawName = line.substring(1).trim();
            const isRefeicao = rawName.toLowerCase().includes('refeicao') || rawName.toLowerCase().includes('refeição');

            let foundItem = null;
            let bucket = null;

            if (isRefeicao) {
                // ===== REFEIÇÃO: busca SOMENTE entre Refeições, vai SEMPRE pra MARMITA =====
                foundItem = findRefeicaoItem(rawName);
                bucket = MARMITA;
            } else {
                // ===== NORMAL: busca SOMENTE entre itens normais, NUNCA cai em marmita =====
                foundItem = findNormalItem(rawName);
                if (foundItem) {
                    bucket = getBucketForNormal(foundItem.name);
                }
            }

            if (foundItem && bucket) {
                menuData[currentDayIdx][bucket].push({
                    recipe_id: foundItem.id,
                    locations: customers
                });
                matched++;
            } else {
                console.log(`❌ NÃO ENCONTRADO: "${rawName}" (${isRefeicao ? 'REFEIÇÃO' : 'NORMAL'})`);
                missed++;
            }
        }

        console.log(`\n✅ Matched: ${matched} | ❌ Missed: ${missed}`);

        // Log summary per day
        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        for (let i = 0; i < 7; i++) {
            const marmitaCount = menuData[i][MARMITA].length;
            const totalCount = allBuckets.reduce((sum, b) => sum + menuData[i][b].length, 0);
            console.log(`  ${dayNames[i]}: ${totalCount} total (Marmita: ${marmitaCount})`);
        }

        // ===== SAVE TO FIREBASE =====
        console.log("\nSalvando no Firebase...");
        const mainMealType = "group-x3lLCsradGvncKDNXgEF-1769948050195";
        const now = new Date().toISOString();

        const fullDoc = {
            user_id: 'mock-user-id',
            week_key: '2026-W9',
            week_start: new Date('2026-02-23T03:00:00.000Z'),
            menu_data: { [mainMealType]: menuData },
            createdAt: now,
            updatedAt: now
        };

        const docRef = doc(collection(db, 'WeeklyMenu'));
        await setDoc(docRef, fullDoc);
        console.log("Doc ID:", docRef.id);
        console.log("🎉 WeeklyMenu injetado com sucesso!");
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
