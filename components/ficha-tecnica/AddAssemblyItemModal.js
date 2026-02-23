import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Layers, Plus, Search, Package2, CheckSquare, Square } from "lucide-react";
import { formatWeight, formatCurrency, parseNumericValue } from "@/lib/formatUtils";
import { formatCapitalize } from '@/lib/textUtils';

const AddAssemblyItemModal = ({
  isOpen,
  onClose,
  preparationsData,
  currentPrepIndex,
  currentRecipeId,
  onAddItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  const handleToggleItem = (prepId) => {
    setSelectedItems(prev => {
      if (prev.includes(prepId)) {
        return prev.filter(id => id !== prepId);
      } else {
        return [...prev, prepId];
      }
    });
  };

  const handleConfirm = () => {
    // Encontrar os dados completos dos itens selecionados
    const itemsToAdd = (preparationsData || [])
      .filter(p => selectedItems.includes(p.id))
      .map(prevPrep => ({
        id: prevPrep.id,
        name: prevPrep.title,
        isRecipe: false,
        yield_weight: prevPrep.total_yield_weight_prep || 0,
        total_cost: prevPrep.total_cost_prep || 0
      }));

    // Adicionar cada item selecionado
    itemsToAdd.forEach(item => {
      onAddItem(item);
    });

    setSearchTerm('');
    setSelectedItems([]);
    onClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedItems([]);
    onClose();
  };

  const filteredPreviousProcesses = (preparationsData || [])
    .filter((p, idx) => {
      // Deve ser um processo anterior (índice menor)
      if (idx >= currentPrepIndex) return false;

      // Deve ter título
      if (!p.title) return false;

      // Deve ter ingredientes OU sub_components OU recipes (conteúdo válido)
      const hasIngredients = p.ingredients && p.ingredients.length > 0;
      const hasSubComponents = p.sub_components && p.sub_components.length > 0;
      const hasRecipes = p.recipes && p.recipes.length > 0;

      // Filtro por termo de pesquisa - aplicar filtro apenas se houver termo
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        // Buscar no título do processo
        if (!p.title.toLowerCase().includes(term)) {
          return false;
        }
      }

      return hasIngredients || hasSubComponents || hasRecipes;
    });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose} >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Adicionar Itens ao Porcionamento
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Barra de Pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar processo anterior..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Processos Anteriores */}
          <div>
            <Label className="font-medium text-gray-700 flex items-center gap-2 mb-2">
              <Package2 className="w-4 h-4" />
              Selecione os Processos (desta Ficha)
            </Label>
            <div className="bg-gray-50 rounded-md max-h-[300px] overflow-y-auto mt-1 border">
              {filteredPreviousProcesses.length > 0 ? (
                filteredPreviousProcesses.map(prevPrep => (
                  <div
                    key={`prep-${prevPrep.id}`}
                    className={`
                      w-full text-left px-4 py-3 hover:bg-white flex items-center justify-between border-b last:border-b-0 cursor-pointer transition-colors
                      ${selectedItems.includes(prevPrep.id) ? 'bg-blue-50 border-blue-100' : ''}
                    `}
                    onClick={() => handleToggleItem(prevPrep.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0
                        ${selectedItems.includes(prevPrep.id)
                          ? 'bg-blue-600 border-blue-600 shadow-sm'
                          : 'border-gray-300 bg-white'
                        }
                      `}>
                        {selectedItems.includes(prevPrep.id) && (
                          <Plus className="h-3.5 w-3.5 text-white" />
                        )}
                      </div>
                      <div>
                        <div className={`font-medium ${selectedItems.includes(prevPrep.id) ? 'text-blue-700' : 'text-gray-700'}`}>
                          {prevPrep.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          Rendimento: {formatWeight((parseNumericValue(prevPrep.total_yield_weight_prep) || 0) * 1000)} /
                          Custo: {formatCurrency(parseNumericValue(prevPrep.total_cost_prep))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-gray-500">
                  Nenhum processo anterior utilizável nesta ficha.
                </p>
              )}
            </div>
            {filteredPreviousProcesses.length > 0 && (
              <p className="text-xs text-gray-400 mt-2 text-right">
                {selectedItems.length} item(s) selecionado(s)
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedItems.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Adicionar Selecionados ({selectedItems.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  );
};

export default AddAssemblyItemModal;