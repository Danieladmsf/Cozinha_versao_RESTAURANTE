import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

const MetricDisplay = ({ label, value, unit, gradient, tooltip }) => (
  <div className={`bg-gradient-to-br ${gradient} p-4 rounded-lg border hover:shadow-md transition-all duration-200`}>
    <div className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
      {label}
      {tooltip && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs bg-gray-900 text-white p-2">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    <div className="text-xl font-bold flex items-center text-gray-700">
      <span className="text-gray-400 mr-1">{unit}</span>
      {value}
    </div>
  </div>
);

const RecipeMetrics = ({ recipe, formattedMetrics }) => {
  const metrics = [
    {
      label: 'Peso Bruto',
      value: formattedMetrics.totalWeight,
      unit: 'kg',
      gradient: 'from-gray-50 to-gray-100',
      tooltip: 'Soma de todos os pesos brutos dos ingredientes (antes de processar). Fórmula: Σ peso_bruto_ingredientes'
    },
    {
      label: 'Peso Líquido',
      value: formattedMetrics.yieldWeight,
      unit: 'kg',
      gradient: 'from-blue-50 to-blue-100',
      tooltip: 'Peso final após todos os processos (perdas de limpeza, cocção, etc). Fórmula: Σ peso_final_ingredientes'
    },
    {
      label: 'Custo/Kg (Bruto)',
      value: formattedMetrics.costPerKgRaw,
      unit: 'R$',
      gradient: 'from-green-50 to-green-100',
      tooltip: 'Custo total dividido pelo peso bruto. Fórmula: CMV Total ÷ Peso Bruto'
    },
    {
      label: 'Custo/Kg (Liq)',
      value: formattedMetrics.costPerKgYield,
      unit: 'R$',
      gradient: 'from-indigo-50 to-indigo-100',
      tooltip: 'Custo total dividido pelo peso líquido. Fórmula: CMV Total ÷ Peso Líquido. Inclui embalagem proporcional.'
    },
    {
      label: recipe.weight_field_name || 'Peso da Cuba',
      value: formattedMetrics.cubaWeight,
      unit: 'kg',
      gradient: 'from-purple-50 to-purple-100',
      tooltip: 'Peso final da receita/porção pronta. É o peso que vai para venda ou consumo.'
    },
    {
      label: recipe.cost_field_name || 'Custo CMV',
      value: formattedMetrics.cubaCost,
      unit: 'R$',
      gradient: 'from-pink-50 to-pink-100',
      tooltip: 'Custo de Mercadoria Vendida. Soma de todos os custos (ingredientes + embalagem). Fórmula: Σ custos_ingredientes + Σ custos_embalagem'
    },
  ];

  return (
    <Card className="bg-white backdrop-blur-sm bg-opacity-90 border border-gray-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-gray-700">
          Métricas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map(metric => (
            <MetricDisplay key={metric.label} {...metric} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(RecipeMetrics);

