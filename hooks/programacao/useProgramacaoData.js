
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Order, Customer, Recipe } from "@/app/api/entities";
import { getWeek, getYear, startOfWeek, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAvailableDays } from '@/hooks/useAvailableDays';

export const useProgramacaoData = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState({ initial: true, orders: false });
  const [customers, setCustomers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersCache, setOrdersCache] = useState(new Map());

  // Hook centralizado para dias disponíveis
  const availableDays = useAvailableDays();

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
  const weekNumber = useMemo(() => getWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const year = useMemo(() => getYear(currentDate), [currentDate]);

  const weekDays = useMemo(() => {
    return availableDays.map((dayIndex) => {
      const date = addDays(weekStart, dayIndex);
      return {
        date,
        dayNumber: dayIndex,
        dayName: format(date, 'EEEE', { locale: ptBR }),
        dayShort: format(date, 'EEE', { locale: ptBR }),
        dayDate: format(date, 'dd/MM', { locale: ptBR }),
        fullDate: format(date, 'dd/MM/yyyy', { locale: ptBR })
      };
    });
  }, [weekStart, availableDays]);

  const loadInitialData = useCallback(async () => {
    setLoading(prev => ({ ...prev, initial: true }));
    try {
      const [customersData, recipesData] = await Promise.all([
        Customer.list(),
        Recipe.list()
      ]);
      setCustomers(customersData);
      setRecipes(recipesData);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  }, []);

  const loadOrdersForWeek = useCallback(async (week, year) => {
    const cacheKey = `${week}-${year}`;
    if (ordersCache.has(cacheKey)) {
      setOrders(ordersCache.get(cacheKey));
      return;
    }

    setLoading(prev => ({ ...prev, orders: true }));
    try {
      const ordersData = await Order.query([
        { field: 'week_number', operator: '==', value: week },
        { field: 'year', operator: '==', value: year }
      ]);
      setOrders(ordersData);
      setOrdersCache(prev => new Map(prev).set(cacheKey, ordersData));
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      setOrders([]);
    } finally {
      setLoading(prev => ({ ...prev, orders: false }));
    }
  }, [ordersCache]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const navigateWeek = (direction) => {
    setCurrentDate(prev => addDays(prev, direction * 7));
  };

  return {
    currentDate,
    weekDays,
    weekNumber,
    year,
    loading,
    customers,
    recipes,
    orders,
    navigateWeek,
    loadOrdersForWeek,
    refreshData: () => {
      setOrdersCache(new Map());
      loadOrdersForWeek(weekNumber, year);
    }
  };
};
