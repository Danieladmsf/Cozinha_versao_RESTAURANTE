import React, { useMemo } from 'react'; // Updated for ingredient replacement
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Edit, Trash2, StickyNote } from "lucide-react";
import { formatCurrency } from '@/lib/formatUtils';
import { formatCapitalize } from '@/lib/textUtils';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { RecipeEngine } from '@/lib/recipe-engine/RecipeEngine';

const IngredientRow = ({
  ingredient,
  prepIndex,
  ingredientIndex,
  prep,
  onUpdateIngredient,
  onRemoveIngredient,
  onOpenIngredientReplacementModal,
  readOnly = false,
}) => {
  const processes = prep.processes || [];
  const hasProcess = (processName) => processes.includes(processName);

  // State for Note Popover
  const [isNoteOpen, setIsNoteOpen] = React.useState(false);
  const [noteText, setNoteText] = React.useState(ingredient.usage_note || '');

  // LOG DE DEPURAÇÃO PARA BLOQUEIO
  if (ingredient.locked || readOnly) {
    console.log(`🔒 [IngredientRow] Item: ${ingredient.name}, readOnly: ${readOnly}, ingLocked: ${ingredient.locked}`);
  }

  // Update local state when prop changes
  React.useEffect(() => {
    setNoteText(ingredient.usage_note || '');
  }, [ingredient.usage_note]);

  const handleSaveNote = () => {
    if (typeof onUpdateIngredient !== 'function') {
      console.error('❌ [IngredientRow] onUpdateIngredient is NOT a function!', onUpdateIngredient);
      return;
    }

    onUpdateIngredient(prepIndex, ingredientIndex, 'usage_note', noteText);
    setIsNoteOpen(false);
  };

  const parseNumericValue = (value) => {
    if (!value) return 0;
    const cleaned = String(value).replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatDisplayValue = (value) => {
    if (!value && value !== 0) return '';
    const num = parseNumericValue(value);
    if (num === 0 && String(value).trim() === '') return '';

    // Se o número tem mais de 3 casas decimais, trunca visualmente para 3 casas
    const strVal = String(value).replace(',', '.');
    if (strVal.includes('.') && strVal.split('.')[1].length > 3) {
      return num.toFixed(3).replace('.', ',');
    }
    return String(value); // Mantém como o usuário digitou se for válido e curto
  };


  const calculatedValues = useMemo(() => {
    // 🎯 USANDO O RECIPE ENGINE CENTRALIZADO PARA GARANTIR CONSISTÊNCIA
    const thawingLoss = RecipeEngine.calculateAndClassifyThawingLoss(ingredient).value;
    const cleaningLoss = RecipeEngine.calculateAndClassifyCleaningLoss(ingredient).value;
    const cookingLoss = RecipeEngine.calculateAndClassifyCookingLoss(ingredient).value;
    const portioningLoss = RecipeEngine.calculateAndClassifyPortioningLoss(ingredient).value;
    const yieldPercentage = RecipeEngine.calculateIngredientYield(ingredient, prep.processes);

    return {
      defrostingLoss: thawingLoss, // Alias para compatibilidade com o resto do componente
      cleaningLoss,
      cookingLoss,
      portioningLoss,
      yieldPercentage,
    };
  }, [ingredient, prep.processes]);

  const updateIngredientField = (field, value) => {
    // Atualizar o campo principal primeiro
    onUpdateIngredient(prepIndex, ingredientIndex, field, value);

    // 🎯 AUTO-CALCULO FORWARD (Baseado na Ficha Técnica)
    const val = parseNumericValue(value);
    const textData = ingredient.technical_data || {};

    // 1. Descongelamento: Frozen -> Thawed
    if (field === 'weight_frozen' && hasProcess('defrosting') && textData.thawing_loss_pct) {
      const loss = parseNumericValue(textData.thawing_loss_pct);
      const thawed = val * (1 - loss / 100);
      onUpdateIngredient(prepIndex, ingredientIndex, 'weight_thawed', thawed.toFixed(3).replace('.', ','));

      // Cascata: Thawed -> Clean
      if (hasProcess('cleaning') && textData.cleaning_loss_pct) {
        const cleanLoss = parseNumericValue(textData.cleaning_loss_pct);
        const clean = thawed * (1 - cleanLoss / 100);
        onUpdateIngredient(prepIndex, ingredientIndex, 'weight_clean', clean.toFixed(3).replace('.', ','));

        // Cascata: Clean -> Cooked
        if (hasProcess('cooking') && textData.cooking_loss_pct) {
          const cookLoss = parseNumericValue(textData.cooking_loss_pct);
          const cooked = clean * (1 - cookLoss / 100);
          onUpdateIngredient(prepIndex, ingredientIndex, 'weight_cooked', cooked.toFixed(3).replace('.', ','));
          // Pre-cooking geralmente é igual a clean
          onUpdateIngredient(prepIndex, ingredientIndex, 'weight_pre_cooking', clean.toFixed(3).replace('.', ','));
        }
      }
    }

    // 2. Limpeza: Raw -> Clean
    if (field === 'weight_raw' && hasProcess('cleaning') && textData.cleaning_loss_pct) {
      const loss = parseNumericValue(textData.cleaning_loss_pct);
      const clean = val * (1 - loss / 100);
      onUpdateIngredient(prepIndex, ingredientIndex, 'weight_clean', clean.toFixed(3).replace('.', ','));

      // Cascata: Clean -> Cooked
      if (hasProcess('cooking') && textData.cooking_loss_pct) {
        const cookLoss = parseNumericValue(textData.cooking_loss_pct);
        const cooked = clean * (1 - cookLoss / 100);
        onUpdateIngredient(prepIndex, ingredientIndex, 'weight_cooked', cooked.toFixed(3).replace('.', ','));
        onUpdateIngredient(prepIndex, ingredientIndex, 'weight_pre_cooking', clean.toFixed(3).replace('.', ','));
      }
    }

    // 3. Cocção: Clean/PreCook -> Cooked
    if ((field === 'weight_clean' || field === 'weight_pre_cooking') && hasProcess('cooking') && textData.cooking_loss_pct) {
      const loss = parseNumericValue(textData.cooking_loss_pct);
      const cooked = val * (1 - loss / 100);
      onUpdateIngredient(prepIndex, ingredientIndex, 'weight_cooked', cooked.toFixed(3).replace('.', ','));
    }

    // AUTO-PREENCHIMENTO REVERSO (Mantido como fallback para campos vazios)
    setTimeout(() => {
      // ... lógica existente ...
      // Definir a ordem completa dos campos (da esquerda para direita)
      const fieldOrder = [
        'weight_frozen',      // Descongelamento - Peso Congelado
        'weight_thawed',      // Descongelamento - Peso Resfriado
        'weight_raw',         // Limpeza - Peso Bruto/Entrada
        'weight_clean',       // Limpeza - Pós Limpeza
        'weight_pre_cooking', // Cocção - Pré Cocção
        'weight_cooked',      // Cocção - Pós Cocção
        'weight_portioned'    // Porcionamento - Pós Porcionamento
      ];

      // Encontrar o índice do campo atual
      const currentFieldIndex = fieldOrder.indexOf(field);

      if (currentFieldIndex > 0) {
        // Preencher todos os campos anteriores (apenas os que fazem parte dos processos ativos)
        for (let i = currentFieldIndex - 1; i >= 0; i--) {
          const previousField = fieldOrder[i];
          const currentValue = ingredient[previousField];

          // Só preencher se estiver vazio (para não sobrescrever o cálculo forward ou manual)
          if (!currentValue || currentValue === '' || parseNumericValue(currentValue) === 0) {
            let shouldFill = false;

            if (previousField === 'weight_frozen' && hasProcess('defrosting')) shouldFill = true;
            if (previousField === 'weight_thawed' && hasProcess('defrosting')) shouldFill = true;
            if (previousField === 'weight_raw') shouldFill = true;
            if (previousField === 'weight_clean' && hasProcess('cleaning')) shouldFill = true;
            if (previousField === 'weight_pre_cooking' && hasProcess('cooking')) shouldFill = true;
            if (previousField === 'weight_cooked' && hasProcess('cooking')) shouldFill = true;
            if (previousField === 'weight_portioned' && hasProcess('portioning')) shouldFill = true;

            if (shouldFill) {
              onUpdateIngredient(prepIndex, ingredientIndex, previousField, value);
            }
          }
        }
      }
    }, 50);
  };

  if (ingredient.is_note_row) {
    return (
      <TableRow className="border-b border-gray-100 bg-yellow-50/50 hover:bg-yellow-50">
        <TableCell colSpan={100} className="px-6 py-3 text-sm text-yellow-800 italic">
          <div className="flex items-start gap-2">
            <StickyNote className="h-4 w-4 mt-0.5 opacity-60 flex-shrink-0" />
            <span className="whitespace-pre-wrap">{ingredient.name}</span>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="border-b border-gray-50 hover:bg-gray-50/50">
      <TableCell className="font-medium px-4 py-2 font-mono">
        <div className="flex flex-col">
          <span>{formatCapitalize(ingredient.name)}</span>
          {ingredient.usage_note && (
            <span className="text-xs text-amber-600 italic mt-0.5 flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
              {ingredient.usage_note}
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className="text-center px-4 py-2">
        {formatCurrency(parseNumericValue(ingredient.current_price))}
      </TableCell>

      <TableCell className="text-center px-4 py-2">
        {(() => {
          const brutPrice = parseNumericValue(ingredient.current_price);
          const yieldPercent = calculatedValues.yieldPercentage;
          const liquidPrice = yieldPercent > 0 ? brutPrice / (yieldPercent / 100) : brutPrice;
          return formatCurrency(liquidPrice);
        })()}
      </TableCell>

      {hasProcess('defrosting') && (
        <>
          <TableCell className="px-4 py-2">
            <Input
              type="text"
              value={formatDisplayValue(ingredient.weight_frozen)}
              onChange={(e) => updateIngredientField('weight_frozen', e.target.value)}
              disabled={readOnly || ingredient.locked}
              className={`w-24 h-8 text-center text-xs ${readOnly || ingredient.locked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="0,000"
            />
          </TableCell>
          <TableCell className="px-4 py-2">
            <Input
              type="text"
              value={formatDisplayValue(ingredient.weight_thawed)}
              onChange={(e) => updateIngredientField('weight_thawed', e.target.value)}
              disabled={readOnly || ingredient.locked}
              className={`w-24 h-8 text-center text-xs ${readOnly || ingredient.locked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="0,000"
            />
          </TableCell>
          <TableCell className="text-center px-4 py-2">
            <Badge variant="secondary">
              {calculatedValues.defrostingLoss.toFixed(2)}%
            </Badge>
          </TableCell>
        </>
      )}

      {hasProcess('cleaning') && (
        <>
          {(!hasProcess('defrosting') || parseNumericValue(ingredient.weight_frozen) <= 0) && (
            <TableCell className="px-4 py-2">
              <Input
                type="text"
                value={formatDisplayValue(ingredient.weight_raw)}
                onChange={(e) => updateIngredientField('weight_raw', e.target.value)}
                disabled={readOnly || ingredient.locked}
                className={`w-24 h-8 text-center text-xs ${readOnly || ingredient.locked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="0,000"
                title="Peso Bruto / Entrada para Limpeza"
              />
            </TableCell>
          )}
          {hasProcess('defrosting') && parseNumericValue(ingredient.weight_frozen) > 0 && (
            <TableCell className="px-4 py-2">
              <Input
                type="text"
                value={formatDisplayValue(ingredient.weight_thawed)}
                readOnly
                className="w-24 h-8 text-center text-xs bg-gray-50 cursor-not-allowed"
                placeholder="0,000"
                title="Peso Resfriado (Vindo do descongelamento)"
              />
            </TableCell>
          )}
          <TableCell className="px-4 py-2">
            <Input
              type="text"
              value={formatDisplayValue(ingredient.weight_clean)}
              onChange={(e) => updateIngredientField('weight_clean', e.target.value)}
              disabled={readOnly || ingredient.locked}
              className={`w-24 h-8 text-center text-xs ${readOnly || ingredient.locked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="0,000"
            />
          </TableCell>
          <TableCell className="text-center px-4 py-2">
            <Badge variant="secondary">
              {calculatedValues.cleaningLoss.toFixed(2)}%
            </Badge>
          </TableCell>
        </>
      )}

      {hasProcess('cooking') && (
        <>
          <TableCell className="px-4 py-2">
            <Input
              type="text"
              value={formatDisplayValue(ingredient.weight_pre_cooking)}
              onChange={(e) => updateIngredientField('weight_pre_cooking', e.target.value)}
              disabled={readOnly || ingredient.locked}
              className={`w-24 h-8 text-center text-xs ${readOnly || ingredient.locked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder={(() => {
                // Inferred Previous Weight Logic for Placeholder
                const prev = parseNumericValue(ingredient.weight_clean) ||
                  parseNumericValue(ingredient.weight_thawed) ||
                  parseNumericValue(ingredient.weight_raw);
                return prev > 0 ? prev.toFixed(3) : "0,000";
              })()}
              title="Peso antes da cocção (Automático se vazio)"
            />
          </TableCell>
          <TableCell className="px-4 py-2">
            <Input
              type="text"
              value={formatDisplayValue(ingredient.weight_cooked)}
              onChange={(e) => updateIngredientField('weight_cooked', e.target.value)}
              disabled={readOnly || ingredient.locked}
              className={`w-24 h-8 text-center text-xs ${readOnly || ingredient.locked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="0,000"
              title="Peso depois da cocção"
            />
          </TableCell>
          <TableCell className="text-center px-4 py-2">
            <Badge variant="secondary">
              {calculatedValues.cookingLoss.toFixed(2)}%
            </Badge>
          </TableCell>
        </>
      )}

      {hasProcess('portioning') && (
        <>
          {!hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking') && (
            <TableCell className="px-4 py-2">
              <Input
                type="text"
                value={formatDisplayValue(ingredient.weight_raw)}
                onChange={(e) => updateIngredientField('weight_raw', e.target.value)}
                disabled={readOnly || ingredient.locked}
                className={`w-24 h-8 text-center text-xs ${readOnly || ingredient.locked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="0,000"
              />
            </TableCell>
          )}
          <TableCell className="px-4 py-2">
            <Input
              type="text"
              value={formatDisplayValue(ingredient.weight_portioned)}
              onChange={(e) => updateIngredientField('weight_portioned', e.target.value)}
              disabled={readOnly || ingredient.locked}
              className={`w-24 h-8 text-center text-xs ${readOnly || ingredient.locked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="0,000"
            />
          </TableCell>
          <TableCell className="text-center px-4 py-2">
            <Badge variant="secondary">
              {calculatedValues.portioningLoss.toFixed(2)}%
            </Badge>
          </TableCell>
        </>
      )}

      <TableCell className="text-center px-4 py-2">
        {hasProcess('packaging') ? (
          <span className="text-gray-400 font-medium">-</span>
        ) : (
          <Badge variant="default">
            {calculatedValues.yieldPercentage.toFixed(1)}%
          </Badge>
        )}
      </TableCell>

      <TableCell className="px-4 py-2">
        <div className="flex gap-1 justify-end items-center">
          {/* NOTE BUTTON - ALWAYS VISIBLE */}
          <Popover open={isNoteOpen} onOpenChange={setIsNoteOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded-full ${ingredient.usage_note ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'hover:bg-amber-50 text-gray-400 hover:text-amber-500'}`}
                title="Adicionar observação de uso"
              >
                <StickyNote className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900 flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-amber-500" />
                  Observação de Uso
                </h4>
                <p className="text-xs text-gray-500">
                  Adicione uma nota específica sobre como este ingrediente é usado nesta receita.
                </p>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Ex: Cortar em cubos de 2cm..."
                  className="min-h-[80px] text-sm resize-none focus-visible:ring-amber-500"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsNoteOpen(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSaveNote} className="bg-amber-600 hover:bg-amber-700 text-white">Salvar Nota</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {!readOnly && (
            <>
              {!ingredient.locked && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenIngredientReplacementModal && onOpenIngredientReplacementModal(prepIndex, ingredientIndex)}
                  className="h-7 w-7 rounded-full hover:bg-blue-50"
                  title="Editar ingrediente"
                >
                  <Edit className="h-3 w-3 text-blue-500" />
                </Button>
              )}
              {ingredient.locked && (
                <span className="text-xs text-amber-500 mr-2 flex items-center" title="Este item faz parte de uma receita importada e não pode ser editado.">
                  <span className="mr-1">🔒</span>
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveIngredient(
                  prepIndex,
                  ingredientIndex
                )}
                className="h-7 w-7 rounded-full hover:bg-red-50"
                title="Remover ingrediente"
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </>
          )}
          {readOnly && ingredient.locked && (
            <span className="text-xs text-gray-400 italic">Locked</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(IngredientRow);
