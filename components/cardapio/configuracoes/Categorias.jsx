'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Grid, Check, ChevronDown, ChevronRight, FolderTree } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CategoriesTab = ({
  categories,
  categoryTree,
  selectedMainCategories,
  setSelectedMainCategories
}) => {
  const [expandedCategories, setExpandedCategories] = useState({});

  const handleSelectAll = () => {
    const allCategoryValues = categories.map(cat => cat.value);
    setSelectedMainCategories(allCategoryValues);
  };

  const handleClearSelection = () => {
    setSelectedMainCategories([]);
  };

  const handleCategoryToggle = (categoryValue) => {
    const isSelected = selectedMainCategories.includes(categoryValue);

    if (isSelected) {
      setSelectedMainCategories(prev => prev.filter(val => val !== categoryValue));
    } else {
      setSelectedMainCategories(prev => [...prev, categoryValue]);
    }
  };

  const toggleExpand = (categoryId, e) => {
    e.stopPropagation();
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Função para buscar subcategorias de uma categoria (level 2+)
  const getSubcategoriesForCategory = (categoryValue) => {
    // Primeiro pegar as categorias level 1 deste tipo
    const level1Categories = categoryTree.filter(cat =>
      cat.type === categoryValue && cat.level === 1
    );

    // Para cada level 1, buscar suas subcategorias
    const result = level1Categories.map(level1Cat => {
      const subcats = categoryTree.filter(cat => cat.parent_id === level1Cat.id);
      return {
        ...level1Cat,
        children: subcats
      };
    });

    return result;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Grid className="h-5 w-5 mr-2" />
          Categorias da Ordem de Produção
        </CardTitle>
        <p className="text-sm text-gray-600">
          Selecione quais categorias principais aparecerão na ordem de produção.
          Clique na seta para ver as subcategorias.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-medium">Categorias Disponíveis</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                Selecionar Todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
              >
                Limpar Seleção
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[500px] border rounded-md p-4">
            <div className="space-y-3">
              {categories.map((category) => {
                const categoryName = category.label || category.name || category.id;
                const categoryValue = category.value;
                const isSelected = selectedMainCategories.includes(categoryValue);
                const isExpanded = expandedCategories[category.id];

                // Buscar subcategorias com estrutura completa
                const subcategoriesWithChildren = getSubcategoriesForCategory(categoryValue);
                const subcategoriesCount = subcategoriesWithChildren.length;

                return (
                  <div key={`category-${category.id}`}>
                    {/* Card principal da categoria */}
                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${isSelected
                          ? 'bg-blue-50 border-blue-300 shadow-sm'
                          : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      onClick={() => handleCategoryToggle(categoryValue)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <div
                            className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                              }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-base">{categoryName}</div>
                            <div className="text-sm text-gray-500 mt-0.5">
                              {subcategoriesCount} subcategoria{subcategoriesCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        {/* Botão de expandir */}
                        {subcategoriesCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => toggleExpand(category.id, e)}
                            className="ml-2 h-8 w-8 p-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-500" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Lista de subcategorias expandida */}
                    <AnimatePresence>
                      {isExpanded && subcategoriesCount > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="ml-6 mt-2 border-l-2 border-gray-200 pl-4"
                        >
                          {subcategoriesWithChildren.map((subcat) => (
                            <div key={subcat.id} className="mb-3">
                              {/* Categoria Level 1 */}
                              <div className="flex items-center py-2 px-3 bg-gray-50 rounded-md">
                                <FolderTree className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="font-medium text-sm text-gray-700">
                                  {subcat.name}
                                </span>
                                {subcat.children && subcat.children.length > 0 && (
                                  <span className="ml-2 text-xs text-gray-400">
                                    ({subcat.children.length} itens)
                                  </span>
                                )}
                              </div>

                              {/* Subcategorias Level 2+ */}
                              {subcat.children && subcat.children.length > 0 && (
                                <div className="ml-6 mt-1 space-y-1">
                                  {subcat.children.map((child) => (
                                    <div
                                      key={child.id}
                                      className="flex items-center py-1.5 px-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                                    >
                                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                                      {child.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <strong>{selectedMainCategories.length}</strong> categoria{selectedMainCategories.length !== 1 ? 's' : ''} selecionada{selectedMainCategories.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoriesTab;