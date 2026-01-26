/**
 * API para recriar estrutura mercadológica COMPLETA
 * Primeiro limpa as categorias existentes (type=receitas_-_base com código 003/014/017)
 * Depois cria a estrutura hierárquica com parent_id correto
 */

import { CategoryTree } from '../entities';

// Estrutura mercadológica baseada nas imagens
const ESTRUTURA = {
    "003": {
        name: "PROCESSADOS FLV",
        children: {
            "001": {
                name: "PROCESSADOS",
                children: {
                    "001": { name: "FRUTAS PROCESSADAS" },
                    "002": { name: "LEGUMES PROCESSADAS" },
                    "003": { name: "BEBIDAS PROCESSADAS" }
                }
            }
        }
    },
    "014": {
        name: "PADARIA E INDUSTRIALIZADOS",
        children: {
            "001": {
                name: "PRODUCAO",
                children: {
                    "001": { name: "PRODUCAO PADARIA" },
                    "002": { name: "BOLOS PRODUCAO" },
                    "003": { name: "BISCOITO DE POLVILHO" },
                    "004": { name: "BISCOITOS ARTESANAIS TERC." },
                    "005": { name: "DOCES PRODUCAO" },
                    "006": { name: "BROAS PRODUCAO" },
                    "007": { name: "SALGADOS PRODUCAO" },
                    "008": { name: "ROSCAS" },
                    "009": { name: "TORTAS" },
                    "010": { name: "TORRADAS PRODUCAO" },
                    "011": { name: "SANDUICHES E LANCHES" },
                    "012": { name: "QUEBRA PRODUCAO" },
                    "013": { name: "MASSA CONG" },
                    "014": { name: "PAES PRODUCAO" },
                    "015": { name: "PANETTONE E COLOMBA" }
                }
            }
        }
    },
    "017": {
        name: "ROTISSERIA",
        children: {
            "001": {
                name: "PRODUCAO - ROTISSERIA",
                children: {
                    "001": { name: "RESTAURANTE" },
                    "002": { name: "REFEICAO" },
                    "003": { name: "INSUMOS ROTISSERIA" },
                    "004": { name: "ALIMENTOS FAB. PROPRIA" },
                    "005": { name: "LANCHONETE" }
                }
            }
        }
    }
};

const TYPE = "receitas_-_base"; // Valor correto para aba "Produtos"

export async function GET(request) {
    try {
        const results = [];

        // 1. Primeiro, deletar categorias existentes que começam com 003, 014, 017
        const all = await CategoryTree.list();
        const toDelete = all.filter(c =>
            c.code && (c.code.startsWith('003') || c.code.startsWith('014') || c.code.startsWith('017'))
        );

        for (const cat of toDelete) {
            await CategoryTree.delete(cat.id);
        }
        results.push({ action: 'deleted', count: toDelete.length });

        // 2. Criar estrutura hierárquica
        let order = 1;

        for (const [mainCode, mainCat] of Object.entries(ESTRUTURA)) {
            // Criar categoria principal (nível 1)
            const level1 = await CategoryTree.create({
                code: mainCode,
                name: mainCat.name,
                type: TYPE,
                level: 1,
                order: order++,
                parent_id: null,
                active: true
            });
            results.push({ level: 1, code: mainCode, name: mainCat.name, id: level1.id });

            // Criar subcategorias (nível 2)
            if (mainCat.children) {
                let subOrder = 1;
                for (const [subCode, subCat] of Object.entries(mainCat.children)) {
                    const fullSubCode = `${mainCode}.${subCode}`;
                    const level2 = await CategoryTree.create({
                        code: fullSubCode,
                        name: subCat.name,
                        type: TYPE,
                        level: 2,
                        order: subOrder++,
                        parent_id: level1.id,
                        active: true
                    });
                    results.push({ level: 2, code: fullSubCode, name: subCat.name, id: level2.id, parent: level1.id });

                    // Criar sub-subcategorias (nível 3)
                    if (subCat.children) {
                        let itemOrder = 1;
                        for (const [itemCode, itemCat] of Object.entries(subCat.children)) {
                            const fullItemCode = `${fullSubCode}.${itemCode}`;
                            const level3 = await CategoryTree.create({
                                code: fullItemCode,
                                name: itemCat.name,
                                type: TYPE,
                                level: 3,
                                order: itemOrder++,
                                parent_id: level2.id,
                                active: true
                            });
                            results.push({ level: 3, code: fullItemCode, name: itemCat.name, id: level3.id, parent: level2.id });
                        }
                    }
                }
            }
        }

        return Response.json({
            success: true,
            message: `Estrutura recriada: ${results.length - 1} categorias criadas`,
            results
        });

    } catch (error) {
        console.error('Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
