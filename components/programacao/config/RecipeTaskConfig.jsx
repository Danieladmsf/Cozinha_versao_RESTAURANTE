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

// Performance Optimization: Isolate row render to avoid full list re-renders
const IngredientRow = React.memo(({ recipeId, prepIdx, ingIdx, ingName, currentTaskTypes, columns, onCheckboxChange, getCheckboxColors }) => {
    // Row background based on selected task_types
    let rowBg = '';
    if (currentTaskTypes.includes('rendimento')) rowBg = 'bg-emerald-50/60';
    if (currentTaskTypes.includes('pre_preparo')) rowBg = rowBg ? 'bg-indigo-50/60' : 'bg-blue-50/60';
    if (currentTaskTypes.includes('processamento')) rowBg = rowBg || 'bg-orange-50/60';

    return (
        <div className={`flex items-center px-4 py-2 border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${rowBg}`}>
            <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-800 font-medium">
                    {ingName.charAt(0).toUpperCase() + ingName.slice(1)}
                </span>
            </div>

            {columns.map(col => {
                const isChecked = currentTaskTypes.includes(col.id);
                return (
                    <div key={col.id} className="w-36 flex justify-center">
                        <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => onCheckboxChange(recipeId, prepIdx, ingIdx, col.id)}
                            className={`h-5 w-5 rounded border-2 transition-colors cursor-pointer
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
    return prevProps.ingName === nextProps.ingName;
});

/**
 * Componente de configuração: lista todas as receitas e para cada uma
 * mostra os ingredientes com 3 colunas de checkbox
 * (Rendimento | Pré-preparo | Processamento).
 */
const RecipeTaskConfig = ({ recipes = [], updateIngredientTaskType, saving, configStats }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all | configured | unconfigured
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

    // Filter recipes that have actual preparations with ingredients
    const configurableRecipes = useMemo(() => {
        return recipes
            .filter(r => r.preparations?.some(p => p.ingredients?.length > 0))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [recipes]);

    // Apply search and filter
    const filteredRecipes = useMemo(() => {
        let result = configurableRecipes;

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

        // Filter by config status
        if (filterStatus === 'configured') {
            result = result.filter(r =>
                r.preparations?.some(p =>
                    p.ingredients?.some(ing => ing.task_type)
                )
            );
        } else if (filterStatus === 'unconfigured') {
            result = result.filter(r =>
                !r.preparations?.some(p =>
                    p.ingredients?.some(ing => ing.task_type)
                )
            );
        }

        return result;
    }, [configurableRecipes, searchTerm, filterStatus]);

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

        recipe.preparations?.forEach(prep => {
            prep.ingredients?.forEach(ing => {
                totalIngredients++;
                if (ing.task_type) configuredIngredients++;
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
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe?.preparations) return;

        const newMapSegment = {};

        for (let prepIdx = 0; prepIdx < recipe.preparations.length; prepIdx++) {
            const prep = recipe.preparations[prepIdx];
            if (!prep.ingredients) continue;
            for (let ingIdx = 0; ingIdx < prep.ingredients.length; ingIdx++) {
                const key = `${recipeId}-${prepIdx}-${ingIdx}`;
                const ing = prep.ingredients[ingIdx];

                if (taskType === null) {
                    newMapSegment[key] = [];
                    updateIngredientTaskType(recipeId, prepIdx, ingIdx, null);
                } else {
                    const current = localTaskMap[key] || (Array.isArray(ing.task_type) ? [...ing.task_type] : (ing.task_type ? [ing.task_type] : []));
                    if (!current.includes(taskType)) {
                        const updated = [...current, taskType];
                        newMapSegment[key] = updated;
                        updateIngredientTaskType(recipeId, prepIdx, ingIdx, updated);
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
                    <SelectTrigger className="w-48 border-gray-300">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas ({configurableRecipes.length})</SelectItem>
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
                    filteredRecipes.map(recipe => {
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
                                                        // Skip preparation instructions stored as ingredient entries
                                                        if (/^\d+\.\s/.test(ingName) || ingName.length > 80) return null;
                                                        const key = `${recipe.id}-${prepIdx}-${ingIdx}`;
                                                        const currentTaskTypes = localTaskMap[key] || (Array.isArray(ing.task_type) ? ing.task_type : (ing.task_type ? [ing.task_type] : []));

                                                        return (
                                                            <IngredientRow
                                                                key={`${prepIdx}-${ingIdx}`}
                                                                recipeId={recipe.id}
                                                                prepIdx={prepIdx}
                                                                ingIdx={ingIdx}
                                                                ingName={ingName}
                                                                currentTaskTypes={currentTaskTypes}
                                                                columns={columns}
                                                                onCheckboxChange={handleCheckboxChange}
                                                                getCheckboxColors={getCheckboxColors}
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
