/**
 * API para corrigir o type das categorias para "receitas_-_base"
 * (que é o value correto para a aba "Produtos")
 */

import { CategoryTree } from '../entities';

export async function GET(request) {
    try {
        const all = await CategoryTree.list();

        // Filtrar categorias com type errado (produtos)
        const toFix = all.filter(c => c.type === 'produtos');

        let fixed = 0;
        for (const cat of toFix) {
            await CategoryTree.update(cat.id, { type: 'receitas_-_base' });
            fixed++;
        }

        return Response.json({
            success: true,
            message: `${fixed} categorias corrigidas de type='produtos' para type='receitas_-_base'`,
            fixed
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
