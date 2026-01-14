'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  TrendingUp,
  Upload,
  BarChart3,
  Store,
  DollarSign,
  Check,
  X,
  RefreshCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import BrandsManager from "@/components/ingredientes/BrandsManager";
import ImportManager from "@/components/ingredientes/ImportManager";
import AnalysisManager from "@/components/ingredientes/AnalysisManager";
import IngredientsTable from "@/components/ingredientes/IngredientsTable";

// 🎯 USAR HOOKS CUSTOMIZADOS
import { useIngredients } from "@/hooks/ingredientes/useIngredients";
import { useIngredientFilters } from "@/hooks/ingredientes/useIngredientFilters";
import { usePriceEditor } from "@/hooks/ingredientes/usePriceEditor";
import { logger } from "@/lib/logger";

export default function Ingredients() {
  const router = useRouter();

  // 🎯 Hook para gerenciar ingredientes
  const {
    ingredients,
    loading,
    error,
    stats,
    loadIngredients,
    handleDelete,
  } = useIngredients();

  // 🎯 Hook para gerenciar filtros
  const {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    supplierFilter,
    setSupplierFilter,
    filteredIngredients,
    uniqueCategories,
    uniqueSuppliers
  } = useIngredientFilters(ingredients);

  // 🎯 Hook para gerenciar edição de preços
  const {
    editingPrice,
    tempPrice,
    setTempPrice,
    handlePriceEdit,
    handlePriceSave,
    handlePriceCancel
  } = usePriceEditor();

  // Wrapper para handlePriceSave com callback de atualização
  const onPriceSave = (ingredient) => {
    handlePriceSave(ingredient, (ingredientId, newPrice, lastUpdate) => {
      // Callback para atualizar o ingrediente localmente após salvar
      loadIngredients();
    });
  };

  // Função para atualizar ingrediente (para o IngredientsTable)
  const updateIngredient = async (ingredientData) => {
    try {
      await onPriceSave(ingredientData);
      toast({
        title: "Sucesso",
        description: "Ingrediente atualizado com sucesso!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao atualizar ingrediente.",
      });
    }
  };

  const [activeTab, setActiveTab] = useState("ingredients");

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-lg font-medium">Carregando ingredientes...</div>
        <div className="text-sm text-gray-600">Aguarde enquanto carregamos a lista de ingredientes.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
          <div className="text-gray-800 font-medium">Erro ao carregar ingredientes</div>
          <div className="text-gray-700 text-sm mt-1">{error}</div>
          <button
            onClick={loadIngredients}
            className="mt-3 px-4 py-2 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
            Ingredientes
          </h1>
          <p className="text-gray-600 text-sm md:text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-500" />
            Gerencie seus ingredientes e preços
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              toast({
                title: "Recarregando...",
                description: "Limpando cache e buscando dados atualizados do servidor.",
              });
              loadIngredients();
            }}
            className="shadow-sm hover:shadow-md transition-all duration-300 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button
            onClick={() => router.push('/ingredientes/editor')}
            className="shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Ingrediente
          </Button>
        </div>
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white p-2 rounded-xl shadow-md border border-gray-100 gap-2">
          <TabsTrigger
            value="ingredients"
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 rounded-lg font-medium"
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Ingredientes</span>
          </TabsTrigger>
          <TabsTrigger
            value="brands"
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 rounded-lg font-medium"
          >
            <Store className="w-4 h-4" />
            <span className="hidden sm:inline">Marcas</span>
          </TabsTrigger>
          <TabsTrigger
            value="analysis"
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 rounded-lg font-medium"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Análise Detalhada</span>
          </TabsTrigger>
          <TabsTrigger
            value="import"
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 rounded-lg font-medium"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importação</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients" className="space-y-6 pt-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-white to-orange-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                <CardTitle className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</CardTitle>
                <div className="p-2 rounded-lg bg-orange-100">
                  <Package className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <p className="text-[10px] text-gray-500 mt-1">Ingredientes cadastrados</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-white to-green-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                <CardTitle className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ativos</CardTitle>
                <div className="p-2 rounded-lg bg-green-100">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
                <p className="text-[10px] text-gray-500 mt-1">Em uso nas receitas</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                <CardTitle className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Para Receitas</CardTitle>
                <div className="p-2 rounded-lg bg-blue-100">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-gray-900">{stats.traditional}</div>
                <p className="text-[10px] text-gray-500 mt-1">Ingredientes tradicionais</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-white to-purple-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                <CardTitle className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Comerciais</CardTitle>
                <div className="p-2 rounded-lg bg-purple-100">
                  <Store className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-gray-900">{stats.commercial}</div>
                <p className="text-[10px] text-gray-500 mt-1">Produtos prontos</p>
              </CardContent>
            </Card>
          </div>

          {/* Busca e Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
                <Input
                  placeholder="Buscar ingredientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 border-gray-200 focus:border-orange-400 focus:ring-orange-400 rounded-lg text-sm shadow-sm"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48 h-10 border-gray-200 rounded-lg shadow-sm hover:border-orange-300 transition-colors text-sm">
                  <SelectValue placeholder="Todas categorias" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="all" className="font-medium">Todas categorias</SelectItem>
                  {uniqueCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-full sm:w-48 h-10 border-gray-200 rounded-lg shadow-sm hover:border-orange-300 transition-colors text-sm">
                  <SelectValue placeholder="Todos fornecedores" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="all" className="font-medium">Todos fornecedores</SelectItem>
                  {uniqueSuppliers.map(supplier => (
                    <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tabela de Ingredientes com Filtros */}
          <IngredientsTable
            ingredients={filteredIngredients}
            onDelete={handleDelete}
            updateIngredient={updateIngredient}
          />
        </TabsContent>

        <TabsContent value="brands" className="space-y-6">
          <BrandsManager />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <AnalysisManager />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <ImportManager onImportComplete={loadIngredients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
