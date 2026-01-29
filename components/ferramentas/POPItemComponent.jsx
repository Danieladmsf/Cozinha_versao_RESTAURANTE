'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Camera,
    ListOrdered,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Edit2,
    Save as SaveIcon,
    Trash2,
    Plus,
    Search,
    ChevronLeft,
    Package,
    Thermometer,
    Clock,
    Settings,
    Shield,
    Code,
    FileText,
    GripVertical,
    ChevronUp,
    ChevronDown,
    Printer,
    FilePlus,
    Upload,
    Info,
    ShieldCheck,
    Wrench
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Estrutura inicial vazia para um item POP
const getEmptyItem = () => ({
    codigo: '',
    nome: '',
    descricao: '',
    imageUrl: '',
    passos: [], // Array de { description, imageUrl }
    precaucoes: '',
    especificacoes: '',
    materiais: '', // EPIs
    manutencao: ''
});

/**
 * Componente genérico para gerenciar itens POP (Cortes, Avisos, etc.)
 */
export default function POPItemComponent({
    collectionName,
    itemLabel,
    itemLabelPlural,
    colorScheme = 'emerald',
    Icon
}) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [currentItemId, setCurrentItemId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [uploadingMain, setUploadingMain] = useState(false);
    const [uploadingStep, setUploadingStep] = useState(null);
    const { toast } = useToast();

    const mainImageInputRef = useRef(null);
    const searchInputRef = useRef(null);
    const stepImageInputRefs = useRef({});

    const [localData, setLocalData] = useState(getEmptyItem());

    // Cores baseadas no colorScheme
    const colors = {
        emerald: {
            primary: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            button: 'bg-emerald-600 hover:bg-emerald-700',
            badge: 'bg-emerald-100 text-emerald-700',
            icon: 'text-emerald-500',
            sectionTitle: 'text-emerald-800'
        },
        red: {
            primary: 'text-red-600',
            bg: 'bg-red-50',
            border: 'border-red-200',
            button: 'bg-red-600 hover:bg-red-700',
            badge: 'bg-red-100 text-red-700',
            icon: 'text-red-500',
            sectionTitle: 'text-red-800'
        }
    };

    const colorConfig = colors[colorScheme] || colors.emerald;

    // Carregar itens do Firebase
    const loadItems = async () => {
        setLoading(true);
        try {
            const itemsRef = collection(db, collectionName);
            const q = query(itemsRef, orderBy('nome'));
            const snapshot = await getDocs(q);
            const loadedItems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setItems(loadedItems);
        } catch (error) {
            console.error(`Erro ao carregar ${itemLabelPlural}:`, error);
            toast({
                title: "Erro",
                description: `Não foi possível carregar ${itemLabelPlural.toLowerCase()}.`,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    // Handlers
    const handleSelect = (item) => {
        setLocalData({
            ...getEmptyItem(), // Garante que todos os campos existam
            ...item
        });
        setCurrentItemId(item.id);
        setIsEditing(false);
        setIsDirty(false);
        setSearchTerm('');
        setSearchOpen(false);
    };

    const handleNew = () => {
        setLocalData(getEmptyItem());
        setCurrentItemId(null);
        setIsEditing(true);
        setIsDirty(false);
    };

    const handleSave = async () => {
        if (!localData.nome) {
            toast({
                title: "Campo obrigatório",
                description: "O nome é obrigatório.",
                variant: "destructive"
            });
            return;
        }

        setSaving(true);
        try {
            const itemsRef = collection(db, collectionName);
            const dataToSave = {
                ...localData,
                updatedAt: serverTimestamp()
            };

            if (currentItemId) {
                await updateDoc(doc(db, collectionName, currentItemId), dataToSave);
                toast({ title: "Sucesso", description: `${itemLabel} atualizado!` });
            } else {
                dataToSave.createdAt = serverTimestamp();
                const docRef = await addDoc(itemsRef, dataToSave);
                setCurrentItemId(docRef.id);
                toast({ title: "Sucesso", description: `${itemLabel} criado!` });
            }

            setIsEditing(false);
            setIsDirty(false);
            await loadItems();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            toast({
                title: "Erro",
                description: "Não foi possível salvar.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!currentItemId) return;

        try {
            await deleteDoc(doc(db, collectionName, currentItemId));
            toast({ title: "Sucesso", description: `${itemLabel} excluído!` });
            handleNew();
            await loadItems();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            toast({
                title: "Erro",
                description: "Não foi possível excluir.",
                variant: "destructive"
            });
        }
        setIsDeleteDialogOpen(false);
    };

    const handlePrint = () => {
        window.print();
    };

    // Upload de imagem principal
    const handleMainImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingMain(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Falha no upload');

            const { url } = await response.json();
            setLocalData(prev => ({ ...prev, imageUrl: url }));
            setIsDirty(true);
            toast({ title: "Sucesso", description: "Imagem enviada!" });
        } catch (error) {
            console.error('Erro no upload:', error);
            toast({
                title: "Erro",
                description: "Falha ao enviar imagem.",
                variant: "destructive"
            });
        } finally {
            setUploadingMain(false);
        }
    };

    // === GERENCIAMENTO DE PASSOS ===
    const addStep = () => {
        setLocalData(prev => ({
            ...prev,
            passos: [...(prev.passos || []), { description: '', imageUrl: '' }]
        }));
        setIsDirty(true);
    };

    const updateStep = (index, field, value) => {
        setLocalData(prev => {
            const newSteps = [...prev.passos];
            newSteps[index] = { ...newSteps[index], [field]: value };
            return { ...prev, passos: newSteps };
        });
        setIsDirty(true);
    };

    const deleteStep = (index) => {
        setLocalData(prev => ({
            ...prev,
            passos: prev.passos.filter((_, i) => i !== index)
        }));
        setIsDirty(true);
    };

    const moveStep = (index, direction) => {
        setLocalData(prev => {
            const newSteps = [...prev.passos];
            const temp = newSteps[index];
            newSteps[index] = newSteps[index + direction];
            newSteps[index + direction] = temp;
            return { ...prev, passos: newSteps };
        });
        setIsDirty(true);
    };

    const handleStepImageUpload = async (index, e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingStep(index);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Falha no upload');

            const { url } = await response.json();
            updateStep(index, 'imageUrl', url);
            toast({ title: "Sucesso", description: "Imagem do passo enviada!" });
        } catch (error) {
            console.error('Erro no upload do passo:', error);
            toast({
                title: "Erro",
                description: "Falha ao enviar imagem.",
                variant: "destructive"
            });
        } finally {
            setUploadingStep(null);
        }
    };

    // Filtrar itens
    const filteredItems = items.filter(item =>
        item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={searchTerm ? "pb-20" : ""}>
            {/* BARRA DE MENU SUPERIOR COM PESQUISA E BOTÕES */}
            <Card className="bg-white shadow-sm border mb-6 print:hidden">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Busca */}
                        <div className="relative flex-1 max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setSearchOpen(true);
                                }}
                                onFocus={() => setSearchOpen(true)}
                                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                                placeholder={`Buscar ${itemLabel.toLowerCase()}...`}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                            />

                            {/* Dropdown de busca */}
                            {searchOpen && searchTerm && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                                    <div className="p-2">
                                        {loading ? (
                                            <div className="p-3 text-center text-gray-500 flex items-center justify-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Carregando...
                                            </div>
                                        ) : filteredItems.length === 0 ? (
                                            <div className="p-3 text-center text-gray-500">
                                                Nenhum {itemLabel.toLowerCase()} encontrado
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {filteredItems.map(item => (
                                                    <div
                                                        key={item.id}
                                                        className={`p-2 hover:bg-${colorScheme}-50 rounded cursor-pointer flex items-center gap-2`}
                                                        onMouseDown={() => handleSelect(item)}
                                                    >
                                                        <Icon className={`h-4 w-4 ${colorConfig.icon}`} />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm">{item.nome}</div>
                                                            <div className="text-xs text-gray-500">{item.codigo}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Botões */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={handlePrint}
                                className="gap-1"
                                disabled={!localData.nome}
                            >
                                <Printer className="h-4 w-4" />
                                Imprimir
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleNew}
                                className="gap-1"
                            >
                                <FilePlus className="h-4 w-4" />
                                Novo {itemLabel}
                            </Button>

                            <Button
                                onClick={handleSave}
                                disabled={saving || !isDirty}
                                className={`${colorConfig.button} text-white gap-1`}
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
                                Salvar
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* LAYOUT PRINCIPAL - 2 COLUNAS */}
            <div className="grid md:grid-cols-[350px_1fr] gap-6 print:grid-cols-[30%_70%] print:gap-4">

                {/* === COLUNA ESQUERDA === */}
                <div className="space-y-6 md:sticky md:top-4 md:self-start">

                    {/* ÁREA DA FOTO */}
                    <div className="relative h-64 w-full bg-white rounded-xl overflow-hidden group border border-gray-200 print:h-48">
                        {localData.imageUrl ? (
                            <img
                                src={localData.imageUrl}
                                alt={localData.nome}
                                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-700"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl">
                                <div className="text-center p-4">
                                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-30 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-500">Adicionar Foto</span>
                                </div>
                            </div>
                        )}

                        {/* Botão de Upload */}
                        <div className="absolute bottom-2 right-2 z-10 print:hidden">
                            <input
                                type="file"
                                ref={mainImageInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleMainImageUpload}
                            />
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-10 w-10 bg-white/90 hover:bg-white text-gray-700 shadow-md rounded-full"
                                onClick={() => mainImageInputRef.current?.click()}
                                disabled={uploadingMain}
                                title="Adicionar/Alterar Foto"
                            >
                                {uploadingMain ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                            </Button>
                        </div>
                    </div>

                    {/* DADOS TÉCNICOS / INFO ADICIONAL */}
                    <div className={`bg-${colorScheme}-50/30 rounded-xl p-6 border ${colorConfig.border} print:bg-transparent print:border-gray-300`}>
                        <h3 className={`text-xs uppercase tracking-wider ${colorConfig.primary} font-bold mb-4 flex items-center gap-2 border-b border-${colorScheme}-100 pb-2`}>
                            <Info className="w-4 h-4" />
                            Informações Gerais
                        </h3>

                        {isEditing ? (
                            <Textarea
                                value={localData.especificacoes}
                                onChange={(e) => { setLocalData(prev => ({ ...prev, especificacoes: e.target.value })); setIsDirty(true); }}
                                placeholder="Especificações, detalhes técnicos, composição..."
                                className={`text-sm min-h-[100px] bg-white border-${colorScheme}-200`}
                            />
                        ) : (
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {localData.especificacoes || <span className="text-gray-400 italic">Sem informações adicionais</span>}
                            </div>
                        )}
                    </div>

                    {/* EPIs NECESSÁRIOS */}
                    <div className="bg-orange-50/50 rounded-xl p-6 border border-orange-100 print:bg-transparent print:border-gray-300">
                        <h3 className="text-xs uppercase tracking-wider text-orange-600 font-bold mb-4 flex items-center gap-2 border-b pb-2 border-orange-200">
                            <ShieldCheck className="w-4 h-4" />
                            EPIs Necessários
                        </h3>

                        {isEditing ? (
                            <Textarea
                                value={localData.materiais}
                                onChange={(e) => { setLocalData(prev => ({ ...prev, materiais: e.target.value })); setIsDirty(true); }}
                                placeholder="Luvas, óculos, avental..."
                                className="text-sm min-h-[100px] bg-white border-orange-200"
                            />
                        ) : (
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {localData.materiais || <span className="text-gray-400 italic">Nenhum EPI cadastrado</span>}
                            </div>
                        )}
                    </div>

                    {/* MANUTENÇÃO */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm print:shadow-none">
                        <div className="flex justify-between items-center mb-4 border-b pb-2 border-gray-100">
                            <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                Manutenção e Cuidados
                            </h3>
                            {!isEditing && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-orange-600 print:hidden" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="w-3 h-3" />
                                </Button>
                            )}
                        </div>

                        {isEditing ? (
                            <Textarea
                                value={localData.manutencao}
                                onChange={(e) => { setLocalData(prev => ({ ...prev, manutencao: e.target.value })); setIsDirty(true); }}
                                placeholder="Descreva procedimentos de limpeza, manutenção..."
                                className="text-sm min-h-[100px]"
                            />
                        ) : (
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {localData.manutencao || <span className="text-gray-400 italic">Nenhuma informação</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* === COLUNA DIREITA === */}
                <div className="space-y-8">

                    {/* HEADER DO ITEM */}
                    <div className="border-b border-gray-200 pb-6 print:pb-4">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <div className="w-36">
                                                <label className="text-xs text-gray-500 mb-1 block">Código</label>
                                                <Input
                                                    value={localData.codigo}
                                                    onChange={(e) => { setLocalData(prev => ({ ...prev, codigo: e.target.value.toUpperCase() })); setIsDirty(true); }}
                                                    placeholder="EX: CRT001"
                                                    className="font-mono"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-500 mb-1 block">Nome *</label>
                                                <Input
                                                    value={localData.nome}
                                                    onChange={(e) => { setLocalData(prev => ({ ...prev, nome: e.target.value })); setIsDirty(true); }}
                                                    placeholder={`Nome do ${itemLabel.toLowerCase()}`}
                                                    className="text-lg font-semibold"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
                                            <Input
                                                value={localData.descricao}
                                                onChange={(e) => { setLocalData(prev => ({ ...prev, descricao: e.target.value })); setIsDirty(true); }}
                                                placeholder="Breve descrição..."
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Badge variant="secondary" className={`mb-2 font-mono ${colorConfig.badge} border-none print:border print:border-gray-300 print:bg-transparent`}>
                                            {localData.codigo || 'SEM CÓDIGO'}
                                        </Badge>
                                        <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">
                                            {localData.nome || `Novo ${itemLabel}`}
                                        </h1>
                                        <p className="text-gray-600">{localData.descricao}</p>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-2 ml-4 print:hidden">
                                {isEditing ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (currentItemId) {
                                                const item = items.find(i => i.id === currentItemId);
                                                if (item) handleSelect(item);
                                            } else {
                                                handleNew();
                                            }
                                            setIsEditing(false);
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1">
                                            <Edit2 className="w-4 h-4" />
                                            Editar
                                        </Button>
                                        {currentItemId && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsDeleteDialogOpen(true)}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PROCEDIMENTO OPERACIONAL (POP) */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 print:text-base">
                                <Icon className={`w-5 h-5 ${colorConfig.icon}`} />
                                Procedimento Operacional Padrão (POP)
                            </h2>
                            {isEditing && (
                                <Button variant="outline" size="sm" onClick={addStep} className="gap-1 print:hidden">
                                    <Plus className="w-4 h-4" />
                                    Adicionar Passo
                                </Button>
                            )}
                        </div>

                        <div className="space-y-4 print:space-y-2">
                            {localData.passos?.length > 0 ? (
                                localData.passos.map((passo, idx) => (
                                    <div
                                        key={idx}
                                        className={`relative pl-12 border-l-2 ${isEditing ? `border-${colorScheme}-300` : `border-${colorScheme}-100`} group hover:border-${colorScheme}-400 transition-colors ml-2`}
                                    >
                                        <div className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-${colorScheme}-100 border-4 border-white shadow-sm group-hover:bg-${colorScheme}-500 transition-colors flex items-center justify-center`}>
                                            <span className={`text-xs font-bold text-${colorScheme}-600 group-hover:text-white`}>{idx + 1}</span>
                                        </div>

                                        {isEditing ? (
                                            <div className="flex gap-2 items-start pb-4">
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        onClick={() => moveStep(idx, -1)}
                                                        disabled={idx === 0}
                                                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                                                    >
                                                        <ChevronUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveStep(idx, 1)}
                                                        disabled={idx === localData.passos.length - 1}
                                                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Textarea
                                                        value={passo.description}
                                                        onChange={(e) => updateStep(idx, 'description', e.target.value)}
                                                        placeholder={`Descreva o passo ${idx + 1}...`}
                                                        className="min-h-[80px]"
                                                    />
                                                    {/* Upload de imagem do passo */}
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="file"
                                                            ref={el => stepImageInputRefs.current[idx] = el}
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={(e) => handleStepImageUpload(idx, e)}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => stepImageInputRefs.current[idx]?.click()}
                                                            disabled={uploadingStep === idx}
                                                            className="gap-1"
                                                        >
                                                            {uploadingStep === idx ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Upload className="w-4 h-4" />
                                                            )}
                                                            {passo.imageUrl ? 'Alterar Imagem' : 'Adicionar Imagem'}
                                                        </Button>
                                                        {passo.imageUrl && (
                                                            <img
                                                                src={passo.imageUrl}
                                                                alt={`Passo ${idx + 1}`}
                                                                className="h-32 w-auto object-contain rounded border bg-gray-50"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => deleteStep(idx)}
                                                    disabled={localData.passos.length <= 1}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="pb-4">
                                                <p className="text-gray-700 leading-relaxed max-w-prose">{passo.description || <span className="text-gray-400 italic">Sem descrição</span>}</p>
                                                {passo.imageUrl && (
                                                    <img
                                                        src={passo.imageUrl}
                                                        alt={`Passo ${idx + 1}`}
                                                        className="mt-3 max-w-md rounded-lg border shadow-sm"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <p className="text-gray-400">Nenhum procedimento cadastrado.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PONTOS CRÍTICOS DE SEGURANÇA */}
                    <div className="bg-red-50 rounded-xl p-6 border border-red-100 print:bg-white print:border-gray-300">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-bold text-red-800 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Precauções de Segurança
                            </h3>
                            {!isEditing && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100 print:hidden" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="w-3 h-3" />
                                </Button>
                            )}
                        </div>

                        {isEditing ? (
                            <Textarea
                                value={localData.precaucoes}
                                onChange={(e) => { setLocalData(prev => ({ ...prev, precaucoes: e.target.value })); setIsDirty(true); }}
                                placeholder="Alertas de segurança, riscos críticos, pontos de atenção..."
                                className="min-h-[100px] bg-white border-red-200"
                            />
                        ) : (
                            <div className="text-sm text-red-900/80 leading-relaxed whitespace-pre-wrap">
                                {localData.precaucoes || "Nenhuma precaução registrada."}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Dialog de exclusão */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir <strong>{localData.nome}</strong>?
                            <br />
                            <span className="text-red-500">Esta ação não pode ser desfeita.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
