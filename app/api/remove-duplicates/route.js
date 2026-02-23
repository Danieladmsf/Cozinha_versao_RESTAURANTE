/**
 * API para remover categorias duplicadas
 * Mantém apenas a primeira ocorrência de cada código
 */

import { CategoryTree } from '../entities';

export async function GET(request) {
    try {
        const all = await CategoryTree.list();

        // Agrupar por código
        const byCode = {};
        for (const cat of all) {
            const code = cat.code || cat.name; // Usar code ou name como chave
            if (!byCode[code]) {
                byCode[code] = [];
            }
            byCode[code].push(cat);
        }

        // Encontrar duplicatas e deletar
        let deleted = 0;
        const deletedItems = [];

        for (const [code, items] of Object.entries(byCode)) {
            if (items.length > 1) {
                // Manter o primeiro, deletar o resto
                for (let i = 1; i < items.length; i++) {
                    try {
                        await CategoryTree.delete(items[i].id);
                        deletedItems.push({
                            code: items[i].code,
                            name: items[i].name,
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
