'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Printer } from 'lucide-react';
import MenuHeader from '@/components/shared/MenuHeader';
import SectionContainer, { Section } from '@/components/shared/SectionContainer';
import { useMenuData } from '@/hooks/cardapio/useMenuData';
import { useClientConfig } from '@/hooks/cardapio/useClientConfig';
import { useMenuHelpers } from '@/hooks/cardapio/useMenuHelpers';
import { usePrintMenu } from '@/hooks/cardapio/usePrintMenu';
import { useMenuLocations } from '@/hooks/cardapio/useMenuLocations';
import { useMenuInterface } from '@/hooks/cardapio/useMenuInterface';

// Componentes UI separados
import ClientTabs from './ClientTabs';
import WeeklyMenuGrid from './WeeklyMenuGrid';

export default function ClientMenuComponent() {
  const { toast } = useToast();
  const menuInterface = useMenuInterface();

  // Estados
  const [selectedCustomer, setSelectedCustomer] = useState({ id: "all", name: "Todos os Clientes" });
  const [viewMode, setViewMode] = useState(7); // Quantos dias exibir por vez

  // Hooks
  const {
    categories,
    recipes,
    weeklyMenu,
    customers,
    menuConfig,
    loading,
    forceReloadFromDatabase
  } = useMenuData(menuInterface.currentDate);

  // Auto-recovery: Se menuConfig estiver nulo após carregar, forçar busca no banco
  useEffect(() => {
    if (!loading && !menuConfig) {
      console.log('🔄 [ClientMenuComponent] Configuração não encontrada. Forçando recarregamento...');
      forceReloadFromDatabase();
    }
  }, [loading, menuConfig, forceReloadFromDatabase]);

  // Log para debug
  console.log('🖥️ [ClientMenuComponent] Dados recebidos:', {
    currentDate: menuInterface.currentDate.toLocaleDateString(),
    categories: categories?.length || 0,
    recipes: recipes?.length || 0,
    customers: customers?.length || 0,
    weeklyMenu: weeklyMenu ? `ID: ${weeklyMenu.id}` : 'null',
    menuConfig: menuConfig ? 'presente' : 'null',
    loading
  });

  const { locations, loading: locationsLoading, getLocationById, getAllClientIds } = useMenuLocations();
  const { applyClientConfig, getFilteredItemsForClient } = useClientConfig(menuConfig, getAllClientIds());
  const menuHelpers = useMenuHelpers();
  const { handlePrintCardapio: printMenu } = usePrintMenu();


  // Handler de navegação - Otimizado para não recarregar tudo
  const handleDateChange = useCallback((newDate) => {
    // Atualiza apenas a data, o useEffect do useMenuData se encarrega de carregar o menu
    menuInterface.setCurrentDate(newDate);
  }, [menuInterface]);

  // Funções utilitárias
  const getActiveCategories = useMemo(() => {
    // Se existem grupos de categorias, coletar categorias de todos os grupos ativos
    if (menuConfig?.category_groups?.length > 0) {
      const allCategories = [];
      const seenIds = new Set();
      
      menuConfig.category_groups.forEach(group => {
        console.log(`📂 [ClientMenuComponent] Processando grupo: ${group.name}`, { items: group.items?.length });
        group.items?.forEach(id => {
          if (!seenIds.has(id)) {
            const cat = categories.find(c => c.id === id);
            const isActive = menuConfig.active_categories?.[id] !== false;
            console.log(`   - Categoria ${id}: ${cat ? cat.name : 'NÃO ENCONTRADA'}, ativa: ${isActive}`);
            if (cat && isActive) {
              allCategories.push(cat);
              seenIds.add(id);
            }
          }
        });
      });
      
      console.log('✅ [ClientMenuComponent] Categorias totais encontradas nos grupos:', allCategories.map(c => c.name));
      
      let activeCategories = allCategories;
      // Aplicar filtros específicos do cliente (visibilidade)
      if (selectedCustomer && selectedCustomer.id !== 'all') {
        activeCategories = applyClientConfig(activeCategories, selectedCustomer.id);
      }
      return activeCategories;
    }

    // Comportamento legado: usar helper padrão
    let activeCategories = menuHelpers.getActiveCategories(categories, menuConfig);

    if (selectedCustomer && selectedCustomer.id !== 'all') {
      activeCategories = applyClientConfig(activeCategories, selectedCustomer.id);
    }

    return activeCategories;
  }, [categories, menuConfig, selectedCustomer, menuHelpers, applyClientConfig]);

  const getCategoryColor = useCallback((categoryId) => {
    return menuHelpers.getCategoryColor(categoryId, categories, menuConfig);
  }, [menuHelpers, categories, menuConfig]);

  const handlePrintCardapio = (customerId) => {
    if (!weeklyMenu) {
      toast({
        title: "Erro",
        description: "Nenhum cardápio disponível para impressão.",
        variant: "destructive"
      });
      return;
    }

    try {
      printMenu(
        weeklyMenu,
        getActiveCategories,
        recipes,
        customers,
        locations,
        customerId,
        menuInterface.currentDate,
        getCategoryColor,
        viewMode
      );

      toast({
        title: "Impressão",
        description: `Cardápio${customerId !== 'all' ? ' personalizado' : ''} enviado para impressão.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar impressão do cardápio.",
        variant: "destructive"
      });
    }
  };

  // Loading state
  if (loading || locationsLoading || !categories || !recipes) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // View mode: quantos dias mostrar por vez
  const VIEW_MODES = [
    { label: '2 dias', value: 2 },
    { label: '3 dias', value: 3 },
    { label: '5 dias', value: 5 },
    { label: '7 dias', value: 7 },
  ];

  // Dividir os dias em grupos baseado no viewMode (começando na Segunda)
  const allDays = [1, 2, 3, 4, 5, 6, 0]; // Seg-Sáb, Dom
  const dayGroups = [];
  for (let i = 0; i < allDays.length; i += viewMode) {
    dayGroups.push(allDays.slice(i, i + viewMode));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="flex">
        {/* Sidebar Independente - Seleção de Clientes */}
        <div className="w-36 flex-shrink-0 p-1">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-lg sticky top-6">
            <div className="p-2 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-900 mb-0.5">Seleção de Cliente</h3>
              <p className="text-[10px] text-gray-600">Escolha o cliente para visualizar o cardápio</p>
            </div>
            <ClientTabs
              selectedCustomer={selectedCustomer}
              locations={locations}
              customers={customers}
              getLocationById={getLocationById}
              onCustomerChange={setSelectedCustomer}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <div className="px-2 py-4">
            {/* Cardápio Semanal Card Simplificado */}
            <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-lg">
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">Cardápio Semanal</h2>
                    <p className="text-sm text-gray-600">
                      {selectedCustomer?.id === 'all' ?
                        'Visualização completa do cardápio' :
                        `Cardápio personalizado para ${selectedCustomer?.name || 'cliente selecionado'}`
                      }
                    </p>
                  </div>

                  <div className="flex-1 flex justify-center">
                    <MenuHeader
                      currentDate={menuInterface.currentDate}
                      onDateChange={handleDateChange}
                      weekRange={menuConfig?.available_days?.some(d => d === 0 || d === 6) ? 'full' : 'workdays'}
                    />
                  </div>

                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintCardapio(selectedCustomer?.id || 'all')}
                      className="gap-2 bg-white hover:bg-gray-50 border-gray-300"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir Cardápio
                    </Button>
                  </div>
                </div>

                {/* Barra de modos de visualização */}
                <div className="flex items-center mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 mr-1">Exibir:</span>
                    {VIEW_MODES.map(mode => (
                      <button
                        key={mode.value}
                        onClick={() => setViewMode(mode.value)}
                        className={`px-2 py-1 text-xs rounded-md transition-all ${
                          viewMode === mode.value
                            ? 'bg-blue-600 text-white font-semibold shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grids do cardápio - empilhados verticalmente */}
              <div className="p-2 space-y-4">
                {dayGroups.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    <WeeklyMenuGrid
                      currentDate={menuInterface.currentDate}
                      weeklyMenu={weeklyMenu}
                      activeCategories={getActiveCategories}
                      recipes={recipes}
                      selectedCustomer={selectedCustomer}
                      getFilteredItemsForClient={getFilteredItemsForClient}
                      getCategoryColor={getCategoryColor}
                      customers={customers}
                      locations={locations}
                      getAllClientIds={getAllClientIds}
                      visibleDays={group}
                    />
                    {groupIdx < dayGroups.length - 1 && (
                      <div className="border-t-2 border-dashed border-gray-300 mt-4" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}