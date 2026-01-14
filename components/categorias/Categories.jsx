'use client';


import React, { useState, useEffect } from "react";
import { Category, CategoryType, CategoryTree } from "@/app/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Tag,
  PenSquare,
  Trash2,
  AlertCircle,
  LayoutGrid,
  List,
  Edit,
  X,
  Settings,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Folder,
  FileText
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewTabDialogOpen, setIsNewTabDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("ingredient");
  const [currentCategory, setCurrentCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    type: "ingredient",
    description: "",
    parent_id: null,
    level: 1,
    active: true
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("tree");
  const [newTabName, setNewTabName] = useState("");
  const [isEditTabDialogOpen, setIsEditTabDialogOpen] = useState(false);
  const [currentEditingType, setCurrentEditingType] = useState(null);
  const [editTabName, setEditTabName] = useState("");
  const [isTabSettingsOpen, setIsTabSettingsOpen] = useState(false);
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [parentCategory, setParentCategory] = useState(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const [categoryTypes, setCategoryTypes] = useState([]);

  useEffect(() => {
    loadCategories();
    loadCategoryTypes();
    loadCategoryTree();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await Category.list();

      // Lógica de seeding para projeto "virgem"
      if (!Array.isArray(data) || data.length === 0) {
        console.log("🌱 Projeto virgem detectado. Semeando categorias padrão...");

        const defaultCategories = [
          'Laticínios',
          'Carnes',
          'Vegetais',
          'Frutas',
          'Grãos',
          'Temperos',
          'Massas',
          'Molhos',
          'Bebidas',
          'Outros'
        ];

        const createdCategories = [];

        // Criar uma por uma para garantir persistência
        for (const catName of defaultCategories) {
          try {
            const newCat = await Category.create({
              name: catName,
              type: 'ingredient',
              active: true,
              description: 'Categoria padrão do sistema',
              level: 1,
              parent_id: null
            });
            createdCategories.push(newCat);
          } catch (e) {
            console.error(`Erro ao criar categoria padrão ${catName}:`, e);
          }
        }

        // Se conseguimos criar, atualizamos o estado com as novas categorias
        if (createdCategories.length > 0) {
          setCategories(createdCategories);
          // Salvar flag no localStorage para evitar re-verificação desnecessária (opcional, mas bom pra performance)
          localStorage.setItem('system_seeded', 'true');
          toast({
            title: "Configuração Inicial",
            description: "Categorias padrão foram criadas com sucesso.",
          });
        } else {
          setCategories([]);
        }
      } else {
        setCategories(data);
      }

    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      setError("Erro ao carregar categorias. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryTree = async () => {
    try {
      const data = await CategoryTree.list();
      setCategoryTree(Array.isArray(data) ? data : []);
    } catch (error) {
      setError("Erro ao carregar estrutura de categorias. Por favor, tente novamente.");
    }
  };


  const loadCategoryTypes = async () => {
    try {
      let typeData = await CategoryType.list();

      // Init array if null
      if (!Array.isArray(typeData)) typeData = [];

      // SEEDING: Ensure default types exist
      const defaultTypes = [
        { value: 'ingredientes', label: 'Ingredientes', order: 1, is_system: true },
        { value: 'receitas', label: 'Receitas', order: 2, is_system: true },
        { value: 'contas', label: 'Contas', order: 3, is_system: true }
      ];

      let seeded = false;
      const existingValues = new Set(typeData.map(t => t.value));

      for (const defType of defaultTypes) {
        if (!existingValues.has(defType.value)) {
          // Special case: check if we have the singular version before seeding plural
          if (defType.value === 'ingredientes' && existingValues.has('ingredient')) {
            continue; // Don't seed 'ingredientes' if 'ingredient' already exists to avoid duplication if user prefers singular
          }

          try {
            console.log(`Seeding missing category type: ${defType.label}`);
            const newType = await CategoryType.create(defType);
            if (newType) {
              typeData.push(newType);
              seeded = true;
            }
          } catch (e) {
            console.error(`Failed to seed type ${defType.value}:`, e);
          }
        }
      }

      if (typeData.length > 0) {
        typeData.sort((a, b) => (a.order || 99) - (b.order || 99));

        // Remove duplicates based on value
        let uniqueTypes = typeData.filter((type, index, self) =>
          index === self.findIndex(t => t.value === type.value)
        );

        // CLEANUP: Filter out unwanted/duplicate English keys if they exist
        const ignoredValues = ['recipe', 'bill'];
        uniqueTypes = uniqueTypes.filter(t => !ignoredValues.includes(t.value));

        // DEDUPLICATION: Prefer 'ingredientes' if both exist, otherwise keep 'ingredient'
        // If the user has both, we hide 'ingredient' to avoid visual duplicate
        const hasPluralIngredients = uniqueTypes.some(t => t.value === 'ingredientes');
        if (hasPluralIngredients) {
          uniqueTypes = uniqueTypes.filter(t => t.value !== 'ingredient');
        }

        setCategoryTypes(uniqueTypes);

        // Auto-select first tab if current selection doesn't exist
        if (uniqueTypes.length > 0) {
          const currentExists = uniqueTypes.some(t => t.value === selectedType);
          if (!currentExists) {
            setSelectedType(uniqueTypes[0].value);
          }
        }
      } else {
        setCategoryTypes([]);
      }
    } catch (error) {
      console.error("Error loading types:", error);
      setCategoryTypes([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("O nome da categoria é obrigatório.");
      return;
    }

    // Garantir que o type está sempre definido
    const dataToSubmit = {
      ...formData,
      type: formData.type || selectedType  // Usar selectedType se não tiver type definido
    };

    try {
      if (currentCategory?.id) {
        await CategoryTree.update(currentCategory.id, dataToSubmit);
        toast({
          title: "Sucesso",
          description: "Categoria atualizada com sucesso.",
        });
      } else {
        await CategoryTree.create(dataToSubmit);
        toast({
          title: "Sucesso",
          description: "Categoria criada com sucesso.",
        });
      }

      setIsDialogOpen(false);
      setCurrentCategory(null);
      setParentCategory(null);
      resetForm();
      await loadCategoryTree();
    } catch (error) {
      setError("Erro ao salvar categoria. Por favor, tente novamente.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: selectedType,
      description: "",
      parent_id: null,
      level: 1,
      active: true
    });
    setIsAddingSubcategory(false);
    setIsAddingItem(false);
  };

  const handleEdit = (category) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name || "",
      type: category.type || "ingredient",
      description: category.description || "",
      parent_id: category.parent_id,
      level: category.level || 1,
      active: category.active ?? true
    });
    setIsDialogOpen(true);
  };

  const handleAddSubcategory = (parentCat) => {
    setParentCategory(parentCat);
    setIsAddingSubcategory(true);
    setIsAddingItem(false);

    // Calcular a ordem da nova subcategoria
    const existingSubcategories = getSubcategories(parentCat.id);
    const nextOrder = existingSubcategories.length > 0
      ? Math.max(...existingSubcategories.map(sub => sub.order || 0)) + 1
      : 1;

    setFormData({
      name: "",
      type: parentCat.type,
      description: "",
      parent_id: parentCat.id,
      level: (parentCat.level || 1) + 1,
      order: nextOrder,
      active: true
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (category) => {
    if (!category || !category.id) {
      toast({
        title: "Erro",
        description: "Categoria inválida para exclusão.",
        variant: "destructive"
      });
      return;
    }

    const hasChildren = categoryTree.some(cat => cat.parent_id === category.id);
    if (hasChildren) {
      toast({
        title: "Operação não permitida",
        description: "Esta categoria possui subcategorias. Remova-as primeiro.",
        variant: "destructive"
      });
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
      return;
    }

    try {
      await CategoryTree.delete(category.id);
      toast({
        title: "Sucesso",
        description: "Categoria excluída com sucesso.",
      });
      await loadCategoryTree();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir categoria. Verifique se ela não está sendo usada.",
        variant: "destructive"
      });
    }
  };

  const toggleExpand = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const getRootCategories = (type) => {
    return categoryTree
      .filter(cat => cat.type === type && cat.level === 1)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const getSubcategories = (parentId) => {
    return categoryTree
      .filter(cat => cat.parent_id === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const handleAddItem = (parentCat) => {
    if (parentCat.level >= 3) {
      toast({
        title: "Aviso",
        description: "Não é possível adicionar itens em um nível maior que 3",
        variant: "warning"
      });
      return;
    }

    setParentCategory(parentCat);
    setIsAddingItem(true);
    setIsAddingSubcategory(false);

    // Calcular a ordem do novo item
    const existingItems = getSubcategories(parentCat.id);
    const nextOrder = existingItems.length > 0
      ? Math.max(...existingItems.map(item => item.order || 0)) + 1
      : 1;

    setFormData({
      name: "",
      type: parentCat.type,
      description: "",
      parent_id: parentCat.id,
      level: 3, // Sempre nível 3 para itens
      order: nextOrder,
      active: true
    });
    setIsDialogOpen(true);
  };

  const getSortedFlatTree = (type) => {
    const result = [];

    const traverse = (parentId) => {
      const children = getSubcategories(parentId);
      children.forEach(child => {
        result.push(child);
        traverse(child.id);
      });
    };

    const roots = getRootCategories(type);
    roots.forEach(root => {
      result.push(root);
      traverse(root.id);
    });

    return result;
  };

  const renderCategoryTree = (categories, level = 0) => {
    const getFolderColor = (level) => {
      switch (level) {
        case 1: return "text-blue-500";
        case 2: return "text-indigo-500";
        case 3: return "text-purple-500";
        default: return "text-gray-500";
      }
    };

    return (
      <div className={`pl-${level * 4}`}>
        {categories.map((category, index) => {
          const hasChildren = getSubcategories(category.id).length > 0;
          const isLeafNode = category.level === 3;
          const canAddChildren = category.level < 3;

          return (
            <div key={category.id || `category-${index}`} className="mb-2">
              <div className={`flex items-center p-2 rounded-md hover:bg-gray-50 ${level === 0 ? 'font-semibold' : ''}`}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpand(category.id)}
                    className="mr-2 focus:outline-none"
                  >
                    {expandedCategories[category.id] ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                ) : (
                  <div className="w-6 ml-2"></div>
                )}

                {isLeafNode ? (
                  <Tag className="h-4 w-4 text-gray-400 mr-2" />
                ) : (
                  <Folder className={`h-4 w-4 mr-2 ${getFolderColor(category.level)}`} />
                )}

                <span className={`flex-1 ${isLeafNode ? 'text-sm text-gray-600' : ''}`}>
                  {category.name}
                </span>

                <div className="flex items-center space-x-1">
                  {canAddChildren && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-blue-600"
                      onClick={() => {
                        if (category.level < 2) handleAddSubcategory(category);
                        else if (category.level === 2) handleAddItem(category);
                      }}
                      title={category.level < 2 ? "Nova Subcategoria" : "Nova Sub-Subcategoria"}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(category)}
                    className="h-8 w-8 text-gray-500 hover:text-blue-600"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(category)}
                    className="h-8 w-8 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {expandedCategories[category.id] && (
                <div className="ml-6 mt-1 pl-2 border-l-2 border-gray-200">
                  {renderCategoryTree(getSubcategories(category.id), level + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleAddNewTab = async () => {
    if (!newTabName.trim()) {
      toast({
        title: "Erro",
        description: "O nome da categoria é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      const typeValue = newTabName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (categoryTypes.some(t => t.value === typeValue)) {
        toast({
          title: "Erro",
          description: "Já existe uma categoria com este nome.",
          variant: "destructive"
        });
        return;
      }

      const newType = {
        value: typeValue,
        label: newTabName.trim(),
        is_system: false,
        order: categoryTypes.length + 1
      };

      const savedType = await CategoryType.create(newType);

      setCategoryTypes(prev => [...prev, savedType]);

      setSelectedType(typeValue);

      setNewTabName("");
      setIsNewTabDialogOpen(false);

      await loadCategoryTree();

      toast({
        title: "Sucesso",
        description: "Novo tipo de categoria criado com sucesso.",
      });
    } catch (error) {
      setError("Erro ao criar novo tipo de categoria. Por favor, tente novamente.");
    }
  };

  const handleUpdateTab = async () => {
    if (!editTabName.trim() || !currentEditingType) {
      toast({
        title: "Erro",
        description: "Nome da categoria é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      const nameExists = categoryTypes.some(t =>
        t.id !== currentEditingType.id &&
        t.label.toLowerCase() === editTabName.trim().toLowerCase()
      );

      if (nameExists) {
        toast({
          title: "Erro",
          description: "Já existe uma categoria com este nome.",
          variant: "destructive"
        });
        return;
      }

      const updatedType = {
        ...currentEditingType,
        label: editTabName.trim()
      };

      await CategoryType.update(currentEditingType.id, updatedType);

      setCategoryTypes(prev => prev.map(t =>
        t.id === currentEditingType.id ? { ...t, label: editTabName.trim() } : t
      ));

      setCurrentEditingType(null);
      setEditTabName("");
      setIsEditTabDialogOpen(false);

      toast({
        title: "Sucesso",
        description: "Nome da categoria atualizado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar nome da categoria.",
        variant: "destructive"
      });
    }
  };

  const handleAddCategory = () => {
    setCurrentCategory(null);

    // Calcular a ordem da nova categoria principal
    const existingRootCategories = getRootCategories(selectedType);
    const nextOrder = existingRootCategories.length > 0
      ? Math.max(...existingRootCategories.map(cat => cat.order || 0)) + 1
      : 1;

    setFormData({
      name: "",
      type: selectedType,  // Aqui definimos o type com base na tab atual
      description: "",
      parent_id: null,
      level: 1,
      order: nextOrder,
      active: true
    });
    setIsDialogOpen(true);
  };

  const handleIngredientFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="p-4 md:p-8">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Categorias
          </h1>
          <p className="text-gray-500 mt-1">Gerencie as categorias e subcategorias do sistema</p>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`p-2 ${viewMode === 'tree' ? 'bg-white shadow' : ''}`}
              onClick={() => setViewMode('tree')}
            >
              <Folder className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`p-2 ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`p-2 ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={() => setIsNewTabDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Tipo de Categoria
          </Button>
        </div>
      </div>

      {/* Navegação em Tabs */}
      <div className="mb-6">
        <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-gray-700">Tipos de Categorias</h2>
            <p className="text-sm text-gray-500 mt-1">Cada tipo agrupa categorias relacionadas (ex: Ingredientes, Receitas, Equipamentos)</p>
          </div>

          <div className="bg-white rounded-lg border p-1">
            <TabsList className="flex flex-wrap p-1 bg-gray-50 gap-1">
              {categoryTypes.map((type, index) => (
                <div key={type.id || `tab-trigger-${type.value}-${index}`} className="relative group">
                  <TabsTrigger
                    value={type.value}
                    className="flex items-center gap-2 relative px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-blue-600"
                  >
                    {type.label}

                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentEditingType(type);
                        setEditTabName(type.label);
                        setIsTabSettingsOpen(true);
                      }}
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Settings className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
                    </span>
                  </TabsTrigger>
                </div>
              ))}
            </TabsList>

            {categoryTypes.map((type, index) => (
              <TabsContent key={type.id || `tab-content-${type.value}-${index}`} value={type.value} className="p-4">


                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {type.label}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddCategory}
                      className="text-sm"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Nova Categoria Raiz
                    </Button>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                    <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Estrutura Hierárquica para {type.label}:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                      <div className="flex items-center">
                        <Folder className="h-3 w-3 text-blue-500 mr-1" />
                        <span className="text-blue-700"><strong>Categoria</strong><br />Nível principal</span>
                      </div>
                      <div className="flex items-center">
                        <Folder className="h-3 w-3 text-indigo-500 mr-1" />
                        <span className="text-indigo-700"><strong>Subcategoria</strong><br />Divisão da categoria</span>
                      </div>
                      <div className="flex items-center">
                        <Tag className="h-3 w-3 text-purple-500 mr-1" />
                        <span className="text-purple-700"><strong>Sub-Subcategoria</strong><br />Nível 3</span>
                      </div>
                      <div className="text-xs text-gray-600 italic">
                        Máximo 3 níveis de profundidade
                      </div>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center items-center h-60">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    {viewMode === 'tree' ? (
                      <div className="space-y-1">
                        {renderCategoryTree(getRootCategories(type.value))}
                        {getRootCategories(type.value).length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <div className="mb-4">
                              <Folder className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                              <p className="font-medium">Nenhuma categoria em {type.label}</p>
                              <p className="text-sm text-gray-400 mt-1">Comece criando sua primeira categoria raiz</p>
                            </div>

                          </div>
                        )}
                      </div>
                    ) : viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getRootCategories(type.value).map((category, index) => (
                          <div key={category.id || `grid-category-${type.value}-${index}`} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold text-gray-900">{category.name}</h4>
                                {category.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{category.description}</p>
                                )}
                              </div>
                              <Badge variant={category.active ? "success" : "secondary"} className="shrink-0 ml-2">
                                {category.active ? "Ativa" : "Inativa"}
                              </Badge>
                            </div>

                            <div className="flex-1 mt-2 mb-4">
                              {getSubcategories(category.id).length > 0 ? (
                                <div className="bg-gray-50 rounded-md p-2.5">
                                  <div className="flex items-center text-xs text-gray-500 font-medium mb-2">
                                    <Folder className="w-3 h-3 mr-1.5" />
                                    Subcategorias ({getSubcategories(category.id).length})
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {getSubcategories(category.id).slice(0, 8).map(sub => (
                                      <Badge key={sub.id} variant="secondary" className="bg-white border text-gray-700 font-normal hover:border-blue-300">
                                        {sub.name}
                                      </Badge>
                                    ))}
                                    {getSubcategories(category.id).length > 8 && (
                                      <Badge variant="ghost" className="text-xs text-gray-500 h-5 px-1">
                                        +{getSubcategories(category.id).length - 8}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 italic py-2 mt-2">
                                  Nenhuma subcategoria
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t flex justify-end gap-2 mt-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddSubcategory(category)}
                                className="h-8 text-xs"
                              >
                                <FolderPlus className="h-3.5 w-3.5 mr-1" />
                                Sub
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(category)}
                                className="h-8 text-xs"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 h-8 text-xs hover:bg-red-50"
                                onClick={() => handleDelete(category)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Excluir
                              </Button>
                            </div>
                          </div>
                        ))}
                        {getRootCategories(type.value).length === 0 && (
                          <div className="col-span-full text-center py-8 text-gray-500">
                            <div className="mb-4">
                              <Folder className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                              <p className="font-medium">Nenhuma categoria em {type.label}</p>
                              <p className="text-sm text-gray-400 mt-1">Comece criando sua primeira categoria raiz</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nome
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nível
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Descrição
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getSortedFlatTree(type.value).map((category, index) => (
                            <tr key={category.id || `table-category-${type.value}-${index}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="pl-1" style={{ marginLeft: `${(category.level - 1) * 16}px` }}>
                                    {category.level > 1 && <ChevronRight className="h-3 w-3 inline mr-1 text-gray-400" />}
                                    <Tag className="h-4 w-4 text-gray-500 mr-2 inline" />
                                    <span className="font-medium">{category.name}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant="outline" className="font-normal">
                                  {category.level === 1 ? 'Principal' : category.level === 2 ? 'Subcategoria' : 'Sub-Subcategoria'}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-gray-500">
                                  {category.description || '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant={category.active ? "success" : "secondary"}>
                                  {category.active ? "Ativa" : "Inativa"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddSubcategory(category)}
                                  >
                                    <FolderPlus className="h-4 w-4 mr-1" />
                                    Sub
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(category)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Editar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDelete(category)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Excluir
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {getSortedFlatTree(type.value).length === 0 && (
                            <tr>
                              <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                  <Folder className="h-8 w-8 text-gray-300 mb-2" />
                                  <p className="font-medium">Nenhuma categoria em {type.label}</p>
                                  <p className="text-sm text-gray-400 mt-1">Comece criando sua primeira categoria raiz</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>

      {/* Dialog Nova/Editar Categoria */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCurrentCategory(null);
          setParentCategory(null);
          setIsAddingSubcategory(false);
          setIsAddingItem(false);
          setError(null);
        }
        setIsDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isAddingItem
                ? `Nova Sub-Subcategoria em "${parentCategory?.name}"`
                : isAddingSubcategory
                  ? `Nova Subcategoria em "${parentCategory?.name}"`
                  : currentCategory
                    ? currentCategory.level === 3
                      ? "Editar Sub-Subcategoria"
                      : currentCategory.level === 2
                        ? "Editar Subcategoria"
                        : "Editar Categoria"
                    : "Nova Categoria Raiz"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                {isAddingItem
                  ? 'Nome da Sub-Subcategoria *'
                  : currentCategory?.level === 3
                    ? 'Nome da Sub-Subcategoria *'
                    : currentCategory?.level === 2 || isAddingSubcategory
                      ? 'Nome da Subcategoria *'
                      : 'Nome da Categoria *'}
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleIngredientFormChange}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-medium">
                {isAddingItem || currentCategory?.level === 3
                  ? 'Descrição da Sub-Subcategoria'
                  : currentCategory?.level === 2 || isAddingSubcategory
                    ? 'Descrição da Subcategoria'
                    : 'Descrição da Categoria'}
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleIngredientFormChange}
                placeholder={
                  isAddingItem || currentCategory?.level === 3
                    ? "Descrição da sub-subcategoria..."
                    : currentCategory?.level === 2 || isAddingSubcategory
                      ? "Descrição da subcategoria..."
                      : "Descrição da categoria principal..."
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, active: checked }))
                }
              />
              <Label htmlFor="active" className="text-sm font-medium">
                {isAddingItem || currentCategory?.level === 3
                  ? 'Sub-Subcategoria ativa'
                  : currentCategory?.level === 2 || isAddingSubcategory
                    ? 'Subcategoria ativa'
                    : 'Categoria ativa'}
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setCurrentCategory(null);
                  setParentCategory(null);
                  setIsAddingSubcategory(false);
                  setIsAddingItem(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {currentCategory
                  ? "Salvar Alterações"
                  : isAddingItem
                    ? "Criar Sub-Subcategoria"
                    : isAddingSubcategory
                      ? "Criar Subcategoria"
                      : "Criar Categoria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Configurações da Aba */}
      <Dialog open={isTabSettingsOpen} onOpenChange={setIsTabSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configurações do Tipo de Categoria</DialogTitle>
          </DialogHeader>

          {currentEditingType && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Tipo de Categoria</label>
                <Input
                  value={editTabName}
                  onChange={(e) => setEditTabName(e.target.value)}
                  placeholder="Nome do tipo de categoria"
                />
              </div>



              <div className="flex justify-between mt-4">
                <div>
                  {!currentEditingType.is_system && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        const hasCategories = categoryTree.some(cat => cat.type === currentEditingType.value);

                        if (hasCategories) {
                          toast({
                            title: "Operação não permitida",
                            description: "Este tipo de categoria possui categorias. Remova-as primeiro.",
                            variant: "destructive"
                          });
                          return;
                        }

                        if (window.confirm(`Tem certeza que deseja excluir "${currentEditingType.label}"?`)) {
                          CategoryType.delete(currentEditingType.id)
                            .then(() => {
                              setCategoryTypes(prev => prev.filter(t => t.id !== currentEditingType.id));

                              if (selectedType === currentEditingType.value) {
                                setSelectedType(categoryTypes[0]?.value || "ingredient");
                              }

                              setIsTabSettingsOpen(false);
                              setCurrentEditingType(null);

                              toast({
                                title: "Sucesso",
                                description: "Tipo de categoria excluído com sucesso."
                              });
                            })
                            .catch(error => {
                              toast({
                                title: "Erro",
                                description: "Erro ao excluir tipo de categoria.",
                                variant: "destructive"
                              });
                            });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsTabSettingsOpen(false);
                      setCurrentEditingType(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      handleUpdateTab();
                      setIsTabSettingsOpen(false);
                    }}
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Categoria Principal */}
      <Dialog open={isNewTabDialogOpen} onOpenChange={setIsNewTabDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Novo Tipo de Categoria</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Novo Tipo de Categoria</label>
              <Input
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="Ex: Equipamentos, Fornecedores, etc."
              />
              <p className="text-xs text-gray-500">
                Este será o nome da aba/seção que agrupará categorias relacionadas
              </p>
              <div className="bg-blue-50 p-3 rounded-md mt-3">
                <h4 className="text-sm font-medium text-blue-800 mb-1">Estrutura Hierárquica:</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded mr-2"></div>
                    <span><strong>Tipo:</strong> {newTabName || 'Seu Tipo'} (esta aba)</span>
                  </div>
                  <div className="flex items-center ml-4">
                    <div className="w-2 h-2 bg-indigo-400 rounded mr-2"></div>
                    <span><strong>Categoria:</strong> Nível principal de organização</span>
                  </div>
                  <div className="flex items-center ml-8">
                    <div className="w-2 h-2 bg-purple-400 rounded mr-2"></div>
                    <span><strong>Subcategoria:</strong> Divisão da categoria</span>
                  </div>
                  <div className="flex items-center ml-12">
                    <div className="w-2 h-2 bg-gray-400 rounded mr-2"></div>
                    <span><strong>Sub-Subcategoria:</strong> Nível 3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsNewTabDialogOpen(false);
              setNewTabName("");
            }}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddNewTab}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Criar Tipo de Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
