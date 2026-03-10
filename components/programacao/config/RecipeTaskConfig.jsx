'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Search,
    ChefHat,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Flame,
    Scissors,
    Cog,
} from 'lucide-react';
import { TASK_TYPES } from '@/hooks/programacao/useTaskDistribution';
import { RecipeEngine } from '@/lib/recipe-engine/RecipeEngine';

// Performance Optimization: Isolate row render to avoid full list re-renders
const IngredientRow = React.memo(({ recipeId, prepIdx, ingIdx, ingName, currentTaskTypes, columns, onCheckboxChange, getCheckboxColors, isInherited, weightInfo }) => {
    // Row background based on selected task_types
    let rowBg = '';
    if (currentTaskTypes.includes('rendimento')) rowBg = 'bg-emerald-50/60';
    if (currentTaskTypes.includes('pre_preparo')) rowBg = rowBg ? 'bg-indigo-50/60' : 'bg-blue-50/60';
    if (currentTaskTypes.includes('processamento')) rowBg = rowBg || 'bg-orange-50/60';

    return (
        <div className={`flex items-center px-4 py-2 border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${rowBg}`}>
            <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm text-gray-800 font-medium">
                    {ingName.charAt(0).toUpperCase() + ingName.slice(1)}
                </span>
                {isInherited && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-bold uppercase tracking-wide" title="Herdado da receita matriz (editar lá)">
                        Herdado
                    </span>
                )}
            </div>
            {/* Peso Rendimento column */}
            <div className="w-28 text-right px-2">
                {weightInfo && (
                    <span className="text-xs tabular-nums font-semibold text-emerald-600" title={`Bruto: ${weightInfo.raw} → Rendimento: ${weightInfo.yield}`}>
                        {weightInfo.yield}
                    </span>
                )}
            </div>

            {columns.map(col => {
                const isChecked = currentTaskTypes.includes(col.id);
                return (
                    <div key={col.id} className="w-36 flex justify-center">
                        <Checkbox
                            checked={isChecked}
                            disabled={isInherited}
                            onCheckedChange={() => onCheckboxChange(recipeId, prepIdx, ingIdx, col.id)}
                            title={isInherited ? "As tarefas para este item são herdadas da receita matriz original." : ""}
                            className={`h-5 w-5 rounded border-2 transition-colors ${isInherited ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                              ${isChecked ? getCheckboxColors(col.id, true) : 'border-gray-300 hover:border-gray-400'}
                            `}
                        />
                    </div>
                );
            })}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom exact equality check for ultra-fast skipping
    if (prevProps.currentTaskTypes.length !== nextProps.currentTaskTypes.length) return false;
    for (let i = 0; i < prevProps.currentTaskTypes.length; i++) {
        if (prevProps.currentTaskTypes[i] !== nextProps.currentTaskTypes[i]) return false;
    }
    return prevProps.ingName === nextProps.ingName && prevProps.isInherited === nextProps.isInherited && prevProps.weightInfo?.yield === nextProps.weightInfo?.yield;
});

/**
 * Componente de configuração: lista todas as receitas e para cada uma
 * mostra os ingredientes com 3 colunas de checkbox
 * (Rendimento | Pré-preparo | Processamento).
 */
const RecipeTaskConfig = ({ recipes = [], activeRecipeIds = new Set(), menuRecipeIds = new Set(), updateIngredientTaskType, saving, configStats, categories = [], getCategoryInfo, taskReports }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('menu_only'); // all | configured | unconfigured | menu_only
    const [expandedRecipes, setExpandedRecipes] = useState(new Set());
    // Ultra-fast Local Cache for Optimistic Updates to prevent re-render lagging
    const [localTaskMap, setLocalTaskMap] = useState({});

    // Keep localTaskMap synced with prop recipes ONLY for items we haven't touched locally yet
    // React's standard way to use props as initial state but sync if props change
    React.useEffect(() => {
        if (!recipes) return;
        const newMap = { ...localTaskMap };
        let modified = false;
        recipes.forEach(r => {
            r.preparations?.forEach((p, pIdx) => {
                p.ingredients?.forEach((ing, iIdx) => {
                    const key = `${r.id}-${pIdx}-${iIdx}`;
                    if (!localTaskMap[key] && ing.task_type !== undefined) {
                        newMap[key] = Array.isArray(ing.task_type) ? [...ing.task_type] : (ing.task_type ? [ing.task_type] : []);
                        modified = true;
                    }
                });
            });
        });
        if (modified) setLocalTaskMap(newMap);
    }, [recipes]);

    // Enrich recipes (especially Products) with base recipe preparations if they don't have their own
    const enrichedRecipes = useMemo(() => {
        if (!recipes) return [];
        return recipes.map(recipe => {
            // Se já tem preparations, ok
            if (recipe.preparations && recipe.preparations.length > 0) return recipe;

            // Se for um Produto que tem um recipe_id base, vamos tentar encontrar as preparations da receita base
            if (recipe.recipe_id) {
                const baseRecipe = recipes.find(r => r.id === recipe.recipe_id);
                if (baseRecipe && baseRecipe.preparations) {
                    return { ...recipe, base_recipe_id: baseRecipe.id, preparations: baseRecipe.preparations };
                }
            } else {
                // Fallback: Se não tem recipe_id, buscar por nome exato (útil para Produtos legacy/mal ligados)
                const baseRecipeByName = recipes.find(r => r.name === recipe.name && r.id !== recipe.id && r.preparations);
                if (baseRecipeByName && baseRecipeByName.preparations) {
                    return { ...recipe, base_recipe_id: baseRecipeByName.id, preparations: baseRecipeByName.preparations };
                }
            }
            return recipe;
        });
    }, [recipes]);

    // Filter recipes that have actual preparations with ingredients
    const configurableRecipes = useMemo(() => {
        return enrichedRecipes
            .filter(r => r.preparations?.some(p => p.ingredients?.length > 0))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [enrichedRecipes]);

    // Build a weight lookup from taskReports.grouped: recipeId -> ingredientKey -> { totalWeight, totalYieldWeight }
    const scaledWeightLookup = useMemo(() => {
        const lookup = new Map();
        if (!taskReports?.grouped) return lookup;

        for (const [taskType, catMap] of Object.entries(taskReports.grouped)) {
            for (const [cat, recipeGroups] of Object.entries(catMap)) {
                for (const rg of recipeGroups) {
                    const recipeKey = rg.recipeId;
                    if (!lookup.has(recipeKey)) lookup.set(recipeKey, new Map());
                    const ingMap = lookup.get(recipeKey);

                    for (const [ingKey, ingData] of rg.ingredients.entries()) {
                        if (ingMap.has(ingKey)) {
                            const existing = ingMap.get(ingKey);
                            existing.totalWeight += ingData.totalWeight;
                            existing.totalYieldWeight += (ingData.totalYieldWeight || 0);
                        } else {
                            ingMap.set(ingKey, {
                                totalWeight: ingData.totalWeight,
                                totalYieldWeight: ingData.totalYieldWeight || 0,
                            });
                        }
                    }
                }
            }
        }
        return lookup;
    }, [taskReports]);

    // Apply search and filter
    const filteredRecipes = useMemo(() => {
        let result;

        if (filterStatus === 'menu_only') {
            // Para "Cardápio do Dia": começar de TODAS as receitas (não só configuráveis)
            // para incluir Products sem preparations no menu
            if (menuRecipeIds.size > 0) {
                result = enrichedRecipes
                    .filter(r => menuRecipeIds.has(r.id))
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            } else {
                // Sem cardápio configurado → mostra todas as configuráveis
                result = [...configurableRecipes];
            }
        } else {
            result = [...configurableRecipes];
        }

        // Search
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(r =>
                (r.name || '').toLowerCase().includes(term) ||
                r.preparations?.some(p =>
                    p.ingredients?.some(ing =>
                        (ing.name || '').toLowerCase().includes(term)
                    )
                )
            );
        }

        // Helper to check if an item is a real ingredient and not a note
        const isRealIngredient = (ing) => {
            const name = (ing.name || '').trim();
            if (!name) return false;
            if (/^\d+\.\s/.test(name) || name.length > 80) return false;
            if (name.toLowerCase().includes('refrigerado') || name.toLowerCase().includes('congelado') || name.toLowerCase().includes('fogo médio')) return false;
            if (parseFloat(ing.weight_raw) > 0 || ing.unit) return true;
            if (name.match(/[;.!]$/)) return false;
            if (name.split(' ').length > 6) return false;
            return true;
        };

        // Filter by config status (only for non-menu filters)
        if (filterStatus === 'configured') {
            result = result.filter(r =>
                r.preparations?.some(p =>
                    p.ingredients?.some(ing => isRealIngredient(ing) && ing.task_type)
                )
            );
        } else if (filterStatus === 'unconfigured') {
            result = result.filter(r =>
                !r.preparations?.some(p =>
                    p.ingredients?.some(ing => isRealIngredient(ing) && ing.task_type)
                )
            );
        }

        return result;
    }, [enrichedRecipes, configurableRecipes, searchTerm, filterStatus, menuRecipeIds]);

    // =============================================
    // AGRUPAR POR CATEGORIA (mesma ordem do Relatório)
    // =============================================
    const groupedByCategory = useMemo(() => {
        // Build a category map: id -> name
        const catMap = new Map();
        if (categories && Array.isArray(categories)) {
            categories.forEach(cat => {
                if (cat.id && cat.name) catMap.set(cat.id, cat.name);
            });
        }

        // Group recipes by their resolved category ID (for ordering) and name (for display)
        const groups = {}; // key = categoryId || name, value = { name, recipes }
        filteredRecipes.forEach(recipe => {
            let categoryId = null;
            let categoryName = 'Outros';

            if (recipe.category_id && catMap.has(recipe.category_id)) {
                categoryId = recipe.category_id;
                categoryName = catMap.get(recipe.category_id);
            } else if (recipe.category) {
                // Try to match the name from the category map to get a proper ID
                const normalizedStatic = recipe.category.trim().toLowerCase();
                for (const [id, name] of catMap.entries()) {
                    if (name.trim().toLowerCase() === normalizedStatic) {
                        categoryId = id;
                        categoryName = name;
                        break;
                    }
                }
                if (!categoryId) categoryName = recipe.category;
            }

            const groupKey = categoryId || categoryName.toUpperCase();

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    categoryId: categoryId,
                    displayName: categoryName.toUpperCase(),
                    recipes: []
                };
            }
            groups[groupKey].recipes.push(recipe);
        });

        // Sort categories using getCategoryInfo (by ID, same as Report tab)
        const sortedEntries = Object.values(groups).sort((a, b) => {
            if (getCategoryInfo) {
                // Pass the category ID (not the name!) to getCategoryInfo for proper ordering
                const lookupA = a.categoryId || a.displayName;
                const lookupB = b.categoryId || b.displayName;
                const infoA = getCategoryInfo(lookupA);
                const infoB = getCategoryInfo(lookupB);
                const orderA = infoA?.order !== undefined && infoA.order !== -1 ? infoA.order : 999999;
                const orderB = infoB?.order !== undefined && infoB.order !== -1 ? infoB.order : 999999;
                if (orderA !== orderB) return orderA - orderB;
            }
            return a.displayName.localeCompare(b.displayName);
        });

        return sortedEntries.map(entry => ({ category: entry.displayName, recipes: entry.recipes }));
    }, [filteredRecipes, categories, getCategoryInfo]);

    const toggleExpand = (recipeId) => {
        setExpandedRecipes(prev => {
            const next = new Set(prev);
            if (next.has(recipeId)) {
                next.delete(recipeId);
            } else {
                next.add(recipeId);
            }
            return next;
        });
    };

    const expandAll = () => {
        setExpandedRecipes(new Set(filteredRecipes.map(r => r.id)));
    };

    const collapseAll = () => {
        setExpandedRecipes(new Set());
    };

    // Count configured ingredients in a recipe
    const getRecipeConfigInfo = (recipe) => {
        let totalIngredients = 0;
        let configuredIngredients = 0;

        const isRealIngredient = (ing) => {
            const name = (ing.name || '').trim();
            if (!name) return false;
            if (/^\d+\.\s/.test(name) || name.length > 80) return false;
            if (name.toLowerCase().includes('refrigerado') || name.toLowerCase().includes('congelado') || name.toLowerCase().includes('fogo médio')) return false;
            if (parseFloat(ing.weight_raw) > 0 || ing.unit) return true;
            if (name.match(/[;.!]$/)) return false;
            if (name.split(' ').length > 6) return false;
            return true;
        };

        recipe.preparations?.forEach(prep => {
            prep.ingredients?.forEach(ing => {
                if (isRealIngredient(ing)) {
                    totalIngredients++;
                    if (ing.task_type && (!Array.isArray(ing.task_type) || ing.task_type.length > 0)) configuredIngredients++;
                }
            });
        });

        return { totalIngredients, configuredIngredients };
    };

    // Get the status badge for a recipe
    const getRecipeStatus = (recipe) => {
        const { totalIngredients, configuredIngredients } = getRecipeConfigInfo(recipe);
        if (totalIngredients === 0) return null;

        if (configuredIngredients === totalIngredients) {
            return (
                <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completa
                </Badge>
            );
        } else if (configuredIngredients > 0) {
            return (
                <Badge className="bg-amber-100 text-amber-700 text-xs gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {configuredIngredients}/{totalIngredients}
                </Badge>
            );
        } else {
            return (
                <Badge className="bg-gray-100 text-gray-500 text-xs">
                    Pendente
                </Badge>
            );
        }
    };

    // Handle checkbox toggle for an ingredient
    const handleCheckboxChange = useCallback(async (recipeId, prepIndex, ingIndex, taskType) => {
        const key = `${recipeId}-${prepIndex}-${ingIndex}`;

        // Use functional state update to always get the latest state without depending on localTaskMap array directly
        setLocalTaskMap(prev => {
            const currentTypes = prev[key] || [];
            let newTypes;

            if (currentTypes.includes(taskType)) {
                newTypes = currentTypes.filter(t => t !== taskType);
            } else {
                newTypes = [...currentTypes, taskType];
            }

            // Sync with backend without awaiting to match UI speed
            updateIngredientTaskType(recipeId, prepIndex, ingIndex, newTypes.length > 0 ? newTypes : null);

            return { ...prev, [key]: newTypes };
        });
    }, [updateIngredientTaskType]);

    // Bulk set: ADD a task_type to all ingredients (preserving existing ones)
    const handleBulkSet = async (recipeId, taskType) => {
        const recipe = enrichedRecipes.find(r => r.id === recipeId);
        if (!recipe?.preparations) return;

        const targetRecipeId = recipe.base_recipe_id || recipe.id;
        const newMapSegment = {};

        for (let prepIdx = 0; prepIdx < recipe.preparations.length; prepIdx++) {
            const prep = recipe.preparations[prepIdx];
            if (!prep.ingredients) continue;
            for (let ingIdx = 0; ingIdx < prep.ingredients.length; ingIdx++) {
                const key = `${targetRecipeId}-${prepIdx}-${ingIdx}`;
                const ing = prep.ingredients[ingIdx];

                if (taskType === null) {
                    newMapSegment[key] = [];
                    updateIngredientTaskType(targetRecipeId, prepIdx, ingIdx, null);
                } else {
                    const current = localTaskMap[key] || (Array.isArray(ing.task_type) ? [...ing.task_type] : (ing.task_type ? [ing.task_type] : []));
                    if (!current.includes(taskType)) {
                        const updated = [...current, taskType];
                        newMapSegment[key] = updated;
                        updateIngredientTaskType(targetRecipeId, prepIdx, ingIdx, updated);
                    }
                }
            }
        }

        // Fast local bulk update
        if (Object.keys(newMapSegment).length > 0) {
            setLocalTaskMap(prev => ({ ...prev, ...newMapSegment }));
        }
    };

    // Category column config
    const columns = [
        { id: 'rendimento', label: 'Rendimento', fullLabel: 'Rendimento', icon: Flame, color: 'emerald' },
        { id: 'pre_preparo', label: 'Pré-preparo', fullLabel: 'Pré-preparo', icon: Scissors, color: 'blue' },
        { id: 'processamento', label: 'Processamento', fullLabel: 'Processamento', icon: Cog, color: 'orange' },
    ];

    const getCheckboxColors = useCallback((colId, isChecked) => {
        if (!isChecked) return '';
        switch (colId) {
            case 'rendimento': return 'border-emerald-500 bg-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500';
            case 'pre_preparo': return 'border-blue-500 bg-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500';
            case 'processamento': return 'border-orange-500 bg-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500';
            default: return '';
        }
    }, []);

    return (
        <div className="space-y-4">
            {/* Stats Bar */}
            <Card className="border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-gray-50">
                <CardContent className="py-4 px-6">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <ChefHat className="w-5 h-5 text-slate-600" />
                            <span className="font-semibold text-gray-800">
                                Progresso da Configuração
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-40 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${configStats.percentage}%` }}
                                />
                            </div>
                            <Badge className="bg-slate-100 text-slate-700 text-sm px-3 py-1">
                                {configStats.configured} / {configStats.total} receitas
                            </Badge>
                            <Badge className="bg-emerald-100 text-emerald-700 text-sm font-bold px-3 py-1">
                                {configStats.percentage}%
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Search + Filter */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        type="text"
                        placeholder="Buscar receita ou ingrediente..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10 border-gray-300"
                    />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-56 border-gray-300">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="menu_only">Cardápio do Dia</SelectItem>
                        <SelectItem value="all">Todas as Receitas ({configurableRecipes.length})</SelectItem>
                        <SelectItem value="configured">Configuradas</SelectItem>
                        <SelectItem value="unconfigured">Pendentes</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={expandAll} className="text-xs">
                    Expandir Tudo
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs">
                    Recolher
                </Button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                {Object.values(TASK_TYPES).map(tt => (
                    <div key={tt.id} className="flex items-center gap-1.5 text-xs">
                        <div className={`w-3 h-3 rounded-full ${tt.badgeClass.split(' ')[0]}`} />
                        <span className="font-semibold text-gray-700">{tt.shortLabel}</span>
                        <span className="text-gray-400">→ {tt.role}</span>
                    </div>
                ))}
            </div>

            {/* Recipe List */}
            <div className="space-y-2">
                {filteredRecipes.length === 0 ? (
                    <Card className="border-2 border-dashed border-gray-300">
                        <CardContent className="py-8 text-center text-gray-500">
                            Nenhuma receita encontrada.
                        </CardContent>
                    </Card>
                ) : (
                    groupedByCategory.map(group => (
                        <div key={group.category}>
                            {/* Category Header */}
                            <div className="px-4 py-2.5 bg-slate-200/60 border border-gray-200 rounded-t-lg mt-3 first:mt-0">
                                <span className="font-bold text-gray-700 text-xs uppercase tracking-wider">
                                    {group.category}
                                </span>
                                <span className="ml-2 text-xs text-gray-400">({group.recipes.length})</span>
                            </div>
                            {group.recipes.map(recipe => {
                                const isExpanded = expandedRecipes.has(recipe.id);
                                const { totalIngredients } = getRecipeConfigInfo(recipe);

                                return (
                                    <Card
                                        key={recipe.id}
                                        className={`border transition-all duration-200 ${isExpanded
                                            ? 'border-blue-300 shadow-md'
                                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                            }`}
                                    >
                                        {/* Recipe Header - Clickable */}
                                        <div
                                            className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                                            onClick={() => toggleExpand(recipe.id)}
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                            )}
                                            <span className="font-semibold text-gray-900 flex-1 text-sm">
                                                {recipe.name || 'Sem nome'}
                                            </span>
                                            <Badge className="bg-gray-100 text-gray-500 text-xs">
                                                {totalIngredients} ing.
                                            </Badge>
                                            {getRecipeStatus(recipe)}
                                        </div>

                                        {/* Expanded: Show ingredients */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100">
                                                {/* Column headers */}
                                                <div className="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
                                                    <div className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                        Ingrediente
                                                    </div>
                                                    <div className="w-28 text-right px-2 text-xs font-bold text-emerald-600 uppercase tracking-wider">
                                                        Peso Rend.
                                                    </div>
                                                    {columns.map(col => (
                                                        <div
                                                            key={col.id}
                                                            className="w-36 text-center text-xs font-bold uppercase tracking-wider"
                                                            style={{ color: col.color === 'emerald' ? '#059669' : col.color === 'blue' ? '#2563eb' : '#ea580c' }}
                                                        >
                                                            {col.label}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Bulk buttons */}
                                                <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50/70 border-b border-gray-100">
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide mr-2">Marcar tudo:</span>
                                                    {columns.map(col => {
                                                        const Col = col.icon;
                                                        return (
                                                            <Button
                                                                key={col.id}
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => { e.stopPropagation(); handleBulkSet(recipe.id, col.id); }}
                                                                className={`h-6 text-[10px] px-2 gap-1 hover:opacity-80`}
                                                                style={{ color: col.color === 'emerald' ? '#059669' : col.color === 'blue' ? '#2563eb' : '#ea580c' }}
                                                            >
                                                                <Col className="w-3 h-3" />
                                                                {col.fullLabel}
                                                            </Button>
                                                        );
                                                    })}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); handleBulkSet(recipe.id, null); }}
                                                        className="h-6 text-[10px] px-2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        Limpar
                                                    </Button>
                                                </div>

                                                {/* Ingredients list */}
                                                {recipe.preparations?.map((prep, prepIdx) => {
                                                    if (!prep.ingredients || prep.ingredients.length === 0) return null;

                                                    return (
                                                        <div key={prepIdx}>
                                                            {/* Prep title divider (only if more than 1 prep) */}
                                                            {recipe.preparations.filter(p => p.ingredients?.length > 0).length > 1 && (
                                                                <div className="px-4 py-1.5 bg-slate-50 border-b border-gray-100">
                                                                    <span className="text-xs font-semibold text-slate-500">
                                                                        {prep.title || `Preparação ${prepIdx + 1}`}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {prep.ingredients.map((ing, ingIdx) => {
                                                                const ingName = (ing.name || '').trim();
                                                                if (!ingName) return null;

                                                                // Melhor filtro de notas e instruções
                                                                if (/^\d+\.\s/.test(ingName) || ingName.length > 80) return null;
                                                                if (ingName.toLowerCase().includes('refrigerado') || ingName.toLowerCase().includes('congelado') || ingName.toLowerCase().includes('fogo médio')) return null;

                                                                const isClearlyNote = !parseFloat(ing.weight_raw) && !ing.unit && (ingName.match(/[;.!]$/) || ingName.split(' ').length > 6);
                                                                if (isClearlyNote) return null;

                                                                const targetRecipeId = recipe.base_recipe_id || recipe.id;
                                                                const key = `${targetRecipeId}-${prepIdx}-${ingIdx}`;
                                                                let currentTaskTypes = localTaskMap[key] || (Array.isArray(ing.task_type) ? ing.task_type : (ing.task_type ? [ing.task_type] : []));
                                                                let isInherited = false;

                                                                // PUXAR CONFIGURAÇÕES DA MATRIZ (mas permitir edição)
                                                                // Se as tarefas locais estiverem vazias e a matriz tiver configuração, puxamos como padrão.
                                                                // Se já foi editado localmente (salvo no bd do produto), a edição local ganha.
                                                                const hasLocalEdit = localTaskMap[key] !== undefined || (Array.isArray(ing.task_type) && ing.task_type.length >= 0) || ing.task_type === null;

                                                                if (!hasLocalEdit && currentTaskTypes.length === 0 && prep.origin_id) {
                                                                    const baseRecipe = recipes.find(r => r.id === prep.origin_id);
                                                                    if (baseRecipe) {
                                                                        for (const bp of baseRecipe.preparations || []) {
                                                                            const foundIng = bp.ingredients?.find(bi =>
                                                                                (bi.ingredient_id && ing.ingredient_id && bi.ingredient_id === ing.ingredient_id) ||
                                                                                bi.name === ing.name
                                                                            );
                                                                            if (foundIng) {
                                                                                const baseTypes = Array.isArray(foundIng.task_type) ? foundIng.task_type : (foundIng.task_type ? [foundIng.task_type] : []);
                                                                                if (baseTypes.length > 0) {
                                                                                    // Apply base types as starting value, but they are NOT read-only
                                                                                    // We must also immediately put this inherited state in localTaskMap so that unchecking works
                                                                                    currentTaskTypes = baseTypes;
                                                                                }
                                                                                break;
                                                                            }
                                                                        }
                                                                    }
                                                                }

                                                                // Calculate weight info for display (scaled by order)
                                                                const ingKey = ingName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                                const recipeWeights = scaledWeightLookup.get(recipe.base_recipe_id || recipe.id);
                                                                const scaledData = recipeWeights?.get(ingKey);

                                                                const formatW = (w) => {
                                                                    if (!w || w <= 0) return null;
                                                                    if (w >= 1) return `${w.toFixed(3).replace('.', ',')} kg`;
                                                                    return `${Math.round(w * 1000)} g`;
                                                                };

                                                                let weightInfo = null;
                                                                if (scaledData && scaledData.totalYieldWeight > 0) {
                                                                    weightInfo = {
                                                                        raw: formatW(scaledData.totalWeight) || '—',
                                                                        yield: formatW(scaledData.totalYieldWeight) || formatW(scaledData.totalWeight) || '—',
                                                                    };
                                                                } else {
                                                                    // Fallback: show base recipe weight (not scaled)
                                                                    const rawW = RecipeEngine.getInitialWeight(ing);
                                                                    const yieldW = RecipeEngine.getFinalWeight(ing);
                                                                    if (rawW > 0 || yieldW > 0) {
                                                                        weightInfo = {
                                                                            raw: formatW(rawW) || '—',
                                                                            yield: formatW(yieldW) || formatW(rawW) || '—',
                                                                        };
                                                                    }
                                                                }

                                                                return (
                                                                    <IngredientRow
                                                                        key={`${prepIdx}-${ingIdx}`}
                                                                        recipeId={targetRecipeId}
                                                                        prepIdx={prepIdx}
                                                                        ingIdx={ingIdx}
                                                                        ingName={ingName}
                                                                        currentTaskTypes={currentTaskTypes}
                                                                        columns={columns}
                                                                        onCheckboxChange={handleCheckboxChange}
                                                                        getCheckboxColors={getCheckboxColors}
                                                                        isInherited={isInherited}
                                                                        weightInfo={weightInfo}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </Card>
                                );
                            })
                            }
                        </div>
                    ))
                )}
            </div>

            {/* Saving indicator */}
            {saving && (
                <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                </div>
            )}
        </div>
    );
};

export default RecipeTaskConfig;
