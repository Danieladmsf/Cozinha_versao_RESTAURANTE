/**
 * API para listar categorias de produtos
 */

import { CategoryTree } from '../entities';

export async function GET(request) {
    try {
        const all = await CategoryTree.list();
        const produtos = all.filter(c => c.type === 'produtos');

        return Response.json({
            total: produtos.length,
            categories: produtos.map(c => ({
                id: c.id,
                code: c.code,
                name: c.name,
                level: c.level,
                order: c.order
            })).sort((a, b) => (a.order || 0) - (b.order || 0))
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
