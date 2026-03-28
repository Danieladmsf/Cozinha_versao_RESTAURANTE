'use client';

import React from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { renderFormattedRecipeName } from '@/lib/textHelpers';
import { useLocationSelection } from '@/hooks/cardapio/useLocationSelection';
import { useAvailableDays, DAY_NAMES_FULL } from '@/hooks/useAvailableDays';

export default function WeeklyMenuGrid({
  currentDate,
  weeklyMenu,
  activeCategories,
  recipes,
  selectedCustomer,
  getFilteredItemsForClient,
  getCategoryColor,
  customers,
  locations,
  getAllClientIds,
  visibleDays: visibleDaysProp
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const locationSelection = useLocationSelection(getAllClientIds());

  // Hook centralizado para dias disponíveis
  const availableDays = useAvailableDays();
  // Usar visibleDays do prop se fornecido, senão usar todos os days disponíveis
  const daysToRender = visibleDaysProp || availableDays;

  // ============================================================
  // 🔍 DIAGNÓSTICO COMPLETO - Copie tudo do console e envie
  // ============================================================
  console.log('🔍🔍🔍 ═══════════════════════════════════════════════════');
  console.log('🔍 DIAGNÓSTICO CARDÁPIO - COPIE TUDO ABAIXO E ENVIE');
  console.log('🔍🔍🔍 ═══════════════════════════════════════════════════');
  console.log('📊 [1] WeeklyMenuGrid Props:', {
    hasWeeklyMenu: !!weeklyMenu,
    weekKey: weeklyMenu?.week_key,
    weeklyMenuId: weeklyMenu?.id || 'SEM ID',
    activeCategoriesCount: activeCategories?.length,
    activeCategoriesNames: activeCategories?.map(c => `${c.name} (${c.id})`),
    recipesCount: recipes?.length,
    selectedCustomer: selectedCustomer?.name,
    availableDays
  });
  
  if (weeklyMenu) {
    console.log('📊 [2] weeklyMenu.menu_data KEYS:', Object.keys(weeklyMenu.menu_data || {}));
    // Dumpar toda a estrutura de menu_data para diagnóstico
    if (weeklyMenu.menu_data) {
      Object.keys(weeklyMenu.menu_data).forEach(mealType => {
        if (mealType.startsWith('_')) return;
        const mealData = weeklyMenu.menu_data[mealType];
        console.log(`📊 [3] menu_data["${mealType}"] KEYS (dias):`, Object.keys(mealData || {}));
        Object.keys(mealData || {}).forEach(dayKey => {
          const dayData = mealData[dayKey];
          console.log(`📊 [4] menu_data["${mealType}"]["${dayKey}"] (categorias):`, 
            Object.keys(dayData || {}).map(catId => {
              const items = dayData[catId];
              const itemList = Array.isArray(items) ? items : Object.values(items || {});
              return `${catId}: ${itemList.length} itens`;
            })
          );
        });
      });
    }
  } else {
    console.log('⚠️ [2] weeklyMenu É NULL! Nenhum cardápio encontrado para esta semana.');
  }
  console.log('🔍🔍🔍 ═══════════════════════════════════════════════════');

  // Função para obter clientes desmarcados de uma receita
  const getUncheckedClients = (item) => {
    if (!item || !item.locations || !locations) return [];

    return locations.filter(location => {
      const isSelected = locationSelection.isLocationSelected(item.locations, location.id);
      return !isSelected; // Retorna apenas os NÃO selecionados
    });
  };

  // Determinar número de colunas do grid
  const getGridCols = () => {
    const numDays = daysToRender.length;
    return `repeat(${numDays}, 1fr)`;
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: getGridCols(),
      gap: '6px',
      minHeight: 'auto',
      padding: '0',
      width: '100%',
      overflow: 'visible'
    }}>
      {daysToRender.map(day => {
        const dayDate = addDays(weekStart, day);
        // Agregação de itens de todos os tipos de refeição (grupos) para o dia
        const dayItems = {};
        if (weeklyMenu?.menu_data) {
          console.log(`🔍 [WeeklyMenuGrid] Agregando dados para o dia ${day}...`);
          Object.keys(weeklyMenu.menu_data).forEach(mealType => {
            if (mealType.startsWith('_')) return;

            const itemsForDay = weeklyMenu.menu_data[mealType]?.[day] || weeklyMenu.menu_data[mealType]?.[String(day)];
            if (itemsForDay) {
              console.log(`   - Encontrados itens em "${mealType}" para o dia ${day}`);
              Object.entries(itemsForDay).forEach(([catId, items]) => {
                if (!dayItems[catId]) dayItems[catId] = [];
                const itemList = Array.isArray(items) ? items : Object.values(items);
                console.log(`     > Categoria ${catId}: adicionando ${itemList.length} itens`);
                dayItems[catId] = [...dayItems[catId], ...itemList];
              });
            }
          });
        }

        console.log(`📅 [WeeklyMenuGrid] Resultado Dia ${day}:`, {
          temDados: Object.keys(dayItems).length > 0,
          categoriasResumo: Object.keys(dayItems).map(id => {
            const cat = activeCategories.find(c => c.id === id);
            return `${cat ? cat.name : id} (${dayItems[id].length})`;
          })
        });

        return (
          <div key={day} style={{
            border: '2px solid #000',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'auto',
            height: 'auto',
            overflow: 'visible'
          }}>
            <div style={{
              borderBottom: '1px solid #ccc',
              paddingBottom: '3px',
              marginBottom: '4px',
              flexShrink: 0
            }}>
              <h2 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0', textAlign: 'center' }}>{DAY_NAMES_FULL[day].toUpperCase().replace('-FEIRA', '')} - {format(dayDate, 'dd/MM/yyyy', { locale: ptBR })}</h2>
            </div>

            <div style={{ padding: '2px', borderTop: '1px solid #eee', minHeight: '100px', backgroundColor: '#fff' }}>
              {activeCategories.map((category, categoryIndex) => {
                const items = dayItems[category.id] || [];
                const filteredItems = selectedCustomer?.id === 'all'
                  ? items
                  : getFilteredItemsForClient(items, category.id, selectedCustomer?.id);

                if (filteredItems.length === 0) return null;

                return (
                  <div key={category.id} style={{ marginBottom: '10px', display: 'block' }}>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 'normal',
                      backgroundColor: '#e2e8f0',
                      padding: '1px 4px',
                      borderRadius: '4px',
                      color: '#1e293b',
                      marginBottom: '4px'
                    }}>{category.name}</div>
                          {filteredItems.map((item, idx) => {
                            const recipe = recipes.find(r => r.id === item.recipe_id);
                            if (!recipe) return null;

                            return (
                              <div key={`${category.id}-${idx}`} style={{ marginBottom: '2px' }}>
                                <div style={{
                                  fontSize: '10px',
                                  color: '#333',
                                  lineHeight: '1.2'
                                }}>
                                  • {renderFormattedRecipeName(recipe.name)}
                                </div>
                                {selectedCustomer?.id === 'all' && getUncheckedClients(item).length > 0 && (
                                  <div style={{
                                    fontSize: '8px',
                                    color: '#d00',
                                    textDecoration: 'line-through',
                                    marginLeft: '2px',
                                    lineHeight: '1.1'
                                  }}>
                                    {getUncheckedClients(item).map(client => client.name).join(', ')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                  </div>
                );
              })}

              {/* Estado vazio */}
              {!Object.keys(dayItems).some(categoryId => {
                const items = dayItems[categoryId] || [];
                const filteredItems = getFilteredItemsForClient(items, categoryId, selectedCustomer?.id);
                return filteredItems.length > 0;
              }) && (
                  <div style={{
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '10px',
                    marginTop: '20px'
                  }}>
                    <p>
                      {!selectedCustomer || selectedCustomer.id === 'all'
                        ? 'Nenhum item cadastrado'
                        : 'Sem itens para este cliente'
                      }
                    </p>
                    <p>neste dia</p>
                  </div>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
}