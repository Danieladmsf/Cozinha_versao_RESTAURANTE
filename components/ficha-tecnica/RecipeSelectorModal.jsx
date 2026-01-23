import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CookingPot, Loader2, GripVertical, X, Check } from "lucide-react";
import { formatCurrency, formatWeight } from "@/lib/formatUtils";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { highlightSearchTerm } from "@/lib/searchUtils";

/**
 * Modal para buscar e selecionar receitas para adicionar à preparação
 */
const EMPTY_FILTERS = {};

/**
 * Modal para buscar e selecionar receitas para adicionar à preparação
 */
export const RecipeSelectorContent = ({ onSelectRecipe, currentRecipeId, onCancel, filters = EMPTY_FILTERS }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for tab selection: 'receitas' (Receita - Base) or 'receitas_-_base' (Produtos)
  const [activeTab, setActiveTab] = useState('receitas');

  // State for multiple selection
  const [selectedRecipes, setSelectedRecipes] = useState([]);

  // Busca dinâmica com debounce
  useEffect(() => {
    // Não buscar se não tiver termo de busca
    if (!searchTerm.trim()) {
      setFilteredRecipes([]);
      return;
    }

    // Mínimo de 1 caractere para buscar
    if (searchTerm.trim().length < 1) {
      setFilteredRecipes([]);
      return;
    }

    // Debounce: esperar 500ms após o usuário parar de digitar
    const timeoutId = setTimeout(() => {
      searchRecipes(searchTerm.trim());
    }, 500);

    // Limpar timeout anterior
    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentRecipeId, filters, activeTab]);

  const searchRecipes = async (term) => {
    setLoading(true);
    setError(null);

    try {
      // Fazer busca no backend com o termo
      const params = new URLSearchParams({
        search: term,
        excludeId: currentRecipeId || '',
        activeOnly: 'true',
        type: activeTab, // Filtrar por tipo baseado na aba selecionada
        ...filters // Injetar filtros extras
      });

      console.log('🔍 [RecipeSelector] Buscando:', { term, activeTab, url: `/api/recipes?${params}` });

      const response = await fetch(`/api/recipes?${params}`);

      if (!response.ok) {
        throw new Error('Falha ao buscar receitas');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar receitas');
      }

      const recipes = result.data || [];

      // Manter a ordem da API (ordenada por relevância/posição do match)
      setFilteredRecipes(recipes);
    } catch (err) {
      console.error('Erro ao buscar receitas:', err);
      setError(err.message);
      setFilteredRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipeSelection = (recipe) => {
    setSelectedRecipes(prev => {
      const isSelected = prev.some(r => r.id === recipe.id);
      if (isSelected) {
        return prev.filter(r => r.id !== recipe.id);
      } else {
        // Prepare recipe data format
        const recipeData = {
          id: recipe.id,
          name: recipe.name,
          category: recipe.category,
          yield_weight: recipe.yield_weight,
          cost_per_kg_yield: recipe.cost_per_kg_yield,
          total_cost: recipe.total_cost,
          used_weight: '',
          isRecipe: true,
          type: 'recipe',
          // Unique ID for Drag and Drop key (in case we allow duplicates later, though here by ID selection it's unique)
          dndId: `dnd-${recipe.id}-${Date.now()}`
        };
        return [...prev, recipeData];
      }
    });
  };

  const handleRemoveSelected = (recipeId) => {
    setSelectedRecipes(prev => prev.filter(r => r.id !== recipeId));
  };

  const handleOnDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(selectedRecipes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedRecipes(items);
  };

  const handleConfirmSelection = () => {
    // Pass the selected recipes array to the parent
    onSelectRecipe(selectedRecipes);
  };

  // Função para destacar o termo buscado em azul
  const highlightMatch = (text) => {
    const { before, match, after, hasMatch } = highlightSearchTerm(text, searchTerm);

    if (!hasMatch) return text;

    return (
      <>
        {before}
        <span className="text-blue-600 font-semibold">{match}</span>
        {after}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full max-h-[65vh] w-full bg-white rounded-lg">
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200 min-h-0">

        {/* Left Side: Search & Results */}
        <div className="flex-1 flex flex-col p-1 min-h-0">
          {/* Abas de filtro por tipo */}
          <div className="flex border-b border-gray-200 mb-2 px-3 flex-shrink-0">
            <button
              onClick={() => { setActiveTab('receitas'); setFilteredRecipes([]); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'receitas'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Receitas - Base
            </button>
            <button
              onClick={() => { setActiveTab('receitas_-_base'); setFilteredRecipes([]); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'receitas_-_base'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Produtos
            </button>
          </div>

          {/* Campo de busca - FIXO */}
          <div className="relative mb-2 p-3 pb-0 flex-shrink-0">
            <Search className="absolute left-6 top-6 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={`Buscar ${activeTab === 'receitas' ? 'receita' : 'produto'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Lista de resultados - COM SCROLL FIXO */}
          <div className="flex-1 overflow-y-auto min-h-0 max-h-[300px] p-2">
            {loading ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <span>Buscando...</span>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">
                <p className="font-medium text-sm">Erro ao buscar</p>
                <Button variant="ghost" size="sm" onClick={() => searchRecipes(searchTerm.trim())} className="mt-2 text-xs">
                  Tentar novamente
                </Button>
              </div>
            ) : !searchTerm.trim() ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                <Search className="h-8 w-8 text-gray-300" />
                <p className="text-sm">Digite para buscar</p>
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <p>Nenhuma receita encontrada</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredRecipes.map(recipe => {
                  const isSelected = selectedRecipes.some(r => r.id === recipe.id);
                  return (
                    <div
                      key={recipe.id}
                      className={`p-2 rounded-md border text-sm cursor-pointer transition-colors flex items-center gap-2 ${isSelected
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-white border-gray-100 hover:bg-gray-50'
                        }`}
                      onClick={() => toggleRecipeSelection(recipe)}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                        }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate" title={recipe.name}>
                          {highlightMatch(recipe.name)}
                        </div>
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span>{formatWeight(recipe.yield_weight)}kg</span>
                          <span>•</span>
                          <span className="text-green-600">{formatCurrency(recipe.cost_per_kg_yield)}/kg</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selected Recipes & Ordering */}
        <div className="w-full md:w-1/3 bg-gray-50 flex flex-col border-l border-gray-200">
          <div className="p-3 bg-gray-100 border-b border-gray-200">
            <h4 className="font-semibold text-gray-700 text-sm flex items-center justify-between">
              Selecionadas
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                {selectedRecipes.length}
              </span>
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {selectedRecipes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                <CookingPot className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">
                  Selecione receitas na lista ao lado
                </p>
                <p className="text-[10px] mt-1 opacity-70">
                  Arraste para reordenar
                </p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleOnDragEnd}>
                <Droppable droppableId="selected-recipes-list">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {selectedRecipes.map((item, index) => (
                        <Draggable key={item.dndId} draggableId={item.dndId} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`bg-white p-2 rounded border shadow-sm text-sm flex items-center gap-2 ${snapshot.isDragging ? 'ring-2 ring-purple-400 rotate-1' : 'border-gray-200'
                                }`}
                            >
                              <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-600 cursor-move p-1">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <span className="flex-1 truncate font-medium text-gray-700">{item.name}</span>
                              <button
                                onClick={() => handleRemoveSelected(item.id)}
                                className="text-gray-400 hover:text-red-500 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>

      </div>

      <div className="pt-3 pb-3 px-4 border-t bg-gray-50 flex justify-between items-center rounded-b-lg">
        <Button variant="outline" onClick={onCancel} className="bg-white">
          Cancelar
        </Button>
        <Button
          onClick={handleConfirmSelection}
          disabled={selectedRecipes.length === 0}
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
        >
          Adicionar {selectedRecipes.length > 0 ? `(${selectedRecipes.length})` : ''}
        </Button>
      </div>
    </div>
  );
};

/**
 * Modal para buscar e selecionar receitas para adicionar à preparação
 */
const RecipeSelectorModal = ({ isOpen, onClose, onSelectRecipe, currentRecipeId }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <CookingPot className="w-5 h-5 text-purple-600" />
            Selecionar Receitas
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <RecipeSelectorContent
            onSelectRecipe={(recipes) => {
              onSelectRecipe(recipes);
              onClose();
            }}
            currentRecipeId={currentRecipeId}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipeSelectorModal;
