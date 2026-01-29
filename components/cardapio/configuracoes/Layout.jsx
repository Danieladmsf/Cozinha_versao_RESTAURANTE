import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Grid, GripVertical, Plus, Trash2, Pencil, Check, FolderPlus, Loader2, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const LayoutTab = ({
  categories,
  categoryTree,
  selectedMainCategories,
  activeCategories,
  expandedCategories,
  categoryColors,
  fixedDropdowns,
  categoryOrder,
  categoryGroups,
  getFilteredCategories,
  toggleCategoryActive,
  toggleExpandedCategory,
  updateFixedDropdowns,
  setCategoryOrder,
  setCategoryGroups
}) => {
  const [editingGroupId, setEditingGroupId] = React.useState(null);
  const [editingName, setEditingName] = React.useState("");

  // Fix for SSR/hydration issues with DragDropContext
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-save categoryGroups to localStorage when they change
  React.useEffect(() => {
    if (categoryGroups && categoryGroups.length >= 0) {
      try {
        const cachedConfig = localStorage.getItem('menuConfig');
        if (cachedConfig) {
          const config = JSON.parse(cachedConfig);
          config.category_groups = categoryGroups;
          localStorage.setItem('menuConfig', JSON.stringify(config));
          console.log('✅ [LayoutTab] categoryGroups salvo no localStorage:', categoryGroups.length, 'grupos');
        }
      } catch (e) {
        console.error('❌ [LayoutTab] Erro ao salvar categoryGroups no localStorage:', e);
      }
    }
  }, [categoryGroups]);

  const allFilteredCategories = getFilteredCategories();

  // Filtra categorias que já foram usadas como abas (group.name === cat.name ou group contém cat.id)
  // Para evitar duplicação na lista da direita
  const usedCategoryIds = (categoryGroups || []).flatMap(group => {
    // Se o grupo foi criado a partir de uma categoria, o ID original pode estar no nome ou items
    // Uma forma simples: verificar se existe uma categoria com o mesmo nome que o grupo
    const matchingCat = allFilteredCategories.find(c => c.name === group.name);
    return matchingCat ? [matchingCat.id] : [];
  });

  const filteredCategories = allFilteredCategories.filter(cat => !usedCategoryIds.includes(cat.id));

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, type, draggableId } = result;

    // 1. Reordering GROUPS
    if (type === "group" && destination.droppableId === "all-groups") {
      const newGroups = Array.from(categoryGroups || []);
      const [removed] = newGroups.splice(source.index, 1);
      newGroups.splice(destination.index, 0, removed);
      setCategoryGroups(newGroups);
      return;
    }

    // 2. Creating a NEW TAB (Group) from a Category
    if (type === "category" && destination.droppableId === "create-tab-zone") {
      const categoryId = draggableId;
      const category = filteredCategories.find(c => c.id === categoryId);

      if (category) {
        // Create new group based on category
        // Find children to populate items
        const children = categoryTree.filter(c => c.parent_id === category.id);
        const childrenIds = children.map(c => c.id);

        const newGroup = {
          id: `group-${category.id}-${Date.now()}`,
          name: category.name, // Default to category name
          items: childrenIds
        };

        setCategoryGroups([...(categoryGroups || []), newGroup]);
      }
      return;
    }

    // 3. Reordering CATEGORIES 
    // Case A: Moving within the same list (reordering items in a group)
    if (source.droppableId === destination.droppableId) {
      // If reordering inside the "Available Categories" list (source-categories) - usually disabled or just reorder array
      // Only handle reordering INSIDE A GROUP
      const groupIndex = categoryGroups.findIndex(g => g.id === source.droppableId);
      if (groupIndex !== -1) {
        const newGroups = [...categoryGroups];
        const group = newGroups[groupIndex];
        const newItems = Array.from(group.items);
        const [removed] = newItems.splice(source.index, 1);
        newItems.splice(destination.index, 0, removed);

        newGroups[groupIndex] = { ...group, items: newItems };
        setCategoryGroups(newGroups);
      }
      return;
    }

    // Case B: Moving specific category TO a group (from Available list OR another group)
    // Find Source (Group or List)
    const sourceGroupIndex = categoryGroups.findIndex(g => g.id === source.droppableId);
    const destGroupIndex = categoryGroups.findIndex(g => g.id === destination.droppableId);

    // If dropping into "create-tab-zone" handled above (but only if type=category). 
    // If dragging FROM group to create-tab-zone, it's weird. Assuming dragging from available list.

    if (destGroupIndex !== -1) {
      // Destination is a Group
      let itemId = draggableId;

      // Remove from Source Group if applicable
      if (sourceGroupIndex !== -1) {
        const sourceGroup = categoryGroups[sourceGroupIndex];
        const newSourceItems = sourceGroup.items.filter(id => id !== itemId);
        // We need to update state immediately for source? No, we batch update.
      }

      // Add to Dest Group
      const newGroups = [...categoryGroups];

      // If source was a group, remove item from it
      if (sourceGroupIndex !== -1) {
        const sGroup = newGroups[sourceGroupIndex];
        // Note: draggableId might be 'category-ID' or just 'ID'. Assuming 'ID'.
        // Wait, Draggable draggableId usually needs to be string.
        // In the list below, I use category.id.

        const newSItems = Array.from(sGroup.items);
        newSItems.splice(source.index, 1);
        newGroups[sourceGroupIndex] = { ...sGroup, items: newSItems };
      }

      // Add to destination
      const dGroup = newGroups[destGroupIndex];
      const newDItems = Array.from(dGroup.items);

      // If coming from Available List, itemId is just the category ID.
      // We need to ensure we don't duplicate if already there?
      if (!newDItems.includes(itemId)) {
        newDItems.splice(destination.index, 0, itemId);
      } else {
        // Just reorder if already exists? But we handled same-list reorder above.
        // If implicit duplicate, ignore?
      }

      newGroups[destGroupIndex] = { ...dGroup, items: newDItems };
      setCategoryGroups(newGroups);
    }
  };

  const removeGroup = (groupId) => {
    console.log('🗑️ [LayoutTab] Removendo grupo:', groupId);
    const removedGroup = categoryGroups.find(g => g.id === groupId);
    console.log('🗑️ [LayoutTab] Grupo removido:', removedGroup?.name);
    const newGroups = categoryGroups.filter(g => g.id !== groupId);
    console.log('🗑️ [LayoutTab] Grupos restantes:', newGroups.length);
    setCategoryGroups(newGroups);
  };

  const startEditing = (group) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  };

  const saveGroupName = () => {
    if (editingGroupId && editingName.trim()) {
      const newGroups = categoryGroups.map(g =>
        g.id === editingGroupId ? { ...g, name: editingName.trim() } : g
      );
      setCategoryGroups(newGroups);
      setEditingGroupId(null);
      setEditingName("");
    }
  };

  // Show loading while component is mounting (fixes SSR issues with DragDropContext)
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-slate-200 rounded-full"></div>
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <span className="ml-3 text-slate-600 font-medium">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DragDropContext onDragEnd={handleDragEnd}>

        {/* Container Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Esquerda: Abas Existentes (Tabs) */}
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <div className="p-1.5 bg-slate-900 rounded-lg">
                    <GripVertical className="h-4 w-4 text-white" />
                  </div>
                  Abas Configuradas
                </CardTitle>
                <p className="text-sm text-slate-500 font-normal mt-1">
                  Arraste categorias da lista ao lado para a área pontilhada abaixo para criar novas abas.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Groups List */}
                <Droppable droppableId="all-groups" type="group">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {categoryGroups && categoryGroups.map((group, groupIndex) => (
                        <Draggable key={group.id} draggableId={group.id} index={groupIndex}>
                          {(provided) => (
                            <div {...provided.innerRef} {...provided.draggableProps} className="border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200 p-0 overflow-hidden">
                              {/* Group Header */}
                              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                                <div className="flex items-center gap-2 flex-1">
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                                  </div>
                                  {editingGroupId === group.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <Input
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className="h-8 text-sm"
                                        autoFocus
                                      />
                                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveGroupName}>
                                        <Check className="h-4 w-4 text-green-600" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="font-medium text-sm flex items-center gap-2">
                                      {group.name}
                                      <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEditing(group)}>
                                        <Pencil className="h-3 w-3 text-gray-400" />
                                      </Button>
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{group.items.length} itens</Badge>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeGroup(group.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Items inside Group */}
                              <Droppable droppableId={group.id} type="category">
                                {(provided, snapshot) => (
                                  <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`p-2 min-h-[50px] transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                                  >
                                    {group.items.length === 0 && (
                                      <p className="text-xs text-center text-gray-400 py-2">
                                        Dê um nome para a aba (ex: "Confeitária") e os itens devem aparecer aqui.
                                      </p>
                                    )}
                                    <div className="space-y-1">
                                      {/* Filtrar items válidos primeiro para evitar problemas de índice */}
                                      {group.items
                                        .map(itemId => ({
                                          itemId,
                                          cat: categories.find(c => c.id === itemId) || categoryTree.find(c => c.id === itemId)
                                        }))
                                        .filter(item => item.cat)
                                        .map((item, index) => (
                                          <Draggable key={item.itemId} draggableId={item.itemId} index={index}>
                                            {(provided) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className="flex items-center gap-2 p-2 bg-white border rounded text-sm group"
                                              >
                                                <Grid className="h-3 w-3 text-gray-300" />
                                                <span>{item.cat.name}</span>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))
                                      }
                                      {provided.placeholder}
                                    </div>
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Zone to Create New Tab */}
                <Droppable droppableId="create-tab-zone" type="category">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2 transition-all duration-200
                        ${snapshot.isDraggingOver
                          ? 'border-emerald-400 bg-emerald-50 scale-[1.02]'
                          : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'}
                      `}
                    >
                      <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-2 transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        <FolderPlus className={`h-7 w-7 transition-colors duration-200 ${snapshot.isDraggingOver ? 'text-emerald-600' : 'text-slate-500'}`} />
                      </div>
                      <h3 className="font-semibold text-slate-800">Arraste uma Categoria aqui</h3>
                      <p className="text-sm text-slate-500 max-w-xs">
                        Para criar uma nova aba (ex: "Confeitaria"). Os itens da categoria serão adicionados automaticamente.
                      </p>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

          {/* Direita: Categorias Disponíveis */}
          <div className="space-y-4">
            <Card className="h-full border-slate-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-white border-b border-slate-100">
                <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                  <div className="p-1.5 bg-emerald-500 rounded-lg">
                    <LayoutGrid className="h-4 w-4 text-white" />
                  </div>
                  Categorias Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Droppable droppableId="source-categories" type="category" isDropDisabled={true}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                      {filteredCategories.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          Nenhuma categoria encontrada. Verifique os filtros na aba Categorias.
                        </div>
                      ) : (
                        filteredCategories.map((cat, index) => (
                          <Draggable key={cat.id} draggableId={cat.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`
                                                        flex items-center justify-between p-3 rounded border 
                                                        ${snapshot.isDragging ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-gray-200 hover:border-blue-200'}
                                                    `}
                              >
                                <span className="font-medium text-sm">{cat.name}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  Nível {cat.level}
                                </Badge>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

        </div>
      </DragDropContext>
    </div>
  );
};

export default LayoutTab;