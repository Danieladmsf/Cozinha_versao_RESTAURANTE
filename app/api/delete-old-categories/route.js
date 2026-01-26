/**
 * API para deletar categorias antigas sem código
 */

import { CategoryTree } from '../entities';

export async function GET(request) {
    try {
        const all = await CategoryTree.list();

        // Filtrar categorias sem código na aba Produtos
        const toDelete = all.filter(c =>
            c.type === 'receitas_-_base' &&
            (!c.code || c.code === '')
        );

        let deleted = 0;
        const deletedItems = [];

        for (const cat of toDelete) {
            try {
                await CategoryTree.delete(cat.id);
                deletedItems.push({ name: cat.name, id: cat.id });
                deleted++;
            } catch (err) {
                console.error(`Erro ao deletar ${cat.id}:`, err);
            }
        }

        return Response.json({
            success: true,
            message: `${deleted} categorias antigas (sem código) removidas`,
            deleted,
            details: deletedItems
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
