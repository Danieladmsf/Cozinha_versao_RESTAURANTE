'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    ChefHat,
    ClipboardList,
    Settings2,
    BarChart3,
    Printer,
    Loader2,
    Scale,
    Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useTaskDistribution, TASK_TYPES } from '@/hooks/programacao/useTaskDistribution';
import { getCanonicalIngredientName } from '@/lib/production-engine/DemandCalculator';
import { useProgramacaoRealtimeData } from '@/hooks/programacao/useProgramacaoRealtimeData';
import { useAvailableDays } from '@/hooks/useAvailableDays';
import { useCategoryDisplay } from '@/hooks/shared/useCategoryDisplay';
import WeekNavigator from '@/components/shared/WeekNavigator';
import WeekDaySelector from '@/components/shared/WeekDaySelector';
import RecipeTaskConfig from '../config/RecipeTaskConfig';
import { CategoryTree, WeeklyMenu as WeeklyMenuEntity } from '@/app/api/entities';
import { APP_CONSTANTS } from '@/lib/constants';

/**
 * Formata peso em kg para exibição brasileira.
 */
function formatWeight(weightKg) {
    if (weightKg >= 1) return `${weightKg.toFixed(2).replace('.', ',')} kg`;
    const grams = Math.round(weightKg * 1000);
    return `${grams} g`;
}

/**
 * Componente da aba "Escala Cozinha" dentro da página de Programação.
 * 2 sub-modos: Configuração (mapear receitas) e Relatório (listas do dia).
 */
const EscalaCozinhaTab = () => {
    const [mode, setMode] = useState('report'); // 'config' | 'report'
    const [printing, setPrinting] = useState(false);
    const [selectedDay, setSelectedDay] = useState(1);
    const { categories, getCategoryInfo } = useCategoryDisplay();

    const sortCategories = (a, b) => {
        const infoA = getCategoryInfo(a);
        const infoB = getCategoryInfo(b);
        const orderA = infoA?.order !== undefined && infoA.order !== -1 ? infoA.order : 999999;
        const orderB = infoB?.order !== undefined && infoB.order !== -1 ? infoB.order : 999999;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
    };

    // Get shared data from Programação
    const {
        orders,
        recipes,
        setRecipes,
        weekDays,
        currentDate,
        weekNumber,
        year,
        navigateWeek,
        loading,
    } = useProgramacaoRealtimeData();

    const availableDays = useAvailableDays();

    // =========================================
    // WEEKLY MENU: Carregar cardápio da semana
    // =========================================
    const [weeklyMenu, setWeeklyMenu] = useState(null);

    useEffect(() => {
        const loadWeeklyMenu = async () => {
            try {
                const mockUserId = APP_CONSTANTS?.MOCK_USER_ID || 'mock-user-id';
                const weekKey = `${year}-W${weekNumber}`;
                const menus = await WeeklyMenuEntity.query([
                    { field: 'user_id', operator: '==', value: mockUserId },
                    { field: 'week_key', operator: '==', value: weekKey }
                ]);
                setWeeklyMenu(menus?.[0] || null);
            } catch (error) {
                console.error('Erro ao carregar WeeklyMenu:', error);
                setWeeklyMenu(null);
            }
        };
        if (weekNumber && year) {
            loadWeeklyMenu();
        }
    }, [weekNumber, year]);

    // Extrair IDs das receitas do cardápio para o dia selecionado (independente de pedidos)
    // Usa APENAS os recipe_ids diretos do WeeklyMenu (sem expandir sub-receitas)
    const menuRecipeIds = React.useMemo(() => {
        if (!weeklyMenu?.menu_data || !recipes || recipes.length === 0) return new Set();

        const ids = new Set();
        const menuData = weeklyMenu.menu_data;

        // Percorrer todos os mealTypes (ex: "almoco", "jantar", etc.)
        Object.entries(menuData).forEach(([mealType, value]) => {
            if (value && typeof value === 'object' && value[selectedDay]) {
                const dayData = value[selectedDay];
                if (dayData && typeof dayData === 'object') {
                    Object.values(dayData).forEach(items => {
                        if (Array.isArray(items)) {
                            items.forEach(item => {
                                if (item?.recipe_id) ids.add(item.recipe_id);
                            });
                        }
                    });
                }
            }
        });

        // Fallback: menu_data pode ter dayIndex direto (sem mealType)
        if (ids.size === 0 && menuData[selectedDay]) {
            const dayData = menuData[selectedDay];
            if (dayData && typeof dayData === 'object') {
                Object.values(dayData).forEach(items => {
                    if (Array.isArray(items)) {
                        items.forEach(item => {
                            if (item?.recipe_id) ids.add(item.recipe_id);
                        });
                    }
                });
            }
        }

        return ids;
    }, [weeklyMenu, recipes, selectedDay]);

    const {
        updateIngredientTaskType,
        configStats,
        saving,
        saveError,
        taskReports,
    } = useTaskDistribution(orders, recipes, setRecipes, selectedDay, categories);

    const selectedDayInfo = weekDays?.find(d => d.dayNumber === selectedDay);
    const dateLabel = selectedDayInfo?.fullDate || format(currentDate, 'dd/MM/yyyy', { locale: ptBR });

    // Extrair IDs das receitas que estão ativas no dia selecionado, expandindo Products → base Recipes
    const activeRecipeIds = React.useMemo(() => {
        if (!orders || orders.length === 0 || !recipes || recipes.length === 0) return new Set();

        const dayOrders = orders.filter(o => Number(o.day_of_week) === Number(selectedDay));
        if (dayOrders.length === 0) return new Set();

        const ids = new Set();

        dayOrders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (item.recipe_id) {
                        ids.add(item.recipe_id);

                        // Se o item do pedido é um Product, resolver a receita base vinculada
                        const entity = recipes.find(r => r.id === item.recipe_id);
                        if (entity) {
                            // Product.recipe_id → base Recipe ID
                            if (entity.recipe_id) {
                                ids.add(entity.recipe_id);
                            }
                            // Preparations com origin_id apontando para receitas-mãe
                            if (entity.preparations) {
                                entity.preparations.forEach(prep => {
                                    if (prep.origin_id) {
                                        ids.add(prep.origin_id);
                                    }
                                });
                            }
                        }
                    }
                });
            }
        });

        return ids;
    }, [orders, recipes, selectedDay]);

    // =========================================
    // PRINT: Gera folha por cargo
    // =========================================
    const handlePrint = async (taskTypeFilter = null) => {
        setPrinting(true);
        try {
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) {
                alert('Popup bloqueado! Habilite popups para imprimir.');
                return;
            }

            const sectionsToRender = taskTypeFilter
                ? [taskTypeFilter]
                : Object.keys(TASK_TYPES);

            const sectionsHTML = sectionsToRender.map(ttId => {
                const tt = TASK_TYPES[ttId];
                const groupedData = taskReports.grouped?.[ttId] || {};
                const categoriesList = Object.keys(groupedData).sort(sortCategories);
                if (categoriesList.length === 0) return '';

                // Build consolidated lookup
                // Build consolidated lookup from GLOBAL list (across all task types)
                const globalConsolidated = taskReports.globalConsolidated || {};
                const consolidatedMap = {};

                // Map global consolidated weights by normalized key
                Object.entries(globalConsolidated).forEach(([key, data]) => {
                    const normalizedKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    consolidatedMap[normalizedKey] = {
                        totalWeight: data.totalWeight,
                        sourceCount: data.sourceCount,
                    };
                });

                let totalWeight = 0;
                let totalCount = 0;

                const catBlocks = categoriesList.map(cat => {
                    const recipeRows = groupedData[cat].map(rg => {
                        const qtyLabel = rg.unitType === 'kg'
                            ? `${rg.orderQty.toFixed(1).replace('.', ',')} kg`
                            : `${Math.round(rg.orderQty)} ${rg.unitType === 'un' ? 'un.' : rg.unitType}`;

                        const ingRows = rg.ingredients.map(ing => {
                            totalCount++;
                            totalWeight += ing.totalWeight;
                            // Use canonical name for lookup (e.g. "Alho Triturado" -> "alho")
                            const ingKey = getCanonicalIngredientName(ing.name);
                            const cons = consolidatedMap[ingKey];
                            const consLabel = cons ? formatWeight(cons.totalWeight) : '—';
                            const consStyle = cons && cons.sourceCount > 1 ? 'font-weight:700;color:#374151;' : 'color:#9ca3af;';
                            return '<tr><td style="padding:4px 12px 4px 32px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;">' + ing.displayName + '</td><td style="padding:4px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;font-size:13px;white-space:nowrap;">' + formatWeight(ing.totalWeight) + '</td><td style="padding:4px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;white-space:nowrap;' + consStyle + '">' + consLabel + '</td></tr>';
                        }).join('');

                        return '<tr><td colspan="2" style="padding:5px 12px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:13px;color:#1f2937;">' + rg.recipeName + '</td><td style="padding:5px 12px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;color:#6b7280;">' + qtyLabel + '</td></tr>' + ingRows;
                    }).join('');

                    return '<tr><td colspan="3" style="padding:6px 12px;background:#e5e7eb;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#374151;border-bottom:1px solid #d1d5db;">' + cat + '</td></tr>' + recipeRows;
                }).join('');

                return '<div style="margin-bottom:24px;"><h2 style="font-size:16px;font-weight:700;margin:0 0 8px 0;padding:8px 12px;background:#f3f4f6;border-radius:4px;border-bottom:2px solid #d1d5db;">' + tt.label + ' — ' + tt.role + '<span style="float:right;font-size:13px;font-weight:400;color:#6b7280;">' + totalCount + ' itens | ' + formatWeight(totalWeight) + '</span></h2><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#fafafa;"><th style="padding:4px 12px;text-align:left;font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Item</th><th style="padding:4px 12px;text-align:right;font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;width:80px;">Peso</th><th style="padding:4px 12px;text-align:right;font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;width:90px;">Consolidado</th></tr></thead><tbody>' + catBlocks + '</tbody></table></div>';
            }).join('');

            const roleLabel = taskTypeFilter
                ? TASK_TYPES[taskTypeFilter].role
                : 'Todas as Funções';

            const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Escala Cozinha - ${roleLabel} - ${dateLabel}</title>
<style>
@page { margin: 15mm; size: A4 portrait; }
body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #111; font-size: 13px; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
<h1 style="font-size: 20px; margin: 0; letter-spacing: 0.5px;">ESCALA COZINHA — ${roleLabel.toUpperCase()}</h1>
<p style="font-size: 13px; margin: 4px 0 0 0; color: #374151;">${dateLabel}</p>
</div>
${sectionsHTML || '<p style="text-align: center; color: #9ca3af; padding: 40px;">Nenhum dado configurado para este dia.</p>'}
<div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #d1d5db; text-align: center; font-size: 11px; color: #9ca3af;">
Cozinha Afeto — Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
</div>
</body>
</html>`.trim();

            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        } finally {
            setPrinting(false);
        }
    };

    // =========================================
    // PRINT: Listas Consolidadas
    // =========================================
    const handlePrintConsolidated = async () => {
        setPrinting(true);
        try {
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) {
                alert('Popup bloqueado! Habilite popups para imprimir.');
                return;
            }

            const sectionsHTML = ['rendimento', 'pre_preparo', 'processamento'].map(taskKey => {
                const items = taskReports[taskKey] || [];
                const taskDef = TASK_TYPES[taskKey];
                if (items.length === 0) return '';

                const rows = items.map((ing, idx) => {
                    const cats = (ing.sourceCategories || []).join(', ') || '—';
                    const recs = (ing.sourceRecipes || []).map(r => `• ${r}`).join('<br/>');
                    return `<tr style="border-bottom:1px solid #e5e7eb;${idx % 2 === 0 ? '' : 'background:#f9fafb;'}">
                        <td style="padding:6px 12px;text-align:right;font-weight:700;color:#1d4ed8;white-space:nowrap;font-size:13px;">${formatWeight(ing.totalWeight)}</td>
                        <td style="padding:6px 12px;font-weight:600;font-size:13px;color:#1f2937;">${ing.displayName}</td>
                        <td style="padding:6px 12px;font-size:11px;color:#6b7280;">${cats}</td>
                        <td style="padding:6px 12px;font-size:11px;color:#374151;line-height:1.5;">${recs || '—'}</td>
                    </tr>`;
                }).join('');

                return `<div style="margin-bottom:28px;">
                    <h2 style="font-size:15px;font-weight:700;margin:0 0 8px 0;padding:8px 12px;background:#f3f4f6;border-radius:4px;border-bottom:2px solid #d1d5db;text-transform:uppercase;letter-spacing:0.5px;">
                        ${taskDef.label} (Consolidada)
                        <span style="float:right;font-size:12px;font-weight:400;color:#6b7280;">${items.length} itens</span>
                    </h2>
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:#e5e7eb;">
                                <th style="padding:6px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#374151;width:100px;">Peso Bruto</th>
                                <th style="padding:6px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#374151;">Nome do Insumo</th>
                                <th style="padding:6px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#374151;">Categoria</th>
                                <th style="padding:6px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#374151;">Receitas</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;
            }).join('');

            const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Listas Consolidadas - ${dateLabel}</title>
<style>
@page { margin: 15mm; size: A4 portrait; }
body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #111; font-size: 13px; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
<h1 style="font-size: 20px; margin: 0; letter-spacing: 0.5px;">TABELA DE RENDIMENTO</h1>
<p style="font-size: 13px; margin: 4px 0 0 0; color: #374151;">${dateLabel}</p>
</div>
${sectionsHTML || '<p style="text-align: center; color: #9ca3af; padding: 40px;">Nenhum dado para este dia.</p>'}
<div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #d1d5db; text-align: center; font-size: 11px; color: #9ca3af;">
Cozinha Afeto — Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
</div>
</body>
</html>`.trim();

            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        } finally {
            setPrinting(false);
        }
    };

    // =========================================
    // RENDER: Seção agrupada (para todos os tipos)
    // =========================================
    const renderGroupedSection = (taskTypeId) => {
        const tt = TASK_TYPES[taskTypeId];
        const groupedData = taskReports.grouped?.[taskTypeId] || {};
        const categoriesList = Object.keys(groupedData).sort(sortCategories);
        const flatItems = taskReports[taskTypeId] || [];

        if (categoriesList.length === 0) {
            return (
                <Card key={taskTypeId} className="border border-gray-200">
                    <CardContent className="py-8 text-center">
                        <p className="text-sm text-gray-500">
                            Nenhum item de <strong>{tt.label}</strong> para o dia selecionado.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Configure as receitas na aba "Configuração" para que apareçam aqui.
                        </p>
                    </CardContent>
                </Card>
            );
        }

        // Build consolidated lookup from GLOBAL list (across all task types)
        const globalConsolidated = taskReports.globalConsolidated || {};
        const consolidatedMap = {};

        // Map global consolidated weights by normalized key
        Object.entries(globalConsolidated).forEach(([key, data]) => {
            const normalizedKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            consolidatedMap[normalizedKey] = {
                totalWeight: data.totalWeight,
                sourceCount: data.sourceCount,
                // For global consolidated, we compare total vs current line. 
                // If distinct, implying detail != global, highlight it.
                // We don't have source count easily available here without more mapping, 
                // but weight diff is the critical piece.
            };
        });

        // Count totals
        let totalIngredients = 0;
        let totalWeight = 0;
        categoriesList.forEach(cat => {
            groupedData[cat].forEach(rg => {
                rg.ingredients.forEach(ing => {
                    totalIngredients++;
                    totalWeight += ing.totalWeight;
                });
            });
        });

        return (
            <Card key={taskTypeId} className={`border ${tt.borderClass}`}>
                {/* Header */}
                <CardHeader className={`${tt.headerClass} border-b ${tt.borderClass} py-3 px-4`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CardTitle className={`text-base font-bold ${tt.textClass} tracking-wide uppercase`}>
                                {tt.label}
                            </CardTitle>
                            <span className="text-xs text-gray-500 font-medium border border-gray-300 rounded px-2 py-0.5">
                                {tt.role}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 tabular-nums">
                                {totalIngredients} itens — {formatWeight(totalWeight)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrint(taskTypeId)}
                                disabled={printing}
                                className="h-7 text-xs gap-1 border-gray-300 text-gray-600 hover:bg-gray-50"
                            >
                                <Printer className="w-3 h-3" />
                                Imprimir
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {/* Body: Category → Recipe → Ingredients */}
                <CardContent className="p-0">
                    {/* Column headers */}
                    <div className="flex items-center px-4 py-1.5 border-b border-gray-200 bg-gray-50/50">
                        <span className="flex-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Item</span>
                        <span className="w-24 text-[10px] font-bold text-blue-600 uppercase tracking-wider text-right" title="Quantidade exata para usar apenas nesta receita">USAR NA RECEITA</span>
                        <span className="w-28 text-[9px] font-semibold text-gray-400 uppercase tracking-wider text-right" title="Quantidade total necessária para o dia todo">Total do Dia</span>
                    </div>

                    {categoriesList.map(category => (
                        <div key={category}>
                            {/* Category row */}
                            <div className={`${tt.categoryBg} px-4 py-2 border-b border-gray-200`}>
                                <span className="font-bold text-gray-700 text-xs uppercase tracking-wider">
                                    {category}
                                </span>
                            </div>

                            {/* Recipes */}
                            {groupedData[category].map((recipeGroup, rgIdx) => {
                                const qtyLabel = recipeGroup.unitType === 'kg'
                                    ? `${recipeGroup.orderQty.toFixed(1).replace('.', ',')} kg`
                                    : `${Math.round(recipeGroup.orderQty)} ${recipeGroup.unitType === 'un' ? 'un.' : recipeGroup.unitType}`;

                                return (
                                    <div key={recipeGroup.recipeId + '-' + rgIdx}>
                                        {/* Recipe row */}
                                        <div className={`flex items-center justify-between px-4 py-1.5 ${tt.recipeBg} border-b border-gray-100`}>
                                            <span className="font-semibold text-gray-700 text-sm">
                                                {recipeGroup.recipeName}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium tabular-nums">
                                                {qtyLabel}
                                            </span>
                                        </div>

                                        {/* Ingredient rows */}
                                        {recipeGroup.ingredients.map((ing, ingIdx) => {
                                            const ingKey = getCanonicalIngredientName(ing.name);
                                            const consolidated = consolidatedMap[ingKey];
                                            const hasMultiple = consolidated && consolidated.sourceCount > 1;

                                            return (
                                                <div
                                                    key={ing.name}
                                                    className={`flex items-center px-4 py-1.5 pl-8 border-b border-gray-50 ${ingIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                                        } hover:bg-gray-50 transition-colors`}
                                                >
                                                    <span className="flex-1 text-gray-600 text-sm">
                                                        {ing.displayName}
                                                    </span>
                                                    <span className="w-24 text-right font-bold text-blue-700 text-sm tabular-nums">
                                                        {formatWeight(ing.totalWeight)}
                                                    </span>
                                                    <span className={`w-28 text-right text-[11px] tabular-nums ${hasMultiple
                                                        ? 'font-medium text-gray-500'
                                                        : 'text-gray-300'
                                                        }`} title="Total que precisa ser retirado do estoque para o dia todo">
                                                        {consolidated ? formatWeight(consolidated.totalWeight) : '—'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    };

    // =========================================
    // LOADING
    // =========================================
    if (loading?.initial) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
                    <p className="text-gray-500 text-sm">Carregando dados...</p>
                </div>
            </div>
        );
    }

    // =========================================
    // MAIN RENDER
    // =========================================
    return (
        <div className="space-y-6">
            {/* Navigation */}
            <div className="space-y-4">
                <div className="flex justify-center">
                    <WeekNavigator
                        currentDate={currentDate}
                        weekNumber={weekNumber}
                        onNavigateWeek={navigateWeek}
                        showCalendar={false}
                        weekRange={availableDays?.some(d => d === 0 || d === 6) ? 'full' : 'workdays'}
                    />
                </div>
                <WeekDaySelector
                    currentDate={currentDate}
                    currentDayIndex={selectedDay}
                    onDayChange={setSelectedDay}
                    availableDays={availableDays}
                />
            </div>

            {/* Mode Switcher */}
            <Tabs value={mode} onValueChange={setMode}>
                <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200 p-1 rounded-lg">
                    <TabsTrigger
                        value="report"
                        className="flex items-center gap-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:border-gray-900 border border-transparent hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 text-sm"
                    >
                        <BarChart3 className="w-4 h-4" />
                        Relatório do Dia
                    </TabsTrigger>
                    <TabsTrigger
                        value="pre_preparo_list"
                        className="flex items-center gap-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:border-gray-900 border border-transparent hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 text-sm"
                    >
                        <ClipboardList className="w-4 h-4" />
                        Listas Consolidadas
                    </TabsTrigger>
                    <TabsTrigger
                        value="config"
                        className="flex items-center gap-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:border-gray-900 border border-transparent hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 text-sm"
                    >
                        <Settings2 className="w-4 h-4" />
                        Configuração de Receitas
                    </TabsTrigger>
                </TabsList>

                {/* REPORT MODE */}
                <TabsContent value="report" className="mt-6 space-y-6">
                    {/* Summary header */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader className="py-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <CardTitle className="flex items-center gap-2 text-gray-800 text-base uppercase tracking-wide">
                                    <ChefHat className="w-5 h-5" />
                                    Escala Cozinha — {dateLabel}
                                </CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePrint()}
                                    disabled={printing}
                                    className="gap-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                                >
                                    {printing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Printer className="w-4 h-4" />
                                    )}
                                    Imprimir Tudo
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Task sections — all grouped */}
                    {renderGroupedSection('rendimento')}
                    {renderGroupedSection('pre_preparo')}
                    {renderGroupedSection('processamento')}
                    {renderGroupedSection('sem_categoria')}

                    {/* Total footer */}
                    {(() => {
                        const flatKeys = ['rendimento', 'pre_preparo', 'processamento', 'sem_categoria'];
                        const totalAllItems = flatKeys.reduce(
                            (sum, k) => sum + (taskReports[k]?.length || 0), 0
                        );
                        const totalAllWeight = flatKeys.reduce(
                            (sum, k) => sum + (taskReports[k] || []).reduce((s, i) => s + i.totalWeight, 0), 0
                        );
                        if (totalAllItems === 0) return null;
                        return (
                            <Card className="border border-gray-300 bg-gray-50">
                                <CardContent className="py-3 px-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                            Total Geral
                                        </span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-gray-500">
                                                {totalAllItems} ingredientes
                                            </span>
                                            <span className="text-lg font-bold text-gray-900 tabular-nums">
                                                {formatWeight(totalAllWeight)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })()}
                </TabsContent>

                {/* LISTAS CONSOLIDADAS MODE */}
                <TabsContent value="pre_preparo_list" className="mt-6 flex flex-col gap-6">
                    {/* Header com botão de impressão */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader className="py-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <CardTitle className="flex items-center gap-2 text-gray-800 text-base uppercase tracking-wide">
                                    <ClipboardList className="w-5 h-5" />
                                    Listas Consolidadas — {dateLabel}
                                </CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePrintConsolidated}
                                    disabled={printing}
                                    className="gap-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                                >
                                    {printing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Printer className="w-4 h-4" />
                                    )}
                                    Imprimir Consolidadas
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>
                    {['rendimento', 'pre_preparo', 'processamento'].map(taskKey => {
                        const items = taskReports[taskKey] || [];
                        const taskDef = TASK_TYPES[taskKey];

                        return (
                            <Card key={taskKey} className={`border ${taskDef.borderClass} bg-white`}>
                                <CardHeader className={`${taskDef.headerClass} border-b ${taskDef.borderClass} py-4 px-6`}>
                                    <CardTitle className={`flex items-center justify-between ${taskDef.textClass}`}>
                                        <div className="flex items-center gap-2">
                                            <ClipboardList className="w-5 h-5" />
                                            {taskDef.label} (Consolidada)
                                        </div>
                                        <div className="text-sm font-medium">
                                            {dateLabel}
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {items.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500">
                                            Nenhum item de {taskDef.label.toLowerCase()} para este dia.
                                        </div>
                                    ) : (
                                        <div className="w-full">
                                            {/* Table Header */}
                                            <div className={`grid grid-cols-[120px_2fr_2fr_4fr] divide-x border-b ${taskDef.borderClass} ${taskDef.categoryBg} border-t-0 font-semibold text-xs tracking-wider uppercase ${taskDef.textClass}`}>
                                                <div className="text-right px-4 py-3">Peso Bruto</div>
                                                <div className="px-4 py-3">Nome do Insumo</div>
                                                <div className="px-4 py-3">Categoria</div>
                                                <div className="px-4 py-3">Receitas</div>
                                            </div>

                                            {/* Table Body */}
                                            <div className={`divide-y ${taskDef.borderClass}`}>
                                                {items.map((ing, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`grid grid-cols-[120px_2fr_2fr_4fr] divide-x divide-slate-200 items-stretch hover:bg-slate-50 transition-colors text-sm`}
                                                    >
                                                        <div className="text-right font-bold tabular-nums text-blue-700 px-4 py-3 flex items-center justify-end">
                                                            {formatWeight(ing.totalWeight)}
                                                        </div>
                                                        <div className="font-medium text-slate-800 px-4 py-3 flex items-center">
                                                            {ing.displayName}
                                                        </div>
                                                        <div className="px-4 py-3 flex flex-wrap content-center gap-1">
                                                            {ing.sourceCategories && ing.sourceCategories.length > 0 ? (
                                                                [...ing.sourceCategories]
                                                                    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
                                                                    .map((cat, catIdx) => (
                                                                        <Badge key={catIdx} variant="secondary" className="bg-slate-100 text-slate-600 font-normal px-1.5 py-0 text-[10px]">
                                                                            {cat}
                                                                        </Badge>
                                                                    ))
                                                            ) : (
                                                                <span className="text-xs text-slate-400 italic">—</span>
                                                            )}
                                                        </div>
                                                        <div className="px-4 py-3">
                                                            <div className="flex flex-col text-xs text-slate-600 leading-tight border border-slate-200 rounded-md overflow-hidden bg-white">
                                                                {ing.sourceRecipes && ing.sourceRecipes.length > 0 ? (
                                                                    [...ing.sourceRecipes]
                                                                        .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
                                                                        .map((rec, rIdx) => (
                                                                            <div key={rIdx} className="w-full px-2 py-1.5 border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                                                                                • {rec}
                                                                            </div>
                                                                        ))
                                                                ) : (
                                                                    <div className="px-2 py-1.5 italic text-slate-400">—</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </TabsContent>

                {/* CONFIG MODE */}
                <TabsContent value="config" className="mt-6">
                    <RecipeTaskConfig
                        recipes={recipes}
                        updateIngredientTaskType={updateIngredientTaskType}
                        saving={saving}
                        configStats={configStats}
                        activeRecipeIds={activeRecipeIds}
                        menuRecipeIds={menuRecipeIds}
                        categories={categories}
                        getCategoryInfo={getCategoryInfo}
                        taskReports={taskReports}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default EscalaCozinhaTab;
