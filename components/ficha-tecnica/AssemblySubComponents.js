import React, { useCallback } from 'react';
import { RecipeEngine as RecipeCalculator } from "@/lib/recipe-engine/RecipeEngine";
import { formatCapitalize } from '@/lib/textUtils';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Scale, Layers, AlertTriangle, RefreshCw } from "lucide-react";
import { formatWeight, formatCurrency, parseNumericValue } from "@/lib/formatUtils";
// Removed useRecipeStore - avoiding conflicting state logic

const AssemblySubComponents = ({
  subComponents = [],
  onUpdateSubComponents,
  preparationsData = [],
  onRemoveSubComponent,
  showComponentsTable = true,
  onAddComponent,
  addComponentLabel = 'Adicionar Preparo/Receita',
  addComponentClassName = 'border-indigo-300 text-indigo-600 hover:bg-indigo-50',
  isProduct = false,
  onUpdatePreparation, // Local state update (single field)
  onBatchUpdatePreparations // Batch update for atomic multi-prep scaling
}) => {

  // Calculate total assembly weight from sub-components
  // Exclude packaging steps from weight sum (they contribute units/cost, not kg)
  const calculateTotalWeight = useCallback((components) => {
    if (!components || components.length === 0) return 0;

    return components.reduce((total, sc) => {
      // Check if this component's source preparation is a packaging step
      // SEMPRE excluir embalagem do peso, independentemente de ser receita ou produto
      const sourcePrep = preparationsData.find(p => p.id === sc.source_id);
      const isPackaging = sourcePrep?.processes?.includes('packaging') ||
        sc.isPackaging === true;

      if (isPackaging) {
        return total; // Don't add weight for packaging
      }

      const weight = parseNumericValue(sc.assembly_weight_kg) || 0;
      return total + weight;
    }, 0);
  }, [preparationsData]);

  // Handle weight change for individual sub-components
  const handleWeightChange = useCallback((subComponentId, newWeight) => {
    const updatedComponents = subComponents.map(sc => {
      if (sc.id === subComponentId) {
        return { ...sc, assembly_weight_kg: newWeight };
      }
      return sc;
    });

    onUpdateSubComponents(updatedComponents);
  }, [subComponents, onUpdateSubComponents]);

  // AUTO-SCALE ON BLUR — Scales source preparation ingredients when component weight changes
  const handleInputBlur = useCallback((sc) => {
    if (!sc.source_id) return;

    const desiredWeight = parseNumericValue(sc.assembly_weight_kg);
    if (!desiredWeight || desiredWeight <= 0) return;

    // We must find which preparation index corresponds to THIS assembly step
    // because we have to update the sub_components array atomically alongside the source ingredients.
    const currentPrepIndex = preparationsData.findIndex(p =>
      p.sub_components && p.sub_components.some(sub => sub.id === sc.id)
    );

    const sourcePrepIndex = preparationsData.findIndex(p => p.id === sc.source_id);
    if (sourcePrepIndex === -1) return;

    const sourcePrep = preparationsData[sourcePrepIndex];

    // Skip packaging steps
    const isPackaging = sourcePrep.processes?.includes('packaging') || sc.isPackaging === true;
    if (isPackaging) return;

    // Calculate current yield and scaling factor
    const sourceMetrics = RecipeCalculator.calculatePreparationMetrics(sourcePrep, preparationsData);
    const currentYield = sourceMetrics.totalYieldWeight || 0;
    if (currentYield <= 0) return;

    const factor = desiredWeight / currentYield;
    if (Math.abs(factor - 1) < 0.001) return;

    // Scale using centralized utility + ATOMIC batch update
    if (onBatchUpdatePreparations && preparationsData) {
      const clonedPreps = [...preparationsData];
      const scaledIngredients = RecipeCalculator.scaleIngredients(sourcePrep.ingredients, factor);

      // 1. Update the source preparation (e.g. Cocção)
      clonedPreps[sourcePrepIndex] = {
        ...clonedPreps[sourcePrepIndex],
        ingredients: scaledIngredients
      };

      // 2. We MUST also re-inject the modified assembly_weight_kg into the current assembly step
      // otherwise, React state batching might overwrite the onChange `handleWeightChange` state
      if (currentPrepIndex !== -1 && clonedPreps[currentPrepIndex].sub_components) {
        clonedPreps[currentPrepIndex] = {
          ...clonedPreps[currentPrepIndex],
          sub_components: clonedPreps[currentPrepIndex].sub_components.map(sub =>
            sub.id === sc.id ? { ...sub, assembly_weight_kg: sc.assembly_weight_kg } : sub
          )
        };
      }

      onBatchUpdatePreparations(clonedPreps);
    } else if (onUpdatePreparation) {
      // Legacy fallback
      const scaledIngredients = RecipeCalculator.scaleIngredients(sourcePrep.ingredients, factor);
      onUpdatePreparation(sourcePrepIndex, 'ingredients', scaledIngredients);
    }
  }, [onUpdatePreparation, onBatchUpdatePreparations, preparationsData]);

  const totalAssemblyWeight = calculateTotalWeight(subComponents);

  // Empty state when no sub-components
  if (!subComponents || subComponents.length === 0) {
    return (
      <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 text-center">
        <div className="flex flex-col items-center gap-4">
          <Layers className="h-10 w-10 text-indigo-500" />
          <h3 className="text-lg font-medium text-indigo-800">
            Componentes de Montagem
          </h3>
          <p className="text-indigo-600 max-w-md mx-auto">
            Os componentes serão adicionados automaticamente a partir das etapas anteriores.
          </p>
        </div>
      </div>
    );
  }

  // Handle Sync Weight (Pull from Source Yield)
  const handleSyncRowWeight = useCallback((sc) => {
    if (!sc.source_id) return;
    const sourcePrep = preparationsData.find(p => p.id === sc.source_id);
    if (!sourcePrep) return;

    const sourceMetrics = RecipeCalculator.calculatePreparationMetrics(sourcePrep, preparationsData);
    const currentYield = sourceMetrics.totalYieldWeight || 0;
    
    if (currentYield > 0) {
      handleWeightChange(sc.id, currentYield.toFixed(3).replace('.', ','));
    }
  }, [preparationsData, handleWeightChange]);

  const componentsWithCalculations = subComponents.map((sc, index) => {
    const componentWeightNumeric = parseNumericValue(sc.assembly_weight_kg) || 0;
    const percentage = totalAssemblyWeight > 0 ? (componentWeightNumeric / totalAssemblyWeight) * 100 : 0;

    let proportionalCost = 0;
    let sourceYieldWeight = 0;

    const sourcePrep = preparationsData.find(p => p.id === sc.source_id);

    if (sourcePrep) {
      // Recalcula as métricas da preparação dinamicamente para obter os valores mais recentes
      const sourceMetrics = RecipeCalculator.calculatePreparationMetrics(sourcePrep, preparationsData);
      sourceYieldWeight = sourceMetrics.totalYieldWeight;
      let sourceTotalCost = sourceMetrics.totalCost;

      // PATCH: Se o custo da preparação for zero, verifique se é um ingrediente simples.
      if (sourceTotalCost === 0 && sourcePrep.ingredients?.length === 1 && (!sourcePrep.sub_components || sourcePrep.sub_components.length === 0)) {
        const singleIngredient = sourcePrep.ingredients[0];
        const unitPrice = RecipeCalculator.getUnitPrice(singleIngredient);

        if (unitPrice > 0) {
          // Usa o preço do ingrediente para calcular o custo proporcional
          proportionalCost = componentWeightNumeric * unitPrice;
        }
      } else {
        if (sourceYieldWeight > 0) {
          proportionalCost = (componentWeightNumeric / sourceYieldWeight) * sourceTotalCost;
        } else {
          proportionalCost = 0; // Evita divisão por zero e usa 0 se não houver rendimento
        }
      }
    } else { // This 'else' block is for when sourcePrep is NOT found (i.e., it's not a preparation)
      // External recipe or fresh ingredient
      const inputYieldWeightNumeric = parseNumericValue(sc.input_yield_weight) || 0;
      const inputTotalCostNumeric = parseNumericValue(sc.input_total_cost) || 0;

      sourceYieldWeight = inputYieldWeightNumeric;

      // Handle raw ingredients added directly to assembly
      if (sc.type === 'ingredient' && sc.current_price) {
        proportionalCost = componentWeightNumeric * parseNumericValue(sc.current_price);
      } else if (inputYieldWeightNumeric > 0) {
        proportionalCost = (componentWeightNumeric / inputYieldWeightNumeric) * inputTotalCostNumeric;
      }
      else {
        proportionalCost = inputTotalCostNumeric; // Fallback if no yield weight
      }
    }

    // Check if weights are OUT OF SYNC (consensus check)
    const isOutOfSync = sourceYieldWeight > 0 && Math.abs(componentWeightNumeric - sourceYieldWeight) > 0.002;

    return {
      ...sc,
      percentage,
      proportionalCost,
      componentWeightNumeric,
      sourceYieldWeight,
      isOutOfSync,
      displayName: sourcePrep ? sourcePrep.title : sc.name
    };
  });

  const totalCost = componentsWithCalculations.reduce((sum, sc) => sum + (sc.proportionalCost || 0), 0);

  return (
    <>
      {/* Sub-Components Table - Compacto */}
      {showComponentsTable && (
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <div className="bg-indigo-50 px-3 py-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h5 className="font-semibold text-indigo-800 text-sm">Componentes da Montagem</h5>
              {componentsWithCalculations.some(c => c.isOutOfSync) && (
                <Badge variant="warning" className="text-[10px] animate-pulse bg-amber-100 text-amber-800 border-amber-200">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Fora de Consenso
                </Badge>
              )}
            </div>
            {componentsWithCalculations.some(c => c.isOutOfSync) && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] bg-white border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => componentsWithCalculations.forEach(c => c.isOutOfSync && handleSyncRowWeight(c))}
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Sincronizar Tudo
              </Button>
            )}
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 font-medium text-gray-700 text-left">Componente</th>
                <th className="px-3 py-2 font-medium text-gray-700 text-center">Peso (kg)</th>
                <th className="px-3 py-2 font-medium text-gray-700 text-center">%</th>
                <th className="px-3 py-2 font-medium text-gray-700 text-center">Custo</th>
                <th className="px-3 py-2 font-medium text-gray-700 text-center w-24">Ações</th>
              </tr>
            </thead>

            <tbody>
              {componentsWithCalculations.map((sc, index) => (
                <tr key={sc.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{formatCapitalize(sc.displayName)}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 ${sc.type === 'recipe'
                          ? 'border-green-400 text-green-700 bg-green-50'
                          : 'border-purple-400 text-purple-700 bg-purple-50'
                          }`}
                      >
                        {sc.type === 'recipe' ? 'Receita' : 'Etapa'}
                      </Badge>
                    </div>
                  </td>

                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="relative group">
                        <Input
                          type="text"
                          value={sc.assembly_weight_kg || ''}
                          onChange={(e) => handleWeightChange(sc.id, e.target.value)}
                          onBlur={() => handleInputBlur(sc)}
                          className={`w-20 h-7 text-center text-xs border-gray-300 mx-auto transition-colors focus:border-indigo-500 ${sc.isOutOfSync ? 'border-amber-400 bg-amber-50 text-amber-900' : ''}`}
                          placeholder="0,000"
                        />
                        {sc.isOutOfSync && (
                          <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-amber-500 animate-bounce" title={`O rendimento real é ${sc.sourceYieldWeight.toFixed(3)}kg`}>
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </div>
                    {sc.origin_id && (
                      <div className="text-[10px] text-gray-400 mt-0.5">Matriz</div>
                    )}
                  </td>

                  <td className="px-3 py-2 text-center">
                    <span className="font-semibold text-indigo-600">
                      {(sc.isPackaging || (preparationsData.find(p => p.id === sc.source_id)?.processes?.includes('packaging')))
                        ? '-'
                        : `${sc.percentage.toFixed(1).replace('.', ',')}%`
                      }
                    </span>
                  </td>

                  <td className="px-3 py-2 text-center">
                    <span className="font-semibold text-green-600">
                      {formatCurrency(sc.proportionalCost)}
                    </span>
                  </td>

                  <td className="px-3 py-2 text-center flex items-center justify-center gap-1">
                    {/* Botão de Sincronização (Consenso) */}
                    {sc.isOutOfSync && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSyncRowWeight(sc)}
                        className="h-6 w-6 rounded bg-amber-100 hover:bg-amber-200 text-amber-700"
                        title="Vincular ao Rendimento Real (Consenso)"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {!sc.origin_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveSubComponent(index)}
                        className="h-6 w-6 rounded hover:bg-red-50"
                        title="Remover"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                    {sc.origin_id && (
                      <span title="Item de Matriz (fechado)" className="cursor-not-allowed opacity-50">
                        🔒
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr className="border-t-2 border-gray-200">
                <td className="px-3 py-2 font-semibold text-gray-800 text-right">Total</td>
                <td className="px-3 py-2 text-center font-bold text-indigo-700">
                  {formatWeight(totalAssemblyWeight * 1000)}
                </td>
                <td className="px-3 py-2 text-center font-semibold text-gray-700">100,0%</td>
                <td className="px-3 py-2 text-center font-bold text-green-700">
                  {formatCurrency(totalCost)}
                </td>
                <td className="px-3 py-2"></td>
              </tr>
            </tfoot>
          </table>

        </div>
      )}
    </>
  );
};

export default AssemblySubComponents;