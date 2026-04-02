import { useState, useCallback, useEffect } from 'react';

/**
 * Hook para gerenciar a ordem das categorias dentro dos blocos
 * Permite arrastar categorias no menu lateral e aplicar nos cards de empresa
 */

const STORAGE_KEY = 'print-preview-category-order-v2';

export function useCategoryOrder() {
  // Estado da ordem das categorias - inicia vazio para herdar a ordem real dos dados
  // (que já vêm ordenados pela Configuração Global do Cardápio)
  const [categoryOrder, setCategoryOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      return [];
    } catch (error) {
      return [];
    }
  });

  // Estado para drag-and-drop de categorias
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState(null);

  // Salvar ordem no localStorage quando mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categoryOrder));
    } catch (error) {
      // Silenciar erro
    }
  }, [categoryOrder]);

  // Handlers de drag-and-drop para categorias
  const handleCategoryDragStart = useCallback((e, index) => {
    setDraggedCategoryIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'category'); // Identificar como categoria
    e.stopPropagation();
  }, []);

  const handleCategoryDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // Importante para evitar interferência
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleCategoryDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedCategoryIndex === null || draggedCategoryIndex === dropIndex) {
      setDraggedCategoryIndex(null);
      return;
    }

    // Reordenar categorias
    const newOrder = [...categoryOrder];
    const [draggedCategory] = newOrder.splice(draggedCategoryIndex, 1);
    newOrder.splice(dropIndex, 0, draggedCategory);

    setCategoryOrder(newOrder);
    setDraggedCategoryIndex(null);
  }, [draggedCategoryIndex, categoryOrder]);

  const handleCategoryDragEnd = useCallback((e) => {
    if (e) e.stopPropagation();
    setDraggedCategoryIndex(null);
  }, []);

  // Limpar ordem salva para restaurar da configuração global
  const resetCategoryOrder = useCallback(() => {
    setCategoryOrder([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Sincronizar categoryOrder com as categorias reais dos blocos
  const syncWithBlocks = useCallback((blocks) => {
    if (!Array.isArray(blocks)) return;

    // Extrair todas as categorias reais dos blocos
    const realCategories = new Set();
    blocks.forEach(block => {
      if (block.type === 'empresa' && block.items) {
        Object.keys(block.items).forEach(cat => {
          realCategories.add(cat);
        });
      }
    });

    if (realCategories.size === 0) return;

    setCategoryOrder(prev => {
      // Manter categorias que ainda existem nos blocos (preservar ordem do usuário)
      const kept = prev.filter(cat => realCategories.has(cat));

      // Adicionar categorias novas que não estão na ordem atual
      const newCats = [];
      realCategories.forEach(cat => {
        if (!kept.includes(cat)) {
          newCats.push(cat);
        }
      });

      const merged = [...kept, ...newCats];

      // Só atualizar se realmente mudou
      if (merged.length === prev.length && merged.every((c, i) => c === prev[i])) {
        return prev;
      }

      console.log('🔄 [useCategoryOrder] Sincronizando com blocos:', { anterior: prev, novo: merged });
      return merged;
    });
  }, []);

  // Aplicar ordem das categorias a um objeto de items
  const applyCategoryOrder = useCallback((items) => {
    if (!items || typeof items !== 'object') return items;

    const orderedItems = {};

    // Primeiro, adicionar categorias na ordem definida
    categoryOrder.forEach(category => {
      // Normalizar nome da categoria para comparação
      const normalizedCategory = category.toUpperCase();

      // Procurar a categoria nos items (case-insensitive)
      const matchingKey = Object.keys(items).find(
        key => key.toUpperCase() === normalizedCategory
      );

      if (matchingKey && items[matchingKey]) {
        orderedItems[matchingKey] = items[matchingKey];
      }
    });

    // Adicionar categorias que não estão na ordem (novas/desconhecidas)
    Object.keys(items).forEach(key => {
      if (!orderedItems[key]) {
        orderedItems[key] = items[key];
      }
    });

    return orderedItems;
  }, [categoryOrder]);

  // Aplicar ordem das categorias a todos os blocos
  const applyOrderToBlocks = useCallback((blocks) => {
    if (!Array.isArray(blocks)) return blocks;

    return blocks.map(block => {
      if (block.type === 'empresa' && block.items) {
        return {
          ...block,
          items: applyCategoryOrder(block.items)
        };
      }
      return block;
    });
  }, [applyCategoryOrder]);

  // Extrair categorias únicas dos blocos
  const extractCategoriesFromBlocks = useCallback((blocks) => {
    const categories = new Set();

    if (!Array.isArray(blocks)) return [];

    blocks.forEach(block => {
      if (block.type === 'empresa' && block.items) {
        Object.keys(block.items).forEach(category => {
          categories.add(category.toUpperCase());
        });
      }
    });

    // Ordenar de acordo com categoryOrder
    const sortedCategories = [];
    categoryOrder.forEach(cat => {
      if (categories.has(cat)) {
        sortedCategories.push(cat);
      }
    });

    // Adicionar categorias não listadas
    categories.forEach(cat => {
      if (!sortedCategories.includes(cat)) {
        sortedCategories.push(cat);
      }
    });

    return sortedCategories;
  }, [categoryOrder]);

  // Extrair ordem dos clientes (empresas) a partir da ordem dos blocos
  const extractCustomerOrderFromBlocks = useCallback((blocks) => {
    if (!Array.isArray(blocks)) return [];

    // Pegar apenas blocos tipo 'empresa' na ordem atual
    return blocks
      .filter(block => block.type === 'empresa')
      .map(block => block.title);
  }, []);

  // Aplicar ordem dos clientes aos blocos consolidados
  const applyCustomerOrderToConsolidatedBlocks = useCallback((blocks) => {
    if (!Array.isArray(blocks)) return blocks;

    // Extrair ordem dos clientes dos blocos empresa
    const customerOrder = extractCustomerOrderFromBlocks(blocks);

    if (customerOrder.length === 0) return blocks;

    return blocks.map(block => {
      // Aplicar apenas em blocos consolidados
      if ((block.type === 'detailed-section' || block.type === 'embalagem-category') && block.items) {
        const newItems = block.items.map(recipe => {
          if (!recipe.clientes || !Array.isArray(recipe.clientes)) {
            return recipe;
          }

          // Reordenar clientes de acordo com a ordem dos blocos empresa
          const sortedClientes = [...recipe.clientes].sort((a, b) => {
            const indexA = customerOrder.indexOf(a.customer_name);
            const indexB = customerOrder.indexOf(b.customer_name);

            // Se não encontrar na lista, colocar no final
            const posA = indexA === -1 ? 9999 : indexA;
            const posB = indexB === -1 ? 9999 : indexB;

            return posA - posB;
          });

          return {
            ...recipe,
            clientes: sortedClientes
          };
        });

        return {
          ...block,
          items: newItems
        };
      }

      return block;
    });
  }, [extractCustomerOrderFromBlocks]);

  return {
    // Estado
    categoryOrder,
    draggedCategoryIndex,

    // Handlers de drag-and-drop
    handleCategoryDragStart,
    handleCategoryDragOver,
    handleCategoryDrop,
    handleCategoryDragEnd,

    // Funções de manipulação
    setCategoryOrder,
    resetCategoryOrder,
    syncWithBlocks,
    applyCategoryOrder,
    applyOrderToBlocks,
    extractCategoriesFromBlocks,
    extractCustomerOrderFromBlocks,
    applyCustomerOrderToConsolidatedBlocks
  };
}
