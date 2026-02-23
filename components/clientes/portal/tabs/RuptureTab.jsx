'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Send, AlertTriangle, Loader2, CheckCircle, Clock,
    Hourglass, TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff,
    ShoppingCart, Timer
} from "lucide-react";
import {
    formattedQuantity as utilFormattedQuantity,
    formatCurrency as utilFormatCurrency
} from "@/components/utils/orderUtils";
import { useVRSalesApi } from "@/hooks/useVRSalesApi";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OrderSuggestionManager } from "@/lib/order-suggestions";

import { addDays, format, isFuture, isSameDay } from 'date-fns';

// Constantes para cálculo de ruptura
const HOURS_PER_DAY = 9; // 9 horas de funcionamento por dia

/**
 * Calcula o status de ruptura baseado nos dados de venda
 * @param {Object} item - Item do cardápio
 * @param {Object} salesData - Dados de vendas da API VR
 * @returns {Object} Status de ruptura calculado
 */
function calculateRuptureStatus(item, salesData, periodInfo) {
    const vrCode = item.vr_product_code;
    const sales = vrCode ? salesData[vrCode] : null;

    // Se não tem duração definida, assume 1 dia por padrão
    const durationDays = item.expected_duration ? parseInt(item.expected_duration) : 1;

    if (!sales) {
        return {
            alert: false,
            severity: null,
            message: null,
            suggestedAdjustment: null
        };
    }

    // CENÁRIO 0b: Venda sem Produção (Erro real)
    if (sales && sales.quantidade_total > 0 && (!item.ordered_quantity || item.ordered_quantity === 0)) {
        return {
            alert: true,
            severity: 'high',
            message: `Erro: Vendas (${utilFormattedQuantity(sales.quantidade_total)}) sem produção`,
            suggestedAdjustment: null,
            ratio: null
        };
    }

    // Calcular horas esperadas totais (Baseado em dias de funcionamento)
    const expectedHoursTotal = durationDays * HOURS_PER_DAY;

    // Datas base
    const now = new Date();
    const menuDate = periodInfo ? periodInfo.menuDate : now;

    // Verificar Ruptura Implícita (Vendas >= Pedido)
    let isStockOut = false;
    let stockOutDate = null;

    // Se vendeu mais ou igual ao pedido, assumimos que acabou na última venda
    if (sales && item.ordered_quantity > 0 && sales.quantidade_total >= item.ordered_quantity) {
        isStockOut = true;
        if (sales.ultima_venda) {
            stockOutDate = new Date(sales.ultima_venda);
        }
    }

    // Determinar data final real para cálculo de duração
    let actualEndDate = now;

    // Se usuário marcou hora manual -> tem prioridade
    if (item.rupture_time) {
        const [h, m] = item.rupture_time.split(':').map(Number);
        actualEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    }
    // Se não marcou manual, mas estourou estoque -> usa data da última venda
    else if (isStockOut && stockOutDate) {
        actualEndDate = stockOutDate;
    }

    // Se a data final calc for anterior ao menu, algo errado (vendas antigas?)
    if (actualEndDate < menuDate) actualEndDate = menuDate;

    // Calcular Duração Real em Horas Úteis
    const diffMs = actualEndDate - menuDate;
    const totalDaysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const endDayStart = new Date(actualEndDate.getFullYear(), actualEndDate.getMonth(), actualEndDate.getDate(), 8, 0, 0);
    let hoursLastDay = (actualEndDate - endDayStart) / (1000 * 60 * 60);

    if (hoursLastDay < 0) hoursLastDay = 0;
    if (hoursLastDay > HOURS_PER_DAY) hoursLastDay = HOURS_PER_DAY;

    const actualHoursTotal = (totalDaysPassed * HOURS_PER_DAY) + hoursLastDay;

    // LOGS
    if (sales && sales.quantidade_total > 0) {
        console.log(`[Ruptura] ${item.recipe_name}`);
        console.log(` Vendas: ${sales.quantidade_total}/${item.ordered_quantity} | StockOut? ${isStockOut}`);
        console.log(` Menu: ${menuDate.toLocaleDateString()} | End: ${actualEndDate.toLocaleDateString()} ${actualEndDate.toLocaleTimeString()}`);
        console.log(` TotalHoras: ${actualHoursTotal.toFixed(1)} vs Meta: ${expectedHoursTotal}`);
    }

    // AVALIAÇÃO FINAL
    // Se já rompeu (Manual ou Implícito)
    if (item.rupture_time || isStockOut) {
        // Se durou menos que o esperado
        if (actualHoursTotal < expectedHoursTotal) {
            const ratio = expectedHoursTotal / (actualHoursTotal || 0.1);
            // Sugestão de ajuste
            const suggestedQty = Math.ceil(item.ordered_quantity * ratio * 1.1);

            let severity = 'low';
            if (ratio >= 2) severity = 'high';
            else if (ratio >= 1.5) severity = 'medium';

            const msgDuration = (actualHoursTotal / HOURS_PER_DAY).toFixed(1);

            return {
                alert: true,
                severity,
                message: `Alert: Durou ${msgDuration}d (Meta: ${durationDays}d)`,
                suggestedAdjustment: suggestedQty,
                ratio
            };
        } else {
            // Durou o suficiente ou mais!
            return {
                alert: false, // Status VERDE/OK
                severity: 'success',
                message: `Meta atingida! Durou ${(actualHoursTotal / HOURS_PER_DAY).toFixed(1)} dias`,
                suggestedAdjustment: null
            };
        }
    }

    // Se NÃO rompeu (ainda tem estoque teórico) -> Previsão
    if (item.ordered_quantity > 0 && sales.quantidade_total > 0) {
        // Taxa de consumo = Vendas / Horas até agora
        const consumptionRate = sales.quantidade_total / actualHoursTotal;
        const totalCapacityHours = item.ordered_quantity / consumptionRate;

        if (totalCapacityHours < expectedHoursTotal * 0.7) {
            return {
                alert: true,
                severity: 'medium',
                message: `Consumo alto! Est. total: ${(totalCapacityHours / HOURS_PER_DAY).toFixed(1)} dias`,
                suggestedAdjustment: Math.ceil(item.ordered_quantity * (expectedHoursTotal / totalCapacityHours)),
                estimatedDuration: totalCapacityHours
            };
        }
    }

    return {
        alert: false,
        severity: null,
        message: null,
        suggestedAdjustment: null,
        // Helper para UI
        menuDate: menuDate,
        lastSaleDate: sales && sales.ultima_venda ? new Date(sales.ultima_venda) : null,
        durationDays: durationDays
    };
}

/**
 * Verifica se a venda ocorreu fora do prazo de validade
 */
function isSaleExpired(lastSaleDate, menuDate, durationDays) {
    if (!lastSaleDate || !menuDate) return false;

    // Data limite = Menu + Duração (em dias)
    // Ex: Menu 01/01 + 1 dia = Expira fim do dia 01/01 (ou inicio do 02?)
    // Interpretando "Validade 1 dia": Feito dia 1, vale até o fim do dia 1.
    // MenuDate geralmente é 00:00:00.

    // Adicionamos (durationDays) dias ao menu para ter o limite
    // Ex: Duração 1 dia. Menu 01/01. Limite: 02/01 00:00 (ou fim do dia 01)
    // Vamos considerar que se vendeu NO DIA SEGUINTE ao limite, já era.

    const limitDate = addDays(menuDate, durationDays);
    // Ajustar para fim do dia limite? Ou apenas comparar datas?
    // Se duração = 1 (1 dia). Menu 02/02.
    // Limite = 03/02 00:00. 
    // Venda 02/02 23:59 -> OK (delta < 24h)
    // Venda 03/02 08:00 -> Vencido? Sim, se validade é 1 dia (consumir no dia).

    return lastSaleDate > limitDate;
}

/**
 * Formata hora da última venda
 */
function formatLastSaleTime(isoString) {
    if (!isoString) return '--:--';
    try {
        const date = new Date(isoString);
        return format(date, 'dd/MM/yy - HH:mm');
    } catch {
        return '--:--';
    }
}



const RuptureTab = ({
    ruptureLoading,
    ruptureItems,
    ruptureNotes,
    setRuptureNotes,
    updateRuptureItem,
    saveRuptureData,
    showSuccessEffect,
    existingRupture,
    groupItemsByCategory,
    getOrderedCategories,
    generateCategoryStyles,
    selectedDay, // Recebe dia selecionado (0-6)
    weekStart,    // Recebe inicio da semana
    storeId       // Recebe ID da Loja VR
}) => {
    // Hook para API VR
    const {
        salesData: fullSalesData, // Agora recebe o mapa completo
        loading: salesLoading,
        apiOnline,
        lastUpdate,
        refresh // Re-adicionado para evitar erro de referência
    } = useVRSalesApi();

    const [isRefreshing, setIsRefreshing] = useState(false);

    // Calcular datas do período
    const periodInfo = useMemo(() => {
        if (!weekStart || selectedDay === undefined) return null;

        const menuDate = addDays(weekStart, selectedDay);
        const now = new Date();

        // Data formatada para API
        const startDateStr = format(menuDate, 'yyyy-MM-dd');
        const endDateStr = format(now, 'yyyy-MM-dd');

        // Flag se é futuro
        const isFutureDate = isFuture(menuDate) && !isSameDay(menuDate, now);

        return {
            menuDate,
            startDateStr,
            endDateStr,
            isFutureDate,
            formattedStart: format(menuDate, 'dd/MM'),
            formattedEnd: format(now, 'dd/MM')
        };
    }, [weekStart, selectedDay]);

    // Função de refresh manual (Mantida para feedback visual)
    const handleRefresh = async () => {
        setIsRefreshing(true);
        if (refresh) await refresh();
        // Delay artificial curto apenas para feedback visual se o refresh for instantâneo
        setTimeout(() => setIsRefreshing(false), 500);
    };

    // FILTRO LOCAL: Processa os dados brutos para o dia selecionado
    // Isso é instantâneo e não causa flicker
    const dailySalesMap = useMemo(() => {
        if (!fullSalesData || !periodInfo || !periodInfo.menuDate) {
            console.log('🔴 [RuptureTab] Missing data for map:', {
                hasSales: !!fullSalesData,
                hasPeriod: !!periodInfo,
                menuDate: periodInfo?.menuDate
            });
            return {};
        }

        const map = {};
        const targetDate = periodInfo.menuDate;
        // Como o filtro é por dia único (ou acumulado até o dia?), 
        // O código anterior somava: d >= start && d <= end.
        // Aqui start=menuDate, end=now.

        const startStr = periodInfo.startDateStr;
        const endStr = periodInfo.endDateStr;

        console.log('🟠 [RuptureTab] processing daily sales with strings:', { startStr, endStr });

        Object.values(fullSalesData).forEach(item => {
            let periodTotal = 0;
            let lastSale = item.ultima_venda;

            // Logic: Select Store-Specific Data if available
            let sourceData = item;

            if (storeId && item.stores && item.stores[storeId]) {
                sourceData = item.stores[storeId];
                console.log(`🏬 [RuptureTab] Using Store specific data for product ${item.codigo} (Store: ${storeId})`);
                // Override last sale from store specific data
                if (sourceData.ultima_venda) {
                    lastSale = sourceData.ultima_venda;
                }
            } else if (storeId) {
                // If storeId is requested but not found for this product, it might have 0 sales in this store
                // We should theoretically treat as 0 sales, but for now fallback or keep 0?
                // If the product exists in global but not in store, it implies 0 sales for that store.
                // Let's use a safe empty object so we don't count global sales.
                console.log(`⚠️ [RuptureTab] Product ${item.codigo} has no data for Store ${storeId}. Assuming 0 sales.`);
                sourceData = { daily: {}, received_quantity: 0 };
                lastSale = null;
            }

            if (sourceData.daily) {
                Object.entries(sourceData.daily).forEach(([dateStr, qty]) => {
                    // Comparação de Strings ISO (yyyy-MM-dd) funciona perfeitamente
                    if (dateStr >= startStr && dateStr <= endStr) {
                        periodTotal += (Number(qty) || 0);
                    }
                });
            }

            map[item.codigo] = {
                ...item,
                quantidade_total: periodTotal, // Sobrescreve para exibição local
                ultima_venda: lastSale,        // Update last sale date
                // Mantemos o original se precisar
            };

            // Garantir que a chave seja string para lookup consistente
            map[String(item.codigo)] = map[item.codigo];
        });

        return map;
    }, [fullSalesData, periodInfo]);

    // Calcular itens com alertas (Usando o mapa filtrado localmente)
    const itemsWithAlerts = useMemo(() => {
        return ruptureItems.map(item => ({
            ...item,
            ruptureStatus: calculateRuptureStatus(item, dailySalesMap, periodInfo),
            salesInfo: item.vr_product_code ? dailySalesMap[String(item.vr_product_code)] : null
        }));
    }, [ruptureItems, dailySalesMap, periodInfo]);

    // Contar alertas
    const alertCount = useMemo(() => {
        return itemsWithAlerts.filter(item => item.ruptureStatus.alert).length;
    }, [itemsWithAlerts]);

    // LOADING STATE LOGIC:
    // 1. Initial Load or Empty + Loading -> Show Full Loader
    // 2. Data + Loading -> Show Content + Overlay (No flicker)
    // 3. No Data + Not Loading -> Show Empty State

    if (ruptureLoading && ruptureItems.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 text-purple-500 animate-spin" />
                    <p className="text-purple-600">Carregando dados de ruptura...</p>
                </CardContent>
            </Card>
        );
    }

    if (ruptureItems.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                    <h3 className="font-semibold text-lg text-gray-700 mb-2">Nenhum Item Disponível</h3>
                    <p className="text-gray-500 text-sm">
                        Não há itens disponíveis no cardápio para registrar ruptura neste dia.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4 relative min-h-[500px]">
            {/* Loading Overlay (if we have items but are refreshing) */}
            {/* Overlay Loader removido para experiência nativa */}

            {/* Efeito de Sucesso Overlay */}
            {showSuccessEffect && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-500">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-purple-600 mb-2">Ruptura Salva!</h2>
                            <p className="text-gray-600">Os dados foram salvos com sucesso</p>
                            <div className="mt-4 flex items-center justify-center text-purple-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                <span className="ml-2 text-sm">Processando...</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status da API e Alertas */}
            <Card className={`border-2 ${apiOnline ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Status da API */}
                            <div className="flex items-center gap-2">
                                {apiOnline ? (
                                    <><Wifi className="w-4 h-4 text-green-600" /><span className="text-sm text-green-700">API VR Online</span></>
                                ) : (
                                    <><WifiOff className="w-4 h-4 text-red-600" /><span className="text-sm text-red-700">API VR Offline</span></>
                                )}
                            </div>

                            {/* Última atualização */}
                            {lastUpdate && (
                                <span className="text-xs text-gray-500">
                                    Atualizado: {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}

                            {/* Contador de alertas */}
                            {alertCount > 0 && (
                                <Badge variant="destructive" className="animate-pulse">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {alertCount} alerta{alertCount > 1 ? 's' : ''}
                                </Badge>
                            )}
                        </div>

                        {/* Botão refresh */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing || salesLoading}
                        >
                            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Status de Ruptura Salva */}
            {existingRupture && !showSuccessEffect && (
                <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="p-4">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-purple-700">Ruptura Registrada</h3>
                                <p className="text-sm text-purple-600">Este registro já foi processado e salvo. Atualize os dados se necessário.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabela de Ruptura por Categoria */}
            <TooltipProvider>
                {getOrderedCategories(
                    groupItemsByCategory(itemsWithAlerts, (item) => item.category)
                ).map(({ name: categoryName, data: categoryData }) => {
                    const { headerStyle } = generateCategoryStyles(categoryData.categoryInfo.color);
                    return (
                        <div key={categoryName} className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-all duration-300">
                            <div
                                className="py-4 px-6 relative border-b border-gray-100/50"
                                style={headerStyle}
                            >
                                <div className="flex items-center">
                                    <div
                                        className="w-5 h-5 rounded-full mr-3 shadow-sm border-2 border-white/30 ring-2 ring-white/20"
                                        style={{ backgroundColor: categoryData.categoryInfo.color }}
                                    />
                                    <h3 className="text-lg font-semibold text-gray-800">{categoryName}</h3>
                                </div>
                            </div>
                            <div className="p-6 bg-gradient-to-b from-white to-gray-50/30">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-purple-100 bg-purple-50">
                                                <th className="text-left p-2 text-xs font-medium text-purple-700">Item</th>
                                                <th className="text-center p-2 text-xs font-medium text-purple-700">
                                                    <Tooltip>
                                                        <TooltipTrigger className="flex items-center justify-center gap-1 cursor-help w-full">
                                                            <ShoppingCart className="w-3 h-3" />
                                                            Vendido
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Vendas acumuladas no período
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </th>
                                                <th className="text-center p-2 text-xs font-medium text-purple-700">
                                                    <div className="flex items-center justify-center gap-1 w-full">
                                                        <Timer className="w-3 h-3" />
                                                        Últ. Venda
                                                    </div>
                                                </th>

                                                <th className="text-left p-2 pl-4 text-xs font-medium text-purple-700">Previsão Duração</th>
                                                <th className="text-center p-2 text-xs font-medium text-purple-700">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {categoryData.items.map((item, index) => {
                                                const globalIndex = ruptureItems.findIndex(ri => ri.recipe_id === item.recipe_id);
                                                const salesInfo = item.salesInfo;
                                                const ruptureStatus = item.ruptureStatus;

                                                return (
                                                    <tr
                                                        key={`rupture-${categoryName}-${item.recipe_id}-${index}`}
                                                        className={`border-b border-purple-50 ${ruptureStatus.alert ? 'bg-red-50/50' : ''}`}
                                                    >
                                                        <td className="p-2 w-1/4">
                                                            <div>
                                                                <p className="font-medium text-purple-900 text-xs">
                                                                    {item.vr_product_code && (
                                                                        <span className="text-orange-500 font-bold mr-1">
                                                                            #{String(item.vr_product_code).padStart(6, '0')}
                                                                        </span>
                                                                    )}
                                                                    {item.recipe_name}
                                                                </p>
                                                                <p className="text-xs text-purple-600">
                                                                    <span className="font-semibold mr-1">Pedido:</span>{utilFormattedQuantity(item.ordered_quantity)} {item.ordered_unit_type}
                                                                </p>
                                                            </div>
                                                        </td>

                                                        {/* 2. Vendido */}
                                                        <td className="p-2 text-center">
                                                            {salesInfo ? (
                                                                <div className="flex flex-col items-center justify-center text-center">
                                                                    <span className="font-bold text-purple-700 text-sm">
                                                                        {(salesInfo.quantidade_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">-</span>
                                                            )}
                                                        </td>

                                                        {/* 3. Última Venda (com Validade) */}
                                                        <td className="p-2 text-center">
                                                            {salesInfo?.ultima_venda ? (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-xs font-medium text-purple-700">
                                                                        {formatLastSaleTime(salesInfo.ultima_venda)}
                                                                    </span>
                                                                    {isSaleExpired(
                                                                        ruptureStatus.lastSaleDate,
                                                                        ruptureStatus.menuDate,
                                                                        ruptureStatus.durationDays
                                                                    ) && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger>
                                                                                    <Badge variant="destructive" className="mt-1 text-[9px] px-1 py-0 h-4 flex gap-1 items-center bg-red-100 text-red-700 border-red-200 hover:bg-red-200">
                                                                                        <Clock className="w-2 h-2" />
                                                                                        Vencido
                                                                                    </Badge>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>Venda ocorreu após o prazo de validade ({ruptureStatus.durationDays}d)</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">--:--</span>
                                                            )}
                                                        </td>

                                                        {/* 4. Previsão Duração */}
                                                        <td className="p-2 text-left align-middle pl-4">
                                                            <select
                                                                value={item.expected_duration ? parseInt(item.expected_duration) : 1}
                                                                onChange={(e) => updateRuptureItem(globalIndex, 'expected_duration', parseInt(e.target.value))}
                                                                className="text-left text-xs h-8 w-full border-purple-300 focus:border-purple-500 block rounded-md border bg-transparent px-2 py-1"
                                                            >
                                                                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                                                    <option key={day} value={day}>
                                                                        {day} {day === 1 ? 'dia' : 'dias'}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>

                                                        {/* 5. Status */}
                                                        <td className="p-2 text-center">
                                                            {ruptureStatus.alert ? (
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <Badge
                                                                            variant={ruptureStatus.severity === 'high' ? 'destructive' : 'secondary'}
                                                                            className={`text-[10px] cursor-help ${ruptureStatus.severity === 'high' ? 'bg-red-500 animate-pulse' :
                                                                                ruptureStatus.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                                                                                }`}
                                                                        >
                                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                                            {ruptureStatus.severity === 'high' ? 'CRÍTICO' :
                                                                                ruptureStatus.severity === 'medium' ? 'ALERTA' : 'ATENÇÃO'}
                                                                        </Badge>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="max-w-xs">
                                                                        <div className="text-xs">
                                                                            <p className="font-semibold">{ruptureStatus.message}</p>
                                                                            {ruptureStatus.suggestedAdjustment && (
                                                                                <p className="mt-1 text-green-600">
                                                                                    💡 Sugestão: {ruptureStatus.suggestedAdjustment} unidades
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            ) : (
                                                                <Badge variant="outline" className="text-[10px] text-gray-500">
                                                                    OK
                                                                </Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </TooltipProvider>

            {/* Observações Gerais */}
            <Card className="border-purple-200">
                <CardContent className="p-4">
                    <label className="block text-sm font-medium text-purple-700 mb-2">
                        Observações Gerais sobre Ruptura
                    </label>
                    <Textarea
                        value={ruptureNotes}
                        onChange={(e) => setRuptureNotes(e.target.value)}
                        placeholder="Observações sobre motivos da ruptura ou ajustes necessários..."
                        className="min-h-[80px] border-purple-300 focus:border-purple-500"
                        rows={3}
                    />
                </CardContent>
            </Card>

            {/* Botão de Salvar */}
            <Button
                onClick={saveRuptureData}
                className={`w-full text-white transition-all duration-500 ${showSuccessEffect
                    ? 'bg-green-600 hover:bg-green-700 scale-105 shadow-lg'
                    : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                disabled={showSuccessEffect}
            >
                {showSuccessEffect ? (
                    <>
                        <CheckCircle className="w-4 h-4 mr-2 animate-bounce" />
                        Ruptura Salva!
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4 mr-2" />
                        {existingRupture ? 'Atualizar Ruptura' : 'Salvar Ruptura'}
                    </>
                )}
            </Button>
        </div>
    );
};

export default RuptureTab;
