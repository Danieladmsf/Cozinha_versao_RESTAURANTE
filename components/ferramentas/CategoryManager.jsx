'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Trash2,
    GripVertical,
    ChevronUp,
    ChevronDown,
    Loader2,
    Save,
    Wrench,
    Scissors,
    AlertTriangle,
    Package,
    Thermometer,
    Clock,
    Settings,
    Shield,
    Info,
    ShieldCheck,
    FileText,
    Box,
    Truck,
    Utensils,
    Flame,
    Droplet,
    Zap,
    Heart,
    Star
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Mapa de ícones disponíveis
const ICON_MAP = {
    Wrench, Scissors, AlertTriangle, Package, Thermometer, Clock,
    Settings, Shield, Info, ShieldCheck, FileText, Box, Truck,
    Utensils, Flame, Droplet, Zap, Heart, Star
};

// Cores disponíveis para cards
const CORES_DISPONIVEIS = [
    { nome: 'Azul', valor: '#3b82f6' },
    { nome: 'Verde', valor: '#22c55e' },
    { nome: 'Vermelho', valor: '#dc2626' },
    { nome: 'Laranja', valor: '#f97316' },
    { nome: 'Amarelo', valor: '#eab308' },
    { nome: 'Roxo', valor: '#8b5cf6' },
    { nome: 'Rosa', valor: '#ec4899' },
    { nome: 'Cinza', valor: '#6b7280' },
    { nome: 'Ciano', valor: '#06b6d4' },
];

const ICONES_DISPONIVEIS = Object.keys(ICON_MAP);

export default function CategoryManager({ open, onClose, categoria, onSave }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        nome: '',
        prefixo: '', // Novo campo para prefixo (ex: FERR)
        icone: 'Package',
        corPrimaria: '#3b82f6',
        ordem: 99,
        colecao: '',
        cards: []
    });
    const { toast } = useToast();

    useEffect(() => {
        if (categoria) {
            setFormData({
                ...categoria,
                prefixo: categoria.prefixo || categoria.nome.substring(0, 3).toUpperCase(),
                cards: categoria.cards || []
            });
        } else {
            setFormData({
                id: '',
                nome: '',
                prefixo: '',
                icone: 'Package',
                corPrimaria: '#3b82f6',
                ordem: 99,
                colecao: '',
                cards: [
                    { id: 'dados', titulo: 'Dados Técnicos', cor: '#3b82f6', icone: 'Info' },
                    { id: 'epis', titulo: 'EPIs Necessários', cor: '#f97316', icone: 'ShieldCheck' },
                    { id: 'manutencao', titulo: 'Manutenção', cor: '#6b7280', icone: 'Settings' },
                    { id: 'precaucoes', titulo: 'Precauções de Segurança', cor: '#dc2626', icone: 'Shield' }
                ]
            });
        }
    }, [categoria, open]);

    const generateId = (nome) => {
        return nome
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
    };

    const handleNomeChange = (nome) => {
        const prefixoSugestion = nome.substring(0, 3).toUpperCase();
        setFormData(prev => ({
            ...prev,
            nome,
            prefixo: !categoria ? prefixoSugestion : prev.prefixo, // Sugere prefixo apenas ao criar
            id: !categoria ? generateId(nome) : prev.id,
            colecao: !categoria ? generateId(nome) : prev.colecao
        }));
    };

    const addCard = () => {
        const newId = `card_${Date.now()}`;
        setFormData(prev => ({
            ...prev,
            cards: [...prev.cards, { id: newId, titulo: 'Novo Card', cor: '#6b7280', icone: 'FileText' }]
        }));
    };

    const updateCard = (index, field, value) => {
        setFormData(prev => {
            const newCards = [...prev.cards];
            newCards[index] = { ...newCards[index], [field]: value };
            return { ...prev, cards: newCards };
        });
    };

    const removeCard = (index) => {
        setFormData(prev => ({
            ...prev,
            cards: prev.cards.filter((_, i) => i !== index)
        }));
    };

    const moveCard = (index, direction) => {
        setFormData(prev => {
            const newCards = [...prev.cards];
            const temp = newCards[index];
            newCards[index] = newCards[index + direction];
            newCards[index + direction] = temp;
            return { ...prev, cards: newCards };
        });
    };

    const handleSave = async () => {
        if (!formData.nome.trim()) {
            toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
            return;
        }
        if (!formData.prefixo.trim()) {
            toast({ title: 'Erro', description: 'Prefixo é obrigatório (ex: FERR)', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            const docRef = doc(db, 'pop_categorias', formData.id);
            await setDoc(docRef, {
                ...formData,
                updatedAt: serverTimestamp(),
                ...(categoria ? {} : { createdAt: serverTimestamp() })
            });

            toast({ title: 'Sucesso', description: `Categoria "${formData.nome}" salva!` });
            onSave?.();
            onClose();
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
            toast({ title: 'Erro', description: 'Não foi possível salvar', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!categoria || !confirm(`Excluir categoria "${formData.nome}"? Isso NÃO exclui os POPs.`)) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, 'pop_categorias', formData.id));
            toast({ title: 'Sucesso', description: 'Categoria excluída!' });
            onSave?.();
            onClose();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            toast({ title: 'Erro', description: 'Não foi possível excluir', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const IconComponent = ICON_MAP[formData.icone] || Package;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconComponent className="w-5 h-5" style={{ color: formData.corPrimaria }} />
                        {categoria ? 'Editar Categoria' : 'Nova Categoria de POP'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Nome e Prefixo */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Nome *</label>
                            <Input
                                value={formData.nome}
                                onChange={(e) => handleNomeChange(e.target.value)}
                                placeholder="Ex: Insumos"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Prefixo *</label>
                            <Input
                                value={formData.prefixo}
                                onChange={(e) => setFormData(p => ({ ...p, prefixo: e.target.value.toUpperCase().slice(0, 4) }))}
                                placeholder="EX: INSU"
                                className="font-mono uppercase"
                                maxLength={4}
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Usado para gerar código (ex: INSU001)</p>
                        </div>
                    </div>

                    {/* Ícone e cor */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Ícone</label>
                            <Select value={formData.icone} onValueChange={(v) => setFormData(p => ({ ...p, icone: v }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ICONES_DISPONIVEIS.map(icon => {
                                        const Icon = ICON_MAP[icon];
                                        return (
                                            <SelectItem key={icon} value={icon}>
                                                <div className="flex items-center gap-2">
                                                    <Icon className="w-4 h-4" />
                                                    {icon}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Cor Principal</label>
                            <Select value={formData.corPrimaria} onValueChange={(v) => setFormData(p => ({ ...p, corPrimaria: v }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CORES_DISPONIVEIS.map(c => (
                                        <SelectItem key={c.valor} value={c.valor}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.valor }} />
                                                {c.nome}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Cards */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-gray-700">Cards do POP</label>
                            <Button variant="outline" size="sm" onClick={addCard} className="gap-1">
                                <Plus className="w-4 h-4" />
                                Adicionar Card
                            </Button>
                        </div>

                        <div className="space-y-2 bg-gray-50 rounded-lg p-3 border">
                            {formData.cards.length === 0 ? (
                                <p className="text-center text-gray-400 py-4">Nenhum card. Clique em "Adicionar Card".</p>
                            ) : (
                                formData.cards.map((card, idx) => {
                                    const CardIcon = ICON_MAP[card.icone] || FileText;
                                    return (
                                        <div key={card.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                                            {/* Mover */}
                                            <div className="flex flex-col">
                                                <button
                                                    onClick={() => moveCard(idx, -1)}
                                                    disabled={idx === 0}
                                                    className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-20"
                                                >
                                                    <ChevronUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => moveCard(idx, 1)}
                                                    disabled={idx === formData.cards.length - 1}
                                                    className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-20"
                                                >
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                            </div>

                                            {/* Preview do ícone */}
                                            <CardIcon className="w-4 h-4" style={{ color: card.cor }} />

                                            {/* Título */}
                                            <Input
                                                value={card.titulo}
                                                onChange={(e) => updateCard(idx, 'titulo', e.target.value)}
                                                className="flex-1 h-8 text-sm"
                                                placeholder="Título do card"
                                            />

                                            {/* Cor */}
                                            <Select value={card.cor} onValueChange={(v) => updateCard(idx, 'cor', v)}>
                                                <SelectTrigger className="w-28 h-8">
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.cor }} />
                                                        <span className="text-xs">{CORES_DISPONIVEIS.find(c => c.valor === card.cor)?.nome || 'Cor'}</span>
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {CORES_DISPONIVEIS.map(c => (
                                                        <SelectItem key={c.valor} value={c.valor}>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.valor }} />
                                                                {c.nome}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            {/* Ícone */}
                                            <Select value={card.icone} onValueChange={(v) => updateCard(idx, 'icone', v)}>
                                                <SelectTrigger className="w-24 h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ICONES_DISPONIVEIS.map(icon => {
                                                        const Icon = ICON_MAP[icon];
                                                        return (
                                                            <SelectItem key={icon} value={icon}>
                                                                <Icon className="w-4 h-4" />
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>

                                            {/* Remover */}
                                            <button
                                                onClick={() => removeCard(idx)}
                                                disabled={formData.cards.length <= 1}
                                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between">
                    <div>
                        {categoria && (
                            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                                Excluir Categoria
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={loading} className="gap-1">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar Categoria
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
