
'use client';

import React, { useState } from 'react';
import { useRecipeQuickEditor } from '@/hooks/ficha-tecnica/useRecipeQuickEditor';
import RecipeEditModal from './RecipeEditModal';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Eye, Trash2, CheckSquare, Square, X } from "lucide-react";
import { formatCurrency } from "@/lib/formatUtils";

export default function RecipeQuickEditor() {
  const { recipes, loading, error, refreshRecipes, updateRecipe, deleteRecipe, bulkDeleteRecipes } = useRecipeQuickEditor();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Bulk delete mode state
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditClick = (recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedRecipe(null);
    setIsModalOpen(false);
  };

  const handleSaveRecipe = async (editedRecipe) => {
    await updateRecipe(editedRecipe.id, editedRecipe);
    handleCloseModal();
    refreshRecipes();
  };

  // --- Bulk Delete Functions ---
  const enterBulkDeleteMode = () => {
    setIsBulkDeleteMode(true);
    setSelectedForDelete(new Set());
  };

  const exitBulkDeleteMode = () => {
    setIsBulkDeleteMode(false);
    setSelectedForDelete(new Set());
  };

  const toggleSelectRecipe = (recipeId) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedForDelete.size === recipes.length) {
      setSelectedForDelete(new Set());
    } else {
      setSelectedForDelete(new Set(recipes.map(r => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedForDelete.size === 0) return;

    const count = selectedForDelete.size;
    const confirmed = confirm(`Tem certeza que deseja excluir ${count} receita(s)? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    setIsDeleting(true);
    await bulkDeleteRecipes([...selectedForDelete]);
    setIsDeleting(false);
    exitBulkDeleteMode();
  };

  const allSelected = recipes.length > 0 && selectedForDelete.size === recipes.length;
  const someSelected = selectedForDelete.size > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Erro ao carregar receitas: {error}</p>
        <Button onClick={refreshRecipes} className="mt-4">Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Bulk delete toolbar */}
      {isBulkDeleteMode && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={exitBulkDeleteMode}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>

          <div className="h-5 w-px bg-red-200" />

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
            className="text-red-600 hover:text-red-700 hover:bg-red-100"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 mr-1.5" />
            ) : (
              <Square className="h-4 w-4 mr-1.5" />
            )}
            {allSelected ? 'Desmarcar tudo' : 'Marcar tudo'}
          </Button>

          <div className="flex-1" />

          <span className="text-sm text-red-600 font-medium">
            {selectedForDelete.size} selecionada(s)
          </span>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={!someSelected || isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1.5" />
            )}
            Excluir {someSelected ? `(${selectedForDelete.size})` : ''}
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {isBulkDeleteMode && (
              <TableHead className="w-10">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center"
                  title={allSelected ? 'Desmarcar tudo' : 'Marcar tudo'}
                >
                  {allSelected ? (
                    <CheckSquare className="h-4 w-4 text-red-500" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </TableHead>
            )}
            <TableHead>Nome da Receita</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Custo/kg (Rendimento)</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipes.map((recipe) => {
            const isChecked = selectedForDelete.has(recipe.id);
            return (
              <TableRow
                key={recipe.id}
                className={isChecked ? 'bg-red-50' : ''}
                onClick={isBulkDeleteMode ? () => toggleSelectRecipe(recipe.id) : undefined}
                style={isBulkDeleteMode ? { cursor: 'pointer' } : undefined}
              >
                {isBulkDeleteMode && (
                  <TableCell>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelectRecipe(recipe.id); }}
                      className="flex items-center justify-center"
                    >
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 text-red-500" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </TableCell>
                )}
                <TableCell className="font-medium">{recipe.name}</TableCell>
                <TableCell>{recipe.category}</TableCell>
                <TableCell>{formatCurrency(recipe.cost_per_kg_yield)}</TableCell>
                <TableCell className="text-right">
                  {!isBulkDeleteMode && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(recipe)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={enterBulkDeleteMode}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {selectedRecipe && (
        <RecipeEditModal
          recipe={selectedRecipe}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveRecipe}
        />
      )}
    </div>
  );
}
