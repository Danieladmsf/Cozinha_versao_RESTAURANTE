// test-shelf-life.js
// Mocking the calculateShelfLifeAverage function to test Day 6 logic.

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

    return { samples, jsTargetDay };
}

const mockEvents = {
    // A Saturday
    '2026-02-14': { '10': 5, '14': 2 },
    // A Sunday
    '2026-02-15': { '09': 10 },
    // Another Saturday
    '2026-02-21': { '11': 4 }
};

console.log("Testing day 6 (Saturday)");
console.log(calculateShelfLifeAverage(mockEvents, 6, 2, 'all_day'));
console.log("Testing day 0 (Sunday)");
console.log(calculateShelfLifeAverage(mockEvents, 0, 1, 'all_day'));

