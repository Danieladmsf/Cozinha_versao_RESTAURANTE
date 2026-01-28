'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Utensils, Package } from 'lucide-react';
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
  useMenuHelpers
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

  // Estado para controlar tab de tipo de refeição (Almoço / Mono Porções)
  const [mealType, setMealType] = useState('almoco');

  const {
    categories,
    recipes,
    weeklyMenu,
    customers,
    menuConfig,
    loading,
    setWeeklyMenu,
    loadWeeklyMenu
  } = useMenuData(menuInterface.currentDate);

  // Log para debug
  console.log('📋 [WeeklyMenuComponent] Dados recebidos:', {
    currentDate: menuInterface.currentDate.toLocaleDateString(),
    currentDayIndex: menuInterface.currentDayIndex,
    categories: categories?.length || 0,
    recipes: recipes?.length || 0,
    weeklyMenu: weeklyMenu ? {
      id: weeklyMenu.id,
      weekKey: weeklyMenu.week_key,
      temMenuData: !!weeklyMenu.menu_data,
      diasComDados: weeklyMenu.menu_data ? Object.keys(weeklyMenu.menu_data).length : 0,
      diasDisponiveis: weeklyMenu.menu_data ? Object.keys(weeklyMenu.menu_data) : [],
      menuData: weeklyMenu.menu_data
    } : 'null',
    menuConfig: menuConfig ? 'presente' : 'null',
    loading
  });

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
  useEffect(() => {
    if (menuConfig?.category_groups?.length > 0) {
      const firstGroupId = menuConfig.category_groups[0].id;
      // Só muda se o mealType atual não existe nos groups
      const currentGroupExists = menuConfig.category_groups.some(g => g.id === mealType);
      if (!currentGroupExists) {
        setMealType(firstGroupId);
      }
    }
  }, [menuConfig?.category_groups]);

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
  const getAvailableDays = () => menuConfig?.available_days || [1, 2, 3, 4, 5];

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

            <WeekDaySelector
              currentDate={menuInterface.currentDate}
              currentDayIndex={menuInterface.currentDayIndex}
              availableDays={getAvailableDays()}
              onDayChange={menuInterface.setCurrentDayIndex}
            />

            {/* Tabs Dinâmicas baseadas em Grupos */}
            <div className="flex justify-center mt-4">
              <Tabs value={mealType} onValueChange={setMealType} className="w-full max-w-3xl">
                <TabsList className="flex w-full flex-wrap h-auto p-1 bg-gray-100/80">
                  {menuConfig?.category_groups?.length > 0 ? (
                    menuConfig.category_groups.map(group => (
                      <TabsTrigger
                        key={group.id}
                        value={group.id}
                        className="flex items-center gap-2 flex-1 min-w-[120px]"
                      >
                        {group.id === 'almoco' ? <Utensils className="h-4 w-4" /> :
                          group.id === 'mono_porcoes' ? <Package className="h-4 w-4" /> :
                            <div className="w-2 h-2 rounded-full bg-blue-400" />}
                        {group.name}
                      </TabsTrigger>
                    ))
                  ) : (
                    <>
                      {/* Fallback Legacy Tabs */}
                      <TabsTrigger value="almoco" className="flex items-center gap-2 flex-1">
                        <Utensils className="h-4 w-4" />
                        Almoço
                      </TabsTrigger>
                      <TabsTrigger value="mono_porcoes" className="flex items-center gap-2 flex-1">
                        <Package className="h-4 w-4" />
                        Mono Porções
                      </TabsTrigger>
                    </>
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
            <div className="space-y-4">
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

                return categoriesToShow.map(category => {
                  if (!category) return null;

                  // Acessar dados usando a estrutura: menu_data[mealType][dayIndex][categoryId]
                  const mealTypeData = weeklyMenu?.menu_data?.[mealType] || weeklyMenu?.menu_data;
                  const categoryItems = mealTypeData?.[menuInterface.currentDayIndex]?.[category.id] || [];
                  const fixedDropdowns = menuConfig?.fixed_dropdowns?.[category.id] || 0;
                  const items = menuHelpers.ensureMinimumItems(categoryItems, fixedDropdowns);
                  const categoryColor = getCategoryColor(category.id);

                  console.log(`🍽️ [WeeklyMenuComponent] Categoria ${category.name} - Tab ${mealType} - Dia ${menuInterface.currentDayIndex}:`, {
                    categoryItems: categoryItems.length,
                    items: items.length
                  });

                  return (
                    <CategoryMenuCard
                      key={category.id}
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
                  );
                });
              })()}
            </div>
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