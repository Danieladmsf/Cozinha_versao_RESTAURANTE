'use client';

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Scale, Package, AlertCircle, List, Grid3x3, Printer, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

// Utilitário para consolidação de ingredientes (VERSÃO CORRIGIDA)
import { consolidateIngredientsFromRecipes } from './utils/ingredientConsolidatorFixed';

const IngredientesConsolidados = ({
  orders = [],
  recipes = [],
  categories = [],
  menuConfig = null,
  ingredientsCatalog = [],
  weekDays = [],
  weekNumber,
  year,
  selectedDay = null,
  showWeekMode = true,
  dataVersion,
  handlePrint,
  printing,
  setShowWeekMode
}) => {
  // Estado para controlar a aba ativa
  const [activeTab, setActiveTab] = useState("por-fornecedor");
  // ✅ NOVO: Obter categorias ativas na ordem configurada (igual ao cardápio)
  const getActiveCategories = useMemo(() => {
    if (!categories || !menuConfig) return [];

    // Filtrar apenas categorias de nível 1 (principais)
    let filteredCategories = categories.filter(cat => cat.level === 1);

    // Filtrar por categorias principais selecionadas
    if (menuConfig.selected_main_categories && menuConfig.selected_main_categories.length > 0) {
      filteredCategories = filteredCategories.filter(category => {
        return menuConfig.selected_main_categories.includes(category.type);
      });
    }

    // Filtrar categorias ativas
    const activeCategories = filteredCategories.filter(category => {
      return menuConfig.active_categories?.[category.id] === true;
    });

    // Aplicar ordem personalizada
    if (menuConfig.category_order && menuConfig.category_order.length > 0) {
      return menuConfig.category_order
        .map(id => activeCategories.find(cat => cat.id === id))
        .filter(Boolean);
    }

    return activeCategories;
  }, [categories, menuConfig]);
  // ✅ CORREÇÃO: Filtrar apenas o último pedido de cada cliente por dia
  // Isso evita somar pedidos duplicados na lista de compras
  const getLatestOrderPerCustomer = (orders) => {
    const ordersByCustomerAndDay = {};

    orders.forEach(order => {
      const key = `${order.customer_name}_${order.day_of_week}`;
      // Substituir pedido anterior - pega sempre o último do array
      ordersByCustomerAndDay[key] = order;
    });

    return Object.values(ordersByCustomerAndDay);
  };

  // Filtrar pedidos pelo dia se necessário
  const filteredOrders = useMemo(() => {
    // Primeiro, remover duplicados (pegar apenas último pedido de cada cliente por dia)
    const uniqueOrders = getLatestOrderPerCustomer(orders);

    if (showWeekMode || !selectedDay) {
      return uniqueOrders; // Modo semana: todos os pedidos únicos
    }
    // Modo dia: filtrar pelo dia selecionado
    return uniqueOrders.filter(order => order.day_of_week === selectedDay);
  }, [orders, selectedDay, showWeekMode]);

  // Consolidar todos os ingredientes GLOBALMENTE (para aba alfabética)
  const ingredientesConsolidados = useMemo(() => {
    if (!filteredOrders.length || !recipes.length) return [];

    let consolidated = consolidateIngredientsFromRecipes(filteredOrders, recipes);

    // Injetar fornecedor atualizado do DB
    if (ingredientsCatalog && ingredientsCatalog.length > 0) {
      consolidated = consolidated.map(ing => {
        const nativeIng = ingredientsCatalog.find(i => i.name.toLowerCase() === ing.name.toLowerCase());
        return {
          ...ing,
          main_supplier: nativeIng?.main_supplier || 'N/A'
        };
      });
    }

    return consolidated;
  }, [filteredOrders, recipes, dataVersion, ingredientsCatalog]);

  // ✅ NOVO: Extrair ingredientes SEM consolidação global (para agrupamento por categoria)
  const ingredientesSemConsolidacao = useMemo(() => {
    if (!filteredOrders.length || !recipes.length) return [];

    // Usar a mesma lógica mas sem a etapa de consolidação
    const { extractAllIngredientsWithoutConsolidation } = require('./utils/ingredientConsolidatorFixed');
    return extractAllIngredientsWithoutConsolidation(filteredOrders, recipes);
  }, [filteredOrders, recipes, dataVersion]);

  // ✅ ATUALIZADO: Agrupar ingredientes por CATEGORIA DO INGREDIENTE (Hortifruti, Despensa, etc)
  const ingredientesPorCategoria = useMemo(() => {
    // Para lista de compras, o ideal é agrupar pelo TIPO DE INGREDIENTE (onde comprar)
    // e não pelo setor de produção (Receita).

    // 1. Obter todas as categorias únicas dos ingredientes
    const categorias = {};

    // 2. Agrupar ingredientes
    ingredientesSemConsolidacao.forEach(ingrediente => {
      // Usar a categoria do PRÓPRIO ingrediente (Hortifruti, Laticínios...)
      // Fallback para 'Outros' se não tiver
      const categoriaNome = ingrediente.category || 'Outros';

      // Normalizar chave
      const categoriaId = categoriaNome.toLowerCase().replace(/\s+/g, '_');

      if (!categorias[categoriaId]) {
        categorias[categoriaId] = {
          id: categoriaId,
          name: categoriaNome,
          ingredientes: []
        };
      }

      categorias[categoriaId].ingredientes.push(ingrediente);
    });

    console.log('🔍 DEBUG ingredientesPorCategoria (Refatorado):', {
      totalCategorias: Object.keys(categorias).length,
      categorias: Object.keys(categorias)
    });

    // 3. Helper para consolidar ingredientes duplicados DENTRO de cada categoria
    const consolidarDentroDeCategoria = (ingredientes) => {
      const consolidated = {};

      ingredientes.forEach(ing => {
        const key = `${ing.name}_${ing.unit}`.toLowerCase();

        if (consolidated[key]) {
          consolidated[key].totalQuantity += ing.quantity;
          consolidated[key].totalWeight += ing.weight;

          if (!consolidated[key].recipes.includes(ing.recipe)) {
            consolidated[key].recipes.push(ing.recipe);
          }
          consolidated[key].usedInRecipes = consolidated[key].recipes.length;
          // Manter categorias de receita para referência
          if (ing.recipeCategory && !consolidated[key].recipeCategories?.includes(ing.recipeCategory)) {
            if (!consolidated[key].recipeCategories) consolidated[key].recipeCategories = [];
            consolidated[key].recipeCategories.push(ing.recipeCategory);
          }
        } else {
          consolidated[key] = {
            name: ing.name,
            unit: ing.unit,
            totalQuantity: ing.quantity, // Usar totalQuantity para consistência
            totalWeight: ing.weight,    // Usar totalWeight
            recipes: [ing.recipe],
            recipeCategories: [ing.recipeCategory || 'Outros'],
            usedInRecipes: 1,
            // Manter propriedades originais
            quantity: ing.quantity,
            weight: ing.weight
          };
        }
      });

      return Object.values(consolidated).sort((a, b) => a.name.localeCompare(b.name));
    };

    // 4. Consolidar e limpar
    const categoriasFinais = {};

    // Ordem preferencial de exibição (opcional, pode vir de config depois)
    const ordemPreferencial = ['hortifruti', 'carnes', 'bovinos', 'aves', 'suínos', 'pescados', 'laticínios', 'frios', 'conguelados', 'mercearia', 'despensa', 'temperos', 'embalagens', 'limpeza', 'outros'];

    // Ordenar chaves
    const chavesOrdenadas = Object.keys(categorias).sort((a, b) => {
      const idxA = ordemPreferencial.indexOf(a);
      const idxB = ordemPreferencial.indexOf(b);

      // Se ambos estiverem na lista, ordena pela lista
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      // Se apenas A estiver na lista, vem primeiro
      if (idxA !== -1) return -1;
      // Se apenas B estiver na lista, vem primeiro
      if (idxB !== -1) return 1;
      // Se nenhum, ordem alfabética
      return categorias[a].name.localeCompare(categorias[b].name);
    });

    chavesOrdenadas.forEach(catId => {
      const dados = categorias[catId];
      if (dados.ingredientes.length > 0) {
        categoriasFinais[catId] = {
          name: dados.name,
          ingredientes: consolidarDentroDeCategoria(dados.ingredientes)
        };
      }
    });

    return categoriasFinais;
  }, [ingredientesSemConsolidacao]);

  // Agrupar ingredientes por Fornecedor Nativamente
  const ingredientesPorFornecedor = useMemo(() => {
    const fornecedores = {};

    ingredientesConsolidados.forEach(ing => {
      // Normalizing supplier name handling empty cases as "S/ Fornecedor Definido"
      const supplierName = ing.main_supplier && ing.main_supplier !== 'N/A' ? ing.main_supplier : 'S/ Fornecedor Definido';

      if (!fornecedores[supplierName]) {
        fornecedores[supplierName] = {
          name: supplierName,
          ingredientes: []
        };
      }
      fornecedores[supplierName].ingredientes.push(ing);
    });

    const chavesOrdenadas = Object.keys(fornecedores).sort((a, b) => {
      // Deixar indefinidos por ultimo
      if (a === 'S/ Fornecedor Definido') return 1;
      if (b === 'S/ Fornecedor Definido') return -1;
      return a.localeCompare(b);
    });

    const finalSuppliers = {};
    chavesOrdenadas.forEach(key => {
      fornecedores[key].ingredientes.sort((a, b) => a.name.localeCompare(b.name));
      finalSuppliers[key] = fornecedores[key];
    });

    return finalSuppliers;
  }, [ingredientesConsolidados]);

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    const totalIngredientes = ingredientesConsolidados.length;
    const totalCategorias = Object.keys(ingredientesPorCategoria).length;
    const pesoTotal = ingredientesConsolidados.reduce((total, ing) => total + ing.totalWeight, 0);

    return {
      totalIngredientes,
      totalCategorias,
      pesoTotal
    };
  }, [ingredientesConsolidados, ingredientesPorCategoria]);

  if (ingredientesConsolidados.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="font-semibold text-lg text-gray-700 mb-2">
            Nenhum Ingrediente Encontrado
          </h3>
          <p className="text-gray-500 text-sm">
            Não há pedidos ou receitas com ingredientes para a semana selecionada.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sistema de abas para visualizações diferentes */}
      <Card className="border-2 border-teal-400 shadow-xl bg-white print:border-none print:shadow-none">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-cyan-600 border-b-2 border-teal-700 flex flex-col md:flex-row flex-wrap justify-between items-center py-4 print:hidden gap-4">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            LISTA DE INGREDIENTES
          </CardTitle>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            {/* Toggle: Dia Selecionado / Semana Inteira */}
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-lg backdrop-blur-sm border border-white/20">
              <Button
                variant={!showWeekMode ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowWeekMode(false)}
                className={`gap-2 h-9 px-4 transition-colors ${!showWeekMode
                  ? "bg-white text-teal-700 hover:bg-white/90 shadow-sm"
                  : "text-white hover:bg-white/20 hover:text-white"
                  }`}
              >
                <Calendar className="w-4 h-4" />
                Dia Selecionado
              </Button>

              <Button
                variant={showWeekMode ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowWeekMode(true)}
                className={`gap-2 h-9 px-4 transition-colors ${showWeekMode
                  ? "bg-white text-teal-700 hover:bg-white/90 shadow-sm"
                  : "text-white hover:bg-white/20 hover:text-white"
                  }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Semana Inteira
              </Button>
            </div>

            {/* Imprimir */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={printing}
              className="gap-2 h-9 bg-white text-teal-700 hover:bg-teal-50 border-none shadow-sm print:hidden transition-colors"
            >
              {printing ? (
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              ) : (
                <Printer className="w-4 h-4 text-teal-600" />
              )}
              Imprimir
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="por-fornecedor" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Por Fornecedor
              </TabsTrigger>
              <TabsTrigger value="por-categoria" className="flex items-center gap-2">
                <Grid3x3 className="w-4 h-4" />
                Por Categoria
              </TabsTrigger>
              <TabsTrigger value="alfabetica" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Ordem Alfabética
              </TabsTrigger>
            </TabsList>

            {/* Nova Aba 3: Por Fornecedor */}
            <TabsContent value="por-fornecedor">
              <div className="space-y-8">
                {Object.entries(ingredientesPorFornecedor).map(([supId, supData], supIndex) => {
                  const categoryColors = [
                    { bg: 'bg-emerald-50', border: 'border-emerald-300', header: 'bg-emerald-100', text: 'text-emerald-900', hover: 'hover:bg-emerald-100' },
                    { bg: 'bg-sky-50', border: 'border-sky-300', header: 'bg-sky-100', text: 'text-sky-900', hover: 'hover:bg-sky-100' },
                    { bg: 'bg-amber-50', border: 'border-amber-300', header: 'bg-amber-100', text: 'text-amber-900', hover: 'hover:bg-amber-100' },
                    { bg: 'bg-indigo-50', border: 'border-indigo-300', header: 'bg-indigo-100', text: 'text-indigo-900', hover: 'hover:bg-indigo-100' },
                    { bg: 'bg-rose-50', border: 'border-rose-300', header: 'bg-rose-100', text: 'text-rose-900', hover: 'hover:bg-rose-100' },
                  ];
                  const colors = supId === 'S/ Fornecedor Definido'
                    ? { bg: 'bg-slate-50', border: 'border-slate-300', header: 'bg-slate-100', text: 'text-slate-900', hover: 'hover:bg-slate-100' }
                    : categoryColors[supIndex % categoryColors.length];

                  return (
                    <div key={supId} className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-4 shadow-md`}>
                      <div className="mb-4">
                        <h3 className={`text-lg font-bold ${colors.text} mb-3 border-b-2 ${colors.border} pb-2`}>
                          FORNECEDOR: {supData.name.toUpperCase()}
                        </h3>
                      </div>
                      <div className="overflow-x-auto rounded-lg">
                        <table className={`w-full border-2 ${colors.border} bg-white`}>
                          <thead>
                            <tr className={colors.header}>
                              <th className={`border ${colors.border} px-4 py-3 text-left font-bold ${colors.text}`}>INGREDIENTE</th>
                              <th className={`border ${colors.border} px-4 py-3 text-center font-bold ${colors.text}`}>QUANTIDADE TOTAL</th>
                              <th className={`border ${colors.border} px-4 py-3 text-center font-bold ${colors.text}`}>UNIDADE</th>
                              <th className={`border ${colors.border} px-4 py-3 text-center font-bold ${colors.text}`}>PESO TOTAL (kg)</th>
                              <th className={`border ${colors.border} px-4 py-3 text-center font-bold ${colors.text}`}>RECEITAS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {supData.ingredientes.map((ingrediente, index) => (
                              <tr key={`${ingrediente.name}_${index}`} className={`${colors.hover} transition-colors`}>
                                <td className={`border ${colors.border} px-4 py-2 font-semibold text-gray-800`}>{ingrediente.name}</td>
                                <td className={`border ${colors.border} px-4 py-2 text-center font-bold text-gray-900`}>{ingrediente.totalQuantity.toFixed(3)}</td>
                                <td className={`border ${colors.border} px-4 py-2 text-center text-gray-700`}>{ingrediente.unit}</td>
                                <td className={`border ${colors.border} px-4 py-2 text-center font-bold text-gray-900`}>{ingrediente.totalWeight.toFixed(3)}</td>
                                <td className={`border ${colors.border} px-4 py-2 text-center text-sm text-gray-600`}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help underline decoration-dotted">{ingrediente.usedInRecipes} receitas</span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs bg-slate-800 text-white p-3">
                                        <p className="font-semibold mb-2">Receitas que usam {ingrediente.name}:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                          {ingrediente.recipes?.map((recipe, idx) => <li key={idx} className="text-sm">{recipe}</li>)}
                                        </ul>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Aba 1: Por Categoria */}
            <TabsContent value="por-categoria">
              <div className="space-y-8">
                {/* ✅ ATUALIZADO: Categorias na ordem do cardápio */}
                {Object.entries(ingredientesPorCategoria).map(([catId, catData], categoryIndex) => {
                  // Definir cores alternadas para cada categoria
                  const categoryColors = [
                    { bg: 'bg-blue-50', border: 'border-blue-300', header: 'bg-blue-100', text: 'text-blue-900', hover: 'hover:bg-blue-100' },
                    { bg: 'bg-purple-50', border: 'border-purple-300', header: 'bg-purple-100', text: 'text-purple-900', hover: 'hover:bg-purple-100' },
                    { bg: 'bg-orange-50', border: 'border-orange-300', header: 'bg-orange-100', text: 'text-orange-900', hover: 'hover:bg-orange-100' },
                    { bg: 'bg-teal-50', border: 'border-teal-300', header: 'bg-teal-100', text: 'text-teal-900', hover: 'hover:bg-teal-100' },
                    { bg: 'bg-pink-50', border: 'border-pink-300', header: 'bg-pink-100', text: 'text-pink-900', hover: 'hover:bg-pink-100' },
                  ];
                  const colors = categoryColors[categoryIndex % categoryColors.length];

                  return (
                    <div key={catId} className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-4 shadow-md`}>
                      {/* Nome da categoria */}
                      <div className="mb-4">
                        <h3 className={`text-lg font-bold ${colors.text} mb-3 border-b-2 ${colors.border} pb-2`}>
                          {catData.name.toUpperCase()}
                        </h3>
                      </div>

                      {/* Tabela de ingredientes */}
                      <div className="overflow-x-auto rounded-lg">
                        <table className={`w-full border-2 ${colors.border} bg-white`}>
                          <thead>
                            <tr className={colors.header}>
                              <th className={`border ${colors.border} px-4 py-3 text-left font-bold ${colors.text}`}>
                                INGREDIENTE
                              </th>
                              <th className={`border ${colors.border} px-4 py-3 text-center font-bold ${colors.text}`}>
                                QUANTIDADE TOTAL
                              </th>
                              <th className={`border ${colors.border} px-4 py-3 text-center font-bold ${colors.text}`}>
                                UNIDADE
                              </th>
                              <th className={`border ${colors.border} px-4 py-3 text-center font-bold ${colors.text}`}>
                                PESO TOTAL (kg)
                              </th>
                              <th className={`border ${colors.border} px-4 py-3 text-center font-bold ${colors.text}`}>
                                RECEITAS
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {catData.ingredientes.map((ingrediente, index) => (
                              <tr key={`${ingrediente.name}_${index}`} className={`${colors.hover} transition-colors`}>
                                <td className={`border ${colors.border} px-4 py-2 font-semibold text-gray-800`}>
                                  {ingrediente.name}
                                </td>
                                <td className={`border ${colors.border} px-4 py-2 text-center font-bold text-gray-900`}>
                                  {ingrediente.totalQuantity.toFixed(3)}
                                </td>
                                <td className={`border ${colors.border} px-4 py-2 text-center text-gray-700`}>
                                  {ingrediente.unit}
                                </td>
                                <td className={`border ${colors.border} px-4 py-2 text-center font-bold text-gray-900`}>
                                  {ingrediente.totalWeight.toFixed(3)}
                                </td>
                                <td className={`border ${colors.border} px-4 py-2 text-center text-sm text-gray-600`}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help underline decoration-dotted">
                                          {ingrediente.usedInRecipes} receitas
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs bg-slate-800 text-white p-3">
                                        <p className="font-semibold mb-2">Receitas que usam {ingrediente.name}:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                          {ingrediente.recipes?.map((recipe, idx) => (
                                            <li key={idx} className="text-sm">{recipe}</li>
                                          ))}
                                        </ul>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Aba 2: Ordem Alfabética */}
            <TabsContent value="alfabetica">
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-lg">
                  <table className="w-full border-2 border-slate-300 bg-white">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-100 to-gray-100">
                        <th className="border border-slate-300 px-4 py-3 text-left font-bold text-slate-900">
                          INGREDIENTE
                        </th>
                        <th className="border border-slate-300 px-4 py-3 text-center font-bold text-slate-900">
                          QUANTIDADE TOTAL
                        </th>
                        <th className="border border-slate-300 px-4 py-3 text-center font-bold text-slate-900">
                          UNIDADE
                        </th>
                        <th className="border border-slate-300 px-4 py-3 text-center font-bold text-slate-900">
                          PESO TOTAL (kg)
                        </th>
                        <th className="border border-slate-300 px-4 py-3 text-left font-bold text-slate-900">
                          CATEGORIAS QUE USAM
                        </th>
                        <th className="border border-slate-300 px-4 py-3 text-center font-bold text-slate-900">
                          Nº RECEITAS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientesConsolidados.map((ingrediente, index) => (
                        <tr key={`${ingrediente.name}_${index}`} className="hover:bg-slate-50 transition-colors">
                          <td className="border border-slate-300 px-4 py-2 font-semibold text-gray-800">
                            {ingrediente.name}
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-center font-bold text-gray-900">
                            {ingrediente.totalQuantity.toFixed(3)}
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-center text-gray-700">
                            {ingrediente.unit}
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-center font-bold text-gray-900">
                            {ingrediente.totalWeight.toFixed(3)}
                          </td>
                          <td className="border border-slate-300 px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {ingrediente.recipeCategories && ingrediente.recipeCategories.length > 0 ? (
                                ingrediente.recipeCategories.map((category, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200"
                                  >
                                    {category}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-sm italic">Sem categoria</span>
                              )}
                            </div>
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-center text-sm text-gray-600">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help underline decoration-dotted">
                                    {ingrediente.usedInRecipes} receitas
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-slate-800 text-white p-3">
                                  <p className="font-semibold mb-2">Receitas que usam {ingrediente.name}:</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {ingrediente.recipes?.map((recipe, idx) => (
                                      <li key={idx} className="text-sm">{recipe}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default IngredientesConsolidados;