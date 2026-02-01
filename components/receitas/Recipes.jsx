'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Recipe, Ingredient, Category, CategoryTree, CategoryType, MenuConfig } from "@/app/api/entities";
import { Button } from "@/components/ui/button";
import {
  Card,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Trash,
  MoreVertical,
  Eye,
  EyeOff,
  Pencil,
  Printer,
  Settings
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast"
import RecipeSimplePrintDialog from "@/components/receitas/RecipeSimplePrintDialog";
import BulkRecipeCreator from "@/components/receitas/BulkRecipeCreator";
import RecipeSettingsDialog from "@/components/receitas/RecipeSettingsDialog";
import { APP_CONSTANTS } from "@/lib/constants";

export default function Recipes() {
  const router = useRouter();
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const [activeType, setActiveType] = useState("receitas");
  const [categoryTypes, setCategoryTypes] = useState([]);

  const [viewMode, setViewMode] = useState("grid");
  const [recipeCategories, setRecipeCategories] = useState([]);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [recipeToPrint, setRecipeToPrint] = useState(null);

  const [isPrintRecipeDialogOpen, setIsPrintRecipeDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // State for config
  const [visibleTypes, setVisibleTypes] = useState({});

  // State for subcategory logic
  const [fullCategoryTree, setFullCategoryTree] = useState([]);
  const [activeSubCategory, setActiveSubCategory] = useState(null);

  useEffect(() => {
    loadRecipes();
    loadIngredients();
    loadCategoryTypes();
    loadVisibilitySettings();
  }, []);

  // Reload categories when activeType changes
  useEffect(() => {
    loadRecipeCategories();
    // Reset active category when type switches
    setActiveCategory("all");
    setActiveSubCategory(null);
  }, [activeType, fullCategoryTree]);

  const loadCategoryTypes = async () => {
    try {
      const types = await CategoryType.list();
      setCategoryTypes(types.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (error) {
      console.error("Error loading category types:", error);
    }
  };

  const loadVisibilitySettings = async () => {
    try {
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      const configs = await MenuConfig.query([
        { field: 'user_id', operator: '==', value: mockUserId },
        { field: 'is_default', operator: '==', value: true }
      ]);

      if (configs && configs.length > 0 && configs[0].recipe_visible_types) {
        setVisibleTypes(configs[0].recipe_visible_types);
      } else {
        // Default: Show only 'receitas' and 'receitas_-_base' if no config
        setVisibleTypes({
          'receitas': true,
          'receitas_-_base': true
        });
      }
    } catch (e) {
      console.error("Failed to load visibility settings", e);
    }
  };

  // Filter types based on configuration
  const visibleCategoryTypes = categoryTypes.filter(type => {
    if (Object.keys(visibleTypes).length > 0) {
      return visibleTypes[type.value] === true;
    }
    // Fallback if config loading or empty:
    return ['receitas', 'receitas_-_base'].includes(type.value);
  });

  const loadRecipeCategories = async () => {
    try {
      let allCategories = fullCategoryTree;
      if (allCategories.length === 0) {
        allCategories = await CategoryTree.list();
        setFullCategoryTree(allCategories);
      }

      const recipeCategories = allCategories
        .filter(cat => cat.type === activeType && cat.active !== false && cat.level === 1)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      if (recipeCategories.length > 0) {
        const formattedCategories = recipeCategories.map(cat => ({
          id: cat.id, name: cat.name, label: cat.name, value: cat.name,
        }));
        setRecipeCategories(formattedCategories);
        return;
      }

      // Fallback logic could go here if needed
      setRecipeCategories([]);
    } catch (error) {
      console.error("Error loading recipe categories", error);
    }
  };

  const loadRecipes = async () => {
    try {
      const recipesData = await Recipe.list();
      setRecipes(recipesData);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar receitas.",
        variant: "destructive"
      });
    }
  };

  const loadIngredients = async () => {
    try {
      const ingredientsData = await Ingredient.list();
      setIngredients(ingredientsData);
    } catch (error) {
      // Silent error
    }
  };

  const handleDelete = async (recipe) => {
    if (window.confirm(`Tem certeza que deseja excluir a receita "${recipe.name}"?`)) {
      try {
        await Recipe.delete(recipe.id);
        await loadRecipes();
        toast({
          title: "Receita excluída",
          description: `A receita "${recipe.name}" foi excluída com sucesso.`,
        });
      } catch (error) {
        toast({
          title: "Erro ao excluir",
          description: `Erro ao excluir a receita "${recipe.name}": ${error.message}`,
          variant: "destructive"
        });
      }
    }
  };

  const handleToggleActive = async (recipe) => {
    try {
      await Recipe.update(recipe.id, {
        ...recipe,
        active: !recipe.active
      });
      loadRecipes();
    } catch (error) {
      console.error("Error toggling active status", error);
    }
  };

  const deleteCategory = async (categoryName) => {
    if (!categoryName) return;

    if (window.confirm(`Tem certeza que deseja excluir a categoria "${categoryName}"?`)) {
      try {
        // Find in tree first
        const treeCat = fullCategoryTree.find(c => c.name === categoryName && c.level === 1);
        if (treeCat) {
          await CategoryTree.delete(treeCat.id);
          loadRecipeCategories();
          toast({ title: "Categoria excluída" });
          return;
        }

        // Fallback to Category legacy
        const allCategories = await Category.list();
        const categoryToDelete = allCategories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
        if (categoryToDelete) {
          await Category.delete(categoryToDelete.id);
          loadRecipeCategories();
          toast({ title: "Categoria excluída" });
        }
      } catch (e) {
        toast({ title: "Erro ao excluir categoria", variant: "destructive" });
      }
    }
  };

  // Helper to find root category type
  // Agora usa category_id da receita (se disponível) para busca direta
  const getRootCategoryType = (categoryName, categoryId = null) => {
    // Busca por ID primeiro (mais confiável)
    if (categoryId) {
      const catById = fullCategoryTree.find(c => c.id === categoryId);
      if (catById) {
        // Traverse up to find root type
        let node = catById;
        const visited = new Set();
        while (node && node.parent_id && !visited.has(node.id)) {
          visited.add(node.id);
          const parent = fullCategoryTree.find(c => c.id === node.parent_id);
          if (parent) node = parent;
          else break;
        }
        return node?.type || 'receitas';
      }
    }

    // Fallback: busca por nome
    if (!categoryName) return 'receitas';

    let node = fullCategoryTree.find(c => c.name === categoryName);
    if (!node) {
      return 'receitas';
    }

    // Traverse up
    const visited = new Set();
    while (node && node.parent_id && !visited.has(node.id)) {
      visited.add(node.id);
      const parent = fullCategoryTree.find(c => c.id === node.parent_id);
      if (parent) node = parent;
      else break;
    }

    return node ? (node.type || 'receitas') : 'receitas';
  };

  // Helper to get all descendant names
  const getDescendantNames = (categoryId) => {
    const children = fullCategoryTree.filter(c => c.parent_id === categoryId);
    let names = children.map(c => c.name);

    children.forEach(child => {
      names = [...names, ...getDescendantNames(child.id)];
    });

    return names;
  };

  const getFilteredRecipes = () => {
    let filtered = recipes;

    // IMPORTANT: If searching, we search across ALL types and categories.
    // If NOT searching, we filter by activeType.
    if (!searchTerm) {
      filtered = filtered.filter(recipe => {
        const type = getRootCategoryType(recipe.category, recipe.category_id);
        return type === activeType;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(recipe =>
        (recipe.name && recipe.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (recipe.code && recipe.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (recipe.category && recipe.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      // When searching, we skip category filtering to show all matches
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      return filtered;
    }

    if (activeCategory !== "all") {
      //...
      let targetNames = [activeCategory];
      let targetCategoryIds = [];

      if (activeSubCategory) {
        targetNames = [activeSubCategory.name];
        targetCategoryIds = [activeSubCategory.id];
      } else {
        const rootCat = fullCategoryTree.find(c => c.name === activeCategory && c.level === 1);
        if (rootCat) {
          targetCategoryIds = [rootCat.id];
        }
      }

      targetCategoryIds.forEach(id => {
        const descendants = getDescendantNames(id);
        targetNames = [...targetNames, ...descendants];
      });

      filtered = filtered.filter(recipe => targetNames.includes(recipe.category));
    }

    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  };

  const filteredRecipes = getFilteredRecipes();

  // Logic to determine badges to show
  let visibleBadgesParentId = null;
  const rootCatForBadges = fullCategoryTree.find(c => c.name === activeCategory && c.level === 1);
  if (rootCatForBadges) {
    visibleBadgesParentId = rootCatForBadges.id;
  }

  const subCategoriesToShow = visibleBadgesParentId
    ? fullCategoryTree.filter(c => c.parent_id === visibleBadgesParentId).sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];

  const handleSubCategoryClick = (cat) => {
    if (activeSubCategory?.id === cat.id) {
      setActiveSubCategory(null);
    } else {
      setActiveSubCategory(cat);
    }
  };

  const handlePrintSimpleRecipe = (recipe) => {
    setRecipeToPrint(recipe);
    setIsPrintRecipeDialogOpen(true);
  };

  const handleEdit = useCallback((recipeData) => {
    router.push(`/ficha-tecnica?id=${recipeData.id}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="p-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"
          >
            <div>
              <h1 className="text-2xl font-bold">Receitas</h1>
              <p className="text-gray-500">Gerencie suas receitas e custos</p>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar receitas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex gap-2">
                <BulkRecipeCreator
                  onSuccess={loadRecipes}
                />
              </div>
            </div>
          </motion.div>

          <div className="mb-6 space-y-4">

            {/* Header com Configuração */}
            <div className="flex justify-between items-center mb-2">
              {visibleCategoryTypes.length > 0 && (
                <Tabs value={activeType} onValueChange={setActiveType} className="w-full max-w-3xl">
                  <TabsList className="bg-gray-100 p-1 flex-wrap h-auto">
                    {visibleCategoryTypes.map(type => (
                      <TabsTrigger
                        key={type.id}
                        value={type.value}
                        className="min-w-[100px]"
                      >
                        {type.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsSettingsOpen(true)}
                title="Configurar Abas"
                className="ml-2"
              >
                <Settings className="h-4 w-4 text-gray-600" />
              </Button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="w-full justify-start border-b border-orange-200 bg-transparent p-0 h-auto space-x-1 flex-wrap">
                  <TabsTrigger
                    value="all"
                    className="rounded-t-lg border-t border-x border-b-0 border-transparent px-4 py-2 data-[state=active]:bg-orange-50 data-[state=active]:border-orange-200 data-[state=active]:text-orange-700 data-[state=active]:shadow-none relative -mb-[1px]"
                  >
                    Todas
                  </TabsTrigger>
                  {recipeCategories
                    .map(category => (
                      <TabsTrigger
                        key={category.id}
                        value={category.name}
                        className="rounded-t-lg border-t border-x border-b-0 border-transparent px-4 py-2 relative group data-[state=active]:bg-orange-50 data-[state=active]:border-orange-200 data-[state=active]:text-orange-700 data-[state=active]:shadow-none -mb-[1px]"
                      >
                        {category.name === "prato_principal" ? "Prato Principal" :
                          category.name === "entrada" ? "Entrada" :
                            category.name === "sobremesa" ? "Sobremesa" : category.name}

                        <span
                          className="ml-2 p-0.5 rounded-full hover:bg-red-100 text-gray-300 hover:text-red-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCategory(category.name);
                          }}
                          title="Excluir categoria"
                        >
                          <Trash className="h-3 w-3" />
                        </span>
                      </TabsTrigger>
                    ))}
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-4">
                <div className="flex border rounded-md">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("rounded-r-none", viewMode === "grid" && "bg-gray-100")}
                    onClick={() => setViewMode("grid")}
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                      <path d="M6 2H2V6H6V2ZM13 2H9V6H13V2ZM6 9H2V13H6V9ZM13 9H9V13H13V9Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("rounded-l-none", viewMode === "list" && "bg-gray-100")}
                    onClick={() => setViewMode("list")}
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                      <path d="M2 3.5C2 3.22386 2.22386 3 2.5 3H12.5C12.7761 3 13 3.22386 13 3.5C13 3.77614 12.7761 4 12.5 4H2.5C2.22386 4 2 3.77614 2 3.5ZM2 7.5C2 7.22386 2.22386 7 2.5 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H2.5C2.22386 8 2 7.77614 2 7.5ZM2 11.5C2 11.2239 2.22386 11 2.5 11H12.5C12.7761 11 13 11.2239 13 11.5C13 11.7761 12.7761 12 12.5 12H2.5C2.22386 12 2 11.7761 2 11.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                  </Button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {subCategoriesToShow.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-orange-50 border-x border-b border-orange-200 rounded-b-lg p-4 flex flex-wrap gap-2 -mt-4 pt-6 z-0 relative"
                >
                  {subCategoriesToShow.map(cat => (
                    <Badge
                      key={cat.id}
                      variant="outline"
                      className={cn(
                        "cursor-pointer px-3 py-1.5 text-sm transition-all shadow-sm border",
                        activeSubCategory?.id === cat.id
                          ? "bg-amber-600 text-white border-amber-700 hover:bg-amber-700"
                          : "bg-white text-orange-900 border-orange-200 hover:bg-white hover:border-orange-300 hover:shadow-md"
                      )}
                      onClick={() => handleSubCategoryClick(cat)}
                    >
                      {cat.name}
                    </Badge>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={cn(
            "gap-4",
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col space-y-4"
          )}>
            {filteredRecipes.map((recipe) => {
              return (
                <motion.div
                  key={recipe.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="hover:shadow-md transition-all duration-200">
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col flex-1 mr-2">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-base">
                              {recipe.code && <span className="text-gray-500 text-sm font-mono mr-2">#{recipe.code}</span>}
                              {recipe.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={recipe.active ? "secondary" : "secondary"} className={cn("text-[10px] px-1.5 py-0", recipe.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                              {recipe.active ? "Ativo" : "Inativo"}
                            </Badge>
                            <span className="text-xs text-gray-500 capitalize">
                              {recipe.category}
                            </span>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleEdit(recipe)}
                              className="flex items-center cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handlePrintSimpleRecipe(recipe)}
                              className="flex items-center cursor-pointer"
                            >
                              <Printer className="mr-2 h-4 w-4" />
                              Imprimir Receita
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleToggleActive(recipe)}
                              className="flex items-center cursor-pointer"
                            >
                              {recipe.active ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Marcar como Inativo
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Marcar como Ativo
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleDelete(recipe)}
                              className="flex items-center text-red-600 focus:text-red-600 cursor-pointer"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <RecipeSimplePrintDialog
        isOpen={isPrintRecipeDialogOpen}
        onClose={() => setIsPrintRecipeDialogOpen(false)}
        recipe={recipeToPrint}
        preparations={recipeToPrint?.preparations || []}
      />

      <RecipeSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(newSettings) => setVisibleTypes(newSettings)}
      />
    </div>
  );
}
