import { useState, useCallback } from 'react';
import { CategoryTree } from '@/app/api/entities';

/**
 * Hook para gerenciar as funções exclusivas do SmartCategorySelector e sua árvore agrupada.
 */
export function useRecipeCategorization({
    recipeData,
    selectedFilterCategories,
    handleCategoryChange,
    setCategorySelectorOpen
}) {
    const [groupedCategories, setGroupedCategories] = useState([]);
    const [allCategories, setAllCategories] = useState([]);

    const loadCategoriesTree = useCallback(async (currentFilters = []) => {
        console.log("🧪 [DEBUG] loadCategoriesTree: Running Type-based Grouping with Custom Format (v2)");
        try {
            const data = await CategoryTree.list();
            setAllCategories(data); // Populate allCategories for the filter menu

            // Filtrar categorias baseado nos CategoryTypes selecionados nas configurações
            // Se não houver seleção, mostrar todas. Se houver, filtrar pelo 'type' da categoria
            let recipeCats = data.filter(cat => cat.active !== false);

            if (currentFilters && currentFilters.length > 0) {
                recipeCats = recipeCats.filter(cat => currentFilters.includes(cat.type));
            }

            const roots = recipeCats
                .filter(c => c.level === 1)
                .sort((a, b) => (a.order || 0) - (b.order || 0));

            // 1. Agrupar Roots por Tipo
            const rootsByType = {};
            roots.forEach(root => {
                const type = root.type || 'receitas';
                if (!rootsByType[type]) rootsByType[type] = [];
                rootsByType[type].push(root);
            });

            // 2. Definir Ordem e Labels dos Tipos
            const orderedTypes = ['produtos', 'receitas', 'ingredientes', 'contas'];
            const typeLabels = {
                'produtos': 'PRODUTOS',
                'receitas': 'RECEITAS',
                'ingredientes': 'INGREDIENTES',
                'contas': 'CONTAS'
            };

            const presentTypes = Object.keys(rootsByType);

            const sortedTypes = [
                ...orderedTypes.filter(t => presentTypes.includes(t)),
                ...presentTypes.filter(t => !orderedTypes.includes(t))
            ];

            // 3. Criar Grupos (Type as Header -> Flattened Hierarchy as Items)
            const groups = sortedTypes.map(type => {
                const typeRoots = rootsByType[type];
                const typeLabel = typeLabels[type] || type.toUpperCase();

                let typeItems = [];

                // Helper to flatten descendants
                const buildDescendants = (cats, parentId, prefix) => {
                    let list = [];
                    const children = cats
                        .filter(c => c.parent_id === parentId)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));

                    for (const child of children) {
                        // Label Format: PREFIX > CHILD
                        // (Prefix already contains "TYPE | ROOT")
                        const label = `${prefix} > ${child.name}`;

                        list.push({
                            value: child.id,
                            label: label,
                            originalName: child.name,
                            id: child.id
                        });
                        list = [...list, ...buildDescendants(cats, child.id, label)];
                    }
                    return list;
                };

                typeRoots.forEach(root => {
                    // Base Label: TYPE | ROOT
                    // User Requirement: "PRODUTOS | PRODUTOS > MACARRÃO" or "RECEITAS | PRATOS QUENTES"
                    const rootLabel = `${typeLabel} | ${root.name}`;

                    // Add Root Item
                    typeItems.push({
                        value: root.id,
                        label: rootLabel,
                        originalName: root.name,
                        id: root.id,
                        isRoot: true
                    });

                    // Add Descendants
                    typeItems.push(...buildDescendants(recipeCats, root.id, rootLabel));
                });

                return {
                    groupName: typeLabel,
                    items: typeItems
                };
            });

            setGroupedCategories(groups);

        } catch (error) {
            console.error("Erro ao carregar árvore de categorias", error);
        }
    }, []);

    const getSelectedCategoryLabel = useCallback(() => {
        if (!recipeData.category) return "Selecione a categoria";
        const found = groupedCategories.flatMap(g => g.items).find(c => c.originalName === recipeData.category);
        return found ? found.label : recipeData.category;
    }, [recipeData.category, groupedCategories]);

    const handleSmartCategorySelect = useCallback((originalName) => {
        handleCategoryChange(originalName);
        setCategorySelectorOpen(false);
    }, [handleCategoryChange, setCategorySelectorOpen]);

    return {
        allCategories,
        groupedCategories,
        loadCategoriesTree,
        getSelectedCategoryLabel,
        handleSmartCategorySelect
    };
}
