'use client';

import React, { useState, Suspense } from 'react';
import { Wrench, Scissors, AlertTriangle, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import POPItemComponent from './POPItemComponent';

// Carregamento dinâmico para evitar problemas de SSR
const FerramentasComponent = dynamic(
    () => import('./FerramentasComponent'),
    {
        loading: () => (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        ),
        ssr: false
    }
);

export default function POPsComponent() {
    const [activeTab, setActiveTab] = useState('ferramentas');

    // Se for a tab ferramentas, renderiza o componente original diretamente
    if (activeTab === 'ferramentas') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-gray-100 p-4 md:p-6">
                <div className="max-w-[1400px] mx-auto">
                    {/* HEADER */}
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">
                        POP's - Procedimentos Operacionais
                    </h1>

                    {/* TABS */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('ferramentas')}
                            className="flex items-center gap-2 px-5 py-3 font-medium rounded-lg transition-all bg-orange-500 text-white shadow-lg"
                        >
                            <Wrench className="w-4 h-4" />
                            Ferramentas
                        </button>
                        <button
                            onClick={() => setActiveTab('cortes')}
                            className="flex items-center gap-2 px-5 py-3 font-medium rounded-lg transition-all bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-200"
                        >
                            <Scissors className="w-4 h-4" />
                            Cortes
                        </button>
                        <button
                            onClick={() => setActiveTab('avisos')}
                            className="flex items-center gap-2 px-5 py-3 font-medium rounded-lg transition-all bg-white text-red-600 hover:bg-red-50 border border-red-200"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Avisos Sanitários
                        </button>
                    </div>

                    {/* CONTEUDO FERRAMENTAS */}
                    <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>}>
                        <FerramentasComponent />
                    </Suspense>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-gray-100 p-4 md:p-6">
            <div className="max-w-[1400px] mx-auto">
                {/* HEADER */}
                <h1 className="text-2xl font-bold text-gray-800 mb-4">
                    POP's - Procedimentos Operacionais
                </h1>

                {/* TABS */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('ferramentas')}
                        className="flex items-center gap-2 px-5 py-3 font-medium rounded-lg transition-all bg-white text-orange-600 hover:bg-orange-50 border border-orange-200"
                    >
                        <Wrench className="w-4 h-4" />
                        Ferramentas
                    </button>
                    <button
                        onClick={() => setActiveTab('cortes')}
                        className={`flex items-center gap-2 px-5 py-3 font-medium rounded-lg transition-all ${activeTab === 'cortes'
                                ? 'bg-emerald-500 text-white shadow-lg'
                                : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-200'
                            }`}
                    >
                        <Scissors className="w-4 h-4" />
                        Cortes
                    </button>
                    <button
                        onClick={() => setActiveTab('avisos')}
                        className={`flex items-center gap-2 px-5 py-3 font-medium rounded-lg transition-all ${activeTab === 'avisos'
                                ? 'bg-red-500 text-white shadow-lg'
                                : 'bg-white text-red-600 hover:bg-red-50 border border-red-200'
                            }`}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Avisos Sanitários
                    </button>
                </div>

                {/* TAB CONTENT */}
                {activeTab === 'cortes' && (
                    <POPItemComponent
                        collectionName="cortes"
                        itemLabel="Corte"
                        itemLabelPlural="Cortes"
                        colorScheme="emerald"
                        Icon={Scissors}
                    />
                )}

                {activeTab === 'avisos' && (
                    <POPItemComponent
                        collectionName="avisos_sanitarios"
                        itemLabel="Aviso"
                        itemLabelPlural="Avisos Sanitários"
                        colorScheme="red"
                        Icon={AlertTriangle}
                    />
                )}
            </div>
        </div>
    );
}
