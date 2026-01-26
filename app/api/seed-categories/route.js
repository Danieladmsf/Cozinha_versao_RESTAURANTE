/**
 * API Route para criar estrutura mercadológica CORRIGIDA
 * Usa CategoryTree ao invés de Category, com type="produtos"
 * Acesse: /api/seed-categories para executar
 */

import { CategoryTree } from '../entities';

// Estrutura mercadológica baseada nas imagens
const ESTRUTURA_MERCADOLOGICA = [
    {
        code: '003',
        name: 'PROCESSADOS FLV',
        type: 'produtos',
        level: 1,
        order: 1,
        parent_id: null,
        active: true,
        children: [
            {
                code: '003.001',
                name: 'PROCESSADOS',
                level: 2,
                order: 1,
                children: [
                    { code: '003.001.001', name: 'FRUTAS PROCESSADAS', level: 3, order: 1 },
                    { code: '003.001.002', name: 'LEGUMES PROCESSADAS', level: 3, order: 2 },
                    { code: '003.001.003', name: 'BEBIDAS PROCESSADAS', level: 3, order: 3 }
                ]
            }
        ]
    },
    {
        code: '014',
        name: 'PADARIA E INDUSTRIALIZADOS',
        type: 'produtos',
        level: 1,
        order: 2,
        parent_id: null,
        active: true,
        children: [
            {
                code: '014.001',
                name: 'PRODUCAO',
                level: 2,
                order: 1,
                children: [
                    {
                        code: '014.001.001',
                        name: 'PRODUCAO PADARIA',
                        level: 3,
                        order: 1
                        // Subcategorias de nível 4 não são suportadas pelo sistema (máx 3 níveis)
                        // As 14 subcategorias serão criadas diretamente no nível 3
                    }
                ]
            }
        ]
    },
    {
        code: '017',
        name: 'ROTISSERIA',
        type: 'produtos',
        level: 1,
        order: 3,
        parent_id: null,
        active: true,
        children: [
            {
                code: '017.001',
                name: 'PRODUCAO - ROTISSERIA',
                level: 2,
                order: 1,
                children: [
                    { code: '017.001.001', name: 'RESTAURANTE', level: 3, order: 1 },
                    { code: '017.001.002', name: 'REFEICAO', level: 3, order: 2 },
                    { code: '017.001.003', name: 'INSUMOS ROTISSERIA', level: 3, order: 3 },
                    { code: '017.001.004', name: 'ALIMENTOS FAB. PROPRIA', level: 3, order: 4 },
                    { code: '017.001.005', name: 'LANCHONETE', level: 3, order: 5 }
                ]
            }
        ]
    }
];

// Subcategorias extras para PADARIA (nível 3)
const PADARIA_SUBCATEGORIAS = [
    { code: '014.001.002', name: 'BOLOS PRODUCAO', level: 3, order: 2 },
    { code: '014.001.003', name: 'BISCOITO DE POLVILHO', level: 3, order: 3 },
    { code: '014.001.004', name: 'BISCOITOS ARTESANAIS TERC.', level: 3, order: 4 },
    { code: '014.001.005', name: 'DOCES PRODUCAO', level: 3, order: 5 },
    { code: '014.001.006', name: 'BROAS PRODUCAO', level: 3, order: 6 },
    { code: '014.001.007', name: 'SALGADOS PRODUCAO', level: 3, order: 7 },
    { code: '014.001.008', name: 'ROSCAS', level: 3, order: 8 },
    { code: '014.001.009', name: 'TORTAS', level: 3, order: 9 },
    { code: '014.001.010', name: 'TORRADAS PRODUCAO', level: 3, order: 10 },
    { code: '014.001.011', name: 'SANDUICHES E LANCHES', level: 3, order: 11 },
    { code: '014.001.012', name: 'QUEBRA PRODUCAO', level: 3, order: 12 },
    { code: '014.001.013', name: 'MASSA CONG', level: 3, order: 13 },
    { code: '014.001.014', name: 'PAES PRODUCAO', level: 3, order: 14 },
    { code: '014.001.015', name: 'PANETTONE E COLOMBA', level: 3, order: 15 }
];

// Função recursiva para criar categorias
async function createCategories(categories, parentId = null, parentType = 'produtos', results = []) {
    for (const cat of categories) {
        const categoryData = {
            code: cat.code,
            name: cat.name,
            type: cat.type || parentType,
            level: cat.level,
            order: cat.order || 0,
            parent_id: parentId,
            active: cat.active !== false
        };

        try {
            const created = await CategoryTree.create(categoryData);
            results.push({
                code: cat.code,
                name: cat.name,
                level: cat.level,
                id: created.id
            });

            // Se for a categoria PRODUCAO (014.001), adicionar subcategorias extras
            if (cat.code === '014.001') {
                for (const subcat of PADARIA_SUBCATEGORIAS) {
                    const subcatData = {
                        code: subcat.code,
                        name: subcat.name,
                        type: parentType,
                        level: subcat.level,
                        order: subcat.order,
                        parent_id: created.id,
                        active: true
                    };
                    const createdSub = await CategoryTree.create(subcatData);
                    results.push({
                        code: subcat.code,
                        name: subcat.name,
                        level: subcat.level,
                        id: createdSub.id
                    });
                }
            }

            // Criar filhos recursivamente
            if (cat.children && cat.children.length > 0) {
                await createCategories(cat.children, created.id, cat.type || parentType, results);
            }
        } catch (error) {
            results.push({
                code: cat.code,
                name: cat.name,
                error: error.message
            });
        }
    }
    return results;
}

export async function GET(request) {
    try {
        console.log('🔄 Iniciando criação de estrutura mercadológica em CategoryTree...');

        const results = await createCategories(ESTRUTURA_MERCADOLOGICA);

        console.log(`✅ ${results.length} categorias criadas em CategoryTree`);

        return Response.json({
            success: true,
            message: `${results.length} categorias criadas na aba Produtos`,
            categories: results
        });

    } catch (error) {
        console.error('❌ Erro ao criar categorias:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
