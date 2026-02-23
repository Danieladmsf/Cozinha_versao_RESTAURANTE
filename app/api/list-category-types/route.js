/**
 * API para listar CategoryTypes
 */

import { CategoryType } from '../entities';

export async function GET(request) {
    try {
        const types = await CategoryType.list();
        return Response.json({
            total: types.length,
            types: types.map(t => ({
                id: t.id,
                value: t.value,
                label: t.label,
                order: t.order
            }))
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
