'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Save, ChevronRight } from 'lucide-react';
import { SECTORS } from '@/hooks/workflow/useWorkflow';
import { MenuConfig, CategoryType } from '@/app/api/entities';
import { useToast } from '@/components/ui/use-toast';
import { APP_CONSTANTS } from '@/lib/constants';

// Ícones para cada setor
const SECTOR_ICONS = {
    'ROTISSERIA': '🍖',
    'PADARIA': '🥐',
    'PICADINHO': '🥗',
    'LIMPEZA': '🧹',
    'GERENTE': '👔',
    'EXPEDICAO': '📦',
    'EXTRAS COZINHA': '🍳'
};

// Setores que fazem sentido ter mapeamento (produção)
const PRODUCTION_SECTORS = ['ROTISSERIA', 'PADARIA', 'PICADINHO', 'EXPEDICAO', 'EXTRAS COZINHA'];

export default function SectorConfigModal({ open, onOpenChange, categories, currentConfig, onSave }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Estado: { 'ROTISSERIA': ['catId1', 'catId2'], ... }
    const [mapping, setMapping] = useState({});

    // Estado: qual type está selecionado para cada setor
    const [selectedType, setSelectedType] = useState({});

    // CategoryTypes carregados da entidade (dinâmico do banco)
    const [categoryTypes, setCategoryTypes] = useState([]);

    // Carregar CategoryTypes do Firestore ao abrir
    useEffect(() => {
        if (open) {
            loadCategoryTypes();
            setMapping(currentConfig?.workflow_sector_map || {});
        }
    }, [open, currentConfig]);

    const loadCategoryTypes = async () => {
        try {
            let types = await CategoryType.list();
            if (!Array.isArray(types)) types = [];
            // Ordenar por order
            types.sort((a, b) => (a.order || 99) - (b.order || 99));
            setCategoryTypes(types);

            // Auto-detect selected types from existing mapping
            const typeMap = {};
            const existingMap = currentConfig?.workflow_sector_map || {};
            PRODUCTION_SECTORS.forEach(sectorId => {
                const mappedIds = existingMap[sectorId] || [];
                if (mappedIds.length > 0) {
                    const firstCat = categories.find(c => c.id === mappedIds[0]);
                    if (firstCat) typeMap[sectorId] = firstCat.type?.toLowerCase() || types[0]?.value || '';
                }
                if (!typeMap[sectorId] && types.length > 0) {
                    typeMap[sectorId] = types[0]?.value || '';
                }
            });
            setSelectedType(typeMap);
        } catch (error) {
            console.error('Erro ao carregar CategoryTypes:', error);
        }
    };

    // Categorias Level 1 filtradas pelo type selecionado
    const getCategoriesForType = (typeValue) => {
        return categories
            .filter(c => c.level === 1 && c.type?.toLowerCase() === typeValue)
            .map(c => ({ id: c.id, name: c.name, type: c.type?.toLowerCase() || '' }))
            .sort((a, b) => a.name.localeCompare(b.name));
    };

    // Subcategorias Level 2 de uma categoria Level 1
    const getSubcategories = (parentId) => {
        return categories
            .filter(c => c.level === 2 && c.parent_id === parentId)
            .map(c => c.name)
            .sort();
    };

    // Toggle categoria
    const toggleCategory = (sectorId, categoryId) => {
        setMapping(prev => {
            const currentIds = prev[sectorId] || [];
            const exists = currentIds.includes(categoryId);
            const newIds = exists
                ? currentIds.filter(id => id !== categoryId)
                : [...currentIds, categoryId];
            return { ...prev, [sectorId]: newIds };
        });
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const mockUserId = APP_CONSTANTS?.MOCK_USER_ID || 'mock-user-id';

            let configId = currentConfig?.id;
            if (!configId) {
                const existing = await MenuConfig.query([{ field: 'user_id', operator: '==', value: mockUserId }]);
                if (existing && existing.length > 0) configId = existing[0].id;
            }

            const dataToSave = { workflow_sector_map: mapping, user_id: mockUserId };

            if (configId) {
                await MenuConfig.update(configId, dataToSave);
            } else {
                await MenuConfig.create(dataToSave);
            }

            toast({ title: 'Sucesso', description: 'Configurações de setores salvas!' });
            onSave(mapping);
            onOpenChange(false);
        } catch (error) {
            console.error('Erro ao salvar config:', error);
            toast({ title: 'Erro', description: 'Falha ao salvar configurações.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const getCategoryName = (catId) => {
        const cat = categories.find(c => c.id === catId);
        return cat?.name || catId;
    };

    const filteredSectors = SECTORS.filter(s => PRODUCTION_SECTORS.includes(s.id));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configuração de Setores de Produção</DialogTitle>
                    <DialogDescription>
                        Escolha o tipo de categoria e selecione quais categorias alimentam cada setor.
                        Todos os tipos e categorias são carregados automaticamente do sistema.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {filteredSectors.map(sector => {
                        const sectorType = selectedType[sector.id] || categoryTypes[0]?.value || '';
                        const level1Cats = getCategoriesForType(sectorType);
                        const mappedIds = mapping[sector.id] || [];

                        return (
                            <div key={sector.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                {/* Cabeçalho do setor */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">{SECTOR_ICONS[sector.id] || '🍳'}</span>
                                    <h3 className="font-bold text-slate-800" style={{ color: sector.color }}>
                                        {sector.name}
                                    </h3>
                                    {mappedIds.length > 0 && (
                                        <span className="ml-auto text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                            {mappedIds.length} vinculada{mappedIds.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                {/* 1ª CAMADA: Seletor de Tipo (carregado de CategoryType entity) */}
                                <div className="flex gap-1 mb-3 p-1 bg-white rounded-lg border border-slate-200 flex-wrap">
                                    {categoryTypes.map(type => (
                                        <button
                                            key={type.id || type.value}
                                            onClick={() => setSelectedType(prev => ({ ...prev, [sector.id]: type.value }))}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
                                                ${sectorType === type.value
                                                    ? 'bg-slate-800 text-white shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                                }`}
                                        >
                                            {type.label || type.value}
                                        </button>
                                    ))}
                                    {categoryTypes.length === 0 && (
                                        <span className="text-xs text-slate-400 p-1">Carregando tipos...</span>
                                    )}
                                </div>

                                {/* 2ª CAMADA: Categorias Level 1 do tipo selecionado */}
                                <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                                    <span>{categoryTypes.find(t => t.value === sectorType)?.label || sectorType}</span>
                                    <ChevronRight className="w-3 h-3" />
                                    <span>Categorias Disponíveis ({level1Cats.length})</span>
                                </div>

                                <div className="space-y-2">
                                    {level1Cats.length > 0 ? level1Cats.map(cat => {
                                        const isSelected = mappedIds.includes(cat.id);
                                        const children = getSubcategories(cat.id);
                                        return (
                                            <div key={cat.id}>
                                                <button
                                                    onClick={() => toggleCategory(sector.id, cat.id)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2
                                                        ${isSelected
                                                            ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                                        }`}
                                                >
                                                    <span className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center text-[10px]
                                                        ${isSelected ? 'border-white bg-white/20' : 'border-slate-300'}`}>
                                                        {isSelected && '✓'}
                                                    </span>
                                                    {cat.name}
                                                    {children.length > 0 && (
                                                        <span className={`ml-auto text-[10px] ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                                                            {children.length} sub
                                                        </span>
                                                    )}
                                                </button>
                                                {/* Subcategorias informativas */}
                                                {children.length > 0 && (
                                                    <div className="ml-6 mt-1 flex flex-wrap gap-1">
                                                        {children.map(childName => (
                                                            <span key={childName} className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                {childName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }) : (
                                        <p className="text-xs text-slate-400 italic py-2">
                                            Nenhuma categoria do tipo "{categoryTypes.find(t => t.value === sectorType)?.label || sectorType}" encontrada.
                                        </p>
                                    )}
                                </div>

                                {/* Resumo vinculado */}
                                {mappedIds.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-slate-200">
                                        <p className="text-xs text-slate-500 mb-1">Vinculadas:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {mappedIds.map(id => (
                                                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-800 border border-green-200">
                                                    {getCategoryName(id)}
                                                    <button onClick={() => toggleCategory(sector.id, id)} className="text-green-500 hover:text-red-500 ml-0.5">×</button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {mappedIds.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded inline-block">
                                        ⚠️ Nenhuma categoria vinculada
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

                <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t border-slate-100">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading} className="gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Mapeamento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
