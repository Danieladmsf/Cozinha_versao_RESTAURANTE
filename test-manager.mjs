import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simple polyfill for the manager logic
function average(arr) { if (arr.length === 0) return 0; return arr.reduce((a, b) => a + b) / arr.length; }

function calculateShelfLifeAverage(eventsByDate, targetDayOfWeek, shelfLife, salesWindow) {
    if (!eventsByDate) return { average: 0, confidence: 0, method: 'no_data', samples_count: 0 };

    const allDates = Object.keys(eventsByDate).sort();
    if (allDates.length === 0) return { average: 0, confidence: 0, method: 'no_data', samples_count: 0 };

    const samples = [];
    const jsTargetDay = targetDayOfWeek % 7;

    allDates.forEach(anchorDateStr => {
        const anchorDate = new Date(anchorDateStr + 'T12:00:00');
        if (anchorDate.getDay() === jsTargetDay) {
            let batchTotal = 0;
            let itemsSoldInBatch = 0;

            for (let i = 0; i < shelfLife; i++) {
                const currentDate = new Date(anchorDate);
                currentDate.setDate(anchorDate.getDate() + i);
                const currentDateStr = currentDate.toISOString().split('T')[0];

                const dayEvents = eventsByDate[currentDateStr];
                if (dayEvents) {
                    itemsSoldInBatch++;
                    if (i === shelfLife - 1 && salesWindow && salesWindow !== 'all_day') {
                        let startHour = 0;
                        let endHour = 24;

                        if (salesWindow.includes('-')) {
                            const parts = salesWindow.split('-');
                            startHour = parseInt(parts[0].split(':')[0], 10) || 0;
                            endHour = parseInt(parts[1].split(':')[0], 10) || 24;
                        } else {
                            endHour = parseInt(salesWindow.split(':')[0], 10);
                        }

                        if (!isNaN(endHour)) {
                            Object.keys(dayEvents).forEach(hourStr => {
                                const hour = parseInt(hourStr, 10);
                                if (hour >= startHour && hour <= endHour) {
                                    batchTotal += dayEvents[hourStr];
                                }
                            });
                            continue;
                        }
                    }

                    Object.values(dayEvents).forEach(qty => {
                        batchTotal += qty;
                    });
                }
            }

            if (itemsSoldInBatch > 0) {
                samples.push(batchTotal);
            }
        }
    });

    if (samples.length === 0) {
        return { average: 0, confidence: 0, method: 'no_matching_days', samples_count: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const trimCount = Math.floor(samples.length * 0.1);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

    let avg = trimmed.length > 0 ? average(trimmed) : average(samples);

    return {
        average: avg,
        confidence: samples.length >= 3 ? 0.9 : 0.6,
        method: 'shelf_life_window',
        samples_count: samples.length,
        explain: `Tamanho do lote: ${shelfLife}d. Soma filtrada até ${salesWindow} na conta de ${samples.length} blocos passados`
    };
}

async function run() {
    try {
        const targetNamesMap = {
            7875: { name: "Strogonoff Frango UN (Vazio)", expected: "empty", shelf_life: 1, category: "(ALMOÇO)", salesWindow: "08:00-14:00" },
            1734: { name: "Kafta UN (Vazio)", expected: "empty", shelf_life: 1, category: "(ALMOÇO)", salesWindow: "08:00-14:00" },
            8480: { name: "Macarronada Bolonhesa (Cheio)", expected: "filled", shelf_life: 1, category: "(ALMOÇO)", salesWindow: "08:00-14:00" },
            8326: { name: "Macarrao Cheddar (Vazio)", expected: "empty", shelf_life: 1, category: "M", salesWindow: "all_day" },
            8028: { name: "Arroz Branco (Cheio)", expected: "filled", shelf_life: 1, category: "M", salesWindow: "all_day" },
            8328: { name: "Feijao (Cheio)", expected: "filled", shelf_life: 1, category: "M", salesWindow: "08:00-14:00" },
            8279: { name: "Couve Flor Empanada (Vazio)", expected: "empty", shelf_life: 1, category: "M", salesWindow: "all_day" },
            8089: { name: "Batata Assada (Vazio)", expected: "empty", shelf_life: 1, category: "M", salesWindow: "all_day" },
            8381: { name: "Frango Xadrez (Cheio)", expected: "filled", shelf_life: 1, category: "M", salesWindow: "all_day" },
            8837: { name: "Strogonoff Frango KG (Vazio)", expected: "empty", shelf_life: 1, category: "M", salesWindow: "all_day" },
            8416: { name: "Linguica Assada (Cheio)", expected: "filled", shelf_life: 1, category: "M", salesWindow: "all_day" },
            8400: { name: "Lasanha Bolonhesa (Cheio)", expected: "filled", shelf_life: 3, category: "(TARDE)", salesWindow: "08:00-14:00" },
            8308: { name: "Escondidinho Frango (Vazio)", expected: "empty", shelf_life: 5, category: "(TARDE)", salesWindow: "all_day" },
            6960: { name: "Nhoque Sugo (Cheio)", expected: "filled", shelf_life: 3, category: "(TARDE)", salesWindow: "08:00-14:00" },
            8663: { name: "Rondele Frango (Vazio)", expected: "empty", shelf_life: 3, category: "(TARDE)", salesWindow: "all_day" }
        };

        const productIdsToScan = Object.keys(targetNamesMap);

        const BATCH_SIZE = 10;
        let allSales = [];
        for (let i = 0; i < productIdsToScan.length; i += BATCH_SIZE) {
            const batch = productIdsToScan.slice(i, i + BATCH_SIZE);
            if (batch.length === 0) continue;

            const salesRef = query(collection(db, 'sales_history'), where('productId', 'in', batch));
            const snapshot = await getDocs(salesRef);
            let sampleStoreId = null;
            snapshot.forEach(doc => {
                const data = doc.data();
                allSales.push(data);
                if (!sampleStoreId) sampleStoreId = data.storeId || data.store_id;
            });
            if (sampleStoreId) console.log("Sample store ID from DB:", sampleStoreId, typeof sampleStoreId);

        }

        // Mapped sales events structure
        const mappedSales = {};
        allSales.forEach(doc => {
            if (!mappedSales[doc.productId]) { mappedSales[doc.productId] = { events: {} }; }
            const hourlyQty = {};
            if (Array.isArray(doc.events)) {
                doc.events.forEach(e => {
                    if (e && e.hour !== undefined && e.qty !== undefined) {
                        hourlyQty[String(e.hour)] = e.qty;
                    }
                });
            } else if (doc.total_quantity !== undefined) {
                hourlyQty["12"] = doc.total_quantity;
            }
            mappedSales[doc.productId].events[doc.date] = hourlyQty;
        });

        const dayOfWeek = 4; // Thursday

        const results = [];
        productIdsToScan.forEach(productId => {
            const meta = targetNamesMap[productId];
            const codeInfo = mappedSales[productId];

            if (codeInfo && Object.keys(codeInfo.events).length > 0) {
                let shelfLife = parseInt(meta.shelf_life || 1, 10);
                const salesWindow = meta.salesWindow || 'all_day';

                // Override like in OrderSuggestionManager.js
                if (meta.category && meta.category.toUpperCase().includes('(ALMOÇO)')) {
                    shelfLife = 1;
                }

                const smartStats = calculateShelfLifeAverage(codeInfo.events, dayOfWeek, shelfLife, salesWindow);
                results.push({
                    id: productId,
                    name: meta.name,
                    avg: smartStats.average,
                    conf: smartStats.confidence,
                    samples: smartStats.samples_count,
                    method: smartStats.method,
                    explain: smartStats.explain
                });
            } else {
                results.push({
                    id: productId,
                    name: meta.name,
                    avg: 0,
                    conf: 0,
                    samples: 0,
                    method: 'no_sales_data',
                    explain: ''
                });
            }
        });

        console.table(results);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
