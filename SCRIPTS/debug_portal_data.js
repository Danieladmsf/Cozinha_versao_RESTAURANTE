
import { Customer, WeeklyMenu } from '../app/api/entities.js';

(async () => {
    try {
        console.log('Searching for "Descontão"...');
        const customers = await Customer.list();
        const targetCustomer = customers.find(c => c.name && c.name.toLowerCase().includes('descontão'));

        if (targetCustomer) {
            console.log('✅ Found Customer:', {
                id: targetCustomer.id,
                name: targetCustomer.name,
                pending_registration: targetCustomer.pending_registration
            });
        } else {
            console.log('❌ Customer "Descontão" not found.');
            console.log('Available customers:', customers.map(c => c.name).slice(0, 5));
        }

        console.log('\nFetching Weekly Menus...');
        const menus = await WeeklyMenu.list();
        console.log(`Found ${menus.length} menus.`);

        // Sort by recent first (assuming created_at or just inspecting list order)
        const recentMenus = menus.slice(0, 5);

        recentMenus.forEach(m => {
            console.log('\n--------------------------------');
            console.log(`Menu ID: ${m.id}`);
            console.log(`Week Key: ${m.week_key}`);
            if (m.menu_data) {
                const days = Object.keys(m.menu_data);
                console.log(`Days with data: ${days.join(', ')}`);
                // Check keys of the first day to see structure
                if (days.length > 0) {
                    const firstDay = days[0];
                    const cleanFirstDay = m.menu_data[firstDay];
                    const categories = Object.keys(cleanFirstDay);
                    console.log(`Categories in Day ${firstDay}: ${categories.join(', ')}`);
                }
            } else {
                console.log('No menu_data present.');
            }
        });

    } catch (error) {
        console.error('Error executing script:', error);
    }
})();
