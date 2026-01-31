'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Loader2, Plus, Settings2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Mapa de ícones
import {
    Wrench, Scissors, AlertTriangle, Package, Thermometer, Clock,
    Settings, Shield, Info, ShieldCheck, FileText, Box, Truck,
    Utensils, Flame, Droplet, Zap, Heart, Star
} from 'lucide-react';

const ICON_MAP = {
    Wrench, Scissors, AlertTriangle, Package, Thermometer, Clock,
    Settings, Shield, Info, ShieldCheck, FileText, Box, Truck,
    Utensils, Flame, Droplet, Zap, Heart, Star
};

// Componente carregado dinamicamente (usa o layout profissional para TODAS as categorias)
const FerramentasComponent = dynamic(
    () => import('./FerramentasComponent'),
    { loading: () => <LoadingSpinner />, ssr: false }
);

const CategoryManager = dynamic(
    () => import('./CategoryManager'),
    { ssr: false }
);

const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
);

export default function POPsComponent() {
    const [activeTab, setActiveTab] = useState('ferramentas');
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
    const [editingCategoria, setEditingCategoria] = useState(null);

    // Carregar categorias do Firebase
    const loadCategorias = async () => {
        try {
            const categoriasRef = collection(db, 'pop_categorias');
            const q = query(categoriasRef, orderBy('ordem'));
            const snapshot = await getDocs(q);
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCategorias(loaded);

            if (loaded.length > 0 && !loaded.find(c => c.id === activeTab)) {
                setActiveTab(loaded[0].id);
            }
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategorias();
    }, []);

    const categoriaAtiva = categorias.find(c => c.id === activeTab);

    // Handlers
    const handleEditCategory = (categoria) => {
        setEditingCategoria(categoria);
        setCategoryManagerOpen(true);
    };

    const handleNewCategory = () => {
        setEditingCategoria(null);
        setCategoryManagerOpen(true);
    };

    const handleCategorySaved = () => {
        loadCategorias();
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-6">
            <div className="max-w-[1400px] mx-auto">

                {/* HEADER */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">
                        POP's - Procedimentos Operacionais
                    </h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNewCategory}
                        className="gap-1 bg-white hover:bg-gray-50"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Categoria
                    </Button>
                </div>

                {/* TABS DINÂMICAS */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {categorias.map((categoria) => {
                        const Icon = ICON_MAP[categoria.icone] || Package;
                        const isActive = activeTab === categoria.id;

                        return (
                            <div key={categoria.id} className="relative group">
                                <button
                                    onClick={() => setActiveTab(categoria.id)}
                                    className={`flex items-center gap-2 px-5 py-3 font-medium rounded-lg transition-all shadow-sm ${isActive
                                        ? 'text-white shadow-md transform scale-[1.02]'
                                        : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-600'
                                        }`}
                                    style={isActive ? { backgroundColor: categoria.corPrimaria } : { color: categoria.corPrimaria }}
                                >
                                    <Icon className="w-4 h-4" />
                                    {categoria.nome}
                                </button>

                                {/* Botão de configuração (aparece no hover) */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEditCategory(categoria); }}
                                    className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-white border shadow-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 z-10"
                                    title="Configurar categoria"
                                >
                                    <Settings2 className="w-3.5 h-3.5 text-gray-500" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* CONTEÚDO - Usa FerramentasComponent para TODAS as categorias */}
                <Suspense fallback={<LoadingSpinner />}>
                    {categoriaAtiva ? (
                        <FerramentasComponent
                            key={categoriaAtiva.id}
                            categoria={categoriaAtiva}
                        />
                    ) : (
                        <div className="text-center py-20 text-gray-500">
                            Nenhuma categoria selecionada. Crie uma nova categoria para começar.
                        </div>
                    )}
                </Suspense>

            </div>

            {/* Modal de Gerenciamento */}
            <CategoryManager
                open={categoryManagerOpen}
                onClose={() => setCategoryManagerOpen(false)}
                categoria={editingCategoria}
                onSave={handleCategorySaved}
            />
        </div>
    );
}
