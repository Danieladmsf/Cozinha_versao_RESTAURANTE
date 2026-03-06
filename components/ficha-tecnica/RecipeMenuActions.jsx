import React from 'react';
import { Search, Loader2, CookingPot, Plus, Printer, ClipboardCheck, ClipboardList, FilePlus, Save, Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Componente de Menu e Ações Laterais da Receita.
 * Contém os submenus de busca de receitas, filtros por categoria, configuração 
 * e os botões de ação e gravação.
 */
export function RecipeMenuActions({
    isCategorySettingsOpen,
    setIsCategorySettingsOpen,
    categoryTypes,
    selectedFilterCategories,
    setSelectedFilterCategories,
    activeCategoryFilter,
    setActiveCategoryFilter,
    updateConfig,
    saveConfiguration,
    selectedCategoryType,
    configLoading,
    searchQueryRecipe,
    handleSearchChange,
    handleSearchFocusRecipe,
    handleSearchBlurRecipe,
    searchOpenRecipe,
    searchLoading,
    typeFilteredRecipes,
    highlightMatch,
    handleRecipeSelect,
    handleRecipeSelection,
    setIsPrintDialogOpen,
    setIsPrintCollectDialogOpen,
    setIsPrintSimpleDialogOpen,
    handleClearRecipe,
    handleSaveRecipe,
    saving
}) {

    return (
        <Card className="bg-white shadow-sm border h-full flex flex-col">
            <CardHeader className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium text-gray-700">Menu</CardTitle>

                <Popover open={isCategorySettingsOpen} onOpenChange={setIsCategorySettingsOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-4" align="end">
                        <div className="space-y-4">
                            <h4 className="font-medium text-sm text-gray-900 border-b pb-2">Configurar Filtros</h4>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {categoryTypes
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                    .map(catType => (
                                        <div key={catType.id || catType.value} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`filter-${catType.value}`}
                                                checked={selectedFilterCategories.includes(catType.value)}
                                                onCheckedChange={(checked) => {
                                                    let newCategories = [];
                                                    if (checked) {
                                                        newCategories = [...selectedFilterCategories, catType.value];
                                                    } else {
                                                        newCategories = selectedFilterCategories.filter(v => v !== catType.value);
                                                        if (activeCategoryFilter === catType.value) setActiveCategoryFilter('all');
                                                    }

                                                    setSelectedFilterCategories(newCategories);

                                                    // Atualizar config e salvar (passando newCategories diretamente)
                                                    updateConfig('filter_categories', newCategories);
                                                    saveConfiguration(selectedCategoryType, newCategories);
                                                }}
                                            />
                                            <label
                                                htmlFor={`filter-${catType.value}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {catType.label}
                                            </label>
                                        </div>
                                    ))
                                }
                                {categoryTypes.length === 0 && (
                                    <p className="text-xs text-gray-500">Nenhuma categoria encontrada.</p>
                                )}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </CardHeader>

            <CardContent className="p-4 space-y-3 flex-1">
                {/* Barra de Busca e Filtros */}
                <div className="relative search-container flex flex-col gap-2">

                    {/* ABAS FIXAS: Todos / Receitas / Produtos */}
                    <div className="flex gap-1 overflow-x-auto py-1 px-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent mb-1">
                        <Badge
                            variant={activeCategoryFilter === 'all' ? "default" : "outline"}
                            className={cn(
                                "cursor-pointer whitespace-nowrap px-3 py-1 text-xs",
                                activeCategoryFilter === 'all'
                                    ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
                                    : "hover:bg-gray-100"
                            )}
                            onClick={() => {
                                console.log('🟢 [CLICK] Filtro: all');
                                setActiveCategoryFilter('all');
                            }}
                        >
                            Todos
                        </Badge>
                        <Badge
                            variant={activeCategoryFilter === 'receitas' ? "default" : "outline"}
                            className={cn(
                                "cursor-pointer whitespace-nowrap px-3 py-1 text-xs",
                                activeCategoryFilter === 'receitas'
                                    ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                                    : "hover:bg-gray-100 text-gray-600"
                            )}
                            onClick={() => {
                                console.log('🟢 [CLICK] Filtro: receitas');
                                setActiveCategoryFilter('receitas');
                            }}
                        >
                            Receitas
                        </Badge>
                        <Badge
                            variant={activeCategoryFilter === 'produtos' ? "default" : "outline"}
                            className={cn(
                                "cursor-pointer whitespace-nowrap px-3 py-1 text-xs",
                                activeCategoryFilter === 'produtos'
                                    ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                                    : "hover:bg-gray-100 text-gray-600"
                            )}
                            onClick={() => {
                                console.log('🟢 [CLICK] Filtro: produtos');
                                setActiveCategoryFilter('produtos');
                            }}
                        >
                            Produtos
                        </Badge>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQueryRecipe}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onFocus={handleSearchFocusRecipe}
                            onBlur={handleSearchBlurRecipe}
                            placeholder="Buscar receita..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
                    </div>

                    {searchOpenRecipe && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                            <div className="p-2">
                                {searchLoading ? (
                                    <div className="p-3 text-center text-gray-500 flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Carregando receitas...
                                    </div>
                                ) : typeFilteredRecipes.length === 0 ? (
                                    <div className="p-3 text-center text-gray-500">
                                        {searchQueryRecipe.trim() ? 'Nenhuma receita encontrada' : (
                                            activeCategoryFilter !== 'all'
                                                ? `Nenhuma receita na categoria selecionada`
                                                : 'Digite para buscar receitas'
                                        )}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {typeFilteredRecipes.map(recipe => (
                                            <div
                                                key={recipe.id}
                                                className="p-2 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
                                                onClick={() => handleRecipeSelect(recipe.id, handleRecipeSelection)}
                                            >
                                                <CookingPot className="h-4 w-4 text-gray-400" />
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">{highlightMatch(recipe.name)}</div>
                                                    {recipe.category && (
                                                        <div className="text-xs text-gray-500">{recipe.category}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsPrintDialogOpen(true)}
                        className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-1 justify-start text-xs px-2"
                    >
                        <Printer className="h-3 w-3" />
                        Ficha Completa
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setIsPrintCollectDialogOpen(true)}
                        className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-1 justify-start text-xs px-2"
                    >
                        <ClipboardCheck className="h-3 w-3" />
                        Ficha Coleta
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setIsPrintSimpleDialogOpen(true)}
                        className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-1 justify-start text-xs px-2"
                    >
                        <ClipboardList className="h-3 w-3" />
                        Ajustável
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleClearRecipe}
                        className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-1 justify-start text-xs px-2"
                    >
                        <FilePlus className="h-3 w-3" />
                        Nova Ficha
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button
                            onClick={handleSaveRecipe}
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1 justify-center text-xs col-span-2"
                        >
                            {saving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Save className="h-3 w-3" />
                            )}
                            {saving ? 'Sincronizando e Salvando...' : 'Salvar e Sincronizar'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default RecipeMenuActions;
