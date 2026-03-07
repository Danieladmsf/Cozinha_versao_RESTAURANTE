'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Printer,
  Download,
  Loader2
} from "lucide-react";
import { format, startOfWeek, addDays, getWeek, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";

// Entities
import { Order, Recipe, CategoryTree, MenuConfig, Ingredient, Customer } from "@/app/api/entities";
import { APP_CONSTANTS } from "@/lib/constants";
import { OrderSuggestionManager } from '@/lib/order-suggestions';

// Componentes centralizados
import WeekNavigator from '@/components/shared/WeekNavigator';
import WeekDaySelector from '@/components/shared/WeekDaySelector';

// Componente de consolidação de ingredientes
import IngredientesConsolidados from './lista-compras/IngredientesConsolidados';

const STORAGE_KEY = 'listaCompras_state';

const ListaComprasTabs = () => {
  // Estados principais - restaurar do localStorage se disponível
  const [currentDate, setCurrentDate] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved?.currentDate) return new Date(saved.currentDate);
      } catch { }
    }
    return new Date();
  });
  const hasSavedState = typeof window !== 'undefined' && !!localStorage.getItem(STORAGE_KEY);
  const [loading, setLoading] = useState(!hasSavedState); // Só bloqueia na 1ª visita
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved?.selectedDay !== undefined) return saved.selectedDay;
      } catch { }
    }
    return 1;
  });
  const [showWeekMode, setShowWeekMode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved?.showWeekMode !== undefined) return saved.showWeekMode;
      } catch { }
    }
    return true;
  });
  const [isSuggestionMode, setIsSuggestionMode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved?.isSuggestionMode !== undefined) return saved.isSuggestionMode;
      } catch { }
    }
    return false;
  });

  // Persistir estado no localStorage quando mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentDate: currentDate.toISOString(),
        selectedDay,
        showWeekMode,
        isSuggestionMode
      }));
    } catch { }
  }, [currentDate, selectedDay, showWeekMode, isSuggestionMode]);

  const [orders, setOrders] = useState([]);
  const [realOrders, setRealOrders] = useState([]); // Store real orders
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuConfig, setMenuConfig] = useState(null);
  const [ingredientsCatalog, setIngredientsCatalog] = useState([]);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);

  // Calculados
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
  const weekNumber = useMemo(() => getWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
  const year = useMemo(() => getYear(currentDate), [currentDate]);

  // Dias da semana
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      days.push({
        date,
        dayNumber: i, // 0=Domingo... 6=Sábado (para indexação)
        dayName: format(date, 'EEEE', { locale: ptBR }),
        dayShort: format(date, 'EEE', { locale: ptBR }),
        dayDate: format(date, 'dd/MM', { locale: ptBR }),
        fullDate: format(date, 'dd/MM/yyyy', { locale: ptBR })
      });
    }
    return days;
  }, [weekStart]);

  // Carregar configuração do menu
  const loadMenuConfig = async () => {
    try {
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      const configs = await MenuConfig.query([
        { field: 'user_id', operator: '==', value: mockUserId }
      ]);
      return configs?.[0] || null;
    } catch (error) {
      return null;
    }
  };

  // Função centralizada para carregar/atualizar todos os dados
  const refreshAllData = async (isInitial = false) => {
    try {
      // Só mostra spinner bloqueante se não tiver dados anteriores
      if (recipes.length === 0 && orders.length === 0) {
        setLoading(true);
      } else {
        setBackgroundLoading(true);
      }

      const [recipesData, ordersData, categoriesData, configData, ingredientsData] = await Promise.all([
        Recipe.list(),
        Order.query([
          { field: 'week_number', operator: '==', value: weekNumber },
          { field: 'year', operator: '==', value: year }
        ]),
        CategoryTree.list(),
        loadMenuConfig(),
        Ingredient.list()
      ]);

      setRecipes(recipesData);
      setRealOrders(ordersData);
      setCategories(categoriesData || []);
      setMenuConfig(configData);
      setIngredientsCatalog(ingredientsData || []);
      setDataVersion(prev => prev + 1);

      // Update displayed orders based on mode
      if (!isSuggestionMode) {
        setOrders(ordersData);
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
    }
  };

  // Logic to switch modes and generate suggestions if needed
  useEffect(() => {
    const handleModeSwitch = async () => {
      if (!isSuggestionMode) {
        setOrders(realOrders);
        return;
      }

      // We are in suggestion mode! Generate global projections
      if (recipes.length === 0 || menuConfig === null) return;

      setGeneratingSuggestions(true);
      try {
        console.log("🚀 [SuggestionMode] Gerando ordens simuladas baseadas no VR Sales...");

        // 1. We'll group the active recipes from the menu config
        // Menu config gives us which recipes are active for the store.
        let activeRecipes = recipes.filter(r => r.active !== false);

        // If there's menu constraint, we can filter them here, but for global shopping, 
        // we might just want to project the ones that the kitchen actively produces.
        // We'll pass them to the generator.

        // 2. We mock an empty order with these recipes 
        // We just need the structure that OrderSuggestionManager expects
        const mockOrderItems = activeRecipes.map(r => ({
          id: `mock_item_${r.id}`,
          recipe_id: r.id,
          recipe_name: r.name,
          category: r.category,
          unit_type: r.unit_type,
          code: r.code || r.product_code || r.external_code || r.vr_product_code,
          base_quantity: 0,
          adjustment_percentage: 0,
          quantity: 0
        }));

        // 3. For each day of the week, we run the suggestion engine
        const simulatedOrders = [];

        // Parallel fetching per weekDay mapped
        const daysToProject = menuConfig?.available_days || [0, 1, 2, 3, 4, 5, 6];

        const recipeAdjustments = await OrderSuggestionManager.loadRecipeAdjustments(activeRecipeIds, recipes);

        const daysPromises = daysToProject.map(async (dayIndex) => {
          const result = await OrderSuggestionManager.generateOrderSuggestions(
            'global_store', // Mock Customer ID
            mockOrderItems,
            0, // meals expected
            {
              lookbackWeeks: 8,
              dayOfWeek: dayIndex,
              useVrSales: true,
              fullRecipes: activeRecipes,
              rawValues: false, // Arredondar para logica pratica
              storeId: 1 // Default to 1
            }
          );

          // Convert result items that HAVE suggestion > 0 into a mock Order
          const validItems = result.items
            .filter(item => item.suggestion?.has_suggestion && item.suggestion?.suggested_base_quantity > 0)
            .map(item => ({
              recipe_id: item.recipe_id,
              recipe_name: item.recipe_name,
              category: item.category,
              unit_type: item.unit_type,
              base_quantity: item.suggestion.suggested_base_quantity,
              adjustment_percentage: item.suggestion.suggested_adjustment_percentage,
              quantity: item.base_quantity || item.suggestion.suggested_base_quantity, // Final quantity = base if no adjustments were generated
              suggestion_metadata: item.suggestion
            }));

          if (validItems.length > 0) {
            // Create a mock Order entity perfectly mirroring the DB schema
            const simulatedOrder = {
              id: `simulated_order_${dayIndex}`,
              customer_id: 'global_store',
              customer_name: 'PROJEÇÃO LOJA (VR Sales)',
              week_number: weekNumber,
              year: year,
              day_of_week: dayIndex,
              date: format(addDays(weekStart, dayIndex), "yyyy-MM-dd"),
              status: 'simulated',
              items: validItems
            };
            return simulatedOrder;
          }
          return null;
        });

        const generatedDays = await Promise.all(daysPromises);
        const finalSimulatedOrders = generatedDays.filter(o => o !== null);

        console.log(`✅ [SuggestionMode] Gerou ${finalSimulatedOrders.length} ordens simuladas!`);
        setOrders(finalSimulatedOrders);
        setDataVersion(prev => prev + 1);

      } catch (err) {
        console.error("❌ Erro ao gerar sugestões globais:", err);
      } finally {
        setGeneratingSuggestions(false);
      }
    };

    handleModeSwitch();
  }, [isSuggestionMode, realOrders, recipes, menuConfig, weekNumber, year, weekStart]);

  // Carregamento inicial de dados
  useEffect(() => {
    refreshAllData();
  }, [weekNumber, year]);

  // Função de impressão - agora delegada ao IngredientesConsolidados
  const handlePrint = () => {
    // Não faz nada aqui - a lógica de impressão é interna ao componente
  };

  // Navegação de semana
  const navigateWeek = (direction) => {
    setCurrentDate(prev => addDays(prev, direction * 7));
  };

  if (loading && recipes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-green-500 animate-spin" />
          <p className="text-gray-600">Carregando dados da lista de compras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lista-compras-container">
      {/* Navegação Principal */}
      <Card className="print:hidden border-none shadow-none bg-transparent mb-0">
        <CardContent className="p-0">
          <div className="relative mb-6">
            <div className="flex justify-center flex-col sm:flex-row items-center gap-4 mb-8">
              <WeekNavigator
                currentDate={currentDate}
                weekNumber={weekNumber}
                onNavigateWeek={navigateWeek}
                showCalendar={false}
                weekRange={menuConfig?.available_days?.some(d => d === 0 || d === 6) ? 'full' : 'workdays'}
              />
            </div>

            <div className={`transition-all duration-300 ${showWeekMode ? 'opacity-50 grayscale' : ''}`}>
              <WeekDaySelector
                currentDate={currentDate}
                currentDayIndex={selectedDay}
                availableDays={menuConfig?.available_days || [0, 1, 2, 3, 4, 5, 6]}
                onDayChange={(day) => {
                  setSelectedDay(day);
                  setShowWeekMode(false);
                }}
              />
            </div>
          </div>

          {/* Toggle Type of List */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center p-1 bg-gray-100 rounded-lg shadow-inner">
              <button
                onClick={() => setIsSuggestionMode(false)}
                className={`px-6 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${!isSuggestionMode
                  ? 'bg-white shadow border border-gray-200 text-teal-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                disabled={generatingSuggestions}
              >
                <ShoppingCart className="w-4 h-4" />
                Lista Real (Pedidos feitos)
              </button>
              <button
                onClick={() => setIsSuggestionMode(true)}
                className={`px-6 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${isSuggestionMode
                  ? 'bg-teal-600 shadow border border-teal-700 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                disabled={generatingSuggestions}
              >
                {generatingSuggestions ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {generatingSuggestions ? 'Calculando...' : 'Lista Projetada (Inteligente)'}
              </button>
            </div>
          </div>

        </CardContent>
      </Card>

      {generatingSuggestions ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg shadow-sm">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
          <h3 className="text-xl font-bold text-gray-800">Extraindo Padrões de Venda...</h3>
          <p className="text-gray-500 max-w-md text-center mt-2">
            Analisando o histórico de vendas do PDV das últimas 8 semanas para todos os produtos do cardápio e calculando estimativas baseadas em Shelf Life e dias de fechamento...
          </p>
        </div>
      ) : (
        <IngredientesConsolidados
          orders={orders}
          recipes={recipes}
          categories={categories}
          menuConfig={menuConfig}
          ingredientsCatalog={ingredientsCatalog}
          weekDays={weekDays}
          weekNumber={weekNumber}
          year={year}
          selectedDay={selectedDay}
          showWeekMode={showWeekMode}
          setShowWeekMode={setShowWeekMode}
          dataVersion={dataVersion}
          handlePrint={handlePrint}
          printing={printing}
          isSuggestionMode={isSuggestionMode}
        />
      )}
    </div>
  );
};

export default ListaComprasTabs;