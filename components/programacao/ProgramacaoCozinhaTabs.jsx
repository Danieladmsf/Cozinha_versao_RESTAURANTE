'use client';

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import '../cardapio/consolidacao/print-styles.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Calendar,
  FileText,
  Printer,
  Search,
  Loader2,
  Package2,
  GripVertical
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PrintPreviewEditor from './PrintPreviewEditor';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Utils de ordenação
import { getCustomerOrder } from './utils/customerOrderUtils';

// Hooks
import { useProgramacaoRealtimeData } from '@/hooks/programacao/useProgramacaoRealtimeData';
import { useOrderConsolidation } from "@/hooks/cardapio/useOrderConsolidation";

// Componentes de navegação centralizados
import WeekNavigator from '@/components/shared/WeekNavigator';
import WeekDaySelector from '@/components/shared/WeekDaySelector';

// Imports para abas dinâmicas
import { CategoryTree, MenuConfig } from '@/app/api/entities';
import { APP_CONSTANTS } from '@/lib/constants';


// Função utilitária centralizada para formatação de quantidade
export const formatQuantityForDisplay = (quantity, unitType) => {
  // Validar quantidade - garantir que é um número válido
  let validQuantity = quantity ?? 0;

  // Arredondar para evitar problemas de precisão flutuante
  validQuantity = Math.round(validQuantity * 100) / 100;

  // Formato padrão
  const formattedQty = String(validQuantity).replace('.', ',');
  const unit = unitType || '';
  return `${formattedQty} ${unit}`.trim();
};

const ConsolidacaoContent = ({
  loading,
  ordersByCustomer,
  consolidateCustomerItems,
  weekDays,
  selectedDay,
  formatQuantityDisplay,
}) => (
  <>
    {loading.orders ? (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
        <p className="text-gray-600">Carregando pedidos...</p>
      </div>
    ) : (
      <div className="space-y-4 print:space-y-12">
        {ordersByCustomer.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-slate-100">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="font-semibold text-lg text-gray-700 mb-2">
                Nenhum Pedido Encontrado
              </h3>
              <p className="text-gray-500 text-sm">
                Não há pedidos para o dia selecionado com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        ) : (
          // Ordenar empresas de acordo com a ordem salva
          (() => {
            // Criar array de pseudo-orders a partir de ordersByCustomer para extração
            const pseudoOrders = ordersByCustomer.map(c => ({ customer_name: c.customer_name }));
            const customerOrder = getCustomerOrder(pseudoOrders);
            // Criar array lowercase para comparação case-insensitive
            const customerOrderLower = customerOrder.map(c => c.toLowerCase());

            return [...ordersByCustomer].sort((a, b) => {
              if (customerOrder.length === 0) return 0;

              const lowerA = a.customer_name.toLowerCase();
              const lowerB = b.customer_name.toLowerCase();

              const indexA = customerOrderLower.indexOf(lowerA);
              const indexB = customerOrderLower.indexOf(lowerB);
              const posA = indexA === -1 ? 9999 : indexA;
              const posB = indexB === -1 ? 9999 : indexB;
              return posA - posB;
            });
          })().map((customerData) => {
            const consolidatedItems = consolidateCustomerItems(customerData.orders);
            const selectedDayInfo = weekDays.find(d => d.dayNumber === selectedDay);

            return (
              <Card
                key={customerData.customer_id}
                className="print:break-after-page print:min-h-screen print:p-8 border-2 border-slate-200 shadow-lg bg-gradient-to-br from-white to-slate-50 hover:shadow-xl transition-shadow duration-200"
              >
                <CardContent className="p-4 print:p-8">
                  <div className="mb-3 print:mb-12">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-2 print:pb-6">
                      <div className="flex-1">
                        <h1 className="text-lg print:text-3xl font-bold text-gray-900">
                          {customerData.customer_name}
                        </h1>
                        <p className="text-sm text-gray-600">
                          {selectedDayInfo?.fullDate}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 print:space-y-8">
                    {Object.keys(consolidatedItems).length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        Nenhum item no pedido deste cliente.
                      </p>
                    ) : (
                      Object.entries(consolidatedItems).map(([categoryName, items]) => (
                        <div key={categoryName} className="mb-3 print:mb-10">
                          <div className="mb-2 print:mb-6">
                            <h2 className="text-lg print:text-2xl font-bold text-gray-800 border-b border-gray-200 pb-1">
                              {categoryName}
                            </h2>
                          </div>

                          <div className="space-y-1 print:space-y-3 pl-3 print:pl-6">
                            {items.map((item, index) => (
                              <div
                                key={`${item.unique_id || item.recipe_id}_${index}`}
                                className="flex items-start gap-3 print:gap-6 text-sm print:text-lg"
                              >
                                <span className="font-semibold text-blue-700 min-w-[50px] print:min-w-[80px] text-sm">
                                  {formatQuantityDisplay(item)}
                                </span>
                                <span className="text-gray-800 flex-1">
                                  {item.recipe_name}
                                  {item.notes && item.notes.trim() && (
                                    <span className="text-gray-600 italic">
                                      {' '}({item.notes.trim()})
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="hidden print:block mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
                    <p>Cozinha Afeto - Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    )}
  </>
);

const ProgramacaoCozinhaTabs = () => {
  const {
    currentDate,
    weekDays,
    weekNumber,
    year,
    loading,
    connectionStatus,
    customers,
    recipes,
    orders,
    navigateWeek
  } = useProgramacaoRealtimeData();

  // URL params para persistir estado do editor
  const searchParams = useSearchParams();
  const router = useRouter();

  // Estados principais
  const [selectedDay, setSelectedDay] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [tabOrder, setTabOrder] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('programacao-tabs-order');
        if (saved) return JSON.parse(saved);
      } catch (e) { }
    }
    return [];
  });

  const [showPreviewEditor, setShowPreviewEditor] = useState(() => {
    // Inicializar com base no query param
    return searchParams.get('preview') === 'true';
  });

  // Filtros
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ==== ESTADOS PARA ABAS DINÂMICAS ====
  const [categories, setCategories] = useState([]);
  const [menuConfig, setMenuConfig] = useState(null);
  const [categoryMap, setCategoryMap] = useState({});
  const [loadingConfig, setLoadingConfig] = useState(true);

  // ==== CARREGAMENTO DE CATEGORIAS ====
  useEffect(() => {
    const loadConfigAndCategories = async () => {
      try {
        setLoadingConfig(true);
        const mockUserId = APP_CONSTANTS?.MOCK_USER_ID || 'mock-user-id';

        const [categoriesData, configData] = await Promise.all([
          CategoryTree.list(),
          MenuConfig.query([{ field: 'user_id', operator: '==', value: mockUserId }])
        ]);

        setCategories(categoriesData || []);
        setMenuConfig(configData?.[0] || null);

        // Criar mapa de subcategorias para categorias principais
        const map = {};
        if (categoriesData) {
          categoriesData.forEach(cat => {
            // Normalizar nome da categoria para chave do mapa
            const normalizedName = cat.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

            if (cat.level === 1) {
              map[cat.id] = cat;
              map[normalizedName] = cat;
            } else if (cat.parent_id) {
              const parent = categoriesData.find(p => p.id === cat.parent_id);
              if (parent) {
                map[cat.id] = parent;
                map[normalizedName] = parent;
              }
            }
          });
        }
        setCategoryMap(map);
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      } finally {
        setLoadingConfig(false);
      }
    };
    loadConfigAndCategories();
  }, []);

  // ==== COMPUTAR ABAS DINÂMICAS ====
  const dynamicTabs = useMemo(() => {
    // Usar apenas as categorias selecionadas para produção
    const selectedTypes = menuConfig?.selected_main_categories || [];

    console.log('🔍 [DynamicTabs] Debug:', {
      selectedTypes,
      categoriesCount: categories.length,
      level1Categories: categories.filter(c => c.level === 1).map(c => ({ id: c.id, name: c.name, type: c.type })),
      menuConfig
    });

    if (!selectedTypes.length || !categories.length) return [];

    // Filtrar categorias que têm o type nos selecionados e são level 1
    const productionCategories = categories.filter(c =>
      c.level === 1 && selectedTypes.includes(c.type)
    );

    console.log('🔍 [DynamicTabs] productionCategories:', productionCategories.map(c => c.name));

    // Ordenar: primeiro por tipo (ordem de seleção), depois por nome dentro de cada tipo
    const orderedTabs = selectedTypes
      .flatMap(type => productionCategories.filter(c => c.type === type)) // TODAS as categorias de cada tipo
      .map(cat => ({
        id: cat.id,
        label: cat.name,
        value: `tab-${cat.id}`,
        type: cat.type
      }));

    console.log('🔍 [DynamicTabs] orderedTabs:', orderedTabs);
    return orderedTabs;
  }, [menuConfig, categories]);

  // Define a aba ativa quando as categorias carregarem
  useEffect(() => {
    if (dynamicTabs?.length > 0 && !activeTab) {
      setActiveTab(tabOrder.length ? tabOrder[0] : dynamicTabs[0].value);
    }
  }, [dynamicTabs, activeTab, tabOrder]);

  // Sincronizar tabOrder quando dynamicTabs mudar
  useEffect(() => {
    if (dynamicTabs.length > 0) {
      const currentTabValues = dynamicTabs.map(t => t.value);

      setTabOrder(prevOrder => {
        if (prevOrder.length === 0) return currentTabValues;

        // Mantém ordem antiga, adiciona novas, remove as que sumiram
        const newOrder = prevOrder.filter(val => currentTabValues.includes(val));
        currentTabValues.forEach(val => {
          if (!newOrder.includes(val)) newOrder.push(val);
        });

        if (JSON.stringify(newOrder) !== JSON.stringify(prevOrder)) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('programacao-tabs-order', JSON.stringify(newOrder));
          }
        }
        return newOrder;
      });
    }
  }, [dynamicTabs]);

  // Lista de abas final ordenada para renderização
  const orderedDynamicTabs = useMemo(() => {
    if (!tabOrder.length) return dynamicTabs;
    return tabOrder.map(val => dynamicTabs.find(t => t.value === val)).filter(Boolean);
  }, [dynamicTabs, tabOrder]);

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const newOrder = Array.from(tabOrder.length ? tabOrder : dynamicTabs.map(t => t.value));
    const [reorderedItem] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, reorderedItem);

    setTabOrder(newOrder);
    if (typeof window !== 'undefined') {
      localStorage.setItem('programacao-tabs-order', JSON.stringify(newOrder));
    }
  };

  // ==== FUNÇÃO PARA OBTER DADOS DE UMA ABA DINÂMICA ====
  const getDynamicTabData = (targetTab) => {
    if (!targetTab || !ordersByCustomer) return [];

    const filteredOrdersByCustomer = [];

    ordersByCustomer.forEach(customerData => {
      const filteredCustomerOrders = [];

      customerData.orders.forEach(order => {
        const filteredItems = order.items?.filter(item => {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (!recipe) return false;

          let mainCategory = null;
          if (recipe.category_id && categoryMap[recipe.category_id]) {
            mainCategory = categoryMap[recipe.category_id];
          } else if (recipe.category) {
            const normalizedCat = recipe.category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            mainCategory = categoryMap[normalizedCat];
          }

          return mainCategory && mainCategory.id === targetTab.id;
        });

        if (filteredItems && filteredItems.length > 0) {
          filteredCustomerOrders.push({
            ...order,
            items: filteredItems
          });
        }
      });

      if (filteredCustomerOrders.length > 0) {
        filteredOrdersByCustomer.push({
          ...customerData,
          orders: filteredCustomerOrders
        });
      }
    });

    return filteredOrdersByCustomer;
  };

  // O hook useProgramacaoRealtimeData já gerencia os pedidos automaticamente

  // Filtrar pedidos por dia e cliente
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const dayMatch = order.day_of_week === selectedDay;
      const customerMatch = selectedCustomer === "all" || order.customer_id === selectedCustomer;
      const searchMatch = searchTerm === "" ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());

      return dayMatch && customerMatch && searchMatch;
    });
  }, [orders, selectedDay, selectedCustomer, searchTerm]);

  // Hook de consolidação (deve vir depois de filteredOrders)
  const { ordersByCustomer, consolidateCustomerItems } = useOrderConsolidation(filteredOrders, recipes);

  // Lógica segura de formatação (Arquitetura Nativa / Quilo e Unidade)
  const formatQuantityDisplay = (item) => {
    let quantity = item.quantity ?? 0;
    quantity = Math.round(quantity * 1000) / 1000;

    // A unidade ORIGINAL do pedido
    let originalUnitType = (item.unit_type || "").toLowerCase();

    let unitType = item.unit_type;
    let unitsQuantity = 1;
    let portionWeight = 0;
    let assemblyUnitType = null;
    let isUnitBased = false;

    if (originalUnitType === 'porção' || originalUnitType === 'porcao' || originalUnitType === 'un' || originalUnitType === 'unidades') {
      originalUnitType = 'unidade';
    }

    let recipe = null;
    if (item.recipe_id || item.recipe_name) {
      if (item.recipe_id) {
        recipe = recipes.find(r => r.id === item.recipe_id);
      }

      // Upgrade: Se for um Product antigo, tenta buscar a Ficha Técnica correspondente
      // Usa matching inteligente (nome contido, palavras-chave) para lidar com nomes diferentes
      if (recipe && recipe.entityType === 'product') {
        const searchName = item.recipe_name || recipe.name;
        if (searchName) {
          const { findLinkedRecipe } = require('@/lib/findLinkedRecipe');
          const fichaTecnica = findLinkedRecipe(searchName, recipes);
          if (fichaTecnica) recipe = fichaTecnica;
        }
      }

      // Fallback para buscar pelo nome da receita (caso o recipe_id do pedido seja antigo)
      if (!recipe && item.recipe_name) {
        const { findLinkedRecipe } = require('@/lib/findLinkedRecipe');
        recipe = findLinkedRecipe(item.recipe_name, recipes)
          || recipes.find(r => r.name?.toLowerCase().trim() === item.recipe_name.toLowerCase().trim());
      }

      if (recipe) {
        // Agora que o banco de dados foi limpo e padronizado, o portion_weight_calculated
        // e o unit_type sempre existem de forma correta e definitiva na raiz.
        if (recipe.portion_weight_calculated && recipe.portion_weight_calculated > 0) {
          portionWeight = recipe.portion_weight_calculated;
        }

        // Recupera também outras configurações de montagem, se existirem
        if (recipe.preparations && recipe.preparations.length > 0) {
          const lastPrep = recipe.preparations[recipe.preparations.length - 1];
          if (lastPrep.assembly_config) {
            unitsQuantity = parseFloat(lastPrep.assembly_config.units_quantity) || 1;
            assemblyUnitType = lastPrep.assembly_config.unit_type || lastPrep.assembly_config.container_type;
          }
        }

        // Determinar a unidade base correta
        if (assemblyUnitType) {
          unitType = assemblyUnitType;
        } else if (!unitType) {
          unitType = recipe.container_type || recipe.unit_type;
        }

        // Forçar unit_type para 'kg' se o nome indica fortemente
        const recipeNameHasKg = recipe.name && recipe.name.toUpperCase().endsWith('KG');
        if (recipeNameHasKg) {
          unitType = 'kg';
        }
      }
    }

    if (unitType) {
      unitType = unitType.toLowerCase();
    }

    // Unificar variações de unidade
    if (unitType === 'porção' || unitType === 'porcao' || unitType === 'un' || unitType === 'unidades') {
      unitType = 'unidade';
      isUnitBased = true;
    }
    if (unitType === 'quilo') {
      unitType = 'kg';
    }

    // === LÓGICA DE PRODUÇÃO / CÁLCULO DE EMBALAGENS ===

    // Se a unidade ORIGINAL do pedido já for Unidade (e não kg),
    // a quantidade do pedido é DE FATO o número de embalagens vendidas (Ex: 4 combo/marmita).
    if (originalUnitType === 'unidade' && portionWeight > 0) {
      const portionGrams = Math.round(portionWeight * 1000);
      return `${quantity} emb (${portionGrams}g)`;
    }

    // Se o pedido chegou em KG/PESO, calcula dividindo pela porção
    if (unitType === 'kg' && portionWeight > 0 && quantity > 0) {
      const numPackages = Math.ceil(quantity / portionWeight);
      const portionGrams = Math.round(portionWeight * 1000);
      return `${numPackages} emb (${portionGrams}g)`;
    }

    // Unidades genéricas sem peso configurado
    if (unitType === 'unidade' || isUnitBased || unitType === 'cuba') {
      const portionGrams = Math.round(portionWeight * 1000);
      if (portionWeight > 0) {
        return `${quantity} emb (${portionGrams}g)`;
      }

      const finalQuantity = Math.round((quantity * unitsQuantity) * 100) / 100;
      return `${String(finalQuantity).replace('.', ',')} unidade`;
    }

    // 3. Casos Legacy / Cuba

    if (unitType === 'cuba') {
      unitType = '';
    }

    // Formato padrão final (fallback)
    const formattedQty = String(Math.round(quantity * 100) / 100).replace('.', ',');
    const displayUnit = unitType || '';
    return `${formattedQty} ${displayUnit}`.trim();
  };


  // Sistema inteligente de cálculo de fonte
  const calculateOptimalFontSizes = async (data, progressWindow = null) => {
    const { selectedDayInfo, porEmpresaData } = data;

    // Dimensões da página A4 em pixels com margens reduzidas
    const PAGE_HEIGHT = 1123; // ~297mm
    const PAGE_WIDTH = 794;   // ~210mm
    const PADDING = 30;       // 15px em cada lado (top + bottom)
    const MAX_HEIGHT = PAGE_HEIGHT - PADDING;

    // Função helper para atualizar progresso
    const updateProgress = (percent, message) => {
      if (progressWindow && progressWindow.document.getElementById('progress')) {
        progressWindow.document.getElementById('progress').style.width = percent + '%';
        progressWindow.document.getElementById('status').textContent = message;
      }
    };

    const fontSizes = {
      porEmpresa: [],
      salada: 40,
      acougue: 40,
      embalagem: 40
    };

    // Função para medir altura de HTML em iframe invisível
    const measureHTMLHeight = (htmlContent) => {
      return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position: absolute; left: -9999px; width: 794px; height: 1500px; visibility: hidden;';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>${getPrintStyles()}</style>
            </head>
            <body>${htmlContent}</body>
          </html>
        `);
        iframeDoc.close();

        setTimeout(() => {
          const contentBody = iframeDoc.querySelector('.content-body, .section-content');
          const height = contentBody ? contentBody.scrollHeight : 0;
          document.body.removeChild(iframe);
          resolve(height);
        }, 100);
      });
    };

    // Função de busca binária para encontrar melhor tamanho de fonte
    const findOptimalFontSize = async (generateHTMLFunc, minSize = 20, maxSize = 120) => {
      let bestSize = minSize;
      let iterations = 0;
      const maxIterations = 15; // Limitar iterações

      while (maxSize - minSize > 1 && iterations < maxIterations) {
        const midSize = Math.round((minSize + maxSize) / 2);
        const html = generateHTMLFunc(midSize);
        const height = await measureHTMLHeight(html);

        if (height <= MAX_HEIGHT) {
          bestSize = midSize;
          minSize = midSize;
        } else {
          maxSize = midSize;
        }

        iterations++;
      }

      return bestSize;
    };

    // Calcular total de páginas para progresso
    const totalPages = (porEmpresaData?.length || 0) +
      (saladaData && Object.keys(saladaData).length > 0 ? 1 : 0) +
      (acougueData && Object.keys(acougueData).length > 0 ? 1 : 0) +
      (embalagemData && Object.keys(embalagemData).length > 0 ? 1 : 0);

    let currentPage = 0;

    // Calcular para cada empresa (Por Empresa)
    if (porEmpresaData && porEmpresaData.length > 0) {
      for (let i = 0; i < porEmpresaData.length; i++) {
        const customerData = porEmpresaData[i];
        const progress = Math.round((currentPage / totalPages) * 80);
        updateProgress(progress, `Calculando: ${customerData.customer_name}...`);

        const fontSize = await findOptimalFontSize((size) => {
          return generatePorEmpresaPageHTML(customerData, selectedDayInfo, size);
        });

        fontSizes.porEmpresa.push(fontSize);
        currentPage++;
      }
    }

    // Calcular para Salada
    if (saladaData && Object.keys(saladaData).length > 0) {
      const progress = Math.round((currentPage / totalPages) * 80);
      updateProgress(progress, 'Calculando: Salada...');
      fontSizes.salada = await findOptimalFontSize((size) => {
        return generateSaladaPageHTML(saladaData, selectedDayInfo, size);
      });
      currentPage++;
    }

    // Calcular para Açougue
    if (acougueData && Object.keys(acougueData).length > 0) {
      const progress = Math.round((currentPage / totalPages) * 80);
      updateProgress(progress, 'Calculando: Açougue...');
      fontSizes.acougue = await findOptimalFontSize((size) => {
        return generateAcouguePageHTML(acougueData, selectedDayInfo, size);
      });
      currentPage++;
    }

    // Calcular para Embalagem
    if (embalagemData && Object.keys(embalagemData).length > 0) {
      const progress = Math.round((currentPage / totalPages) * 80);
      updateProgress(progress, 'Calculando: Embalagem...');
      fontSizes.embalagem = await findOptimalFontSize((size) => {
        return generateEmbalagemPageHTML(embalagemData, selectedDayInfo, size);
      });
      currentPage++;
    }

    updateProgress(85, 'Cálculo concluído!');
    return fontSizes;
  };

  // Abrir editor de preview (atualiza URL)
  const openPreviewEditor = () => {
    setShowPreviewEditor(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('preview', 'true');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Fechar editor de preview (remove da URL)
  const closePreviewEditor = () => {
    setShowPreviewEditor(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('preview');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handlePrint = () => {
    // Abrir o editor de preview interativo
    openPreviewEditor();
  };

  // Funções auxiliares para gerar HTML de páginas individuais (para medição)
  const generatePorEmpresaPageHTML = (customerData, dayInfo, baseFontSize) => {
    const consolidatedItems = consolidateCustomerItems(customerData.orders);
    const h1Size = Math.round(baseFontSize * 1.2);
    const h2Size = Math.round(baseFontSize * 1.0);
    const qtySize = Math.round(baseFontSize * 1.1);
    const nameSize = Math.round(baseFontSize * 1.0);
    const spacing = Math.round(baseFontSize * 0.4);

    return `
      <div class="print-page por-empresa-page" style="font-size: ${baseFontSize}px;">
        <div class="client-main-header" style="margin-bottom: ${spacing * 2}px; padding-bottom: ${spacing}px;">
          <h1 class="client-title" style="font-size: ${h1Size}px; line-height: 1.2;">
            ${customerData.customer_name} - <span style="font-size: ${Math.round(baseFontSize * 1.2)}px;">${dayInfo?.fullDate}</span>
          </h1>
        </div>
        <div class="content-body">
          ${Object.entries(consolidatedItems).map(([categoryName, items]) => `
            <div class="category-block" style="margin-bottom: ${spacing * 2}px;">
              <h2 class="category-name" style="font-size: ${h2Size}px; margin-bottom: ${spacing}px;">${categoryName}</h2>
              <div class="items-list" style="margin-left: ${baseFontSize}px;">
                ${items.map((item) => `
                  <div class="item-row" style="margin-bottom: ${spacing}px; gap: ${spacing}px;">
                    <span class="item-quantity" style="font-size: ${qtySize}px;">${formatQuantityDisplay(item)}</span>
                    <span class="item-name" style="font-size: ${nameSize}px;">
                      ${item.recipe_name}
                      ${item.notes && item.notes.trim() ? `<span class="notes" style="font-style: italic; color: #6b7280;"> (${item.notes.trim()})</span>` : ''}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const generateSaladaPageHTML = (data, dayInfo, baseFontSize) => {
    const h1Size = Math.round(baseFontSize * 1.8);
    const h2Size = Math.round(baseFontSize * 1.4);
    const textSize = Math.round(baseFontSize * 1.0);
    const qtySize = Math.round(baseFontSize * 1.1);
    const notesSize = Math.round(baseFontSize * 0.85);

    return `
      <div class="print-page" style="font-size: ${baseFontSize}px;">
        <div class="page-header">
          <h1 style="font-size: ${h1Size}px;">Salada</h1>
          <div class="day-info" style="font-size: ${Math.round(baseFontSize * 1.2)}px;">${dayInfo?.fullDate}</div>
        </div>
        <div class="section-content">
          <div class="recipe-sections">
            ${Object.entries(data).map(([nomeReceita, clientes], index) => `
              <div class="recipe-section" style="margin-bottom: ${baseFontSize}px;">
                <h2 style="font-size: ${h2Size}px; margin-bottom: ${baseFontSize * 0.5}px;">${index + 1}. ${nomeReceita.toUpperCase()}</h2>
                <div class="clients-list" style="padding-left: ${baseFontSize}px;">
                  ${Object.entries(clientes).map(([customerName, dataCustomer]) => {
      const notesText = dataCustomer.items && dataCustomer.items.length > 0 && dataCustomer.items[0].notes
        ? dataCustomer.items[0].notes.trim()
        : '';
      return `
                    <div class="client-line" style="margin-bottom: ${baseFontSize * 0.4}px; gap: ${baseFontSize * 0.3}px;">
                      <span style="font-size: ${textSize}px;">${customerName.toUpperCase()}</span>
                      <span style="font-size: ${textSize}px;">→</span>
                      <span style="font-size: ${qtySize}px;">
                        ${formatQuantityForDisplay(dataCustomer.quantity, dataCustomer.unitType)}
                        ${notesText ? `<span class="notes" style="font-style: italic; color: #6b7280; font-size: ${notesSize}px;"> (${notesText})</span>` : ''}
                      </span>
                    </div>
                  `}).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  };

  const generateAcouguePageHTML = (data, dayInfo, baseFontSize) => {
    return generateSaladaPageHTML(data, dayInfo, baseFontSize).replace('Salada', 'Acougue');
  };

  const generateEmbalagemPageHTML = (data, dayInfo, baseFontSize) => {
    return generateSaladaPageHTML(data, dayInfo, baseFontSize).replace('Salada', 'Embalagem');
  };

  const generateCompletePrintContent = (data) => {
    const { selectedDayInfo, weekNumber, year, porEmpresaData, saladaData, acougueData, embalagemData, fontSizes } = data;

    // Usar fontSizes calculados ou padrões
    const porEmpresaFonts = fontSizes?.porEmpresa || [];
    const saladaFont = fontSizes?.salada || 40;
    const acougueFont = fontSizes?.acougue || 40;
    const embalagemFont = fontSizes?.embalagem || 40;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Programacao de Producao - ${selectedDayInfo?.fullDate}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${getPrintStyles()}
          </style>
        </head>
        <body>
          ${generatePorEmpresaSection(porEmpresaData, selectedDayInfo, porEmpresaFonts)}
          ${generateSaladaSection(saladaData, selectedDayInfo, saladaFont)}
          ${generateAcougueSection(acougueData, selectedDayInfo, acougueFont)}
          ${generateEmbalagemSection(embalagemData, selectedDayInfo, embalagemFont)}
          ${getAutoFontSizeScript()}
        </body>
      </html>
    `;
  };

  const generatePorEmpresaSection = (data, dayInfo, fontSizes = []) => {
    if (!data || data.length === 0) return '';

    return data.map((customerData, index) => {
      const baseFontSize = fontSizes[index] || 40; // Usar tamanho calculado ou padrão
      return generatePorEmpresaPageHTML(customerData, dayInfo, baseFontSize) + `
        <!-- Debug Banner -->
        <div style="position: absolute; top: 5px; right: 5px; background: #000; color: #ff0; padding: 6px 12px; font-size: 14px; font-weight: bold; border: 2px solid #ff0; z-index: 9999;">
          FONTE: ${baseFontSize}px
        </div>
      `;
    }).join('');
  };

  const generateSaladaSection = (data, dayInfo, fontSize = 40) => {
    if (!data || Object.keys(data).length === 0) return '';

    return generateSaladaPageHTML(data, dayInfo, fontSize) + `
      <div style="position: absolute; top: 5px; right: 5px; background: #000; color: #0f0; padding: 6px 12px; font-size: 14px; font-weight: bold; border: 2px solid #0f0; z-index: 9999;">
        FONTE: ${fontSize}px
      </div>
      <div class="page-footer">
        <p>Cozinha Afeto - Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}</p>
      </div>
    `;
  };

  const generateAcougueSection = (data, dayInfo, fontSize = 40) => {
    if (!data || Object.keys(data).length === 0) return '';

    return generateAcouguePageHTML(data, dayInfo, fontSize) + `
      <div style="position: absolute; top: 5px; right: 5px; background: #000; color: #f00; padding: 6px 12px; font-size: 14px; font-weight: bold; border: 2px solid #f00; z-index: 9999;">
        FONTE: ${fontSize}px
      </div>
      <div class="page-footer">
        <p>Cozinha Afeto - Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}</p>
      </div>
    `;
  };

  const generateEmbalagemSection = (data, dayInfo, fontSize = 40) => {
    if (!data || Object.keys(data).length === 0) return '';

    return generateEmbalagemPageHTML(data, dayInfo, fontSize) + `
      <div style="position: absolute; top: 5px; right: 5px; background: #000; color: #0af; padding: 6px 12px; font-size: 14px; font-weight: bold; border: 2px solid #0af; z-index: 9999;">
        FONTE: ${fontSize}px
      </div>
      <div class="page-footer">
        <p>Cozinha Afeto - Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}</p>
      </div>
    `;
  };

  const getAutoFontSizeScript = () => {
    // Não é mais necessário - fontes já são calculadas no React
    return `
      <script>
        // Impressão pronta - fontes já ajustadas pelo React
      </script>
    `;
  };

  /*
  REMOVIDO: Toda a lógica complexa de ajuste JavaScript foi substituída
  por cálculo direto em React baseado na quantidade de itens.
 
  Agora cada seção (Por Empresa, Salada, Açougue, Embalagem) calcula
  seu próprio tamanho de fonte baseado na quantidade de conteúdo.
 
  const getAutoFontSizeScriptOLD_DISABLED = () => {
    return `
      <script>
        function autoAdjustFontSize() {
          setTimeout(() => {
            const pages = document.querySelectorAll('.print-page');
 
            if (pages.length === 0) return;
 
            pages.forEach((page, pageIndex) => {
              // Identificar o conteúdo principal da página
              const selectors = [
                '.content-body',
                '.company-section',
                '.section-content',
                '.recipe-sections',
                '.items-container',
                '.category-section',
                '.clients-list',
                '.category-block'
              ];
 
              let content = null;
              for (let selector of selectors) {
                const found = page.querySelector(selector);
                if (found && !content) {
                  content = found;
                  break;
                }
              }
 
              if (!content) {
                content = page.children[1];
                if (!content) return;
              }
 
              // Resetar estilos inline
              const allElements = page.querySelectorAll('*');
              allElements.forEach(el => {
                if (el.style) {
                  el.style.fontSize = null;
                  el.style.lineHeight = null;
                  el.style.margin = null;
                  el.style.padding = null;
                }
              });
 
              // Forçar reflow
              page.offsetHeight;
 
              // Dimensões da página A4 em pixels (72 DPI)
              const PAGE_WIDTH = 794;
              const PAGE_HEIGHT = 1123;
              const MARGIN = 38;
 
              const header = page.querySelector('.page-header, .client-main-header');
              const footer = page.querySelector('.page-footer');
 
              let headerHeight = 0;
              let footerHeight = 0;
 
              if (header) headerHeight = header.getBoundingClientRect().height;
              if (footer) footerHeight = footer.getBoundingClientRect().height;
 
              const availableHeight = PAGE_HEIGHT - headerHeight - footerHeight - (MARGIN * 2);
              const availableWidth = PAGE_WIDTH - (MARGIN * 2);
 
              // Busca binária para encontrar o maior tamanho de fonte que cabe
              let minSize = 20;
              let maxSize = 180;
              let bestSize = minSize;
 
              function applyFontSize(fontSize, showDebug = false) {
                content.style.fontSize = fontSize + 'px';
                content.style.lineHeight = '1.3';
 
                // Função auxiliar para adicionar badge de debug NO TEXTO
                function addDebugBadge(element, appliedSize) {
                  if (!showDebug) return;
 
                  const originalText = element.textContent.replace(/\s*\[.*?px\]\s*$/, ''); // Remove badge anterior
                  const badge = ' [' + Math.round(appliedSize) + 'px]';
                  element.textContent = originalText + badge;
                  element.style.color = '#000';
                }
 
                // Títulos principais (Por Empresa ou padrão)
                page.querySelectorAll('h1, .client-title').forEach(h1 => {
                  const size = fontSize * 1.7;
                  h1.style.fontSize = size + 'px';
                  h1.style.lineHeight = '1.2';
                  addDebugBadge(h1, size);
                });
 
                // Data/subtítulo no header
                page.querySelectorAll('.header-date').forEach(date => {
                  const size = fontSize * 1.2;
                  date.style.fontSize = size + 'px';
                  addDebugBadge(date, size);
                });
 
                // Categorias (h2)
                content.querySelectorAll('h2, .category-name').forEach(h2 => {
                  const size = fontSize * 1.4;
                  h2.style.fontSize = size + 'px';
                  h2.style.marginBottom = (fontSize * 0.5) + 'px';
                  h2.style.lineHeight = '1.3';
                  addDebugBadge(h2, size);
                });
 
                content.querySelectorAll('h3').forEach(h3 => {
                  const size = fontSize * 1.2;
                  h3.style.fontSize = size + 'px';
                  h3.style.marginBottom = (fontSize * 0.4) + 'px';
                  addDebugBadge(h3, size);
                });
 
                // Quantidades do layout "Por Empresa"
                content.querySelectorAll('.item-quantity').forEach((qty, index) => {
                  const size = fontSize * 1.15;
                  qty.style.fontSize = size + 'px';
                  qty.style.fontWeight = 'bold';
                  if (index === 0) addDebugBadge(qty, size); // Apenas primeiro item
                });
 
                // Nomes dos itens do layout "Por Empresa"
                content.querySelectorAll('.item-name').forEach((name, index) => {
                  const size = fontSize * 1.05;
                  name.style.fontSize = size + 'px';
                  if (index === 0) addDebugBadge(name, size); // Apenas primeiro item
                });
 
                // Quantidades gerais (outras abas)
                content.querySelectorAll('.quantity').forEach((qty, index) => {
                  const size = fontSize * 1.1;
                  qty.style.fontSize = size + 'px';
                  qty.style.fontWeight = 'bold';
                  if (index === 0) addDebugBadge(qty, size); // Apenas primeiro item
                });
 
                content.querySelectorAll('.customer-name').forEach((name, index) => {
                  const size = fontSize * 0.95;
                  name.style.fontSize = size + 'px';
                  name.style.fontWeight = 'bold';
                  if (index === 0) addDebugBadge(name, size); // Apenas primeiro item
                });
 
                content.querySelectorAll('.recipe-name, .meal-count').forEach((text, index) => {
                  text.style.fontSize = fontSize + 'px';
                  if (index === 0) addDebugBadge(text, fontSize); // Apenas primeiro item
                });
 
                content.querySelectorAll('.notes, .note').forEach((note, index) => {
                  const size = fontSize * 0.85;
                  note.style.fontSize = size + 'px';
                  if (index === 0) addDebugBadge(note, size); // Apenas primeiro item
                });
 
                // Espaçamentos entre linhas
                content.querySelectorAll('.item-line, .client-line, .item-row').forEach(line => {
                  line.style.marginBottom = (fontSize * 0.35) + 'px';
                  line.style.gap = (fontSize * 0.5) + 'px';
                });
 
                // Espaçamentos entre seções
                content.querySelectorAll('.category-section, .recipe-section, .category-block').forEach(section => {
                  section.style.marginBottom = (fontSize * 0.9) + 'px';
                });
 
                // Header principal (Por Empresa)
                page.querySelectorAll('.client-main-header').forEach(header => {
                  header.style.marginBottom = (fontSize * 1.0) + 'px';
                  header.style.paddingBottom = (fontSize * 0.5) + 'px';
                });
 
                // Indentação das listas
                content.querySelectorAll('.items-list').forEach(list => {
                  list.style.marginLeft = (fontSize * 1.0) + 'px';
                });
 
                // Forçar reflow
                content.offsetHeight;
 
                const contentHeight = content.scrollHeight;
                const contentWidth = content.scrollWidth;
 
                return contentHeight <= availableHeight && contentWidth <= availableWidth;
              }
 
              // Busca binária com precisão de 0.5px
              while (maxSize - minSize > 0.5) {
                const midSize = (minSize + maxSize) / 2;
 
                if (applyFontSize(midSize, false)) {
                  bestSize = midSize;
                  minSize = midSize;
                } else {
                  maxSize = midSize;
                }
              }
 
              // Aplicar o melhor tamanho encontrado COM DEBUG ATIVADO
              applyFontSize(bestSize, true);
 
              // Adicionar banner de debug bem visível no topo
              const debugBanner = document.createElement('div');
              debugBanner.style.cssText = 'position: absolute; top: 5px; right: 5px; background: #000; color: #ff0; padding: 8px 16px; font-size: 16px; font-weight: bold; border: 3px solid #ff0; z-index: 9999; font-family: monospace;';
              debugBanner.textContent = 'FONTE BASE: ' + Math.round(bestSize) + 'px | USO: ' + Math.round((content.scrollHeight / availableHeight) * 100) + '%';
              page.style.position = 'relative';
              page.insertBefore(debugBanner, page.firstChild);
            });
 
          }, 100);
        }
 
        function runMultipleTimes() {
          autoAdjustFontSize();
          setTimeout(autoAdjustFontSize, 400);
          setTimeout(autoAdjustFontSize, 900);
        }
 
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', runMultipleTimes);
        }
 
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
          runMultipleTimes();
        }
 
        window.addEventListener('load', runMultipleTimes);
 
        window.addEventListener('beforeprint', () => {
          autoAdjustFontSize();
        });
 
      </script>
    `;
  };
  */

  const getPrintStyles = () => {
    return `
      @page {
        size: A4;
        margin: 10mm;
      }
      
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: 'Arial', sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
      }
      
      .print-page {
        page-break-after: always;
        height: 297mm;
        width: 210mm;
        display: flex;
        flex-direction: column;
        padding: 15mm;
        overflow: hidden;
        box-sizing: border-box;
      }
      
      .print-page:last-child {
        page-break-after: avoid;
      }
      
      .page-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #333;
        padding-bottom: 15px;
      }
      
      .page-header h1 {
        font-size: 24px;
        font-weight: bold;
        color: #2563eb;
        margin-bottom: 8px;
      }
      
      .day-info {
        font-size: 16px;
        font-weight: 600;
        color: #666;
      }
      
      .company-section {
        flex: 1;
        margin-bottom: 20px;
        overflow: auto;
        min-height: 0;
      }
      
      .section-content {
        flex: 1;
        margin-bottom: 20px;
        overflow: auto;
        min-height: 0;
      }
      
      .client-header {
        margin-bottom: 20px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 10px;
      }
      
      .client-header h2 {
        font-size: 20px;
        font-weight: bold;
        color: #1f2937;
        margin-bottom: 4px;
      }
      
      .meal-count {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
      }
      
      .no-items {
        text-align: center;
        color: #6b7280;
        padding: 40px 0;
        font-style: italic;
      }
      
      .category-section {
        margin-bottom: 20px;
      }
      
      .category-header {
        margin-bottom: 10px;
      }
      
      .category-title {
        font-size: 18px;
        font-weight: bold;
        color: #1f2937;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 4px;
        margin: 0;
      }
      
      .items-container {
        padding-left: 15px;
      }
      
      .recipe-sections {
        padding: 10px 0;
      }
      
      .recipe-section {
        margin-bottom: 30px;
      }
      
      .recipe-header {
        margin-bottom: 15px;
      }
      
      .recipe-title {
        font-size: 20px;
        font-weight: bold;
        color: #1f2937;
        margin: 0;
      }
      
      .clients-list {
        padding-left: 20px;
      }
      
      .client-line {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      
      .customer-name {
        font-weight: bold;
        color: #1f2937;
        min-width: 120px;
        text-align: left;
      }
      
      .arrow {
        color: #6b7280;
        font-size: 14px;
      }
      
      .notes-section {
        margin-left: 10px;
      }
      
      .note {
        font-style: italic;
        color: #6b7280;
        font-size: 11px;
        margin-right: 5px;
      }
      
      .item-line {
        display: flex;
        align-items: flex-start;
        gap: 15px;
        margin-bottom: 6px;
        padding: 3px 0;
      }
      
      .quantity {
        font-weight: bold;
        color: #2563eb;
        min-width: 80px;
        font-size: 12px;
      }
      
      .recipe-name {
        flex: 1;
        color: #1f2937;
      }
      
      .notes {
        font-style: italic;
        color: #6b7280;
        font-size: 11px;
      }
      
      .customers {
        color: #6b7280;
        font-size: 10px;
        margin-left: 10px;
        font-style: italic;
      }
      
      .page-footer {
        margin-top: auto;
        text-align: center;
        border-top: 1px solid #e5e7eb;
        padding-top: 15px;
        font-size: 10px;
        color: #9ca3af;
      }

      /* Estilos específicos para Por Empresa - SEM tamanhos fixos (controlado por JS) */
      .por-empresa-page {
        padding: 8mm;
      }

      .client-main-header {
        border-bottom: 3px solid #333;
      }

      .client-title {
        font-weight: bold;
        color: #000;
        margin: 0;
        line-height: 1.2;
      }

      .header-date {
        font-weight: normal;
        color: #333;
      }

      .content-body {
        flex: 1;
        overflow: auto;
      }

      .category-block {
        page-break-inside: avoid;
      }

      .category-name {
        font-weight: bold;
        color: #000;
        margin: 0;
        padding: 0;
      }

      .items-list {
        /* Indentação será controlada pelo JS */
      }

      .item-row {
        display: flex;
        align-items: baseline;
        page-break-inside: avoid;
      }

      .item-quantity {
        font-weight: bold;
        color: #2563eb;
        min-width: 110px;
        flex-shrink: 0;
      }

      .item-name {
        color: #000;
        flex: 1;
      }

      .print-page:has(.page-header h1:contains("Por Empresa")) .page-header h1 {
        color: #6366f1;
      }
      
      .print-page:has(.page-header h1:contains("Salada")) .page-header h1 {
        color: #059669;
      }
      
      .print-page:has(.page-header h1:contains("Acougue")) .page-header h1 {
        color: #dc2626;
      }

      .print-page:has(.page-header h1:contains("Embalagem")) .page-header h1 {
        color: #2563eb;
      }
      
      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        
        .print-page {
          page-break-inside: avoid;
        }
        
        .category-block {
          page-break-inside: avoid;
        }
        
        .item-line {
          page-break-inside: avoid;
        }
      }
    `;
  };

  if (loading.initial) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-600">Carregando dados iniciais...</p>
        </div>
      </div>
    );
  }

  // Renderizar editor de preview se estiver aberto
  if (showPreviewEditor) {
    const dayInfo = weekDays.find(d => d.dayNumber === selectedDay);
    // Adicionar weekNumber e year ao selectedDayInfo para o PrintPreviewEditor
    const selectedDayInfo = {
      ...dayInfo,
      weekNumber,
      year
    };
    return (
      <PrintPreviewEditor
        data={{
          porEmpresaData: ordersByCustomer,
          selectedDayInfo,
          formatQuantityDisplay,
          consolidateCustomerItems,
          recipes,
          categoryMap,
          originalOrders: filteredOrders
        }}
        weekDays={weekDays}
        selectedDay={selectedDay}
        onDayChange={setSelectedDay}
        weekNumber={weekNumber}
        year={year}
        currentDate={currentDate}
        onWeekNavigate={navigateWeek}
        onClose={closePreviewEditor}
        onPrint={() => {
          // Callback após impressão bem-sucedida
          closePreviewEditor();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 consolidacao-container">
      {/* Navegação de Semana - Sem card separado, integrado ao layout */}
      <div className="print:hidden">
        <div className="space-y-6">
          <div className="flex justify-center">
            <WeekNavigator
              currentDate={currentDate}
              weekNumber={weekNumber}
              onNavigateWeek={navigateWeek}
              showCalendar={false}
              weekRange={menuConfig?.available_days?.some(d => d === 0 || d === 6) ? 'full' : 'workdays'}
            />
          </div>

          <WeekDaySelector
            currentDate={currentDate}
            currentDayIndex={selectedDay}
            onDayChange={setSelectedDay}
            availableDays={menuConfig?.available_days || [0, 1, 2, 3, 4, 5, 6]}
          />
        </div>
      </div>

      {/* Filtros de Cliente e Busca */}
      <Card className="border-2 border-purple-200 shadow-lg">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Cliente
              </label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="border-purple-300 focus:border-purple-500 focus:ring-purple-200">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Buscar Cliente
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Digite o nome do cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-purple-300 focus:border-purple-500 focus:ring-purple-200"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={printing}
                className="w-full h-10 gap-2 border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                {printing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Imprimir
              </Button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
            <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="dynamic-tabs-droppable" direction="horizontal">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="w-full"
                    >
                      <TabsList
                        className="grid w-full bg-white border-2 border-orange-200 p-2 rounded-lg gap-2"
                        style={{ gridTemplateColumns: `repeat(${orderedDynamicTabs.length || 1}, 1fr)` }}
                      >
                        {orderedDynamicTabs.map((tab, index) => (
                          <Draggable key={tab.value} draggableId={tab.value} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: snapshot.isDragging ? 0.8 : 1,
                                }}
                                className="w-full relative flex items-center group"
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className="absolute left-1 z-10 p-2 cursor-grab active:cursor-grabbing text-gray-400 opacity-50 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <TabsTrigger
                                  value={tab.value}
                                  className="w-full flex items-center justify-center gap-2 pl-8 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-600 border-2 border-transparent hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                                >
                                  <Package2 className="w-4 h-4" />
                                  <span className="truncate">{tab.label}</span>
                                </TabsTrigger>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </TabsList>
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {orderedDynamicTabs.map((tab) => {
                if (activeTab !== tab.value) return null;
                const tabData = getDynamicTabData(tab);

                return (
                  <TabsContent key={tab.value} value={tab.value} className="mt-6">
                    {tabData.length === 0 ? (
                      <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-slate-100">
                        <CardContent className="p-8 text-center">
                          <Package2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <h3 className="font-semibold text-lg text-gray-700 mb-2">
                            Nenhum Item Encontrado
                          </h3>
                          <p className="text-gray-500 text-sm">
                            Não há itens em produção de {tab.label} para o dia selecionado.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <ConsolidacaoContent
                        loading={loading}
                        ordersByCustomer={tabData}
                        consolidateCustomerItems={consolidateCustomerItems}
                        weekDays={weekDays}
                        selectedDay={selectedDay}
                        formatQuantityDisplay={formatQuantityDisplay}
                      />
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgramacaoCozinhaTabs;