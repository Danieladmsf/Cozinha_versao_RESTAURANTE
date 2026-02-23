'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Save,
  LayoutGrid,
  Layers,
  Users,
  Palette,
  Calendar,
  CheckCircle2
} from "lucide-react";

import { useMenuSettings } from '@/hooks/useMenuSettings';
import Categorias from '@/components/cardapio/configuracoes/Categorias';
import Layout from '@/components/cardapio/configuracoes/Layout';
import Clientes from '@/components/cardapio/configuracoes/Clientes';
import Cores from '@/components/cardapio/configuracoes/Cores';
import DiasDaSemana from '@/components/cardapio/configuracoes/DiasDaSemana';

export default function MenuSettingsComponent() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("categories");

  const {
    // Estados
    categories,
    categoryTree,
    customers,
    loading,
    saving,
    error,
    selectedMainCategories,
    activeCategories,
    expandedCategories,
    categoryColors,
    fixedDropdowns,
    availableDays,
    categoryOrder,
    categoryGroups,
    clientCategorySettings,

    // Setters
    setSelectedMainCategories,
    setActiveCategories,
    setExpandedCategories,
    setCategoryColors,
    setFixedDropdowns,
    setAvailableDays,
    setCategoryOrder,
    setCategoryGroups,
    setClientCategorySettings,

    // Funções
    saveConfig,
    getFilteredCategories,
    toggleCategoryActive,
    toggleExpandedCategory,
    updateCategoryColor,
    updateFixedDropdowns,
    toggleDay
  } = useMenuSettings();

  const handleSave = async () => {
    const success = await saveConfig();

    if (success) {
      toast({
        title: "Configurações salvas!",
        description: "As configurações do cardápio foram salvas com sucesso.",
      });

      router.push('/cardapio');
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="text-slate-600 mt-4 font-medium">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  // Tab configuration with icons
  const tabConfig = [
    { value: "categories", label: "Categorias", icon: LayoutGrid },
    { value: "layout", label: "Layout", icon: Layers },
    { value: "clients", label: "Clientes", icon: Users },
    { value: "colors", label: "Cores", icon: Palette },
    { value: "days", label: "Dias da Semana", icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header Premium */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/cardapio')}
                className="text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Cardápio
              </Button>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Settings className="h-6 w-6 text-emerald-400" />
                  </div>
                  Configurações do Cardápio
                </h1>
                <p className="text-slate-400 mt-1">
                  Configure categorias, layout, cores e dias disponíveis
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200 px-6"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Enhanced Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
            <TabsList className="grid grid-cols-5 gap-2 bg-transparent">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-2 py-3 px-4 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-100 transition-all duration-200"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Tab Contents */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <TabsContent value="categories" className="space-y-8 mt-0">
              <Categorias
                categories={categories}
                categoryTree={categoryTree}
                selectedMainCategories={selectedMainCategories}
                setSelectedMainCategories={setSelectedMainCategories}
              />
            </TabsContent>

            <TabsContent value="layout" className="space-y-8 mt-0">
              <Layout
                categories={categories}
                categoryTree={categoryTree}
                selectedMainCategories={selectedMainCategories}
                activeCategories={activeCategories}
                expandedCategories={expandedCategories}
                categoryColors={categoryColors}
                fixedDropdowns={fixedDropdowns}
                categoryOrder={categoryOrder}
                categoryGroups={categoryGroups}
                getFilteredCategories={getFilteredCategories}
                toggleCategoryActive={toggleCategoryActive}
                toggleExpandedCategory={toggleExpandedCategory}
                updateFixedDropdowns={updateFixedDropdowns}
                setCategoryOrder={setCategoryOrder}
                setCategoryGroups={setCategoryGroups}
              />
            </TabsContent>

            <TabsContent value="clients" className="space-y-8 mt-0">
              <Clientes
                categories={categories}
                customers={customers}
                clientCategorySettings={clientCategorySettings}
                setClientCategorySettings={setClientCategorySettings}
                categoryColors={categoryColors}
                fixedDropdowns={fixedDropdowns}
                getFilteredCategories={getFilteredCategories}
              />
            </TabsContent>

            <TabsContent value="colors" className="space-y-6 mt-0">
              <Cores
                categoryColors={categoryColors}
                updateCategoryColor={updateCategoryColor}
                getFilteredCategories={getFilteredCategories}
              />
            </TabsContent>

            <TabsContent value="days" className="space-y-6 mt-0">
              <DiasDaSemana
                availableDays={availableDays}
                toggleDay={toggleDay}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}