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
import { Order, Recipe, CategoryTree, MenuConfig, Ingredient } from "@/app/api/entities";
import { APP_CONSTANTS } from "@/lib/constants";

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

  // Persistir estado no localStorage quando mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentDate: currentDate.toISOString(),
        selectedDay,
        showWeekMode
      }));
    } catch { }
  }, [currentDate, selectedDay, showWeekMode]);

  // Dados
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuConfig, setMenuConfig] = useState(null);
  const [ingredientsCatalog, setIngredientsCatalog] = useState([]);

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
      setOrders(ordersData);
      setCategories(categoriesData || []);
      setMenuConfig(configData);
      setIngredientsCatalog(ingredientsData || []);
      setDataVersion(prev => prev + 1);

    } catch (error) {
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
    }
  };

  // Carregamento inicial de dados
  useEffect(() => {
    refreshAllData();
  }, [weekNumber, year]);

  // Função de impressão
  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
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
        </CardContent>
      </Card>

      {/* Componente de ingredientes consolidados */}
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
      />
    </div>
  );
};

export default ListaComprasTabs;