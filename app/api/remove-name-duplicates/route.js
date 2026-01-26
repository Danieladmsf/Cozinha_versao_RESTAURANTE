/**
 * API para remover categorias duplicadas por NOME
 * Remove as antigas (sem código) que duplicam as novas
 */

import { CategoryTree } from '../entities';

export async function GET(request) {
    try {
        const all = await CategoryTree.list();

        // Filtrar apenas categorias na aba Produtos (receitas_-_base)
        const produtos = all.filter(c => c.type === 'receitas_-_base');

        // Agrupar por nome (normalizado)
        const byName = {};
        for (const cat of produtos) {
            const key = cat.name?.toUpperCase().trim();
            if (!key) continue;
            if (!byName[key]) {
                byName[key] = [];
            }
            byName[key].push(cat);
        }

        // Encontrar duplicatas e priorizar manter as que têm código
        let deleted = 0;
        const deletedItems = [];

        for (const [name, items] of Object.entries(byName)) {
            if (items.length > 1) {
                // Ordenar: primeiro os com código, depois os sem
                items.sort((a, b) => {
                    if (a.code && !b.code) return -1;
                    if (!a.code && b.code) return 1;
                    return 0;
                });

                // Manter o primeiro (com código), deletar o resto
                for (let i = 1; i < items.length; i++) {
                    try {
                        await CategoryTree.delete(items[i].id);
                        deletedItems.push({
                            name: items[i].name,
                            code: items[i].code || '(sem código)',
                            id: items[i].id
                        });
                        deleted++;
                    } catch (err) {
                        console.error(`Erro ao deletar ${items[i].id}:`, err);
                    }
                }
            }
        }

        return Response.json({
            success: true,
            message: `${deleted} categorias duplicadas removidas`,
            deleted,
            details: deletedItems
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
