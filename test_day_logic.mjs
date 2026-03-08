// No imports// Simulate the frontend logic for 05/03/2026
const orders = [
    { day_of_week: "5", customer_name: "Test 1" }, // from DB
    { day_of_week: 5, customer_name: "Test 2" },
    { day_of_week: "4", customer_name: "Test 3" },
];

const selectedDay = 4; // Thursday index in JS is 4 (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu)

console.log("=== EXACT FILTER LOGIC ===");
console.log(`selectedDay: ${selectedDay}`);

const dayOrders1 = orders.filter(o => Number(o.day_of_week) === Number(selectedDay));
console.log(`Original Logic (=== Number(selectedDay)): Found ${dayOrders1.length} orders`);

const dayOrders2 = orders.filter(o => Number(o.day_of_week) === (Number(selectedDay) + 1));
console.log(`New Logic (=== Number(selectedDay) + 1): Found ${dayOrders2.length} orders`);

// Another place might use just `selectedDay` vs `Number(selectedDay)`
const dayOrders3 = orders.filter(o => o.day_of_week === (selectedDay + 1));
console.log(`Other Tabs Logic (=== selectedDay + 1): Found ${dayOrders3.length} orders`);

console.log("\nType Analysis:");
orders.forEach(o => {
    console.log(`Order day_of_week: ${o.day_of_week} (${typeof o.day_of_week}), selectedDay+1: ${selectedDay + 1} (${typeof (selectedDay + 1)})`);
    console.log(`Match? ${o.day_of_week === (selectedDay + 1)}`);
});
