'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Utensils, Package, Copy, CopyCheck, Undo2, Clipboard, CalendarSync } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { MenuConfig } from '@/app/api/entities';
import WeekNavigator from '@/components/shared/WeekNavigator';
import MenuNotes from '@/components/shared/MenuNotes';
import MenuNoteDialog from '@/components/shared/MenuNoteDialog';
import SectionContainer, { Section } from '@/components/shared/SectionContainer';
import { useMenuData } from '@/hooks/cardapio/useMenuData';
import {
  useMenuLocations,
  useLocationSelection,
  useWeeklyMenuOperations,
  useMenuInterface,
  useMenuNotes,
  useMenuNoteActions,
  useMenuHelpers,
  useMenuCopyPaste
} from '@/hooks/cardapio';

// Componentes UI separados
import WeekDaySelector from '@/components/shared/WeekDaySelector';
import CategoryMenuCard from './CategoryMenuCard';
import LocationCheckboxGroup from './LocationCheckboxGroup';

export default function WeeklyMenuComponent() {
  // Hooks de estado e dados
  const menuInterface = useMenuInterface();
  const { locations, loading: locationsLoading, getActiveLocationIds, getAllClientIds } = useMenuLocations();
  const locationSelection = useLocationSelection(getAllClientIds());
  const menuOperations = useWeeklyMenuOperations();
  const menuHelpers = useMenuHelpers();
  const copyPaste = useMenuCopyPaste();

  // Estado para controlar tab de tipo de refeição (Dynamic Tabs)
  const [mealType, _setMealType] = useState(null);
  // Wrapper para debug: registra toda mudança de aba
  const setMealType = React.useCallback((newValue) => {
    console.log('🔴 [TAB_CHANGE] setMealType chamado:', { de: mealTypeRef?.current, para: newValue, stack: new Error().stack?.split('\n').slice(1, 4).join(' <- ') });
    _setMealType(newValue);
  }, []);

  const {
    categories,
    recipes,
    weeklyMenu,
    customers,
    menuConfig,
    loading,
    setWeeklyMenu,
    loadWeeklyMenu,
    forceReloadFromDatabase,
    refreshMenuConfig
  } = useMenuData(menuInterface.currentDate);

  // Auto-recovery: Se menuConfig estiver nulo após carregar, forçar busca no banco
  useEffect(() => {
    if (!loading && !menuConfig) {
      console.log('🔄 [WeeklyMenuComponent] Configuração não encontrada. Tentando forçar recarregamento...');
      forceReloadFromDatabase();
    }
    console.log('🟡 [EFFECT auto-recovery] loading:', loading, 'menuConfig:', !!menuConfig);
  }, [loading, menuConfig, forceReloadFromDatabase]);

  // Log para debug
  console.log('📋 [WeeklyMenuComponent] Dados recebidos:', {
    currentDate: menuInterface.currentDate.toLocaleDateString(),
    currentDayIndex: menuInterface.currentDayIndex,
    categories: categories?.length || 0,
    recipes: recipes?.length || 0,
    weeklyMenu: weeklyMenu ? 'presente' : 'null',
    menuConfig: menuConfig ? 'presente' : 'null',
    categoryGroups: menuConfig?.category_groups || 'undefined',
    loading
  });

  if (menuConfig?.category_groups?.length > 0) {
    console.log('🔍 [WeeklyMenuComponent] Abas detectadas:', menuConfig.category_groups.map(g => ({ id: g.id, name: g.name })));
  }

  const menuNotes = useMenuNotes(menuInterface.currentDate);
  const noteActions = useMenuNoteActions(menuNotes, categories, recipes);

  // Effects para validação e configuração inicial
  useEffect(() => {
    if (menuConfig?.available_days && !menuConfig.available_days.includes(menuInterface.currentDayIndex)) {
      const firstAvailableDay = menuConfig.available_days[0];
      if (firstAvailableDay) {
        menuInterface.setCurrentDayIndex(firstAvailableDay);
      }
    }
  }, [menuConfig?.available_days, menuInterface.currentDayIndex]);

  // Inicializar mealType com o primeiro grupo quando category_groups carrega
  // Usar ref para evitar stale closure (mealType não está nas dependências para não re-triggerar)
  const mealTypeRef = React.useRef(mealType);
  React.useEffect(() => { mealTypeRef.current = mealType; }, [mealType]);

  const groupIds = menuConfig?.category_groups?.map(g => g.id).join(',') || '';
  useEffect(() => {
    // IMPORTANTE: Se groupIds está vazio, menuConfig está temporariamente null (ex: durante update Firestore)
    // NÃO resetar mealType neste caso — manter a aba atual
    if (!groupIds) {
      console.log('🟢 [EFFECT groupIds] groupIds vazio (menuConfig transitório) — ignorando');
      return;
    }

    if (menuConfig?.category_groups?.length > 0) {
      const currentMealType = mealTypeRef.current;
      const currentGroupExists = currentMealType && menuConfig.category_groups.some(g => g.id === currentMealType);
      console.log('🟢 [EFFECT groupIds] currentMealType:', currentMealType, 'exists:', currentGroupExists);

      if (!currentGroupExists) {
        const firstGroupId = menuConfig.category_groups[0].id;
        console.log('🔴 [EFFECT groupIds] Inicializando aba:', firstGroupId);
        setMealType(firstGroupId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIds]);

  // Estado para controlar se já aplicamos as configurações iniciais
  const [hasAppliedInitialConfig, setHasAppliedInitialConfig] = React.useState(false);

  useEffect(() => {
    if (menuConfig?.expanded_categories && menuConfig.expanded_categories.length > 0 && !hasAppliedInitialConfig) {
      menuConfig.expanded_categories.forEach(categoryId => {
        if (!menuInterface.isLocationVisible(categoryId)) {
          menuInterface.toggleLocationVisibility(categoryId);
        }
      });
      setHasAppliedInitialConfig(true);
    }
  }, [menuConfig?.expanded_categories, hasAppliedInitialConfig]);



  // Handlers e funções utilitárias - Otimizado para não recarregar tudo
  const handleDateChange = (newDate) => {
    // Atualiza apenas a data, o useEffect se encarrega de carregar o menu
    menuInterface.setCurrentDate(newDate);
  };

  const getActiveCategories = () => menuHelpers.getActiveCategories(categories, menuConfig);
  const getCategoryColor = (categoryId) => menuHelpers.getCategoryColor(categoryId, categories, menuConfig);
  const getAvailableDays = () => menuConfig?.available_days || [0, 1, 2, 3, 4, 5, 6];

  // Operações de menu - agora com suporte a mealType
  const handleMenuItemChange = async (dayIndex, categoryId, itemIndex, newItem) => {
    try {
      let currentMenu = weeklyMenu;
      if (!currentMenu) {
        currentMenu = await menuOperations.createWeeklyMenu(menuInterface.currentDate);
        setWeeklyMenu(currentMenu);
      }

      const updatedMenu = await menuOperations.updateMenuItem(currentMenu, mealType, dayIndex, categoryId, itemIndex, newItem);
      setWeeklyMenu(updatedMenu);
    } catch (error) {
    }
  };

  const createWeeklyMenu = async () => {
    const newMenu = await menuOperations.createWeeklyMenu(menuInterface.currentDate);
    setWeeklyMenu(newMenu);
    return newMenu;
  };

  const addMenuItem = async (dayIndex, categoryId) => {
    try {
      const createMenuFn = () => menuOperations.createWeeklyMenu(menuInterface.currentDate);
      const updatedMenu = await menuOperations.addMenuItem(weeklyMenu, mealType, dayIndex, categoryId, createMenuFn, getActiveLocationIds);
      if (updatedMenu) {
        setWeeklyMenu(updatedMenu);
      }
    } catch (error) {
    }
  };

  const removeMenuItem = async (dayIndex, categoryId, itemIndex) => {
    try {
      const updatedMenu = await menuOperations.removeMenuItem(weeklyMenu, mealType, dayIndex, categoryId, itemIndex);
      if (updatedMenu) {
        setWeeklyMenu(updatedMenu);
      }
    } catch (error) {
    }
  };

  // Handlers de interface
  const handleOpenChange = (categoryId, itemIndex, open) => {
    menuInterface.handleOpenChange(categoryId, itemIndex, open);
    if (!open) {
      menuInterface.clearSearchTerm(categoryId, itemIndex);
    }
  };

  const toggleLocationVisibility = (categoryId) => {
    menuInterface.toggleLocationVisibility(categoryId);
  };

  const handleLocationChange = async (dayIndex, categoryId, itemIndex, locationId, checked) => {
    try {
      const currentItem = weeklyMenu?.menu_data[dayIndex]?.[categoryId]?.[itemIndex];
      const currentLocations = currentItem?.locations || [];

      let newLocations;

      if (locationId === 'select-all') {
        newLocations = checked ? locationSelection.selectAll() : locationSelection.unselectAll();
      } else {
        newLocations = locationSelection.toggleLocation(currentLocations, locationId, checked);
      }

      await handleMenuItemChange(dayIndex, categoryId, itemIndex, { locations: newLocations });
    } catch (error) {
    }
  };

  // Loading state
  if (loading || !categories || !recipes) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Drag and Drop Handler
  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, type } = result;
    const sourceIndex = source.index;
    const destinationIndex = destination.index;

    if (sourceIndex === destinationIndex && source.droppableId === destination.droppableId) return;

    // ─── Item reordering within a category ───
    if (type === 'MENU_ITEM') {
      const droppableId = source.droppableId; // "items-{categoryId}"
      const categoryId = droppableId.replace('items-', '');

      try {
        const updatedMenu = await menuOperations.reorderMenuItems(
          weeklyMenu, mealType, menuInterface.currentDayIndex, categoryId, sourceIndex, destinationIndex
        );
        if (updatedMenu) {
          setWeeklyMenu(updatedMenu);
        }
      } catch (error) {
        console.error('❌ Erro ao reordenar itens:', error);
      }
      return;
    }

    // ─── Category reordering (existing logic) ───
    if (!mealType || !menuConfig?.category_groups) return;

    const groupIndex = menuConfig.category_groups.findIndex(g => g.id === mealType);
    if (groupIndex === -1) return;

    const currentGroup = menuConfig.category_groups[groupIndex];

    // 2. Determine visible items (to map indices correctly)
    const visibleItems = currentGroup.items
      .map(id => categories.find(c => c.id === id))
      .filter(Boolean)
      .filter(cat => menuConfig.active_categories?.[cat.id] !== false);

    // 3. Reorder visible items
    const newVisibleIds = visibleItems.map(c => c.id);
    const [movedId] = newVisibleIds.splice(sourceIndex, 1);
    newVisibleIds.splice(destinationIndex, 0, movedId);

    // 4. Reconstruct items array (visible + hidden)
    const allHiddenIds = currentGroup.items.filter(id =>
      !visibleItems.some(v => v.id === id) && id !== movedId
    );

    const finalItems = [...newVisibleIds, ...allHiddenIds];

    // 5. Update State & DB
    const newGroups = [...menuConfig.category_groups];
    newGroups[groupIndex] = { ...currentGroup, items: finalItems };

    const newConfig = { ...menuConfig, category_groups: newGroups };

    // Initial optimistic update via localStorage (hook listens to this)
    localStorage.setItem('menuConfig_v2', JSON.stringify(newConfig));

    // Force refresh immediately for this component
    if (refreshMenuConfig) refreshMenuConfig();

    // Persist to Firestore
    try {
      await MenuConfig.update(menuConfig.id, {
        category_groups: newGroups
      });
      console.log('✅ Ordenação salva com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao salvar ordenação:', error);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-6">
        {/* Navegação de Semana - Sem card separado, integrado ao layout */}
        <div className="print:hidden mb-6">
          <div className="space-y-6">
            <div className="flex justify-center">
              <WeekNavigator
                currentDate={menuInterface.currentDate}
                onDateChange={handleDateChange}
                weekRange={menuConfig?.available_days?.some(d => d === 0 || d === 6) ? 'full' : 'workdays'}
                showCalendar={true}
              />
            </div>

            <div>
              {/* Ícones de ação da semana (copiar + desfazer) */}
              <div className="flex justify-end items-center gap-1 mb-1">
                {weeklyMenu && copyPaste.isAnyDayPasted(weeklyMenu) && (
                  <button
                    onClick={async () => {
                      const result = await copyPaste.undoPastedWeek(weeklyMenu);
                      if (result) setWeeklyMenu(result);
                    }}
                    disabled={copyPaste.copying}
                    title="Desfazer semana toda"
                    className="p-1.5 rounded-lg text-amber-500 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={async () => {
                    await copyPaste.copyWeekToNextWeek(weeklyMenu, menuInterface.currentDate);
                  }}
                  disabled={copyPaste.copying || !weeklyMenu}
                  title="Copiar semana toda → próxima semana"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <CalendarSync className="w-4 h-4" />
                </button>
              </div>

              <WeekDaySelector
                currentDate={menuInterface.currentDate}
                currentDayIndex={menuInterface.currentDayIndex}
                availableDays={getAvailableDays()}
                onDayChange={menuInterface.setCurrentDayIndex}
                onCopyDay={async (dayIdx) => {
                  await copyPaste.copyDayToNextWeek(weeklyMenu, menuInterface.currentDate, dayIdx);
                }}
                copyingDay={copyPaste.copying || !weeklyMenu}
                onUndoDay={async (dayIdx) => {
                  const result = await copyPaste.undoPastedDay(weeklyMenu, dayIdx);
                  if (result) setWeeklyMenu(result);
                }}
                isDayPasted={weeklyMenu ? (dayIdx) => copyPaste.isDayPasted(weeklyMenu, dayIdx) : null}
                undoingDay={copyPaste.copying}
              />
            </div>

            {/* Tabs Dinâmicas baseadas em Grupos */}
            <div className="flex justify-center mt-4 flex-col items-center gap-2">
              {menuConfig?.category_groups?.some(g => g.name === 'Menu diário' || g.name === 'Almoço') && (
                <button
                  onClick={() => {
                    const { nukeFirestoreCache } = require('@/hooks/cardapio/useMenuData').useMenuData(menuInterface.currentDate);
                    nukeFirestoreCache();
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 font-bold animate-pulse"
                >
                  ☢️ DADOS ANTIGOS DETECTADOS! CLIQUE AQUI PARA LIMPAR
                </button>
              )}
              <Tabs value={mealType} onValueChange={setMealType} className="w-full max-w-3xl">
                <TabsList className="flex w-full flex-wrap h-auto p-1 bg-gray-100/80">
                  {menuConfig?.category_groups?.length > 0 ? (
                    menuConfig.category_groups.map(group => (
                      <TabsTrigger
                        key={group.id}
                        value={group.id}
                        className="flex items-center gap-2 flex-1 min-w-[120px]"
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        {group.name}
                      </TabsTrigger>
                    ))
                  ) : (
                    <div className="w-full py-2 text-center text-gray-500 text-sm">
                      Nenhuma aba configurada. Vá em Configurações → Layout para criar abas.
                    </div>
                  )}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {/* Menu Principal */}
          <div className="flex-1 space-y-4">
            {/* Cards de Categorias */}
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="categories-list">
                {(provided) => (
                  <div
                    className="space-y-4"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {(() => {
                      // Determine which categories to show based on selected tab (mealType)
                      let categoriesToShow = [];

                      if (menuConfig?.category_groups?.length > 0) {
                        const currentGroup = menuConfig.category_groups.find(g => g.id === mealType);
                        if (currentGroup) {
                          // Filter categories that belong to this group AND are active
                          categoriesToShow = currentGroup.items
                            .map(id => categories.find(c => c.id === id))
                            .filter(Boolean)
                            .filter(cat => {
                              // Check if active (default to true if not specified)
                              return menuConfig.active_categories?.[cat.id] !== false;
                            });
                        }
                      } else {
                        // Legacy behavior: show all active categories
                        categoriesToShow = getActiveCategories();
                      }

                      if (categoriesToShow.length === 0) {
                        return (
                          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-500">Nenhuma categoria configurada para esta aba.</p>
                            <p className="text-sm text-gray-400 mt-1">Vá em Configurações para adicionar categorias.</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {categoriesToShow.map((category, index) => {
                            if (!category) return null;

                            // Acessar dados usando a estrutura: menu_data[mealType][dayIndex][categoryId]
                            const mealTypeData = weeklyMenu?.menu_data?.[mealType] || weeklyMenu?.menu_data;
                            const categoryItems = mealTypeData?.[menuInterface.currentDayIndex]?.[category.id] || [];
                            const fixedDropdowns = menuConfig?.fixed_dropdowns?.[category.id] || 0;
                            const items = menuHelpers.ensureMinimumItems(categoryItems, fixedDropdowns);
                            const categoryColor = getCategoryColor(category.id);

                            return (
                              <Draggable
                                key={category.id}
                                draggableId={category.id}
                                index={index}
                                isDragDisabled={!mealType} // Disable drag if no tab selected (legacy mode)
                              >
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                  >
                                    <CategoryMenuCard
                                      category={category}
                                      items={items}
                                      categoryColor={categoryColor}
                                      isLocationVisible={menuInterface.isLocationVisible(category.id)}
                                      onToggleLocationVisibility={() => toggleLocationVisibility(category.id)}
                                      onMenuItemChange={handleMenuItemChange}
                                      onAddMenuItem={() => addMenuItem(menuInterface.currentDayIndex, category.id)}
                                      onRemoveMenuItem={(itemIndex) => removeMenuItem(menuInterface.currentDayIndex, category.id, itemIndex)}
                                      recipes={recipes}
                                      categories={categories}
                                      menuHelpers={menuHelpers}
                                      menuInterface={menuInterface}
                                      noteActions={noteActions}
                                      currentDayIndex={menuInterface.currentDayIndex}
                                      renderLocationCheckboxes={(itemIndex, item) => (
                                        <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                          <LocationCheckboxGroup
                                            locations={locations}
                                            item={item}
                                            recipes={recipes}
                                            locationSelection={locationSelection}
                                            onLocationChange={(locationId, checked) =>
                                              handleLocationChange(menuInterface.currentDayIndex, category.id, itemIndex, locationId, checked)
                                            }
                                            categoryId={category.id}
                                            itemIndex={itemIndex}
                                          />
                                        </div>
                                      )}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </>
                      );
                    })()}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* Sidebar de Observações */}
          <div className="w-72 flex-shrink-0">
            <div className="sticky top-6">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Observações</h3>
                  <p className="text-sm text-gray-600">Notas e lembretes do cardápio</p>
                </div>
                <div className="p-3">
                  <MenuNotes
                    notes={menuNotes.notes}
                    currentDate={menuInterface.currentDate}
                    currentDayIndex={menuInterface.currentDayIndex}
                    onNotesChange={menuNotes.setNotes}
                    onEdit={noteActions.startEditingNote}
                    onDelete={noteActions.deleteNote}
                    onToggleImportant={noteActions.toggleNoteImportance}
                    categoryColors={categories?.reduce((acc, cat) => {
                      acc[cat.id] = menuHelpers.getCategoryColor(cat.id, categories, menuConfig);
                      return acc;
                    }, {}) || {}}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de Observações */}
      <MenuNoteDialog
        isOpen={noteActions.isAddingNote || noteActions.isEditingNote}
        onClose={noteActions.cancelNoteOperation}
        onSave={noteActions.saveNote}
        isEditing={noteActions.isEditingNote}
        noteData={noteActions.currentNoteData}
        formData={noteActions.noteForm}
        onContentChange={noteActions.updateNoteContent}
        onToggleImportant={noteActions.toggleNoteFormImportance}
      />
    </div>
  );
}