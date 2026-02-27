'use client';

import React, { useState, Suspense } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw, ClipboardList, ShoppingCart, ChefHat } from "lucide-react";
import ProgramacaoCozinhaTabs from '@/components/programacao/ProgramacaoCozinhaTabs';
import ListaCompras from './lista-compras';
import EscalaCozinhaTab from '@/components/programacao/tabs/EscalaCozinhaTab';

export default function ProgramacaoPage() {
  const [activeTab, setActiveTab] = useState("programacao-cozinha");

  return (
    <div className="min-h-screen print:min-h-0 print:bg-white bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 print:p-0 print:m-0">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-blue-600" />
              Programação de Produção.
            </h1>
            <p className="text-gray-600 mt-1">Gerencie a programação e produção da cozinha</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="print:block print:w-full">
          <TabsList className="grid w-full grid-cols-3 print:hidden">
            <TabsTrigger value="programacao-cozinha">
              Programação Cozinha
            </TabsTrigger>
            <TabsTrigger value="escala-cozinha" className="gap-2">
              <ChefHat className="w-4 h-4" />
              Escala Cozinha
            </TabsTrigger>
            <TabsTrigger value="lista-compras">
              Lista de Compras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="programacao-cozinha" className="mt-6">
            <Suspense fallback={<div className="flex items-center justify-center p-8">Carregando...</div>}>
              <ProgramacaoCozinhaTabs />
            </Suspense>
          </TabsContent>

          <TabsContent value="escala-cozinha" className="mt-6">
            <Suspense fallback={<div className="flex items-center justify-center p-8">Carregando...</div>}>
              {activeTab === 'escala-cozinha' && <EscalaCozinhaTab />}
            </Suspense>
          </TabsContent>

          <TabsContent value="lista-compras" className="mt-6">
            <Suspense fallback={<div className="flex items-center justify-center p-8">Carregando...</div>}>
              <ListaCompras />
            </Suspense>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}