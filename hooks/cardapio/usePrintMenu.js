import { useCallback } from 'react';
import { format, addDays, startOfWeek, endOfWeek, getWeek, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { renderFormattedRecipeName } from '@/lib/textHelpers';
import { useLocationSelection } from './useLocationSelection';

export const usePrintMenu = () => {
  const ALL_DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  
  // Função para obter clientes desmarcados de uma receita
  const getUncheckedClients = useCallback((item, locations, allClientIds) => {
    if (!item || !item.locations || !locations || !allClientIds) return [];
    
    // Simular o comportamento do useLocationSelection
    const isLocationSelected = (itemLocations, locationId) => {
      // Estado inicial: array vazio = todos selecionados
      if (!itemLocations || itemLocations.length === 0) {
        return true;
      }
      
      // Caso especial: marcador de "nenhum selecionado"
      if (itemLocations.includes('__NONE_SELECTED__')) {
        return false;
      }
      
      // Verificar se contém todos os IDs válidos
      const validIds = itemLocations.filter(id => allClientIds.includes(id));
      
      if (validIds.length === allClientIds.length) {
        return true; // Todos selecionados
      } else if (validIds.length === 0) {
        return false; // Nenhum selecionado
      } else {
        return itemLocations.includes(locationId); // Seleção parcial
      }
    };
    
    return locations.filter(location => {
      const isSelected = isLocationSelected(item.locations, location.id);
      return !isSelected; // Retorna apenas os NÃO selecionados
    });
  }, []);

  const formatRecipeName = useCallback((name) => {
    if (!name) return '';
    
    // Remover prefixos desnecessários
    const cleanName = name
      .replace(/^(Receita|Recipe)\s*[-:]?\s*/i, '')
      .replace(/\s*\(.*?\)\s*$/g, '') // Remove parênteses no final
      .trim();
    
    // Capitalizar primeira letra
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  }, []);



  const getCustomerName = useCallback((customerId, customers, locations) => {
    const customer = customers?.find(c => c.id === customerId);
    const location = locations?.find(l => l.id === customerId);
    return customer?.name || customer?.razao_social || location?.name || 'Cliente não encontrado';
  }, []);

  const getPrintStyles = useCallback((viewMode = 7) => {
    return `
      @page {
        size: A4 landscape;
        margin: 8mm;
      }
      @media print {
        html, body {
          width: 297mm;
          height: 210mm;
        }
      }
      
      * {
        box-sizing: border-box;
      }
      
      body {
        font-size: 11px;
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
      }
      
      .header {
        text-align: center;
        margin-bottom: 15px;
        flex-shrink: 0;
        padding: 10px 0;
      }
      
      .header-line {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
        margin-bottom: 10px;
      }
      
      .title {
        font-size: 18px;
        font-weight: bold;
      }
      
      h2 {
        font-size: 14px;
        font-weight: bold;
        margin: 0 0 5px 0;
        text-align: center;
      }
      
      h3 {
        font-size: 10px;
        font-weight: normal;
        margin: 0 0 2px 0;
        background-color: #e8e8e8;
        padding: 1px 4px;
      }
      
      .print-grid {
        display: grid;
        gap: 8px;
        flex: 1;
      }
      
      .day-group {
        margin-bottom: 20px;
        page-break-after: always;
      }
      
      .day-group:last-child {
        page-break-after: avoid;
      }
      
      .print-day {
        border: 2px solid #000;
        padding: 4px;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      
      .day-header {
        border-bottom: 1px solid #ccc;
        padding-bottom: 5px;
        margin-bottom: 8px;
        flex-shrink: 0;
      }
      
      .day-content {
        flex: 1;
        overflow: hidden;
      }
      
      .category-section {
        margin-bottom: 8px;
      }
      
      .recipe-name {
        font-size: 10px;
        margin-bottom: 2px;
        line-height: 1.2;
      }
      
      .unchecked-clients {
        font-size: 8px;
        color: #d00;
        text-decoration: line-through;
        margin-left: 2px;
        line-height: 1.1;
      }
      
      
      
      .generation-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 9px;
        max-width: 800px;
        margin: 0 auto;
      }
      
      .brand {
        font-weight: 600;
        color: #333;
      }
      
      .week-number {
        font-size: 14px;
        font-weight: 600;
      }
      
      .date-range {
        font-size: 12px;
        color: #555;
      }
      
      .client-info {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 8px;
      }
    `;
  }, []);

  // Helper: agregar itens de todos os meal type groups para um dia
  const aggregateDayItems = useCallback((weeklyMenu, dayIndex) => {
    const dayItems = {};
    if (!weeklyMenu?.menu_data) return dayItems;
    
    Object.keys(weeklyMenu.menu_data).forEach(mealType => {
      if (mealType.startsWith('_')) return;
      const itemsForDay = weeklyMenu.menu_data[mealType]?.[dayIndex] || weeklyMenu.menu_data[mealType]?.[String(dayIndex)];
      if (itemsForDay) {
        Object.entries(itemsForDay).forEach(([catId, items]) => {
          if (!dayItems[catId]) dayItems[catId] = [];
          const itemList = Array.isArray(items) ? items : Object.values(items);
          dayItems[catId] = [...dayItems[catId], ...itemList];
        });
      }
    });
    return dayItems;
  }, []);

  const calculateCategoryHeights = useCallback((weeklyMenu, categories, recipes, customers, locations, customerId) => {
    if (!weeklyMenu || !categories) return {};

    const dayNames = getDayNames();
    const categoryHeights = {};

    categories.forEach((category, categoryIndex) => {
      let maxItemsInCategory = 0;
      
      dayNames.forEach((dayName, index) => {
        const dayIndex = index + 1;
        const dayItems = aggregateDayItems(weeklyMenu, dayIndex);
        const categoryItems = dayItems[category.id] || [];
        
        const filteredItems = customerId === 'all' 
          ? categoryItems 
          : categoryItems.filter(item => 
              !item.locations || 
              item.locations.length === 0 || 
              item.locations.includes(customerId)
            );

        let totalLines = 0;
        filteredItems.forEach(item => {
          totalLines += 1;
          if (customerId === 'all' && item.locations && item.locations.length > 0) {
            const clientLines = Math.ceil(item.locations.length / 3);
            totalLines += clientLines;
          }
        });

        maxItemsInCategory = Math.max(maxItemsInCategory, totalLines);
      });

      const titleHeight = 12;
      const itemHeight = 6;
      const padding = 5;
      const calculatedHeight = titleHeight + (maxItemsInCategory * itemHeight) + padding;
      
      categoryHeights[categoryIndex] = Math.max(25, Math.min(80, calculatedHeight));
    });

    return categoryHeights;
  }, [ALL_DAY_NAMES, aggregateDayItems]);

  const generatePrintableMenu = useCallback((weeklyMenu, categories, recipes, customers, locations, customerId, currentDate, getCategoryColor, viewMode = 7) => {
    if (!weeklyMenu) return '';

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });
    const year = getYear(currentDate);
    
    const allClientIds = locations?.filter(loc => loc.active !== false).map(loc => loc.id) || [];
    
    // Cabeçalho
    let html = `
      <div class="header">
        <div class="header-line">
          <span class="title">Cardápio Semanal</span>
          <span class="week-number">Semana ${weekNumber}/${year}</span>
          <span class="date-range">${format(weekStart, 'dd/MM/yyyy', { locale: ptBR })} - ${format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}</span>
        </div>
        ${customerId !== 'all' ? `<div class="client-info">Cliente: ${getCustomerName(customerId, customers, locations)}</div>` : ''}
        <div class="generation-info" style="margin-top: 5px;">
          <span>Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
          <span class="brand">Cozinha & Afeto</span>
        </div>
      </div>
    `;

    // Todos os 7 dias (começando na Segunda)
    const allDays = [1, 2, 3, 4, 5, 6, 0]; // Seg-Sáb, Dom
    
    // Dividir em grupos baseado no viewMode
    const dayGroups = [];
    for (let i = 0; i < allDays.length; i += viewMode) {
      dayGroups.push(allDays.slice(i, i + viewMode));
    }

    // Gerar cada grupo de dias
    dayGroups.forEach((group, groupIdx) => {
      const numCols = group.length;
      html += `<div class="day-group">`;
      html += `<div class="print-grid" style="grid-template-columns: repeat(${numCols}, 1fr);">`;

      group.forEach(dayIndex => {
        const dayDate = addDays(weekStart, dayIndex);
        const dayItems = aggregateDayItems(weeklyMenu, dayIndex);
        
        html += `
        <div class="print-day">
        <div class="day-header">
        <h2>${ALL_DAY_NAMES[dayIndex].toUpperCase()} - ${format(dayDate, 'dd/MM/yyyy', { locale: ptBR })}</h2>
        </div>
        
        <div class="day-content">
        `;
        
        categories?.forEach((category) => {
          const categoryItems = dayItems[category.id] || [];
          
          const filteredItems = customerId === 'all' 
            ? categoryItems 
            : categoryItems.filter(item => 
                !item.locations || 
                item.locations.length === 0 || 
                item.locations.includes(customerId)
              );
          
          if (filteredItems.length === 0) return;
          
          html += `
            <div class="category-section">
              <h3>${category.name}</h3>
              <div>
          `;
          
          filteredItems.forEach(item => {
            const recipe = recipes?.find(r => r.id === item.recipe_id);
            if (recipe) {
              const uncheckedClients = customerId === 'all' ? getUncheckedClients(item, locations, allClientIds) : [];
              
              html += `
                <div>
                  <div class="recipe-name">${renderFormattedRecipeName(recipe.name)}</div>
                  ${uncheckedClients.length > 0 ? `
                    <div class="unchecked-clients">${uncheckedClients.map(client => client.name).join(', ')}</div>
                  ` : ''}
                </div>
              `;
            }
          });
          
          html += `
              </div>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      });
      
      html += '</div></div>';
    });
    
    return html;
  }, [ALL_DAY_NAMES, getCustomerName, calculateCategoryHeights, aggregateDayItems]);

  const handlePrintCardapio = useCallback((weeklyMenu, categories, recipes, customers, locations, customerId, currentDate, getCategoryColor, viewMode) => {
    if (!weeklyMenu) {
      return;
    }

    const printContent = generatePrintableMenu(weeklyMenu, categories, recipes, customers, locations, customerId, currentDate, getCategoryColor, viewMode);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cardápio Semanal</title>
          <style>
            ${getPrintStyles(viewMode)}
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, [generatePrintableMenu, getPrintStyles]);

  return {
    handlePrintCardapio
  };
};