import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, GripVertical, X, Check, Package, Leaf } from "lucide-react";
import { formatCurrency } from "@/lib/formatUtils";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { filterAndSortByRelevance, highlightSearchTerm } from "@/lib/searchUtils";

/**
 * Conteúdo do Seletor de Ingredientes/Embalagens com suporte a múltipla seleção
 */
export const IngredientSelectorContent = ({
    ingredients = [],
    onSelect,
    onCancel,
    mode = 'ingredients', // 'ingredients' or 'packaging'
    isLoading = false
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);

    // Filtrar ingredientes baseado no termo e modo
    const filteredList = useMemo(() => {
        // Filtrar primeiro por modo
        const modeFiltered = ingredients.filter(item => {
            const isPackaging = item.category?.toLowerCase().includes('embalagem');
            if (mode === 'packaging' && !isPackaging) return false;
            if (mode === 'ingredients' && isPackaging) return false;
            return true;
        });

        if (!searchTerm.trim()) return modeFiltered;

        // Usar utilitário centralizado
        return filterAndSortByRelevance(modeFiltered, searchTerm, 'name');
    }, [ingredients, searchTerm, mode]);

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

    const toggleSelection = (item) => {
        setSelectedItems(prev => {
            const isSelected = prev.some(i => i.id === item.id);
            if (isSelected) {
                return prev.filter(i => i.id !== item.id);
            } else {
                // Preparar objeto para seleção
                const selectedItem = {
                    ...item,
                    dndId: `dnd-${item.id}-${Date.now()}` // Unique ID for Drag and Drop
                };
                return [...prev, selectedItem];
            }
        });
    };

    const handleRemoveSelected = (itemId) => {
        setSelectedItems(prev => prev.filter(i => i.id !== itemId));
    };

    const handleOnDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(selectedItems);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setSelectedItems(items);
    };

    const handleConfirm = () => {
        onSelect(selectedItems);
    };

    const isPackagingMode = mode === 'packaging';

    return (
        <div className="flex flex-col h-full bg-white rounded-lg">
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200">

                {/* Left Side: Search & Results */}
                <div className="flex-1 flex flex-col p-1 overflow-hidden">
                    {/* Campo de busca */}
                    <div className="relative mb-2 p-3 pb-0">
                        <Search className="absolute left-6 top-6 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder={isPackagingMode ? "Buscar embalagem..." : "Buscar ingrediente..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                            autoFocus
                        />
                    </div>

                    {/* Lista de resultados */}
                    <div className="flex-1 overflow-y-auto min-h-[200px] p-2">
                        {isLoading ? (
                            <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                <span>Carregando...</span>
                            </div>
                        ) : !searchTerm.trim() ? (
                            <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                                <Search className="h-8 w-8 text-gray-300" />
                                <p className="text-sm">Digite para buscar {isPackagingMode ? 'embalagens' : 'ingredientes'}</p>
                            </div>
                        ) : filteredList.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                <p>Nenhum item encontrado</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredList.map(item => {
                                    const isSelected = selectedItems.some(i => i.id === item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-2 rounded-md border text-sm cursor-pointer transition-colors flex items-center gap-2 ${isSelected
                                                ? (isPackagingMode ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200')
                                                : 'bg-white border-gray-100 hover:bg-gray-50'
                                                }`}
                                            onClick={() => toggleSelection(item)}
                                        >
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected
                                                ? (isPackagingMode ? 'bg-amber-500 border-amber-500' : 'bg-blue-600 border-blue-600')
                                                : 'border-gray-300'
                                                }`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 truncate" title={item.name}>
                                                    {highlightMatch(item.name)}
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500">
                                                    <span>{item.brand || '-'}</span>
                                                    <span className="text-green-600 font-medium">
                                                        {formatCurrency(item.current_price)}/{item.unit || 'kg'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Selected Items & Ordering */}
                <div className="w-full md:w-1/3 bg-gray-50 flex flex-col border-l border-gray-200">
                    <div className="p-3 bg-gray-100 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-700 text-sm flex items-center justify-between">
                            Selecionados
                            <span className={`${isPackagingMode ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'} px-2 py-0.5 rounded-full text-xs`}>
                                {selectedItems.length}
                            </span>
                        </h4>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {selectedItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                                {isPackagingMode ? <Package className="w-8 h-8 mb-2 opacity-50" /> : <Leaf className="w-8 h-8 mb-2 opacity-50" />}
                                <p className="text-xs">
                                    Selecione itens na lista ao lado
                                </p>
                                <p className="text-[10px] mt-1 opacity-70">
                                    Arraste para reordenar
                                </p>
                            </div>
                        ) : (
                            <DragDropContext onDragEnd={handleOnDragEnd}>
                                <Droppable droppableId="selected-items-list">
                                    {(provided) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className="space-y-2"
                                        >
                                            {selectedItems.map((item, index) => (
                                                <Draggable key={item.dndId} draggableId={item.dndId} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className={`bg-white p-2 rounded border shadow-sm text-sm flex items-center gap-2 ${snapshot.isDragging
                                                                ? `ring-2 ${isPackagingMode ? 'ring-amber-400' : 'ring-blue-400'} rotate-1`
                                                                : 'border-gray-200'
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
                    onClick={handleConfirm}
                    disabled={selectedItems.length === 0}
                    className={`${isPackagingMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-sm`}
                >
                    Adicionar {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
                </Button>
            </div>
        </div>
    );
};
