'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
        suggestedAdjustment: null
    };
}

/**
 * Formata hora da última venda
 */
function formatLastSaleTime(isoString) {
    if (!isoString) return '--:--';
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
    weekStart    // Recebe inicio da semana
}) => {
    // Hook para API VR
    const {
        salesData,
        loading: salesLoading,
        apiOnline,
        lastUpdate,
        getProductSalesInPeriod, // Usar função de período
        refresh,
        checkStatus
    } = useVRSalesApi({ refreshInterval: 3 * 60 * 1000 }); // 3 minutos

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

    // Buscar dados quando itens ou datas mudam
    useEffect(() => {
        const vrCodes = ruptureItems
            .map(item => item.vr_product_code)
            .filter(code => code && !isNaN(code));

        if (vrCodes.length > 0 && periodInfo && !periodInfo.isFutureDate) {
            getProductSalesInPeriod(vrCodes, periodInfo.startDateStr, periodInfo.endDateStr);
        }
    }, [ruptureItems, getProductSalesInPeriod, periodInfo]);

    // Função de refresh manual
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refresh();
        setIsRefreshing(false);
    };

    // Calcular itens com alertas
    const itemsWithAlerts = useMemo(() => {
        return ruptureItems.map(item => ({
            ...item,
            ruptureStatus: calculateRuptureStatus(item, salesData, periodInfo),
            salesInfo: item.vr_product_code ? salesData[item.vr_product_code] : null
        }));
    }, [ruptureItems, salesData, periodInfo]);

    // Contar alertas
    const alertCount = useMemo(() => {
        return itemsWithAlerts.filter(item => item.ruptureStatus.alert).length;
    }, [itemsWithAlerts]);

    if (ruptureLoading) {
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
        <div className="space-y-4">
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
                                                        <TooltipTrigger className="flex items-center justify-center gap-1 cursor-help">
                                                            <ShoppingCart className="w-3 h-3" />
                                                            Vendido
                                                            <span className="text-[10px] bg-purple-100 text-purple-600 px-1 rounded">
                                                                {periodInfo ? `${periodInfo.formattedStart}-${periodInfo.formattedEnd}` : ''}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Vendas acumuladas no período
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </th>
                                                <th className="text-center p-2 text-xs font-medium text-purple-700">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Timer className="w-3 h-3" />
                                                        Últ. Venda
                                                    </div>
                                                </th>
                                                <th className="text-left p-2 pl-4 text-xs font-medium text-purple-700">Hora Ruptura</th>
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
                                                                <p className="font-medium text-purple-900 text-xs">{item.recipe_name}</p>
                                                                <p className="text-xs text-purple-600">
                                                                    {utilFormattedQuantity(item.ordered_quantity)} {item.ordered_unit_type}
                                                                </p>
                                                                {item.vr_product_code && (
                                                                    <p className="text-[10px] text-gray-400">VR: {item.vr_product_code}</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            {salesLoading ? (
                                                                <Loader2 className="w-3 h-3 animate-spin mx-auto text-purple-400" />
                                                            ) : salesInfo ? (
                                                                <div className="text-xs">
                                                                    <span className="font-semibold text-purple-700">
                                                                        {utilFormattedQuantity(salesInfo.quantidade_total || 0)}
                                                                    </span>
                                                                    <span className="text-gray-400 ml-1">
                                                                        ({salesInfo.numero_vendas || 0}x)
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">-</span>
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            {salesLoading ? (
                                                                <Loader2 className="w-3 h-3 animate-spin mx-auto text-purple-400" />
                                                            ) : salesInfo?.ultima_venda ? (
                                                                <span className="text-xs font-medium text-purple-700">
                                                                    {formatLastSaleTime(salesInfo.ultima_venda)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">--:--</span>
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-left align-middle pl-4">
                                                            <Input
                                                                type="time"
                                                                value={item.rupture_time || ''}
                                                                onChange={(e) => updateRuptureItem(globalIndex, 'rupture_time', e.target.value)}
                                                                className="text-left text-xs h-8 w-[100px] border-purple-300 focus:border-purple-500 block"
                                                            />
                                                        </td>
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
