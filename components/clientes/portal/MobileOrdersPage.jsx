'use client';
// Navegação e carregamento otimizados - v1.1

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format, startOfWeek, getWeek, getYear, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';



// Entities
import {
  Customer,
  Recipe,
  CategoryTree,
  WeeklyMenu,
  Order,
  OrderReceiving,
  OrderWaste,
  OrderRupture
} from "@/app/api/entities";

// Sistema de Sugestões
import { AppSettings, MenuConfig as MenuConfigEntity } from "@/app/api/entities";
import { OrderSuggestionManager } from '@/lib/order-suggestions';

// Componentes UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Icons
import {
  ChefHat,
  ShoppingCart,
  Package,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
  Send,
  Utensils,
  AlertTriangle,
  Loader2,
  Check,
  X,
  CheckCircle,
  Building2,
  Sparkles
} from "lucide-react";

// Utilitários
import {
  parseQuantity as utilParseQuantity,
  formattedQuantity as utilFormattedQuantity,
  formatCurrency as utilFormatCurrency,
  formatWeight as utilFormatWeight,
  sumCurrency as utilSumCurrency
} from "@/components/utils/orderUtils";
import { CategoryLogic } from "@/components/utils/categoryLogic";

import { useCategoryDisplay } from "@/hooks/shared/useCategoryDisplay";
import { getRecipeUnitType } from "@/lib/unitTypeUtils";


// Utilitário para cálculos de depreciação
import {
  calculateTotalDepreciation,
  calculateNonReceivedDiscounts,
  calculateFinalOrderValue,
  formatCurrency as returnFormatCurrency,
  formatQuantity as returnFormatQuantity
} from "@/lib/returnCalculator";

// Tab Components
const OrdersTab = dynamic(() => import("./tabs/OrdersTab"), { ssr: false });
const ReceivingTab = dynamic(() => import("./tabs/ReceivingTab"), { ssr: false });
const RuptureTab = dynamic(() => import("./tabs/RuptureTab"), { ssr: false });
const WasteTab = dynamic(() => import("./tabs/WasteTab"), { ssr: false });
const HistoryTab = dynamic(() => import("./tabs/HistoryTab"), { ssr: false });

// Sistema de edições para sincronização com PrintPreviewEditor
import { saveEdit, clearEditsFromFirebase } from '@/components/programacao/PrintPreviewEditor/utils/simpleEditManager';

// Refresh Button
import { RefreshButton } from "@/components/ui/refresh-button";

// Sistema centralizado de preços temporário
import PortalPricingSystem from "@/lib/portal-pricing";
import { PortalDataSync } from "@/lib/portal-data-sync";
import { calculateTotalWeight } from "@/lib/weightCalculator";
import { APP_CONSTANTS } from '@/lib/constants';





const MobileOrdersPage = ({ customerId, customerData }) => {
  const { toast } = useToast();
  const { groupItemsByCategory, getOrderedCategories, generateCategoryStyles } = useCategoryDisplay();

  // 🧹 LIMPEZA ÚNICA: Remove edições antigas com mapeamento incorreto
  useEffect(() => {
    const CLEANUP_FLAG = 'edits_cleanup_v3_done';
    const alreadyCleaned = localStorage.getItem(CLEANUP_FLAG);

    if (!alreadyCleaned) {
      const cleanupOldEdits = async () => {
        try {
          // Limpar localStorage
          localStorage.removeItem('print_preview_edits_v2');

          // Limpar Firebase para todos os dias da semana atual
          const today = new Date();
          const currentYear = getYear(today);
          const currentWeek = getWeek(today, { weekStartsOn: 1 });
          const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

          // Limpar todos os dias da semana
          for (const dayName of dayNames) {
            const weekDayKey = `${currentYear}_W${String(currentWeek).padStart(2, '0')}_${dayName}`;
            try {
              await clearEditsFromFirebase(weekDayKey);
            } catch (error) {
              // Silenciar erro de dias específicos
            }
          }

          localStorage.setItem(CLEANUP_FLAG, 'true');
          console.log('🧹 Edições antigas removidas (localStorage + Firebase) - sistema atualizado!');
        } catch (error) {
          console.error('Erro ao limpar edições antigas:', error);
        }
      };

      cleanupOldEdits();
    }
  }, []);


  // Estados principais
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date();
  });
  const [customer, setCustomer] = useState(customerData);
  const [multipleSessionsDetected, setMultipleSessionsDetected] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [weeklyMenus, setWeeklyMenus] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [existingOrders, setExistingOrders] = useState({});
  const existingOrdersRef = useRef(existingOrders); // Ref para evitar re-renders desnecessários

  // Sincronizar ref com state
  useEffect(() => {
    existingOrdersRef.current = existingOrders;
  }, [existingOrders]);

  const [hydratedOrders, setHydratedOrders] = useState({}); // Pedidos com preços atualizados
  const [loading, setLoading] = useState(true);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [appSettings, setAppSettings] = useState({ operational_cost_per_kg: 0, profit_margin: 0 });
  const [pricingReady, setPricingReady] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => setRefreshTrigger(p => p + 1);

  // UI States
  const [activeTab, setActiveTab] = useState("orders");
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState(null);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [customSuggestionPercent, setCustomSuggestionPercent] = useState('');

  const [generalNotes, setGeneralNotes] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSuccessEffect, setShowSuccessEffect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceivingSuccessEffect, setShowReceivingSuccessEffect] = useState(false);
  const [showRuptureSuccessEffect, setShowRuptureSuccessEffect] = useState(false);
  const [showWasteSuccessEffect, setShowWasteSuccessEffect] = useState(false);

  // Estados de edição para outras abas
  const [isReceivingEditMode, setIsReceivingEditMode] = useState(true);
  const [isRuptureEditMode, setIsRuptureEditMode] = useState(true);
  const [isWasteEditMode, setIsWasteEditMode] = useState(true);

  // Estados para Sobras
  const [wasteItems, setWasteItems] = useState([]);
  const [wasteNotes, setWasteNotes] = useState("");
  const [existingWaste, setExistingWaste] = useState(null);
  const [wasteLoading, setWasteLoading] = useState(false);
  const [weeklyWasteData, setWeeklyWasteData] = useState({});
  const [weeklyReceivingData, setWeeklyReceivingData] = useState({});

  // Estados para Recebimento
  const [receivingItems, setReceivingItems] = useState([]);
  const [receivingNotes, setReceivingNotes] = useState("");
  const [existingReceiving, setExistingReceiving] = useState(null);
  const [receivingLoading, setReceivingLoading] = useState(false);

  // Estados para Ruptura
  const [ruptureItems, setRuptureItems] = useState([]);
  const [ruptureNotes, setRuptureNotes] = useState("");
  const [existingRupture, setExistingRupture] = useState(null);
  const [ruptureLoading, setRuptureLoading] = useState(false);
  const [weeklyRuptureData, setWeeklyRuptureData] = useState({});

  // Calculados
  // Calculados
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
  // IMPORTANTE: weekNumber deve usar weekStartsOn: 0 para alinhar com o banco de dados/backoffice (Domingo = início)
  const weekNumber = useMemo(() => getWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
  const year = useMemo(() => getYear(currentDate), [currentDate]);

  // Estados de configuração
  const [availableDays, setAvailableDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [categories, setCategories] = useState([]);
  const [menuConfig, setMenuConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    // Carregamento inicial movido para o bloco principal de inicialização (LoadClientData)
    // para evitar chamadas duplicadas e conflitos de estado
  }, []);

  // Inicializar selectedCategoryGroup com primeiro grupo disponível
  useEffect(() => {
    if (menuConfig?.category_groups?.length > 0 && !selectedCategoryGroup) {
      setSelectedCategoryGroup(menuConfig.category_groups[0].id);
    }
  }, [menuConfig?.category_groups, selectedCategoryGroup]);

  // Dias da semana (Dinâmico)
  const weekDays = useMemo(() => {
    // Usar Domingo como base para calcular os dias corretamente (0=Dom, 1=Seg, etc)
    const sundayOfWeek = startOfWeek(currentDate, { weekStartsOn: 0 });

    return availableDays.map(dayIndex => {
      const date = addDays(sundayOfWeek, dayIndex);
      return {
        date,
        dayNumber: dayIndex, // 0=Dom, 1=Seg...
        dayName: format(date, 'EEEE', { locale: ptBR }),
        dayShort: format(date, 'EEE', { locale: ptBR }),
        dayDate: format(date, 'dd/MM', { locale: ptBR })
      };
    });
  }, [currentDate, availableDays]);

  // Função para obter o dia da semana atual (0 = Dom, 1 = Seg, etc.)
  const getCurrentWeekDay = useCallback(() => {
    const today = new Date();
    return today.getDay();
  }, []);

  // Inicializar com valor salvo ou padrão (1=Segunda)
  const [selectedDay, setSelectedDay] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portalSelectedDay');
      if (saved) return parseInt(saved, 10);
    }
    return 1;
  });

  // Salvar seleção no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portalSelectedDay', selectedDay.toString());
    }
  }, [selectedDay]);

  const [hasInitializedDay, setHasInitializedDay] = useState(false);

  // Ajustar selectedDay quando availableDays mudar ou carregar
  useEffect(() => {
    if (!loadingConfig && availableDays.length > 0) {
      // Se já inicializamos, não forçamos mais a mudança (permite o usuário navegar)
      if (hasInitializedDay) return;

      // Se temos um valor salvo válido que está nos dias disponíveis, mantemos ele
      const savedDay = typeof window !== 'undefined' ? localStorage.getItem('portalSelectedDay') : null;
      if (savedDay && availableDays.includes(parseInt(savedDay, 10))) {
        setHasInitializedDay(true);
        return;
      }

      const todayIndex = new Date().getDay();

      // Se o dia atual está disponível, seleciona ele
      if (availableDays.includes(todayIndex)) {
        setSelectedDay(todayIndex);
      } else {
        // Se dia atual não disponível, e dia selecionado também não está disponível
        if (!availableDays.includes(selectedDay)) {
          setSelectedDay(availableDays[0]);
        }
      }
      setHasInitializedDay(true);
    }
  }, [availableDays, loadingConfig, hasInitializedDay, selectedDay]); // selectedDay adicionado para verificação inicial

  // Ref para rastrear a última semana/ano carregada
  const lastLoadedWeekRef = useRef({ weekNumber: null, year: null });

  // Carregar pedidos existentes da semana
  const loadExistingOrders = useCallback(async () => {

    if (!customer) {
      return;
    }

    // Verificar se a semana/ano mudou desde o último carregamento
    const weekChanged = lastLoadedWeekRef.current.weekNumber !== weekNumber ||
      lastLoadedWeekRef.current.year !== year;

    if (weekChanged) {
      // Limpar pedidos antigos IMEDIATAMENTE quando mudar de semana
      // Isso evita que pedidos de semanas anteriores apareçam durante o carregamento
      setExistingOrders({});
      existingOrdersRef.current = {}; // Sincronizar ref imediatamente
      lastLoadedWeekRef.current = { weekNumber, year };
    } else {
    }

    try {
      const orders = await Order.query([
        { field: 'customer_id', operator: '==', value: customer.id },
        { field: 'week_number', operator: '==', value: weekNumber },
        { field: 'year', operator: '==', value: year }
      ]);


      // Organizar por dia da semana
      const ordersByDay = {};
      orders.forEach(order => {
        ordersByDay[order.day_of_week] = order;
      });

      setExistingOrders(ordersByDay);
      existingOrdersRef.current = ordersByDay; // Sincronizar ref imediatamente

      // Definir mealsExpected baseado no pedido do dia atual
      const currentDayOrder = ordersByDay[selectedDay];
      if (currentDayOrder) {


        setGeneralNotes(currentDayOrder.general_notes || "");

        const isComplete = isCompleteOrder(currentDayOrder);


      } else {

        setGeneralNotes("");
        setIsEditMode(true);
      }

    } catch (error) {
    }
  }, [customer, weekNumber, year, selectedDay, isEditMode]);





  const updateRuptureItem = useCallback((index, field, value) => {
    setRuptureItems(prevItems => {
      const updatedItems = [...prevItems];
      const item = { ...updatedItems[index] };
      item[field] = value;
      updatedItems[index] = item;
      return updatedItems;
    });
  }, []);

  const saveRuptureData = useCallback(async () => {
    if (!customer || ruptureItems.length === 0) return;
    try {
      const isEmpty = ruptureItems.every(item => (!item.rupture_time) && (!item.expected_duration)) && (!ruptureNotes);

      // ✅ NOVO: Salvar ajustes de ruptura nas receitas
      // Para cada item que teve ruptura confirmada (tem rupture_time), calcular e salvar multiplicador
      for (const item of ruptureItems) {
        if (item.rupture_time && item.recipe_id) {
          // Calcular multiplicador: se previsto 2 dias mas durou 1, multiplica por 2
          const expectedDays = item.expected_duration || 1;
          // Estimar dias reais baseado na hora de ruptura vs hora esperada
          // Se tem rupture_time, assume que rompeu. Por simplicidade, usar 1 dia menos que o esperado.
          const estimatedActualDays = Math.max(0.5, expectedDays - 1); // Mínimo 0.5 dias
          const multiplier = OrderSuggestionManager.calculateRuptureMultiplier(expectedDays, estimatedActualDays);

          if (multiplier > 1.0) {
            console.log(`📊 [saveRuptureData] Salvando ajuste de ruptura para ${item.recipe_name}: ${multiplier.toFixed(2)}x`);
            await OrderSuggestionManager.updateRecipeAdjustment(item.recipe_id, 'rupture', multiplier);
          }
        }
      }

      setShowRuptureSuccessEffect(true);
      setTimeout(() => {
        setShowRuptureSuccessEffect(false);
        setIsRuptureEditMode(false);
      }, 2000);

      if (existingRupture) {
        if (isEmpty) {
          await OrderRupture.delete(existingRupture.id);
          setExistingRupture(null);
        } else {
          await OrderRupture.update(existingRupture.id, { items: ruptureItems, general_notes: ruptureNotes });
        }
      } else {
        if (!isEmpty) {
          const newRupture = await OrderRupture.create({
            customer_id: customer.id, customer_name: customer.name, week_number: weekNumber, year: year, day_of_week: selectedDay,
            date: format(addDays(weekStart, selectedDay - 1), "yyyy-MM-dd"), items: ruptureItems, general_notes: ruptureNotes
          });
          setExistingRupture(newRupture);
        }
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Erro ao salvar ruptura" });
    }
  }, [customer, ruptureItems, ruptureNotes, existingRupture, weekNumber, year, selectedDay, weekStart, toast]);

  const updateReceivingItem = useCallback((index, field, value) => {
    setReceivingItems(prevItems => {
      const updatedItems = [...prevItems];
      const item = { ...updatedItems[index] };

      if (field === 'received_quantity') {
        item.received_quantity = Math.max(0, utilParseQuantity(value) || 0);
        // Atualizar status baseado na quantidade recebida
        if (item.received_quantity === 0) {
          item.status = 'not_received';
        } else if (item.received_quantity === item.ordered_quantity) {
          item.status = 'received';
        } else {
          item.status = 'partial';
        }
      } else if (field === 'status') {
        item.status = value;
        // Ajustar quantidade baseada no status
        if (value === 'received') {
          item.received_quantity = item.ordered_quantity;
        } else if (value === 'not_received') {
          item.received_quantity = 0;
        }
        // Para partial, mantém a quantidade atual
      } else {
        item[field] = value;
      }

      updatedItems[index] = item;
      return updatedItems;
    });
  }, []);

  const markAllAsReceived = useCallback(() => {
    setReceivingItems(prevItems =>
      prevItems.map(item => ({
        ...item,
        status: 'received',
        received_quantity: item.ordered_quantity
      }))
    );
  }, []);

  const saveReceivingData = useCallback(async () => {
    console.log('💾 [saveReceivingData] INICIANDO salvamento', {
      hasCustomer: !!customer,
      receivingItemsLength: receivingItems.length,
      existingReceivingId: existingReceiving?.id
    });

    if (!customer || receivingItems.length === 0) {
      console.log('💾 [saveReceivingData] ABORTADO - sem customer ou sem itens');
      return;
    }

    try {
      // Verificar se é um registro vazio (para deletar)
      const isEmpty = receivingItems.every(item => item.status === 'pending') &&
        (!receivingNotes || receivingNotes.trim() === '');

      console.log('💾 [saveReceivingData] isEmpty:', isEmpty, '- Iniciando efeito de sucesso e mudando isReceivingEditMode para false em 2s');

      // Sempre ativar efeito de sucesso no início
      setShowReceivingSuccessEffect(true);
      setTimeout(() => {
        console.log('💾 [saveReceivingData setTimeout] Desativando efeito de sucesso e modo de edição');
        setShowReceivingSuccessEffect(false);
        setIsReceivingEditMode(false); // Sair do modo de edição após o sucesso
      }, 2000);

      if (existingReceiving) {
        if (isEmpty) {
          // Deletar registro vazio
          await OrderReceiving.delete(existingReceiving.id);
          toast({
            description: "Registro de recebimento vazio foi removido.",
            className: "border-blue-200 bg-blue-50 text-blue-800"
          });
          setExistingReceiving(null);
        } else {
          // Atualizar registro existente
          await OrderReceiving.update(existingReceiving.id, {
            items: receivingItems,
            general_notes: receivingNotes
          });
          toast({
            description: "Recebimento atualizado com sucesso!",
            className: "border-green-200 bg-green-50 text-green-800"
          });
        }
      } else {
        if (!isEmpty) {
          // Criar novo registro
          const newReceiving = await OrderReceiving.create({
            customer_id: customer.id,
            customer_name: customer.name,
            week_number: weekNumber,
            year: year,
            day_of_week: selectedDay,
            date: format(addDays(weekStart, selectedDay - 1), "yyyy-MM-dd"),
            items: receivingItems,
            general_notes: receivingNotes
          });
          setExistingReceiving(newReceiving);
          toast({
            description: "Recebimento registrado com sucesso!",
            className: "border-green-200 bg-green-50 text-green-800"
          });
        } else {
          toast({
            description: "Nenhum recebimento para registrar.",
            className: "border-gray-200 bg-gray-50 text-gray-800"
          });
        }
      }

      console.log('💾 [saveReceivingData] SUCESSO - Dados salvos');
    } catch (error) {
      console.log('💾 [saveReceivingData] ERRO:', error);
      toast({
        variant: "destructive",
        title: "Erro ao Salvar Recebimento",
        description: error.message
      });
    }
  }, [customer, receivingItems, receivingNotes, existingReceiving, weekNumber, year, selectedDay, weekStart, toast]);

  const updateWasteItem = useCallback((index, field, value) => {
    setWasteItems(prevItems => {
      const updatedItems = [...prevItems];
      const item = { ...updatedItems[index] };

      if (field === 'internal_waste_quantity' || field === 'client_returned_quantity') {
        item[field] = Math.max(0, utilParseQuantity(value) || 0);
      } else {
        item[field] = value;
      }

      updatedItems[index] = item;
      return updatedItems;
    });
  }, []);

  const saveWasteData = useCallback(async () => {
    if (!customer || wasteItems.length === 0) return;

    try {
      // Verificar se é um registro vazio (para deletar)
      const isEmpty = wasteItems.every(item =>
        (item.internal_waste_quantity || 0) === 0 &&
        (item.client_returned_quantity || 0) === 0
      ) && (!wasteNotes || wasteNotes.trim() === '');

      // ✅ NOVO: Salvar ajustes de quebra nas receitas
      // Para cada item que teve quebra, calcular e salvar fator de redução
      for (const item of wasteItems) {
        const totalWaste = (item.internal_waste_quantity || 0) + (item.client_returned_quantity || 0);
        const orderedQty = item.ordered_quantity || 0;

        if (totalWaste > 0 && orderedQty > 0 && item.recipe_id) {
          const wasteFactor = OrderSuggestionManager.calculateWasteMultiplier(orderedQty, totalWaste);

          if (wasteFactor < 1.0) {
            console.log(`📊 [saveWasteData] Salvando ajuste de quebra para ${item.recipe_name}: ${wasteFactor.toFixed(2)}x`);
            await OrderSuggestionManager.updateRecipeAdjustment(item.recipe_id, 'waste', wasteFactor);
          }
        }
      }

      // Sempre ativar efeito de sucesso no início
      setShowWasteSuccessEffect(true);
      setTimeout(() => {
        setShowWasteSuccessEffect(false);
        setIsWasteEditMode(false); // Sair do modo de edição após o sucesso
      }, 2000);

      if (existingWaste) {
        if (isEmpty) {
          // Deletar registro vazio
          await OrderWaste.delete(existingWaste.id);
          toast({
            description: "Registro de sobra vazio foi removido.",
            className: "border-amber-200 bg-amber-50 text-amber-800"
          });
          setExistingWaste(null);
        } else {
          // Atualizar registro existente
          await OrderWaste.update(existingWaste.id, {
            items: wasteItems,
            general_notes: wasteNotes
          });
          toast({
            description: "Quebra atualizada com sucesso!",
            className: "border-green-200 bg-green-50 text-green-800"
          });
        }
      } else {
        if (!isEmpty) {
          // Criar novo registro
          const newWaste = await OrderWaste.create({
            customer_id: customer.id,
            customer_name: customer.name,
            week_number: weekNumber,
            year: year,
            day_of_week: selectedDay,
            date: format(addDays(weekStart, selectedDay - 1), "yyyy-MM-dd"),
            items: wasteItems,
            general_notes: wasteNotes
          });
          setExistingWaste(newWaste);
          toast({
            description: "Quebra registrada com sucesso!",
            className: "border-green-200 bg-green-50 text-green-800"
          });
        } else {
          toast({
            description: "Nenhuma sobra para registrar.",
            className: "border-gray-200 bg-gray-50 text-gray-800"
          });
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao Salvar Quebra",
        description: error.message
      });
    }
  }, [customer, wasteItems, wasteNotes, existingWaste, weekNumber, year, selectedDay, weekStart, toast]);

  // Carregar dados de waste da semana inteira para histórico
  const loadWeeklyWasteData = useCallback(async () => {
    if (!customer) return;

    try {
      // Buscar todos os registros de sobra da semana
      const weeklyWastes = await OrderWaste.query([
        { field: 'customer_id', operator: '==', value: customer.id },
        { field: 'week_number', operator: '==', value: weekNumber },
        { field: 'year', operator: '==', value: year }
      ]);

      // Organizar por dia da semana
      const wasteDataByDay = { _loaded: true };
      weeklyWastes.forEach(waste => {
        wasteDataByDay[waste.day_of_week] = waste;
      });

      setWeeklyWasteData(wasteDataByDay);
    } catch (error) {
      console.error("Erro ao carregar weekly waste", error);
    }
  }, [customer, weekNumber, year]);

  // Carregar dados de recebimento da semana inteira para histórico
  const loadWeeklyReceivingData = useCallback(async () => {
    if (!customer) return;

    try {
      const weeklyReceivings = await OrderReceiving.query([
        { field: 'customer_id', operator: '==', value: customer.id },
        { field: 'week_number', operator: '==', value: weekNumber },
        { field: 'year', operator: '==', value: year }
      ]);

      const receivingDataByDay = { _loaded: true };
      weeklyReceivings.forEach(receiving => {
        receivingDataByDay[receiving.day_of_week] = receiving;
      });

      setWeeklyReceivingData(receivingDataByDay);
    } catch (error) {
      console.error("Erro ao carregar weekly receiving", error);
    }
  }, [customer, weekNumber, year]);

  // Carregar dados de ruptura da semana inteira (Cache)
  const loadWeeklyRuptureData = useCallback(async () => {
    if (!customer) return;

    try {
      const weeklyRuptures = await OrderRupture.query([
        { field: 'customer_id', operator: '==', value: customer.id },
        { field: 'week_number', operator: '==', value: weekNumber },
        { field: 'year', operator: '==', value: year }
      ]);

      const ruptureDataByDay = { _loaded: true };
      weeklyRuptures.forEach(rupture => {
        ruptureDataByDay[rupture.day_of_week] = rupture;
      });

      setWeeklyRuptureData(ruptureDataByDay);
    } catch (error) {
      console.error("Erro ao carregar weekly rupture", error);
    }
  }, [customer, weekNumber, year]);




  // Carregamento inicial
  useEffect(() => {
    const loadInitialData = async () => {
      if (!customerId) {
        return;
      }

      setLoading(true); // Garante que o loading é true antes de qualquer coisa

      try {
        // Crie uma promessa para o atraso
        const delayPromise = new Promise(resolve => setTimeout(resolve, 6000));

        // Execute todas as operações de carregamento em paralelo com o atraso
        const [_, initialData] = await Promise.all([
          delayPromise,
          (async () => { // Função auto-executável para agrupar as chamadas assíncronas
            const recipesData = await Recipe.list();
            setRecipes(recipesData.filter(r => r.active !== false)); // Filtrar ativas aqui

            const appSettingsDoc = await AppSettings.getById('global');
            let newAppSettings = { operational_cost_per_kg: 0, profit_margin: 0 };
            if (appSettingsDoc) {
              newAppSettings = {
                operational_cost_per_kg: appSettingsDoc.operational_cost_per_kg || 0,
                profit_margin: appSettingsDoc.profit_margin || 0
              };
            }
            setAppSettings(newAppSettings);
            PortalPricingSystem.init(newAppSettings);
            setPricingReady(true);

            // Carregar categorias e configuração de cores
            try {
              const categoriesData = await CategoryTree.list();
              setCategories(categoriesData);

              const configs = await MenuConfigEntity.query([
                { field: 'user_id', operator: '==', value: APP_CONSTANTS.MOCK_USER_ID },
                { field: 'is_default', operator: '==', value: true }
              ]);
              if (configs && configs.length > 0) {
                const loadedConfig = configs[0];
                setMenuConfig(loadedConfig);

                if (loadedConfig.available_days && Array.isArray(loadedConfig.available_days)) {
                  // Garantir ordenação
                  setAvailableDays(loadedConfig.available_days.sort((a, b) => a - b));
                }
              }

            } catch (error) {
              console.error("Erro ao carregar categorias/config:", error);
            }
          })()
        ]);

      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro no Carregamento",
          description: "Falha ao carregar dados iniciais"
        });
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      loadInitialData();
    }
  }, [customerId]); // ✅ CORRIGIDO: só executa uma vez por cliente

  // Define a função de busca de dados como um useCallback
  const fetchData = useCallback(async (dateToFetch) => { // Recebe a data como argumento
    toast({ description: "Atualizando todos os dados...", duration: 2500 });
    setIsRefreshingData(true);
    try {
      const weekNumberForFetch = getWeek(dateToFetch, { weekStartsOn: 1 });
      const yearForFetch = getYear(dateToFetch);

      // 1. Recarregar Receitas
      const recipesData = await Recipe.list();
      const saladaAbobrinhaRecipe = recipesData.find(r => r.name === 'S. Abobrinha'); // Assuming 'S. Abobrinha' is the exact name
      if (saladaAbobrinhaRecipe) {
      }
      // Assuming currentConfig is available in scope, otherwise this line might cause an error.
      // If currentConfig is not defined, this line should be removed or defined elsewhere.
      // setAvailableDays(currentConfig?.available_days || [1, 2, 3, 4, 5]); // This line was not in the original code, adding it as per instruction.
      setRecipes(recipesData);

      // 1.1 Recarregar Categorias e Configurações de Menu (Cores)
      const categoriesData = await CategoryTree.list();
      setCategories(categoriesData);

      // 2. Recarregar Cardápios da Semana
      const weekKey = `${yearForFetch}-W${weekNumberForFetch}`;
      const menusData = await WeeklyMenu.query([
        { field: 'week_key', operator: '==', value: weekKey }
      ]);
      setWeeklyMenus(menusData);


      // 3. Recarregar Pedidos Existentes
      if (customer) {
        // Chamar a lógica de loadExistingOrders diretamente aqui, passando os parâmetros
        const orders = await Order.query([
          { field: 'customer_id', operator: '==', value: customer.id },
          { field: 'week_number', operator: '==', value: weekNumberForFetch },
          { field: 'year', operator: '==', value: yearForFetch }
        ]);
        const ordersByDay = {};
        orders.forEach(order => {
          ordersByDay[order.day_of_week] = order;
        });
        setExistingOrders(ordersByDay);
        existingOrdersRef.current = ordersByDay; // Sincronizar ref imediatamente
      }

      toast({
        title: "Dados atualizados!",
        description: "As informações foram recarregadas do servidor.",
        className: "border-green-200 bg-green-50 text-green-800"
      });

    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message });
    } finally {
      setIsRefreshingData(false);
    }
  }, [customer, toast, setRecipes, setWeeklyMenus, setIsRefreshingData, setExistingOrders]); // Dependências: apenas as estáveis e o customer

  // Efeito para atualização manual de dados
  useEffect(() => {
    if (refreshTrigger === 0) return; // Não executar na montagem inicial

    fetchData(currentDate); // Passa a currentDate atual para a função
  }, [refreshTrigger, fetchData, currentDate]); // Depende de refreshTrigger, fetchData (que é estável agora) e currentDate

  // Carregamento de cardápios quando semana muda
  useEffect(() => {

    const loadWeeklyMenus = async () => {
      if (!customerId || !customer) {
        return;
      }

      // Limpar estado antes de carregar novo cardápio
      // As linhas abaixo foram comentadas em 22/08/2025 para evitar que o pedido seja apagado durante a atualização manual.
      // A lógica agora preserva o estado do pedido e apenas atualiza os dados do cardápio.
      // setCurrentOrder(null);
      // setExistingOrders({});

      try {
        const weekKey = `${year}-W${weekNumber}`;
        console.log(`📋 [loadWeeklyMenus] Buscando cardápio para weekKey: ${weekKey}`);

        // ✅ OTIMIZADO: Buscar apenas o cardápio da semana atual em vez de todos
        const menusData = await WeeklyMenu.query([
          { field: 'week_key', operator: '==', value: weekKey }
        ]);

        if (menusData.length > 0) {
          const menu = menusData[0];
          setWeeklyMenus(menusData);
          console.log(`✅ [loadWeeklyMenus] Cardápio encontrado: ${menu.id}`);

          // Analisar estrutura do cardápio
          let totalRecipes = 0;
          let daysWithMenu = 0;
          let categoriesFound = new Set();
          let customerSpecificItems = 0;

          if (menu.menu_data) {
            Object.keys(menu.menu_data).forEach(dayKey => {
              const dayData = menu.menu_data[dayKey];
              if (dayData && Object.keys(dayData).length > 0) {
                daysWithMenu++;
                Object.values(dayData).forEach(categoryData => {
                  if (!categoryData) return;
                  const itemsArray = Array.isArray(categoryData) ? categoryData : categoryData?.items;
                  if (itemsArray && Array.isArray(itemsArray)) {
                    itemsArray.forEach(item => {
                      totalRecipes++;
                      if (item.category) categoriesFound.add(item.category);

                      const itemLocations = item.locations;
                      const isForThisCustomer = !itemLocations || itemLocations.length === 0 ||
                        itemLocations.includes(customer.id);
                      if (isForThisCustomer) customerSpecificItems++;
                    });
                  }
                });
              }
            });
          }

        } else {
          // Nenhum cardápio encontrado - resetar tudo
          setWeeklyMenus([]);

          setGeneralNotes("");
          setWasteItems([]);
          setReceivingItems([]);
          setExistingWaste(null);
          setExistingReceiving(null);
          setIsEditMode(true);
          setIsReceivingEditMode(true);
          setIsWasteEditMode(true);

          toast({
            variant: "destructive",
            title: "Cardápio Indisponível",
            description: `Nenhum cardápio encontrado para a semana ${weekNumber}/${year}.`
          });
        }
      } catch (error) {
        console.error('❌ [loadWeeklyMenus] Erro ao carregar cardápio:', error);
        toast({
          variant: "destructive",
          title: "Erro no Carregamento",
          description: `Falha ao carregar o cardápio da semana: ${error.message || 'Erro desconhecido'}`
        });
      }
    };

    loadWeeklyMenus();
  }, [customerId, currentDate, customer]); // ✅ Usar currentDate diretamente para garantir recarregamento

  // Função para determinar qual dia selecionar baseado na semana
  // COMENTADO: Não força mais nenhum dia específico
  // const getInitialDay = useCallback(() => {
  //   const today = new Date();
  //   const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  //   const viewingWeekStart = weekStart;
  //   
  //   const isCurrentWeek = format(currentWeekStart, 'yyyy-MM-dd') === format(viewingWeekStart, 'yyyy-MM-dd');
  //   
  //   if (isCurrentWeek) {
  //     return getCurrentWeekDay();
  //   } else {
  //     return selectedDay; // Mantém o dia selecionado
  //   }
  // }, [weekStart, getCurrentWeekDay, selectedDay]);

  // Inicialização de dia - executa APENAS após dados iniciais carregarem
  useEffect(() => {
    if (!loading && customer && recipes.length > 0 && weeklyMenus.length > 0 && !hasInitializedDay) {
      // Mantém o selectedDay já definido no useState
      setHasInitializedDay(true);
    }
  }, [loading, customer, recipes, weeklyMenus, hasInitializedDay]);

  // Detectar mudança de semana e resetar para segunda-feira
  // REMOVIDO: Agora o hook useNavigationSync gerencia isso

  // Preparar itens do pedido baseado no cardápio
  const orderItems = useMemo(() => {
    console.log(`🏗️ [orderItems] Calculando itens para Dia: ${selectedDay}, Week: ${weekNumber}`);

    // Log específico para debugging do dia 26/08
    const currentDateStr = format(currentDate, 'dd/MM');
    if (currentDateStr === '26/08' || selectedDay === 1 || selectedDay === 2) { // Segunda-feira é 1, terça é 2
    }


    if (!weeklyMenus.length || !recipes.length || !customer) {
      return [];
    }

    const menu = weeklyMenus[0];

    // CORREÇÃO: Carregar TODOS os itens do dia, independente da aba selecionada
    // Isso evita que ao salvar numa aba, os itens das outras abas sejam perdidos/zerados
    const items = [];
    let uniqueCounter = 0;
    let processedItems = 0;
    let skippedItems = 0;
    let customerSpecificItems = 0;
    let conflictsDetected = [];

    // Iterar sobre todos os grupos de categoria disponíveis no menu
    // A estrutura pode ser:
    // 1. menu_data[groupId][day] (Nova)
    // 2. menu_data[day] (Antiga/Legado)

    const processCategoryData = (categoryId, categoryData) => {
      if (!categoryData) return;
      const itemsArray = Array.isArray(categoryData) ? categoryData : categoryData?.items;

      if (itemsArray && Array.isArray(itemsArray)) {
        itemsArray.forEach((item, itemIndex) => {
          processedItems++;

          // Verificar localização do item
          const itemLocations = item.locations;
          const shouldInclude = !itemLocations || itemLocations.length === 0 ||
            itemLocations.includes(customer.id);

          if (!shouldInclude) {
            skippedItems++;
            return;
          }

          customerSpecificItems++;
          const recipe = recipes.find(r => r.id === item.recipe_id && r.active !== false);

          // Adicionando logs específicos para depuração
          if (recipe && (recipe.name.includes('Farofa de cuscuz') || recipe.name.includes('Brócolis'))) {
          }

          if (!recipe) {
            conflictsDetected.push({
              type: 'RECIPE_NOT_FOUND',
              recipeId: item.recipe_id,
              categoryId,
              itemIndex
            });
            return;
          }

          // Detectar conflitos de categoria
          if (recipe.category !== categoryId && recipe.category) {
            conflictsDetected.push({
              type: 'CATEGORY_MISMATCH',
              recipeId: item.recipe_id,
              recipeName: recipe.name,
              menuCategory: categoryId,
              recipeCategory: recipe.category
            });
          }

          const containerType = getRecipeUnitType(recipe);
          const unitPrice = PortalPricingSystem.recalculateItemUnitPrice(item, recipe, containerType);
          const cubaWeightParsed = utilParseQuantity(recipe.cuba_weight) || 0;
          const unitsQuantity = (() => {
            // Priority: Check Last Preparation (Packing/Final Assembly) - Matches ProgramacaoCozinhaTabs logic
            if (recipe.preparations && recipe.preparations.length > 0) {
              const lastPrep = recipe.preparations[recipe.preparations.length - 1];
              if (lastPrep.assembly_config?.units_quantity) {
                return utilParseQuantity(lastPrep.assembly_config.units_quantity) || 1;
              }
            }
            // Fallback: Check for specific portioning step (Legacy behavior)
            const portioningPrep = recipe.preparations?.find(prep => prep.title === '2º Etapa: Porcionamento' || prep.processes?.includes('portioning'));
            if (portioningPrep?.assembly_config?.units_quantity) {
              return utilParseQuantity(portioningPrep.assembly_config.units_quantity) || 1;
            }
            return 1; // Default to 1 if not found or invalid
          })();

          // Extrair código do produto da receita
          const productCode = recipe.code || recipe.product_code || recipe.external_code;

          // ✅ OVERRIDE VISUAL EMERGENCIAL: Se a Categoria for de ALMOÇO, travar validade em 1 dia
          const categoryName = recipe.category || categoryId || '';
          let shelfLifeFinal = recipe.shelf_life ? parseInt(recipe.shelf_life, 10) : null;
          if (categoryName.toUpperCase().includes('(ALMOÇO)')) {
            shelfLifeFinal = 1;
          }

          const baseItem = {
            unique_id: `${item.recipe_id}_${uniqueCounter++}`,
            recipe_id: item.recipe_id,
            recipe_name: recipe.name,
            category: recipe.category || categoryId,
            category_id: recipe.category_id, // ✅ FIX: Include category_id for robust filtering
            unit_type: containerType,
            base_quantity: 0,
            quantity: 0,
            unit_price: unitPrice,
            total_price: 0,
            notes: "",
            cuba_weight: cubaWeightParsed,
            yield_weight: utilParseQuantity(recipe.yield_weight) || 0,
            total_weight: utilParseQuantity(recipe.total_weight) || 0,
            units_quantity: unitsQuantity,
            tech_sheet_unit_weight: unitsQuantity > 1 ? cubaWeightParsed / unitsQuantity : cubaWeightParsed,
            tech_sheet_units_quantity: unitsQuantity,
            tech_sheet_container_type: containerType, // Explicit container type from Tech Sheet
            vr_product_code: productCode ? parseInt(productCode) : null, // Código do produto para exibição no portal
            shelf_life: shelfLifeFinal, // Validade da Ficha Técnica para sugerir e exibir na Tag

            adjustment_percentage: 0,
            recipe: recipe, // Adicionado para que o weightCalculator possa acessar os pesos da receita
            suggestion: null // Inicializar campo de sugestão
          };
          const syncedItem = PortalDataSync.syncItemSafely(baseItem, recipe);

          const newItem = CategoryLogic.calculateItemValues(syncedItem, 'base_quantity', syncedItem.base_quantity || 0, 0);

          items.push(newItem);
        });
      }
    };

    // Iterar para todos os grupos
    if (menu.menu_data) {
      Object.keys(menu.menu_data).forEach(key => {
        const groupOrDayData = menu.menu_data[key];

        // Verificar se é estrutura de Grupo (contém dias dentro)
        const potentialDayData = groupOrDayData?.[selectedDay] || groupOrDayData?.[String(selectedDay)];

        if (potentialDayData) {
          Object.entries(potentialDayData).forEach(([categoryId, categoryData]) => {
            processCategoryData(categoryId, categoryData);
          });
        }
        else if (key === String(selectedDay) || parseInt(key) === selectedDay) {
          Object.entries(groupOrDayData).forEach(([categoryId, categoryData]) => {
            processCategoryData(categoryId, categoryData);
          });
        }
      });
    }

    return items;
  }, [weeklyMenus, recipes, customer, selectedDay, weekNumber, year, appSettings, pricingReady]);


  // Funções para Sobras (Sync / Cached Version)
  const loadWasteData = useCallback(async () => {
    if (!customer) return;

    // setWasteLoading(true); // REMOVED to prevent flicker
    try {
      // Tentar pegar do cache semanal
      let wasteRecord = weeklyWasteData[selectedDay];

      if (!wasteRecord && !weeklyWasteData[selectedDay] && weeklyWasteData._loaded) {
        wasteRecord = null;
      }

      setExistingWaste(wasteRecord || null);
      setWasteNotes(wasteRecord?.general_notes || "");
      setIsWasteEditMode(!wasteRecord);

      let items = [];
      const sourceItems = currentOrder?.items || orderItems;

      if (sourceItems && sourceItems.length > 0) {
        items = sourceItems.map(item => {
          const wasteItem = {
            unique_id: item.unique_id,
            recipe_id: item.recipe_id,
            recipe_name: item.name,
            category: item.category,
            internal_waste_quantity: 0,
            client_returned_quantity: 0,
            notes: "",
            ordered_quantity: item.quantity || item.base_quantity || 0,
            ordered_unit_type: item.unit_type,
            unit_price: item.unit_price || 0,
            total_price: 0
          };

          if (wasteRecord?.items) {
            let saved = wasteRecord.items.find(s => s.unique_id === wasteItem.unique_id);
            if (!saved) saved = wasteRecord.items.find(s => s.recipe_id === item.recipe_id);

            if (saved) {
              wasteItem.internal_waste_quantity = saved.internal_waste_quantity || 0;
              wasteItem.client_returned_quantity = saved.client_returned_quantity || 0;
              wasteItem.notes = saved.notes || "";
            }
          }
          return wasteItem;
        });
      }

      setWasteItems(items);
    } catch (error) {
      console.error("Erro ao processar dados de quebra", error);
    } finally {
      setWasteLoading(false);
    }
  }, [customer, selectedDay, orderItems, currentOrder, weeklyWasteData]);

  // Funções para Recebimento (Sync / Cached Version)
  const loadReceivingData = useCallback(async () => {
    if (!customer) return;

    // Não mostrar loading se já tivermos os dados em cache (para evitar flicker)
    // Apenas mostrar se for a primeira carga
    // setReceivingLoading(true); // REMOVED to prevent flicker

    try {
      // Tentar pegar do cache semanal primeiro
      let receivingRecord = weeklyReceivingData[selectedDay];

      // Fallback: Se não tiver no cache (ex: acabou de criar), tenta buscar (mas idealmente o cache atualiza)
      if (!receivingRecord && !weeklyReceivingData[selectedDay] && weeklyReceivingData._loaded) {
        // Se o cache diz que já carregou e não tem, é pq não tem mesmo.
        receivingRecord = null;
      }

      // Se o cache ainda não carregou, aí sim talvez precisássemos buscar, 
      // mas como movemos o carregamento para o mount, assumimos que está ou estará lá.
      // Para garantir, podemos esperar ou usar o que tem. 
      // Vamos assumir consistência eventual para UI instantânea.

      setExistingReceiving(receivingRecord || null);
      setReceivingNotes(receivingRecord?.general_notes || "");

      const newEditMode = !receivingRecord;
      setIsReceivingEditMode(newEditMode);

      let items = [];
      const sourceItems = currentOrder?.items || orderItems;

      if (sourceItems && sourceItems.length > 0) {
        items = sourceItems.map(item => {
          const containerType = item.unit_type;

          const receivingItem = {
            unique_id: item.unique_id,
            recipe_id: item.recipe_id,
            recipe_name: item.name,
            category: item.category,
            ordered_quantity: item.quantity || item.base_quantity || 0,
            ordered_unit_type: containerType,
            status: 'pending',
            received_quantity: item.quantity || item.base_quantity || 0,
            notes: ""
          };

          if (receivingRecord?.items) {
            let saved = receivingRecord.items.find(s => s.unique_id === receivingItem.unique_id);
            if (!saved) saved = receivingRecord.items.find(s => s.recipe_id === item.recipe_id);

            if (saved) {
              receivingItem.status = saved.status || 'pending';
              receivingItem.received_quantity = saved.received_quantity !== undefined ? saved.received_quantity : receivingItem.received_quantity;
              receivingItem.notes = saved.notes || "";
            }
          }

          receivingItem.unit_price = item.unit_price || 0;
          receivingItem.total_price = (receivingItem.received_quantity || 0) * receivingItem.unit_price;

          return receivingItem;
        });
      }

      setReceivingItems(items);
    } catch (error) {
      console.error("Erro ao processar dados de recebimento (Sync)", error);
    } finally {
      setReceivingLoading(false);
    }
  }, [customer, selectedDay, orderItems, currentOrder, weeklyReceivingData]);

  // Função para aplicar todas as sugestões
  const applyAllSuggestions = useCallback((percentage = 100) => {
    const pct = parseFloat(percentage) || 100;
    const multiplier = pct / 100;

    // 1. Verificar itens com sugestão válida e diferente da quantidade atual
    const itemsToUpdate = (currentOrder?.items || []).filter(item => {
      const hasSuggestion = item.suggestion?.has_suggestion;
      const suggestionVal = parseFloat(item.suggestion?.suggested_base_quantity || 0);
      return hasSuggestion && suggestionVal > 0;
    });

    if (itemsToUpdate.length === 0) {
      toast({
        title: "Nenhuma sugestão disponível",
        description: "Não há itens com sugestões pendentes para aplicar.",
        variant: "default"
      });
      return;
    }

    // 2. Atualizar estado
    setCurrentOrder(prev => {
      if (!prev?.items) return prev;

      const newItems = prev.items.map(item => {
        if (item.suggestion?.has_suggestion) {
          const suggestionVal = parseFloat(item.suggestion.suggested_base_quantity || 0);
          if (suggestionVal > 0) {
            // Aplicar sugestão com percentual escolhido
            const adjustedVal = (suggestionVal * multiplier).toFixed(3);
            console.log(`🪄 [ApplySuggestion] Item: ${item.recipe_name}, Raw: ${suggestionVal}, Pct: ${pct}%, Adjusted: ${adjustedVal}`);
            return CategoryLogic.calculateItemValues(item, 'base_quantity', adjustedVal, 0);
          }
        }
        return item;
      });

      return { ...prev, items: newItems };
    });

    // 3. Feedback visual
    toast({
      title: "🎉 Sugestões Aplicadas!",
      description: `${itemsToUpdate.length} itens atualizados com ${pct}% da sugestão.`,
      className: "bg-purple-50 border-purple-200 text-purple-900"
    });

    // Ativar modo de edição para permitir salvar
    setIsEditMode(true);
    setShowSuggestionModal(false);
    setCustomSuggestionPercent('');

  }, [currentOrder?.items, toast]);

  // Funções para Ruptura (Sync / Cached Version)
  const loadRuptureData = useCallback(async () => {
    if (!customer) return;

    // setRuptureLoading(true); // Disable flicker
    try {
      // Cache lookup
      let ruptureRecord = weeklyRuptureData[selectedDay];
      if (!ruptureRecord && !weeklyRuptureData[selectedDay] && weeklyRuptureData._loaded) {
        ruptureRecord = null;
      }

      setExistingRupture(ruptureRecord || null);
      setRuptureNotes(ruptureRecord?.general_notes || "");

      const newEditMode = !ruptureRecord;
      setIsRuptureEditMode(newEditMode);

      let items = [];
      const sourceItems = currentOrder?.items || orderItems;

      if (sourceItems && sourceItems.length > 0) {
        items = sourceItems.map(item => {
          const ruptureItem = {
            unique_id: item.unique_id,
            recipe_id: item.recipe_id,
            recipe_name: item.recipe_name,
            category: item.category,
            rupture_time: "",
            expected_duration: "",
            ordered_quantity: item.quantity || item.base_quantity || 0,
            ordered_unit_type: item.unit_type,
            vr_product_code: item.vr_product_code
          };

          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (recipe) {
            // Priority: code > product_code > external_code
            const codeSource = recipe.code || recipe.product_code || recipe.external_code;
            ruptureItem.vr_product_code = codeSource ? parseInt(codeSource) : null;
          }

          if (ruptureRecord?.items) {
            let saved = ruptureRecord.items.find(s => s.unique_id === ruptureItem.unique_id);
            if (!saved) saved = ruptureRecord.items.find(s => s.recipe_id === item.recipe_id);
            if (saved) {
              ruptureItem.rupture_time = saved.rupture_time || "";
              ruptureItem.expected_duration = saved.expected_duration || "";
              ruptureItem.notes = saved.notes || "";
            }
          }

          return ruptureItem;
        });
      }

      setRuptureItems(items);
    } catch (error) {
      console.error("Erro ao carregar dados de ruptura (Sync)", error);
    } finally {
      setRuptureLoading(false);
    }
  }, [customer, selectedDay, orderItems, recipes, currentOrder, weeklyRuptureData]);

  // Carregar dados de ruptura
  useEffect(() => {
    if (activeTab === "rupture" && customer && weeklyMenus.length && recipes.length) {
      loadRuptureData();
    }
  }, [activeTab, customer, selectedDay, weeklyMenus, recipes, loadRuptureData]);

  const updateOrderItem = useCallback((uniqueId, field, value) => {
    setCurrentOrder(prev => {
      if (!prev?.items) return prev;
      const newItems = prev.items.map(item => {
        if (item.unique_id === uniqueId) {
          // Usar lógica centralizada para calcular valores
          return CategoryLogic.calculateItemValues(item, field, value, 0);
        }
        return item;
      });

      return { ...prev, items: newItems };
    });
  }, []);



  // Carregar dados de sobras automaticamente para cálculo de descontos
  useEffect(() => {
    if (customer && hasInitializedDay) {
      loadWasteData();
    }
  }, [customer, selectedDay, hasInitializedDay, weekNumber, year, loadWasteData]);

  // Carregar dados de recebimento automaticamente para cálculo de descontos
  useEffect(() => {
    if (customer && hasInitializedDay) {
      loadReceivingData();
    }
  }, [customer, selectedDay, hasInitializedDay, weekNumber, year, loadReceivingData]);

  // Carregar dados de waste e receiving da semana inteira SEMPRE (Cache Global)
  useEffect(() => {
    if (customer && weekNumber && year) {
      // Load independent data in background
      loadWeeklyWasteData();
      loadWeeklyReceivingData();
      loadWeeklyRuptureData();
    }
  }, [customer, weekNumber, year, loadWeeklyWasteData, loadWeeklyReceivingData, loadWeeklyRuptureData]);

  // Inicializar pedido quando itens mudam
  useEffect(() => {
    const initKey = `${weekNumber}-${year}-${selectedDay}-${orderItems.length}`;

    // Só executar após inicialização do dia
    if (!hasInitializedDay) {
      return;
    }

    // Evitar re-execuções desnecessárias


    // Se existe pedido salvo para este dia, usar ele
    if (existingOrders[selectedDay] && orderItems.length > 0) {
      const existingOrder = existingOrders[selectedDay];


      // SINCRONIZAR ITENS: A nova lógica garante que os preços são sempre os mais atuais
      // ✅ Deduplica por recipe_id para evitar que pedidos salvos com duplicatas persistam
      const seenSavedRecipeIds = new Set();
      const uniqueExistingItems = existingOrder.items.filter(item => {
        if (!item.recipe_id || seenSavedRecipeIds.has(item.recipe_id)) return false;
        seenSavedRecipeIds.add(item.recipe_id);
        return true;
      });

      const synchronizedItems = uniqueExistingItems.map(existingItem => {
        const currentMenuItem = orderItems.find(oi => oi.recipe_id === existingItem.recipe_id);

        if (currentMenuItem) {
          // Base é o item do menu do dia (com preço e dados corretos)
          // Apenas as quantidades e anotações do usuário são preservadas do pedido salvo.
          const mergedItem = {
            ...currentMenuItem,
            base_quantity: existingItem.base_quantity || 0,
            adjustment_percentage: existingItem.adjustment_percentage || 0,
            notes: existingItem.notes || "",
            suggestion: existingItem.suggestion || null,
          };

          // Recalcula totais com base nas quantidades salvas
          return CategoryLogic.calculateItemValues(mergedItem, 'base_quantity', mergedItem.base_quantity, 0);
        }

        return null; // Item não existe mais no cardápio, será removido
      }).filter(Boolean); // Remove itens nulos

      // Adicionar itens que estão no cardápio de hoje mas não estavam no pedido salvo
      // IMPORTANTE: Criar cópias dos objetos para não modificar orderItems original
      const newItemsFromMenu = orderItems.filter(menuItem =>
        !existingOrder.items.some(savedItem => savedItem.recipe_id === menuItem.recipe_id)
      ).map(item => ({ ...item }));

      const allItems = [...synchronizedItems, ...newItemsFromMenu];


      const updatedOrder = {
        ...existingOrder,
        items: allItems,
      };

      setCurrentOrder(updatedOrder);

      setGeneralNotes(updatedOrder.general_notes || "");

    } else if (orderItems.length > 0) {
      // Criar novo pedido se não houver um existente
      // IMPORTANTE: Criar cópia profunda dos items para não modificar orderItems original
      // Isso permite comparar valores originais vs editados no handleSubmitOrder
      const newOrder = {
        customer_id: customer?.id,
        customer_name: customer?.name,
        day_of_week: selectedDay,
        week_number: weekNumber,
        year: year,
        date: format(addDays(weekStart, selectedDay - 1), "yyyy-MM-dd"),
        total_meals_expected: 0,
        general_notes: generalNotes,
        items: orderItems.map(item => ({ ...item })),
      };
      setCurrentOrder(newOrder);
    } else {
      setCurrentOrder(null);
    }
  }, [hasInitializedDay, orderItems, selectedDay, weekNumber, year, existingOrders, isEditMode]);

  // Sincronizar wasteItems com orderItems atualizados (mesma lógica dos pedidos)
  useEffect(() => {
    if (!hasInitializedDay || orderItems.length === 0) return;

    // Use currentOrder items if available
    const sourceItems = currentOrder?.items || orderItems;

    // Inicialização se estiver vazio e não houver dados salvos (ou se dados salvos ainda não carregaram, mas aqui assumimos que existingWaste já sincronizou se existisse)
    if (wasteItems.length === 0 && !existingWaste) {
      const newWasteItems = sourceItems.map(item => ({
        ...item,
        recipe_name: item.recipe_name,
        ordered_quantity: item.quantity || item.base_quantity || 0,
        ordered_unit_type: item.unit_type,
        waste_quantity: 0,
        loss_reason: '',
        notes: ''
      }));
      setWasteItems(newWasteItems);
      return;
    }

    const updatedWasteItems = wasteItems.map(wasteItem => {
      // Encontrar item correspondente nos orderItems atualizados (com preços novos)
      const currentOrderItem = sourceItems.find(oi =>
        oi.unique_id === wasteItem.unique_id ||
        oi.recipe_id === wasteItem.recipe_id
      );

      if (currentOrderItem) {
        // Manter quantities e notas do waste, mas atualizar preços e unit_type
        return {
          ...wasteItem,
          recipe_name: currentOrderItem.recipe_name,
          category: currentOrderItem.category,
          unit_price: currentOrderItem.unit_price,
          ordered_quantity: currentOrderItem.quantity || currentOrderItem.base_quantity || 0,
          ordered_unit_type: currentOrderItem.unit_type,
          total_price: (wasteItem.ordered_quantity || 0) * (currentOrderItem.unit_price || 0)
        };
      }
      return wasteItem;
    });

    // Usar JSON.stringify para uma comparação mais robusta e evitar loops infinitos
    if (JSON.stringify(updatedWasteItems) !== JSON.stringify(wasteItems)) {
      setWasteItems(updatedWasteItems);
    }
  }, [hasInitializedDay, wasteItems, orderItems, currentOrder]);

  // Sincronizar receivingItems com orderItems atualizados (mesma lógica dos pedidos)  
  useEffect(() => {
    if (!hasInitializedDay || orderItems.length === 0) return;

    // Use currentOrder items if available
    const sourceItems = currentOrder?.items || orderItems;

    if (receivingItems.length === 0 && !existingReceiving) {
      const newReceivingItems = sourceItems.map(item => ({
        ...item,
        recipe_name: item.recipe_name,
        ordered_quantity: item.quantity || item.base_quantity || 0,
        ordered_unit_type: item.unit_type,
        received_quantity: 0,
        notes: ''
      }));
      setReceivingItems(newReceivingItems);
      return;
    }

    const updatedReceivingItems = receivingItems.map(receivingItem => {
      // Encontrar item correspondente nos orderItems atualizados (com preços novos)
      const currentOrderItem = sourceItems.find(oi =>
        oi.unique_id === receivingItem.unique_id ||
        oi.recipe_id === receivingItem.recipe_id
      );

      if (currentOrderItem) {
        // Manter quantities e status do receiving, mas atualizar preços e unit_type
        return {
          ...receivingItem,
          recipe_name: currentOrderItem.recipe_name,
          category: currentOrderItem.category,
          unit_price: currentOrderItem.unit_price,
          ordered_quantity: currentOrderItem.quantity || currentOrderItem.base_quantity || 0,
          ordered_unit_type: currentOrderItem.unit_type,
          total_price: (receivingItem.ordered_quantity || 0) * (currentOrderItem.unit_price || 0)
        };
      }
      return receivingItem;
    });

    // Usar JSON.stringify para uma comparação mais robusta e evitar loops infinitos
    if (JSON.stringify(updatedReceivingItems) !== JSON.stringify(receivingItems)) {
      setReceivingItems(updatedReceivingItems);
    }
  }, [hasInitializedDay, receivingItems, orderItems, currentOrder]);

  // Hidratar todos os pedidos da semana com preços atualizados (para HistoryTab)
  useEffect(() => {
    if (!hasInitializedDay || !recipes || recipes.length === 0 || Object.keys(existingOrders).length === 0 || !pricingReady) {
      return;
    }

    const updatedOrders = {};

    Object.entries(existingOrders).forEach(([dayIndex, order]) => {
      if (order && order.items) {
        const hydratedItems = order.items.map(orderItem => {
          const recipe = recipes.find(r => r.id === orderItem.recipe_id);
          if (recipe) {
            const containerType = getRecipeUnitType(recipe);
            const unitPrice = PortalPricingSystem.recalculateItemUnitPrice(orderItem, recipe, containerType);

            return {
              ...orderItem,
              unit_price: unitPrice,
              unit_type: containerType,
              total_price: (orderItem.quantity || 0) * unitPrice
            };
          }
          return orderItem; // Manter item original se a receita não for encontrada
        });

        const newTotalAmount = utilSumCurrency(hydratedItems.map(item => item.total_price || 0));

        updatedOrders[dayIndex] = {
          ...order,
          items: hydratedItems,
          total_amount: newTotalAmount
        };
      } else {
        updatedOrders[dayIndex] = order;
      }
    });

    if (JSON.stringify(updatedOrders) !== JSON.stringify(hydratedOrders)) {
      setHydratedOrders(updatedOrders);
    }
  }, [hasInitializedDay, recipes, existingOrders, pricingReady, hydratedOrders]);



  // Calcular totais, depreciação por devoluções e descontos por não recebimento
  const orderTotals = useMemo(() => {
    if (!currentOrder?.items) {
      return {
        totalItems: 0,
        totalAmount: 0,
        depreciation: null,
        nonReceivedDiscounts: null,
        finalAmount: 0
      };
    }

    const totalItems = currentOrder.items.reduce((sum, item) => {
      // Use quantity if available, otherwise use base_quantity as fallback
      const itemQuantity = item.quantity || item.base_quantity || 0;
      return sum + itemQuantity;
    }, 0);
    const totalAmount = utilSumCurrency(currentOrder.items.map(item => item.total_price || 0));

    // Debug simplificado
    if (process.env.NODE_ENV === 'development' && totalAmount > 500) {

    }

    // Usar calculadora centralizada de peso
    const totalWeight = calculateTotalWeight(currentOrder.items);

    // Calcular depreciação baseada nos itens devolvidos (wasteItems)
    const depreciationData = calculateTotalDepreciation(wasteItems || [], currentOrder.items || []);

    // Calcular descontos por itens não recebidos (receivingItems)
    const nonReceivedDiscountsData = calculateNonReceivedDiscounts(receivingItems || [], currentOrder.items || []);

    // Calcular valor final com ambos os descontos
    const finalOrderValue = calculateFinalOrderValue(
      totalAmount,
      depreciationData.totalDepreciation,
      nonReceivedDiscountsData.totalNonReceivedDiscount
    );

    return {
      totalItems,
      totalAmount,
      totalWeight,
      depreciation: depreciationData,
      nonReceivedDiscounts: nonReceivedDiscountsData,
      finalAmount: finalOrderValue.finalTotal,
      originalAmount: totalAmount,
      depreciationAmount: depreciationData.totalDepreciation,
      nonReceivedDiscountAmount: nonReceivedDiscountsData.totalNonReceivedDiscount,
      totalDiscountAmount: finalOrderValue.totalDiscounts
    };
  }, [currentOrder, wasteItems, receivingItems]);

  const submitOrder = useCallback(async () => {
    // 🚨 LOG INICIAL - Informações básicas da sessão
    const currentTime = new Date();
    const dayOfWeek = currentTime.getDay(); // 0=Domingo, 1=Segunda, ... 5=Sexta
    const dayName = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayOfWeek];

    // ✅ FALLBACK ROBUSTO: Se currentOrder estiver nulo (race condition), reconstruir na hora
    let activeOrder = currentOrder;
    if (!activeOrder && customer && orderItems && orderItems.length > 0) {
      console.warn('⚠️ [submitOrder] currentOrder nulo! Reconstruindo pedido on-the-fly...');
      activeOrder = {
        customer_id: customer.id,
        customer_name: customer.name,
        day_of_week: selectedDay,
        week_number: weekNumber,
        year: year,
        date: format(addDays(weekStart, selectedDay - 1), "yyyy-MM-dd"),
        total_meals_expected: 0,
        general_notes: generalNotes,
        items: orderItems.map(item => ({ ...item })),
      };
    }

    if (!activeOrder || !customer) {
      console.warn('❌ [submitOrder] Abortado: Dados insuficientes', { hasOrder: !!activeOrder, hasCustomer: !!customer });
      toast({ variant: "destructive", description: "Erro: Dados do pedido incompletos. Tente recarregar a página." });
      return;
    }

    // 🚨 VERIFICAÇÃO ESPECÍFICA PARA SEXTAS-FEIRAS
    if (dayOfWeek === 5) {
      const sessionKey = `portal_sessions_${customerId}`;
      const activeSessions = JSON.parse(localStorage.getItem(sessionKey) || '[]');
      const now = Date.now();
      const recentSessions = activeSessions.filter(s => (now - s.timestamp) < 300000);

      if (recentSessions.length > 1) {
      }
    }

    setIsSubmitting(true); // 🔒 Bloquear botão

    try {
      // SINCRONIZAR UNIT_TYPES: Atualizar unit_type dos itens com dados atuais das receitas
      const syncItemsWithCurrentRecipes = (items) => {
        return items.map(item => {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (recipe) {
            const currentUnitType = getRecipeUnitType(recipe);
            return {
              ...item,
              unit_type: currentUnitType // Sincronizar com ficha técnica atual
            };
          }
          return item;
        });
      };

      // Aplicar sincronização nos itens antes de salvar
      const syncedOrder = {
        ...activeOrder,
        items: syncItemsWithCurrentRecipes(activeOrder.items || [])
      };




      const orderData = {
        ...syncedOrder,
        total_meals_expected: 0,
        general_notes: generalNotes,
        total_items: orderTotals.totalItems,
        total_amount: orderTotals.totalAmount,
        final_amount: orderTotals.finalAmount,
        original_amount: orderTotals.originalAmount,
        depreciation_amount: orderTotals.depreciationAmount
      };


      const startTime = Date.now();

      if (existingOrders[selectedDay]) {
        await Order.update(existingOrders[selectedDay].id, orderData);

        const updateTime = Date.now() - startTime;

        toast({ description: "Pedido atualizado com sucesso!" });

        // ATUALIZAÇÃO OTIMISTA: Atualizar o estado local com os dados que acabaram de ser salvos
        const updatedOrder = { ...existingOrders[selectedDay], ...orderData };
        const newOrders = {
          ...existingOrders,
          [selectedDay]: updatedOrder
        };
        setExistingOrders(newOrders);
        existingOrdersRef.current = newOrders; // Sincronizar ref imediatamente

      } else {
        // ✅ VERIFICAÇÃO DEFENSIVA para prevenir duplicatas
        // Antes de criar, consulta novamente para garantir que nenhum pedido foi criado
        // enquanto o usuário estava na página (corrige race condition).
        const freshOrders = await Order.query([
          { field: 'customer_id', operator: '==', value: customer.id },
          { field: 'week_number', operator: '==', value: weekNumber },
          { field: 'year', operator: '==', value: year },
          { field: 'day_of_week', operator: '==', value: selectedDay }
        ]);

        if (freshOrders.length > 0) {
          // Duplicata encontrada! Em vez de criar, atualiza o pedido mais recente.
          const getOrderTimestamp = (o) => {
            const date = o.updatedAt || o.createdAt;
            if (!date) return 0;
            return date.toMillis ? date.toMillis() : new Date(date).getTime();
          };
          freshOrders.sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
          const latestOrder = freshOrders[0];

          await Order.update(latestOrder.id, orderData);

          // Atualização otimista da UI
          const updatedOrder = { ...latestOrder, ...orderData };
          const newOrders = {
            ...existingOrders,
            [selectedDay]: updatedOrder
          };
          setExistingOrders(newOrders);
          existingOrdersRef.current = newOrders; // Sincronizar ref imediatamente
          toast({ description: "Pedido atualizado com sucesso (duplicata evitada)." });

        } else {
          // Nenhum pedido encontrado, seguro para criar.
          const newOrder = await Order.create(orderData);

          const newOrders = {
            ...existingOrders,
            [selectedDay]: newOrder
          };
          setExistingOrders(newOrders);
          existingOrdersRef.current = newOrders; // Sincronizar ref imediatamente
          setGeneralNotes(orderData.general_notes);
          toast({ description: "Pedido enviado com sucesso!" });
        }
      }

      // REMOVIDO: A atualização agora é otimista para evitar race conditions com o DB
      // await loadExistingOrders();

      // SYNC: Salvar edições para o PrintPreviewEditor mostrar com cor verde
      // Construir weekDayKey no formato "2025_W46_Seg" (abreviações em português)
      // selectedDay é um número: 0=Dom, 1=Seg, 2=Ter, etc.
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
      const weekDayKey = `${year}_W${String(weekNumber).padStart(2, '0')}_${dayNames[selectedDay]}`;

      // Salvar APENAS itens que foram alterados em relação ao pedido SALVO anteriormente
      // (não comparar com menu original que tem tudo zerado)
      if (orderData.items && orderData.items.length > 0) {
        let changedCount = 0;

        // Buscar pedido salvo anteriormente para comparação
        const savedOrder = existingOrders[selectedDay];
        const savedItems = savedOrder?.items || [];

        // 🔍 LOG DEBUG: Ver todos os items e o pedido salvo
        console.log('📋 [COMPARAÇÃO PARA EDIÇÕES]', {
          existingOrderExists: !!existingOrders[selectedDay],
          savedItemsCount: savedItems.length,
          orderDataItems: orderData.items.map(i => ({ name: i.recipe_name, recipe_id: i.recipe_id, qty: i.base_quantity })),
          savedItems: savedItems.map(i => ({ name: i.recipe_name, recipe_id: i.recipe_id, qty: i.base_quantity }))
        });

        for (const item of orderData.items) {
          // Buscar item no pedido SALVO anteriormente (não no menu com zeros)
          // Usar recipe_id pois unique_id pode mudar entre sessões
          const savedItem = savedItems.find(si => si.recipe_id === item.recipe_id);
          const originalQty = savedItem?.base_quantity || 0;
          const currentQty = item.base_quantity || 0;

          // Log para cada item
          if (!savedItem) {
            console.log(`⚠️ [${item.recipe_name}] Não encontrado no pedido salvo (recipe_id: ${item.recipe_id})`);
          }

          // Só salvar se a quantidade mudou
          if (Math.abs(originalQty - currentQty) > 0.001) {
            try {
              // 🔍 LOG DEBUG: Verificar mapeamento
              console.log('💾 [SAVE EDIT]', {
                itemRecipeName: item.recipe_name,
                itemRecipeId: item.recipe_id,
                savedItemRecipeName: savedItem?.recipe_name,
                originalQty,
                currentQty,
                diff: Math.abs(originalQty - currentQty)
              });

              await saveEdit(
                customer.name,                    // customerName
                item.recipe_name,                 // recipeName
                currentQty,                       // editedValue (quantidade)
                'quantity',                       // field
                originalQty,                      // firebaseValue (valor original para comparação)
                weekDayKey,                       // weekDayKey
                'portal-client'                   // userId (para aparecer verde)
              );
              changedCount++;
            } catch (editError) {
              // Silently handle error
            }
          }
        }
      }

      // Sincronizar as opções de Janela de Vendas (sales_window) de volta para o Banco de Receitas
      // para o Sistema 'lembrar' dessa configuração na próxima programação
      if (orderData.items && orderData.items.length > 0) {
        setTimeout(async () => {
          try {
            const { Recipe } = await import('@/app/api/entities');
            for (const item of orderData.items) {
              if (item.recipe_id && item.sales_window) {
                const recipe = recipes.find(r => r.id === item.recipe_id);
                if (recipe && recipe.sales_window !== item.sales_window) {
                  await Recipe.update(item.recipe_id, { sales_window: item.sales_window });
                  console.log(`♻️ [Sync] A Ficha da Receita ${item.recipe_name} gravou a nova Janela Padrão: ${item.sales_window}`);
                }
              }
            }
          } catch (e) {
            console.error("❌ Erro ao sincronizar janelas com receitas", e);
          }
        }, 500);
      }

      // Ativar efeito de sucesso e depois sair do modo de edição
      setShowSuccessEffect(true);
      setTimeout(() => {
        setShowSuccessEffect(false);
        setIsEditMode(false);
      }, 2000); // 2 segundos de efeito

    } catch (error) {
      // Toast para o usuário
      toast({
        variant: "destructive",
        description: `Erro ao enviar pedido (${dayName}). Tente novamente.`
      });

      // 🚨 LOG ADICIONAL SE FOR SEXTA-FEIRA
      if (dayOfWeek === 5) {
        const sessionKey = `portal_sessions_${customerId}`;
        const activeSessions = JSON.parse(localStorage.getItem(sessionKey) || '[]');
        const now = Date.now();
        const recentSessions = activeSessions.filter(s => (now - s.timestamp) < 300000);

        if (typeof window !== 'undefined') {
          window.fridayErrorCount = (window.fridayErrorCount || 0) + 1;
        }

        // Tentar limpar sessões antigas para evitar conflitos futuros
        if (recentSessions.length > 1) {
          localStorage.removeItem(sessionKey);
        }
      }
    } finally {
      setIsSubmitting(false); // 🔓 Liberar botão
    }
  }, [currentOrder, customer, generalNotes, orderTotals, existingOrders, selectedDay, toast, orderItems, recipes, weekStart, weekNumber, year]);

  const enableEditMode = useCallback(() => {
    setIsEditMode(true);
  }, []);

  const enableReceivingEditMode = useCallback(() => {
    console.log('🟠 [enableReceivingEditMode] Botão "Editar Recebimento" clicado - mudando para modo edição');
    setIsReceivingEditMode(true);
  }, []);

  const enableWasteEditMode = useCallback(() => {
    setIsWasteEditMode(true);
  }, []);

  /**
   * Determina se um pedido é considerado "completo" ou apenas parcial
   * Pedido parcial = apenas total_meals_expected preenchido, sem itens com quantidades
   * @param {Object} order - Pedido salvo original do banco (antes da população com menu)
   * @returns {boolean} true se é um pedido completo, false se apenas parcial
   */
  const isCompleteOrder = useCallback((order) => {
    if (!order) return false;

    // ✅ ESTRATÉGIA 1: Se não tem itens salvos, é apenas parcial
    if (!order.items || order.items.length === 0) {
      return false;
    }

    // ✅ ESTRATÉGIA 2: Verificar se algum item foi realmente preenchido pelo usuário
    const hasItemsWithQuantity = order.items.some(item => {
      const qty = utilParseQuantity(item.quantity) || utilParseQuantity(item.base_quantity) || 0;
      const adj = utilParseQuantity(item.adjustment_percentage) || 0;

      // Item é considerado preenchido se tem quantidade OU ajuste de porcionamento
      return qty > 0 || adj > 0;
    });

    return hasItemsWithQuantity;
  }, []);

  // ===== SISTEMA DE SUGESTÕES AUTOMÁTICAS =====

  // Estado para evitar execuções múltiplas
  const [isProcessingSuggestions, setIsProcessingSuggestions] = useState(false);

  /**
   * Aplica sugestões automaticamente quando as refeições esperadas mudam
   * Esta é a função principal que executa em background sem interface
   */
  const applyAutomaticSuggestions = useCallback(async (newMealsExpected) => {

    // Proteção contra execuções múltiplas
    if (isProcessingSuggestions) {
      return;
    }


    setIsProcessingSuggestions(true);

    if (!customer || !currentOrder?.items) {

      setIsProcessingSuggestions(false);
      return;
    }

    // *** REMOVIDO: A dependência de mealsExpected foi eliminada a pedido do usuário ***
    // Agora as sugestões são carregadas baseadas na mediana histórica diretamente.
    // A função será chamada ao carregar a página, não mais ao editar.

    // *** NOVA LÓGICA: Sempre aplicar sugestões quando há itens ***
    // Verificar se há itens que podem receber sugestões (vazios OU com valores existentes)
    const hasItemsForSuggestions = currentOrder.items.some(item => {
      const baseQty = utilParseQuantity(item.base_quantity) || 0;
      const adjustmentPct = utilParseQuantity(item.adjustment_percentage) || 0;
      // Aceitar tanto campos vazios quanto preenchidos para recalculo
      return baseQty >= 0 || (CategoryLogic.isCarneCategory(item.category) && adjustmentPct >= 0);
    });

    if (!hasItemsForSuggestions) {

      setIsProcessingSuggestions(false);
      return;
    }



    try {
      // 1. Gerar sugestões usando o pipeline unificado (que tenta API VR -> Histórico)
      const suggestionResult = await OrderSuggestionManager.generateOrderSuggestions(
        customer.id,
        currentOrder.items,
        newMealsExpected,
        {
          dayOfWeek: selectedDay,
          useVrSales: true, // ✅ Tentar API de Vendas
          fullRecipes: recipes, // Para mapear códigos de produto
          lookbackWeeks: 12,
          rawValues: true, // ✅ Usar valores brutos (sem arredondamento para 0.25)
          storeId: customer?.vr_store_id || customer?.store_id // ✅ PASSAR ID DA LOJA (Fallback para store_id)
        }
      );

      if (!suggestionResult.success) {
        console.warn('⚠️ Sugestões falharam:', suggestionResult.error);
        setIsProcessingSuggestions(false);
        return;
      }

      // Log do resultado para debug
      console.log(`📊 [AutoSuggestions] Resultado:`, suggestionResult.metadata.message);

      const itemsWithSuggestions = suggestionResult.items;

      // Aplicar sugestões PRESERVANDO valores originais dos inputs
      setCurrentOrder(prevOrder => {
        const newItems = prevOrder.items.map(item => {
          // Encontrar a sugestão correspondente pelo unique_id
          const suggestedItem = itemsWithSuggestions.find(resItem => resItem.unique_id === item.unique_id);

          // Log de falha de match se houver sugestão mas não match
          if (suggestedItem?.suggestion?.has_suggestion && suggestedItem.unique_id !== item.unique_id) {
            console.error('❌ [AutoSuggestions] Mismatch de Unique ID!', { expected: item.unique_id, got: suggestedItem.unique_id });
          }

          return {
            ...item,
            // Aplicar a sugestão SE encontrada, senão limpar (null) para não manter dados velhos
            suggestion: suggestedItem ? (suggestedItem.suggestion || null) : null
          };
        });

        return {
          ...prevOrder,
          items: newItems,
          total_meals_expected: newMealsExpected
        };
      });

      // Se a fonte foi VR Sales nativo, mostrar um toast informativo
      if (suggestionResult.metadata.source === 'vr_real_sales_native') {
        toast({
          title: "Sugestões do Caixa 🛒",
          description: "Baseado no histórico do seu supermercado (90 Dias).",
          duration: 4000,
          className: "bg-blue-50 border-blue-200 text-blue-800"
        });
      }

      setIsProcessingSuggestions(false);

    } catch (error) {
      console.error('❌ Erro no applyAutomaticSuggestions:', error);
      setIsProcessingSuggestions(false);
    }
  }, [customer, currentOrder, isEditMode, toast, isProcessingSuggestions, selectedDay, recipes]);



  // Wrapper personalizado para injetar as cores corretas das categorias
  const portalGroupItemsByCategory = useCallback((items, keyExtractor) => {
    // 1. Agrupar itens usando a função original do hook
    const groups = groupItemsByCategory(items, keyExtractor);

    // 2. Se temos categorias carregadas localmente, atualizar as cores
    if (categories.length > 0) {
      // Helper para normalizar strings para comparação
      const normalize = (str) => String(str || '').toLowerCase().trim();

      Object.keys(groups).forEach(groupName => {
        const normalizedGroupName = normalize(groupName);

        // Tentar encontrar categoria pelo nome
        let category = categories.find(c => {
          const name = normalize(c.name);
          const label = normalize(c.label);
          const value = normalize(c.value);

          return name === normalizedGroupName ||
            label === normalizedGroupName ||
            value === normalizedGroupName;
        });

        if (category) {
          // Lógica de herança de cores:
          // 1. Configuração direta da categoria (MenuConfig)
          // 2. Cor nativa da categoria
          // 3. Configuração do PAI (se for subcategoria)
          // 4. Cor nativa do PAI

          let finalColor = null;

          // Check 1 & 2: Própria categoria
          if (menuConfig?.category_colors?.[category.id]) {
            finalColor = menuConfig.category_colors[category.id];
          } else if (category.color) {
            finalColor = category.color;
          }

          // Check 3 & 4: Categoria Pai (Fallback)
          if (!finalColor && category.parent_id) {
            const parentCategory = categories.find(c => c.id === category.parent_id);
            if (parentCategory) {
              if (menuConfig?.category_colors?.[parentCategory.id]) {
                finalColor = menuConfig.category_colors[parentCategory.id];
              } else if (parentCategory.color) {
                finalColor = parentCategory.color;
              }
            }
          }

          if (finalColor) {
            // Injetar a cor correta
            groups[groupName].categoryInfo.color = finalColor;
          }
        }
      });
    }

    return groups;
  }, [categories, menuConfig, groupItemsByCategory]);

  // Função para filtrar itens baseado no grupo de categoria selecionado
  const filterItemsByCategoryGroup = useCallback((items) => {
    // Se não há grupo selecionado ou não há category_groups, mostrar todos os itens
    if (!selectedCategoryGroup || !menuConfig?.category_groups?.length) {
      return items;
    }

    const currentGroup = menuConfig.category_groups.find(g => g.id === selectedCategoryGroup);
    // Se grupo não encontrado ou sem items, mostrar todos
    if (!currentGroup || !currentGroup.items?.length) return items;

    // Helper para normalizar strings para comparação
    const normalize = (str) => String(str || '').toLowerCase().trim();

    // Pré-calcular os nomes das categorias do grupo para comparação
    const groupCategoryNames = new Set();
    const groupCategoryIds = new Set(currentGroup.items);

    currentGroup.items.forEach(groupCategoryId => {
      groupCategoryIds.add(groupCategoryId);
      const category = categories.find(c => c.id === groupCategoryId);
      if (category) {
        if (category.name) groupCategoryNames.add(normalize(category.name));
        if (category.label) groupCategoryNames.add(normalize(category.label));
      }
    });

    // Filtrar itens cujas categorias pertencem ao grupo selecionado
    return items.filter(item => {
      const itemCategory = item.category_id || item.category;
      if (!itemCategory) return true; // Se não tem categoria, mostrar (não filtrar)

      const normalizedItemCategory = normalize(itemCategory);

      // Match por ID direto
      if (groupCategoryIds.has(itemCategory)) {
        return true;
      }

      // Match por nome normalizado
      if (groupCategoryNames.has(normalizedItemCategory)) {
        return true;
      }

      // ✅ FIX: Flexible lookup for updated category names
      // If item has old name "Massas" and category is now "Massas Especiais", we try to find the category object
      const resolvedCategory = categories.find(c =>
        normalize(c.name) === normalizedItemCategory ||
        normalize(c.label) === normalizedItemCategory ||
        c.id === itemCategory ||
        // Partial match fallback (Safe for typical renames like "Massas" -> "Massas Especiais")
        normalize(c.name).includes(normalizedItemCategory)
      );

      if (resolvedCategory) {
        if (groupCategoryIds.has(resolvedCategory.id)) return true;
        if (resolvedCategory.parent_id && groupCategoryIds.has(resolvedCategory.parent_id)) return true;
      }

      // Verificar se a categoria do item é FILHA de uma categoria do grupo
      // (importante para subcategorias)
      const itemCategoryObj = categories.find(c =>
        normalize(c.name) === normalizedItemCategory ||
        normalize(c.label) === normalizedItemCategory ||
        c.id === itemCategory
      );

      if (itemCategoryObj?.parent_id && groupCategoryIds.has(itemCategoryObj.parent_id)) {
        return true;
      }

      return false;
    });
  }, [selectedCategoryGroup, menuConfig?.category_groups, categories]);

  // Carregar pedidos existentes quando customer muda OU semana muda OU dia muda
  useEffect(() => {

    if (customer && hasInitializedDay) {
      loadExistingOrders();
    }
  }, [customer, hasInitializedDay, weekNumber, year, selectedDay, loadExistingOrders]);

  // Resetar modos de edição e efeitos visuais quando mudar de semana ou dia
  useEffect(() => {
    setIsEditMode(false);
    setShowSuccessEffect(false);
    setShowReceivingSuccessEffect(false);
    setShowWasteSuccessEffect(false);
    // Nota: isReceivingEditMode e isWasteEditMode são controlados por loadReceivingData e loadWasteData
  }, [weekNumber, year, selectedDay]);

  // ✅ AUTO-CARREGAR SUGESTÕES quando o pedido é populado
  useEffect(() => {
    // Verificar se temos customer, items, e se ainda não processamos sugestões para esse conjunto
    if (customer && currentOrder?.items?.length > 0 && !isProcessingSuggestions) {
      // Verificar se algum item já tem sugestão (para não reprocessar infinitamente)
      const hasAnySuggestion = currentOrder.items.some(item => item.suggestion?.has_suggestion);
      if (!hasAnySuggestion) {
        console.log('📊 [AUTO-SUGGESTIONS] Disparando carregamento automático de sugestões...');
        applyAutomaticSuggestions(0); // Passa 0 pois mealsExpected não é mais usado
      }
    }
  }, [customer?.id, currentOrder]); // Depende de customer ID e objeto do pedido (para detectar carregamento dos itens)

  if (!customerId) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">ID do Cliente Requerido</h3>
        <p className="text-gray-500">Por favor, forneça um ID de cliente válido.</p>
      </div>
    );
  }

  if (loading) {
    return (
      // Container principal
      <div className="fixed top-0 left-0 w-full h-full bg-white">
        {/* Camada 1: Imagem completa como fundo */}
        <img
          src="/splash-bendito.png"
          alt="Carregando..."
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Removed overlay logo as the background image is now the full splash screen */}
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ChefHat className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Portal do Cliente</h1>
                <p className="text-sm text-gray-600">{customer?.name}</p>
              </div>
            </div>
            <RefreshButton
              text="Atualizar"
              size="sm"
              className="shrink-0"
              onClick={handleRefresh}
              isLoading={isRefreshingData}
            />
          </div>

          {/* Week Navigation */}
          <div className="space-y-3 mb-4">
            {/* Navigation Buttons Row */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentDate(addDays(currentDate, -7));
                }}
                className="flex items-center gap-1 text-xs px-2 py-1 h-8 flex-shrink-0"
              >
                <ChevronLeft className="w-3 h-3" />
                <span className="hidden sm:inline">Semana Anterior</span>
                <span className="sm:hidden">Anterior</span>
              </Button>

              <div className="text-center flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  Semana {weekNumber}/{year}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {format(weekStart, "dd/MM")} - {format(addDays(weekStart, 6), "dd/MM")}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentDate(addDays(currentDate, 7));
                }}
                className="flex items-center gap-1 text-xs px-2 py-1 h-8 flex-shrink-0"
              >
                <span className="hidden sm:inline">Próxima Semana</span>
                <span className="sm:hidden">Próxima</span>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>

            {/* Days Selector Row */}
            <div className="flex gap-1 justify-center overflow-x-auto pb-1">
              {weekDays.map((day) => {
                // Verificar se é realmente o dia atual (data exata, não apenas número do dia)
                const today = new Date();
                const isCurrentDay = format(today, 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd');
                const isSelected = selectedDay === day.dayNumber;

                return (
                  <Button
                    key={day.dayNumber}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedDay(day.dayNumber);
                    }}
                    className={cn(
                      "flex flex-col h-14 w-14 p-1 text-xs relative flex-shrink-0",
                      isSelected && "bg-blue-600 text-white",
                      isCurrentDay && !isSelected && "border-blue-400 border-2"
                    )}
                  >
                    <span className="font-medium text-[10px]">{day.dayShort}</span>
                    <span className="text-[9px] opacity-80">{day.dayDate}</span>
                    {isCurrentDay && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-1 ring-white" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Category Group Tabs */}
          {menuConfig?.category_groups?.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100">
              <div className="flex gap-2 overflow-x-auto py-1 justify-center">
                {menuConfig.category_groups.map(group => (
                  <Button
                    key={group.id}
                    variant={selectedCategoryGroup === group.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategoryGroup(group.id)}
                    className={cn(
                      "flex items-center gap-1.5 flex-shrink-0 text-xs px-3 py-1.5",
                      selectedCategoryGroup === group.id && "bg-blue-600 text-white"
                    )}
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    {group.name}
                  </Button>
                ))}
              </div>

              {/* Separator */}
              <div className="hidden sm:block h-6 w-px bg-gray-200 mx-2"></div>

              {/* Apply Suggestions Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSuggestionModal(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-colors ml-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Aplicar Sugestões</span>
              </Button>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-12">
              <TabsTrigger value="orders" className="flex items-center gap-1 text-xs p-1">
                <ShoppingCart className="w-4 h-4" />
                <span>Pedido</span>
              </TabsTrigger>
              <TabsTrigger value="receive" className="flex items-center gap-1 text-xs p-1">
                <Package className="w-4 h-4" />
                <span className="hidden xs:inline">Recebimento</span>
                <span className="xs:hidden">Receb.</span>
              </TabsTrigger>
              <TabsTrigger value="rupture" className="flex items-center gap-1 text-xs p-1">
                <AlertTriangle className="w-4 h-4 rotate-180" />
                <span className="hidden xs:inline">Ponto de Ruptura</span>
                <span className="xs:hidden">Ruptura</span>
              </TabsTrigger>
              <TabsTrigger value="waste" className="flex items-center gap-1 text-xs p-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Quebra</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1 text-xs p-1">
                <CircleDollarSign className="w-4 h-4" />
                <span>Histórico</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">

        {activeTab === "orders" && (
          <OrdersTab
            key={`orders-${weekNumber}-${year}-${selectedDay}-${selectedCategoryGroup}-${currentOrder?.total_amount || 0}`} // ✅ Força re-render quando semana/dia/pedido/categoria muda
            currentOrder={currentOrder}
            orderItems={orderItems}
            orderTotals={orderTotals}

            generalNotes={generalNotes}
            setGeneralNotes={setGeneralNotes}
            updateOrderItem={updateOrderItem}
            submitOrder={submitOrder}
            enableEditMode={enableEditMode}
            isEditMode={isEditMode}
            showSuccessEffect={showSuccessEffect}
            existingOrder={existingOrders[selectedDay]}
            wasteItems={wasteItems}
            existingWaste={existingWaste}
            groupItemsByCategory={portalGroupItemsByCategory}
            getOrderedCategories={getOrderedCategories}
            generateCategoryStyles={generateCategoryStyles}
            filterItemsByCategoryGroup={filterItemsByCategoryGroup}
            isSuggestionsLoading={isProcessingSuggestions}
          />
        )}

        {activeTab === "receive" && (
          <ReceivingTab
            key={`receive-${weekNumber}-${year}-${selectedDay}`} // ✅ Força re-render
            receivingLoading={receivingLoading}
            existingOrders={existingOrders}
            selectedDay={selectedDay}
            receivingItems={receivingItems}
            receivingNotes={receivingNotes}
            setReceivingNotes={setReceivingNotes}
            updateReceivingItem={updateReceivingItem}
            markAllAsReceived={markAllAsReceived}
            saveReceivingData={saveReceivingData}
            showSuccessEffect={showReceivingSuccessEffect}
            isEditMode={isReceivingEditMode}
            enableEditMode={enableReceivingEditMode}
            existingReceiving={existingReceiving}
            groupItemsByCategory={portalGroupItemsByCategory}
            getOrderedCategories={getOrderedCategories}
            generateCategoryStyles={generateCategoryStyles}
          />
        )}

        {activeTab === "rupture" && (
          <RuptureTab
            key={`rupture-${weekNumber}-${year}-${selectedDay}`}
            ruptureLoading={ruptureLoading}
            ruptureItems={ruptureItems}
            ruptureNotes={ruptureNotes}
            setRuptureNotes={setRuptureNotes}
            updateRuptureItem={updateRuptureItem}
            saveRuptureData={saveRuptureData}
            showSuccessEffect={showRuptureSuccessEffect}
            isEditMode={isRuptureEditMode}
            enableEditMode={() => setIsRuptureEditMode(true)}
            existingRupture={existingRupture}
            groupItemsByCategory={portalGroupItemsByCategory}
            getOrderedCategories={getOrderedCategories}
            generateCategoryStyles={generateCategoryStyles}
            selectedDay={selectedDay}
            weekStart={weekStart}
            storeId={customer?.vr_store_id} // Pass storeId from customer
          />
        )}

        {activeTab === "waste" && (
          <WasteTab
            key={`waste-${weekNumber}-${year}-${selectedDay}`} // ✅ Força re-render
            wasteLoading={wasteLoading}
            wasteItems={wasteItems}
            wasteNotes={wasteNotes}
            setWasteNotes={setWasteNotes}
            updateWasteItem={updateWasteItem}
            saveWasteData={saveWasteData}
            showSuccessEffect={showWasteSuccessEffect}
            isEditMode={isWasteEditMode}
            enableEditMode={enableWasteEditMode}
            existingWaste={existingWaste}
            groupItemsByCategory={portalGroupItemsByCategory}
            getOrderedCategories={getOrderedCategories}
            generateCategoryStyles={generateCategoryStyles}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            key={`history-${weekNumber}-${year}`} // ✅ Força re-render (sem selectedDay pois history é da semana toda)
            existingOrders={hydratedOrders}
            weekDays={weekDays}
            year={year}
            weekNumber={weekNumber}
            customer={customer}
            existingWasteData={weeklyWasteData}
            existingReceivingData={weeklyReceivingData} // NOVO PROP
            recipes={recipes}
            selectedDay={selectedDay}
            weeklyMenus={weeklyMenus} // ADICIONAR PROP
          />
        )}
      </div>

      {/* Footer with totals and submit button */}
      {activeTab === "orders" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-gray-600">
                {(orderTotals.depreciationAmount > 0 || orderTotals.nonReceivedDiscountAmount > 0) ? (
                  <div>
                    <div><span className="font-medium">Original:</span> {utilFormatCurrency(orderTotals.originalAmount)}</div>
                    {orderTotals.depreciationAmount > 0 && (
                      <div className="text-red-600"><span className="font-medium">Quebra (25%):</span> -{utilFormatCurrency(orderTotals.depreciationAmount)}</div>
                    )}
                    {orderTotals.nonReceivedDiscountAmount > 0 && (
                      <div className="text-orange-600"><span className="font-medium">Não recebido (100%):</span> -{utilFormatCurrency(orderTotals.nonReceivedDiscountAmount)}</div>
                    )}
                    <div className="font-bold"><span className="font-medium">Final:</span> {utilFormatCurrency(orderTotals.finalAmount)}</div>
                  </div>
                ) : (
                  <div><span className="font-medium">Total:</span> {utilFormatCurrency(orderTotals.totalAmount)}</div>
                )}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Peso:</span> {utilFormatWeight(orderTotals.totalWeight || 0)}
              </div>
            </div>
            {(isEditMode || showSuccessEffect) ? (
              <Button
                onClick={() => {
                  submitOrder();
                }}
                className={`w-full text-white transition-all duration-500 ${showSuccessEffect
                  ? 'bg-green-600 hover:bg-green-700 scale-105 shadow-lg'
                  : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                disabled={showSuccessEffect || isSubmitting}
              >
                {showSuccessEffect ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 animate-bounce" />
                    Pedido Enviado!
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {(() => {
                      const buttonText = existingOrders[selectedDay] ? 'Atualizar Pedido' : 'Enviar Pedido';
                      return buttonText;
                    })()}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={enableEditMode}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Editar Pedido
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Bottom spacing for fixed footer */}
      {activeTab === "orders" && <div className="h-24"></div>}

      {/* Modal de Percentual de Sugestões */}
      <Dialog open={showSuggestionModal} onOpenChange={setShowSuggestionModal}>
        <DialogContent className="max-w-xs mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Aplicar Sugestões
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-gray-600">Escolha o percentual da sugestão a aplicar:</p>

            {/* Preset percentage buttons */}
            <div className="grid grid-cols-3 gap-2">
              {[50, 75, 100].map((pct) => (
                <Button
                  key={pct}
                  variant={pct === 100 ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyAllSuggestions(pct)}
                  className={cn(
                    "text-sm font-bold h-12",
                    pct === 100
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "border-purple-200 text-purple-700 hover:bg-purple-50"
                  )}
                >
                  {pct}%
                </Button>
              ))}
            </div>

            {/* Custom percentage input */}
            <div className="flex items-center gap-2 pt-1">
              <Input
                type="number"
                min="1"
                max="200"
                placeholder="Outro %"
                value={customSuggestionPercent}
                onChange={(e) => setCustomSuggestionPercent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customSuggestionPercent) {
                    applyAllSuggestions(parseFloat(customSuggestionPercent));
                  }
                }}
                className="flex-1 text-center text-sm h-10 border-purple-200 focus:border-purple-500"
              />
              <Button
                size="sm"
                disabled={!customSuggestionPercent || parseFloat(customSuggestionPercent) <= 0}
                onClick={() => applyAllSuggestions(parseFloat(customSuggestionPercent))}
                className="bg-purple-600 hover:bg-purple-700 text-white h-10 px-4"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileOrdersPage;