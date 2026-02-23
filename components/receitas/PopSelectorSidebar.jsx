'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    Wrench, Scissors, AlertTriangle, Package, Thermometer, Clock,
    Settings, Shield, Info, ShieldCheck, FileText, Box, Truck,
    Utensils, Flame, Droplet, Zap, Heart, Star, ChevronRight, ChevronDown, Search, Users
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const ICON_MAP = {
    Wrench, Scissors, AlertTriangle, Package, Thermometer, Clock,
    Settings, Shield, Info, ShieldCheck, FileText, Box, Truck,
    Utensils, Flame, Droplet, Zap, Heart, Star, Users
};

export default function PopSelectorSidebar({ isOpen, onClose }) {
    const [categories, setCategories] = useState([]);
    const [pops, setPops] = useState({});
    const [loading, setLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // 1. Carregar Categorias
            const catsRef = collection(db, 'pop_categorias');
            const catsSnapshot = await getDocs(query(catsRef, orderBy('ordem')));
            const loadedCats = catsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 2. Carregar Funcionários (Mão de Obra)
            const employeesRef = collection(db, 'Employee');
            const employeesSnapshot = await getDocs(employeesRef);
            const employees = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Criar categoria artificial para Mão de Obra se houver funcionários
            const laborCategory = {
                id: 'labor_category',
                nome: 'Mão de Obra',
                icone: 'Users',
                corPrimaria: '#2563eb', // Blue
                tipoCalculo: 'labor',
                ordem: 999
            };

            // Adicionar categoria de Mão de Obra ao final
            const finalCategories = [...loadedCats, laborCategory];
            setCategories(finalCategories);

            // 3. Carregar POPs e Mapear Funcionários
            const popsData = {};
            const initialExpanded = {};

            // Processar POPs normais
            await Promise.all(loadedCats.map(async (cat) => {
                const collectionName = cat.colecao || 'ferramentas'; // fallback
                const popsRef = collection(db, collectionName);
                const popsSnap = await getDocs(popsRef);

                const catPops = popsSnap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(pop => pop.nome); // Garantir que tem nome

                if (catPops.length > 0) {
                    popsData[cat.id] = catPops;
                    // initialExpanded[cat.id] = false; // Manter recolhido por padrão
                }
            }));

            // Processar Funcionários como POPs
            if (employees.length > 0) {
                popsData['labor_category'] = employees.map(emp => ({
                    id: emp.id,
                    nome: emp.name,
                    codigo: emp.role, // Usar cargo como código visual
                    imageUrl: emp.photoUrl || null, // Se tiver foto
                    custoOperacional: (emp.salary || 0) / 220, // Custo/Hora estimado
                    salary: emp.salary,
                    role: emp.role,
                    sector: emp.sector,
                    color: '#2563eb' // Azul para mão de obra
                }));
                // initialExpanded['labor_category'] = false; // Manter recolhido
            }

            setPops(popsData);
            setExpandedCategories(initialExpanded);
        } catch (error) {
            console.error("Erro ao carregar POPs:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (catId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [catId]: !prev[catId]
        }));
    };

    const handleDragStart = (e, pop, category) => {
        // Priorizar cor do POP individual, senão usar da categoria
        const popColor = pop.color || category.corPrimaria || '#3b82f6';

        // Dados transferidos no drop
        const dragData = {
            id: pop.id,
            name: pop.nome,
            code: pop.codigo,
            type: category.tipoCalculo === 'equipment' ? 'equipment' : (category.tipoCalculo === 'labor' ? 'labor' : 'standard'),
            cost: pop.custoOperacional || 0,
            power: pop.potencia || 0,
            imageUrl: pop.imageUrl,
            categoryName: category.nome,
            color: popColor,
            // Dados Extras para Mão de Obra
            salary: pop.salary,
            role: pop.role,
            sector: pop.sector
        };

        console.log('🎨 [PopSelectorSidebar] Drag started:', dragData);

        e.dataTransfer.setData('application/react-pop-data', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const filteredCategories = categories.filter(cat => {
        const catPops = pops[cat.id] || [];
        const hasMatchingPops = catPops.some(p =>
            p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.codigo && p.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        return hasMatchingPops;
    });

    if (!isOpen) return null;

    return (
        <div className="w-80 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col sticky top-4 z-10 shadow-lg h-[calc(100vh-2rem)] rounded-lg mr-4">
            <div className="p-4 border-b border-gray-200 bg-white">
                <h3 className="font-bold text-gray-800 mb-2">Custos Operacionais</h3>
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar POP..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-sm bg-gray-50"
                    />
                </div>
                <p className="text-[10px] text-gray-500 mt-2">
                    Arraste os itens abaixo para dentro do texto da receita.
                </p>
            </div>

            <ScrollArea className="flex-1 p-2">
                {loading ? (
                    <div className="text-center py-8 text-sm text-gray-400">Carregando POPs...</div>
                ) : (
                    <div className="space-y-4">
                        {filteredCategories.map(cat => {
                            const catPops = (pops[cat.id] || []).filter(p =>
                                p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (p.codigo && p.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
                            );

                            if (catPops.length === 0) return null;

                            const Icon = ICON_MAP[cat.icone] || Package;
                            const isExpanded = expandedCategories[cat.id];

                            return (
                                <div key={cat.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                    <button
                                        onClick={() => toggleCategory(cat.id)}
                                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 transition-colors text-left"
                                        style={{ borderLeft: `3px solid ${cat.corPrimaria}` }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon className="w-4 h-4 text-gray-500" />
                                            <span className="font-semibold text-sm text-gray-700">{cat.nome}</span>
                                        </div>
                                        {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                                    </button>

                                    {isExpanded && (
                                        <div className="p-2 space-y-1 bg-gray-50/50">
                                            {catPops.map(pop => (
                                                <div
                                                    key={pop.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, pop, cat)}
                                                    className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:border-gray-400 hover:shadow-sm cursor-grab active:cursor-grabbing group transition-all"
                                                >
                                                    {pop.imageUrl ? (
                                                        <img src={pop.imageUrl} className="w-8 h-8 rounded object-cover bg-gray-100" />
                                                    ) : (
                                                        <div className={`w-8 h-8 rounded ${cat.tipoCalculo === 'labor' ? 'bg-blue-100' : 'bg-gray-100'} flex items-center justify-center`}>
                                                            {cat.tipoCalculo === 'labor' ? <Users className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-gray-400" />}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-gray-700 truncate block">{pop.nome}</span>
                                                            {(cat.tipoCalculo === 'equipment' || cat.tipoCalculo === 'labor') && pop.custoOperacional && (
                                                                <span className="text-[10px] text-green-600 font-mono bg-green-50 px-1 rounded">
                                                                    R${Number(pop.custoOperacional).toFixed(2)}/h
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-gray-500 font-mono">{pop.codigo}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
