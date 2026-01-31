import { useCallback } from 'react';

export const useMenuHelpers = () => {
  const getActiveCategories = useCallback((categories, menuConfig) => {
    if (!categories || !menuConfig) return [];

    // Primeiro filtro: categorias principais selecionadas
    let filteredCategories = categories;
    // Se a configuração de tipos principais estiver definida (array), respeitar estritamente
    if (menuConfig.selected_main_categories && Array.isArray(menuConfig.selected_main_categories)) {
      if (menuConfig.selected_main_categories.length > 0) {
        filteredCategories = categories.filter(category => {
          return menuConfig.selected_main_categories.includes(category.type);
        });
      } else {
        // Array vazio: Usuário desmarcou tudo explicitamente -> Nenhuma categoria
        filteredCategories = [];
      }
    }

    // Filtrar apenas categorias de nível 1 (raiz)
    filteredCategories = filteredCategories.filter(category => category.level === 1);

    // Segundo filtro: categorias ativas
    // IMPORTANTE: Se active_categories não estiver definido para uma categoria, assume ATIVO (true) por padrão
    const activeCategories = filteredCategories.filter(category => {
      // Se não existir active_categories ou a categoria não estiver definida, assume ativa
      if (!menuConfig.active_categories || menuConfig.active_categories[category.id] === undefined) {
        return true;
      }
      return menuConfig.active_categories[category.id] === true;
    });

    // Aplicar ordem personalizada se existir
    if (menuConfig.category_order && menuConfig.category_order.length > 0) {
      return menuConfig.category_order
        .map(id => activeCategories.find(cat => cat.id === id))
        .filter(Boolean);
    }

    return activeCategories;
  }, []);

  const getCategoryColor = useCallback((categoryId, categories, menuConfig) => {
    const category = categories?.find(c => c.id === categoryId);
    const configColor = menuConfig?.category_colors?.[categoryId];
    const categoryColor = category?.color;
    return configColor || categoryColor || '#6B7280';
  }, []);

  // Função auxiliar para obter todos os nomes de subcategorias recursivamente
  const getDescendantCategoryNames = useCallback((categoryName, categories) => {
    if (!categories || categories.length === 0) return [];

    // Encontrar a categoria pelo nome
    const parentCategory = categories.find(c => c.name === categoryName);
    if (!parentCategory) return [];

    // Buscar filhos diretos
    const children = categories.filter(c => c.parent_id === parentCategory.id);
    let names = children.map(c => c.name);

    // Buscar descendentes recursivamente
    children.forEach(child => {
      const childDescendants = getDescendantCategoryNamesById(child.id, categories);
      names = [...names, ...childDescendants];
    });

    return names;
  }, []);

  // Função auxiliar para buscar descendentes por ID
  const getDescendantCategoryNamesById = (categoryId, categories) => {
    const children = categories.filter(c => c.parent_id === categoryId);
    let names = children.map(c => c.name);

    children.forEach(child => {
      names = [...names, ...getDescendantCategoryNamesById(child.id, categories)];
    });

    return names;
  };

  const filterRecipesBySearch = useCallback((recipes, categoryName, searchTerm, categories = []) => {
    if (!Array.isArray(recipes) || recipes.length === 0) {
      return [];
    }

    // Função para normalizar texto (remover acentos e caracteres especiais)
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
    };

    // Mapeamento de nomes de categorias do sistema para categorias das receitas
    const categoryMapping = {
      'Acompanhamento': 'Acompanhamento',
      'Sobremesas': 'Sobremesas',
      'Padrão': ['Padrão', 'Bhkm4hqX8a8NgALgm7fq']
    };

    // Determinar qual categoria de receita buscar
    let targetRecipeCategories = [categoryName];

    // Se temos categorias, buscar todas as subcategorias também
    if (categories && categories.length > 0) {
      const descendantNames = getDescendantCategoryNames(categoryName, categories);
      targetRecipeCategories = [categoryName, ...descendantNames];
    }

    // Aplicar mapeamento de categorias se existir
    if (categoryMapping[categoryName]) {
      const mapped = categoryMapping[categoryName];
      if (Array.isArray(mapped)) {
        targetRecipeCategories = [...targetRecipeCategories, ...mapped];
      } else {
        targetRecipeCategories.push(mapped);
      }
    }

    // Remover duplicatas
    targetRecipeCategories = [...new Set(targetRecipeCategories)];

    const availableRecipes = recipes.filter(r => {
      const isActive = r?.active !== false;
      const matchesCategory = targetRecipeCategories.includes(r?.category);
      return isActive && matchesCategory;
    });

    // Se não há termo de busca, retorna todas as receitas da categoria ordenadas alfabeticamente
    if (!searchTerm || searchTerm.trim() === '') {
      return availableRecipes.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }

    const normalizedSearchTerm = normalizeText(searchTerm);

    const filteredRecipes = availableRecipes.filter(recipe => {
      if (!recipe.name) return false;

      const normalizedRecipeName = normalizeText(recipe.name);

      if (!normalizedSearchTerm.includes(' ')) {
        return normalizedRecipeName.includes(normalizedSearchTerm);
      }

      const searchWords = normalizedSearchTerm.split(/\s+/).filter(word => word.length > 0);

      return searchWords.some(word =>
        normalizedRecipeName.includes(word)
      );
    });

    return filteredRecipes.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, []);

  const ensureMinimumItems = useCallback((categoryItems, fixedDropdowns) => {
    const items = [...categoryItems];
    while (items.length < fixedDropdowns) {
      items.push({
        recipe_id: null,
        locations: []
      });
    }
    return items;
  }, []);

  const generateCategoryStyles = useCallback((categoryColor) => {
    const lighterColor = `${categoryColor}22`;
    const darkColor = `${categoryColor}99`;

    const styles = {
      headerStyle: {
        background: `linear-gradient(135deg, ${darkColor} 0%, ${lighterColor} 100%)`,
        borderBottom: `2px solid ${categoryColor}`
      },
      buttonStyle: {
        borderColor: `${categoryColor}40`,
        color: categoryColor
      }
    };

    return styles;
  }, []);

  return {
    getActiveCategories,
    getCategoryColor,
    filterRecipesBySearch,
    ensureMinimumItems,
    generateCategoryStyles
  };
};