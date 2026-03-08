import { NextResponse } from 'next/server';
import { Product } from '@/app/api/entities';
import { WeeklyMenu as WeeklyMenuEntity } from '@/app/api/entities';

export async function GET(request) {
    try {
        const weeklyMenus = await WeeklyMenuEntity.getAll();
        const products = await Product.getAll();
        const parmId = products.find(p => (p.code || '') === '7673')?.id;
        const parmName = products.find(p => (p.code || '') === '7673')?.name;

        const results = {};

        for (const menu of weeklyMenus) {
            const weekKey = menu.week_key;
            const foundIn = [];

            // Search ALL mealTypes, ALL days for this product
            for (const [mealType, days] of Object.entries(menu.menu_data || {})) {
                if (mealType.startsWith('_')) continue;
                for (const [dayIdx, categories] of Object.entries(days || {})) {
                    for (const [catId, items] of Object.entries(categories || {})) {
                        if (!Array.isArray(items)) continue;
                        items.forEach(item => {
                            if (item.recipe_id === parmId) {
                                const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
                                foundIn.push({
                                    dayIndex: dayIdx,
                                    dayName: dayNames[dayIdx] || dayIdx,
                                    mealType: mealType.substring(0, 30),
                                    categoryId: catId
                                });
                            }
                        });
                    }
                }
            }

            results[weekKey] = foundIn.length > 0 ? foundIn : 'NOT_FOUND';
        }

        return NextResponse.json({
            success: true,
            searchingFor: { id: parmId, name: parmName, code: '7673' },
            parmegiana_in_menus: results
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message });
    }
}
