'use client';

import React, { useState, Suspense } from 'react';
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

import { useTaskDistribution, TASK_TYPES, getCanonicalIngredientName } from '@/hooks/programacao/useTaskDistribution';
import { useProgramacaoRealtimeData } from '@/hooks/programacao/useProgramacaoRealtimeData';
import { useAvailableDays } from '@/hooks/useAvailableDays';
import { useCategoryDisplay } from '@/hooks/shared/useCategoryDisplay';
import WeekNavigator from '@/components/shared/WeekNavigator';
import WeekDaySelector from '@/components/shared/WeekDaySelector';
import RecipeTaskConfig from '../config/RecipeTaskConfig';
import { CategoryTree } from '@/app/api/entities';

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
        navigateWeek,
        loading,
    } = useProgramacaoRealtimeData();

    const availableDays = useAvailableDays();

    const {
        updateIngredientTaskType,
        configStats,
        saving,
        saveError,
        taskReports,
    } = useTaskDistribution(orders, recipes, setRecipes, selectedDay, categories);

    const selectedDayInfo = weekDays?.find(d => d.dayNumber === selectedDay);
    const dateLabel = selectedDayInfo?.fullDate || format(currentDate, 'dd/MM/yyyy', { locale: ptBR });

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
                        <span className="w-24 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Peso</span>
                        <span className="w-24 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Consolidado</span>
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
                                                    <span className="w-24 text-right font-semibold text-gray-800 text-sm tabular-nums">
                                                        {formatWeight(ing.totalWeight)}
                                                    </span>
                                                    <span className={`w-24 text-right text-sm tabular-nums ${hasMultiple
                                                        ? 'font-bold text-gray-800'
                                                        : 'text-gray-300'
                                                        }`}>
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
                <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200 p-1 rounded-lg">
                    <TabsTrigger
                        value="report"
                        className="flex items-center gap-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:border-gray-900 border border-transparent hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 text-sm"
                    >
                        <BarChart3 className="w-4 h-4" />
                        Relatório do Dia
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

                {/* CONFIG MODE */}
                <TabsContent value="config" className="mt-6">
                    <RecipeTaskConfig
                        recipes={recipes}
                        updateIngredientTaskType={updateIngredientTaskType}
                        saving={saving}
                        configStats={configStats}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default EscalaCozinhaTab;
