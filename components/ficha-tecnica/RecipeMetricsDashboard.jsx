import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useRecipeMetrics } from '@/hooks/ficha-tecnica/useRecipeStore';

const MetricCard = ({ label, value, unit, gradient, borderColor, textColor, unitColor, tooltip }) => (
  <div className={`bg-gradient-to-br ${gradient} p-4 rounded-lg border ${borderColor} hover:shadow-md transition-all duration-200`}>
    <div className={`text-sm font-medium ${textColor} mb-1 flex items-center gap-1`}>
      {label}
      {tooltip && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 opacity-60 hover:opacity-100 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs bg-gray-900 text-white p-2">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    <div className={`text-xl font-bold flex items-center ${textColor.replace('-600', '-700').replace('-500', '-700')}`}>
      <span className={`${unitColor} mr-1`}>{unit}</span>
      {value}
    </div>
  </div>
);

// O componente agora aceita a prop 'variant' para alternar entre 'card' (padrão) e 'list' (original)
export default function RecipeMetricsDashboard({ metricsData, className, costFieldName, weightFieldName, variant = 'card' }) {
  // Se receber dados via prop, usa. Se não, busca da store.
  const { raw: storeMetrics } = useRecipeMetrics();

  // Prioridade: metricsData (prop) -> storeMetrics (hook) -> Objeto vazio
  const metricsSource = metricsData || storeMetrics;

  // Fallback seguro par valores zerados
  const metrics = {
    total_weight: metricsSource?.total_weight || 0,
    yield_weight: metricsSource?.yield_weight || 0,
    cost_per_kg_raw: metricsSource?.cost_per_kg_raw || 0,
    cost_per_kg_yield: metricsSource?.cost_per_kg_yield || 0,
    cuba_weight: metricsSource?.cuba_weight || 0,
    cuba_cost: metricsSource?.cuba_cost || 0,
    total_cost: metricsSource?.total_cost || 0,
  };

  const formatDisplayValue = (value, type) => {
    const num = parseFloat(value) || 0;
    if (type === 'weight') return num.toFixed(3).replace('.', ',');
    if (type === 'currency') return num.toFixed(2).replace('.', ',');
    return num.toString().replace('.', ',');
  };

  const metricsConfig = [
    {
      label: 'Peso Bruto',
      value: formatDisplayValue(metrics.total_weight, 'weight'),
      unit: 'kg',
      gradient: 'from-gray-50 to-gray-100',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-500',
      unitColor: 'text-gray-400',
      tooltip: 'Soma de todos os pesos brutos dos ingredientes (antes de processar). Fórmula: Σ peso_bruto_ingredientes',
      // Cores específicas para modo lista
      listBgHover: 'hover:bg-gray-50',
      listTextLabel: 'text-gray-500',
      listTextValue: 'text-gray-700',
      listUnitColor: 'text-gray-400'
    },
    {
      label: 'Peso Líquido',
      value: formatDisplayValue(metrics.yield_weight, 'weight'),
      unit: 'kg',
      gradient: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-600',
      unitColor: 'text-blue-400',
      tooltip: 'Peso final após todos os processos (perdas de limpeza, cocção, etc). Fórmula: Σ peso_final_ingredientes',
      listBgHover: 'hover:bg-blue-50 bg-blue-50/10',
      listTextLabel: 'text-blue-600 font-medium',
      listTextValue: 'text-blue-700 font-bold',
      listUnitColor: 'text-blue-400'
    },
    {
      label: 'Custo/Kg (Bruto)',
      value: formatDisplayValue(metrics.cost_per_kg_raw, 'currency'),
      unit: 'R$',
      gradient: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      textColor: 'text-green-600',
      unitColor: 'text-green-400',
      tooltip: 'Custo total dividido pelo peso bruto. Fórmula: CMV Total ÷ Peso Bruto',
      listBgHover: 'hover:bg-gray-50 border-t-2 border-dashed border-gray-200',
      listTextLabel: 'text-gray-500',
      listTextValue: 'text-gray-700 font-semibold',
      listUnitColor: 'text-gray-400'
    },
    {
      label: 'Custo/Kg (Liq)',
      value: formatDisplayValue(metrics.cost_per_kg_yield, 'currency'),
      unit: 'R$',
      gradient: 'from-indigo-50 to-indigo-100',
      borderColor: 'border-indigo-200',
      textColor: 'text-indigo-600',
      unitColor: 'text-indigo-400',
      tooltip: 'Custo total dividido pelo peso líquido. Fórmula: CMV Total ÷ Peso Líquido. Inclui embalagem proporcional.',
      listBgHover: 'hover:bg-green-50 bg-green-50/10',
      listTextLabel: 'text-green-600 font-medium',
      listTextValue: 'text-green-700 font-bold',
      listUnitColor: 'text-green-400'
    },
    {
      label: weightFieldName || 'Peso da Cuba',
      value: formatDisplayValue(metrics.cuba_weight, 'weight'),
      unit: 'kg',
      gradient: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-600',
      unitColor: 'text-purple-400',
      tooltip: 'Peso final da receita/porção pronta. É o peso que vai para venda ou consumo.',
      listBgHover: 'hover:bg-pink-50 bg-pink-50/10', // Mantendo cores originais aproximadas ou ajustando se necessário? O original não tinha roxo na lista, vamos ver
      // Original tinha peso da cuba? No código inline removido não tinha peso da cuba explicitamente na lista, mas tinha custo da cuba. Vamos manter para consistência.
      listBgHover: 'hover:bg-purple-50 bg-purple-50/10',
      listTextLabel: 'text-purple-600 font-medium',
      listTextValue: 'text-purple-700 font-bold',
      listUnitColor: 'text-purple-400'
    },
    {
      label: costFieldName || 'Custo CMV',
      value: formatDisplayValue(metrics.cuba_cost, 'currency'),
      unit: 'R$',
      gradient: 'from-pink-50 to-pink-100',
      borderColor: 'border-pink-200',
      textColor: 'text-pink-600',
      unitColor: 'text-pink-400',
      tooltip: 'Custo de Mercadoria Vendida. Soma de todos os custos (ingredientes + embalagem). Fórmula: Σ custos_ingredientes + Σ custos_embalagem',
      listBgHover: 'hover:bg-pink-50 bg-pink-50/10',
      listTextLabel: 'text-pink-600 font-medium',
      listTextValue: 'text-pink-700 font-bold',
      listUnitColor: 'text-pink-400'
    }
  ];

  if (variant === 'list') {
    return (
      <div className={`divide-y divide-gray-100 ${className || ''}`}>
        {metricsConfig.map((metric, idx) => (
          <div key={metric.label} className={`flex justify-between items-center p-4 ${metric.listBgHover || ''}`}>
            <span className={`text-sm flex items-center gap-1 ${metric.listTextLabel}`}>
              {metric.label}
              {metric.tooltip && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {/* Cor do ícone ajustada para combinar com o label */}
                      <HelpCircle className={`h-3 w-3 opacity-60 hover:opacity-100 cursor-help`} />
                    </TooltipTrigger>
                    {/* Z-index alto e quebra de linha normal */}
                    <TooltipContent side="top" className="max-w-[200px] text-xs bg-gray-900 text-white p-2 z-[9999] whitespace-normal">
                      {metric.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </span>
            <span className={`flex items-center ${metric.listTextValue}`}>
              <span className={`text-xs mr-1 ${metric.listUnitColor}`}>{metric.unit}</span>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Variant 'card' (Padrão)
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${className || ''}`}>
      {metricsConfig.map(metric => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}
