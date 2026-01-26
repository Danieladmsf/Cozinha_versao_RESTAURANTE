/**
 * API para listar TODAS categorias de Produtos com detalhes
 */

import { CategoryTree } from '../entities';

export async function GET(request) {
    try {
        const all = await CategoryTree.list();
        const produtos = all.filter(c => c.type === 'receitas_-_base' && c.level === 1);

        return Response.json({
            total: produtos.length,
            categories: produtos.map(c => ({
                id: c.id,
                name: c.name,
                code: c.code || '(sem código)',
                level: c.level
            })).sort((a, b) => a.name.localeCompare(b.name))
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
