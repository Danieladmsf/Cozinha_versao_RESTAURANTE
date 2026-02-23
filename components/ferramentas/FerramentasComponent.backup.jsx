'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Camera,
    Wrench,
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
    FileDown,
    FilePlus,
    Upload,
    Info,
    ShieldCheck, // Ícone para EPIs

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

import { useSearchParams } from 'next/navigation'; // Adicionado

export default function FerramentasComponent({ categoria }) {
    // Se não recebeu categoria, usa valores padrão para ferramentas
    const colecaoNome = categoria?.colecao || 'ferramentas';
    const prefixoCodigo = categoria?.prefixo || 'FERR';
    const categoriaNome = categoria?.nome || 'Ferramentas';

    const searchParams = useSearchParams();
    const urlToolId = searchParams.get('id');

    const [ferramentas, setFerramentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [currentFerramentaId, setCurrentFerramentaId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [uploadingMain, setUploadingMain] = useState(false);
    const [uploadingStep, setUploadingStep] = useState(null);
    const [editingTitleId, setEditingTitleId] = useState(null); // ID da seção com título em edição

    const [activeField, setActiveField] = useState(null); // Rastrear campo focado
    const { toast } = useToast();

    const mainImageInputRef = useRef(null);
    const logoImageInputRef = useRef(null); // Ref para o logo
    const stepImageInputRefs = useRef({});
    const searchInputRef = useRef(null);

    // Estado local para edição
    const [localData, setLocalData] = useState({
        codigo: '',
        nome: '',
        descricao: '',
        nome: '',
        descricao: '',
        imageUrl: '',
        logoUrl: '', // URL do Logo
        materiais: '',
        especificacoes: '',
        manutencao: '',
        precaucoes: '',
        manutencao: '',
        precaucoes: '',
        passos: [{ description: '', imageUrl: '' }],
        // Títulos personalizados (opcionais check overrides)
        titulos: {
            dados: '',
            epis: '',
            manutencao: '',
            precaucoes: ''
        }
    });

    // Log para debug de mudanças de estado
    useEffect(() => {
        // console.log('Estado local atualizado:', localData);
        // console.log('Modo de edição:', isEditing);
    }, [localData, isEditing]);



    // Carregar itens do Firebase quando a coleção mudar
    useEffect(() => {
        loadFerramentas();
        // Limpar seleção ao mudar de categoria
        setCurrentFerramentaId(null);
        setIsEditing(false);
        setLocalData({
            codigo: '',
            nome: '',
            descricao: '',
            imageUrl: '',
            logoUrl: '',
            materiais: '',
            especificacoes: '',
            manutencao: '',
            precaucoes: '',
            precaucoes: '',
            passos: [{ description: '' }],
            titulos: { dados: '', epis: '', manutencao: '', precaucoes: '' }
        });
    }, [colecaoNome]);

    // Efeito para abrir ferramenta via URL quando a lista carregar
    useEffect(() => {
        if (urlToolId && ferramentas.length > 0 && !currentFerramentaId) {
            const toolToOpen = ferramentas.find(f => f.id === urlToolId);
            if (toolToOpen) {
                handleSelect(toolToOpen);
            }
        }
    }, [urlToolId, ferramentas, currentFerramentaId]);

    const loadFerramentas = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, colecaoNome), orderBy('codigo'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setFerramentas(data);
        } catch (error) {
            console.error('Erro ao carregar ferramentas:', error);
            toast({
                title: 'Erro',
                description: `Não foi possível carregar ${categoriaNome}.`,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    // Gerar código automático
    const generateCode = () => {
        const prefix = prefixoCodigo;
        const existingCodes = ferramentas
            .map(f => f.codigo)
            .filter(c => c && c.startsWith(prefix))
            .map(c => parseInt(c.replace(prefix, ''), 10))
            .filter(n => !isNaN(n));

        const nextNumber = existingCodes.length > 0
            ? Math.max(...existingCodes) + 1
            : 1;

        return `${prefix}${String(nextNumber).padStart(4, '0')}`;
    };

    // Limpar formulário para nova ferramenta
    const handleNew = () => {
        setLocalData({
            codigo: generateCode(),
            nome: '',
            descricao: '',
            nome: '',
            descricao: '',
            imageUrl: '',
            logoUrl: '',
            materiais: '',
            especificacoes: '', // Resetar especificacoes
            manutencao: '',
            precaucoes: '',
            passos: [{ description: '', imageUrl: '' }],
            titulos: { dados: '', epis: '', manutencao: '', precaucoes: '' }
        });
        setCurrentFerramentaId(null);
        setIsEditing(true);
        setIsDirty(true); // Habilitar botão salvar imediatamente
        setSearchTerm('');
    };


    // Selecionar ferramenta da busca
    const handleSelect = (ferramenta) => {
        console.log('Ferramenta selecionada:', ferramenta);
        setLocalData({
            codigo: ferramenta.codigo || '',
            nome: ferramenta.nome || '',
            descricao: ferramenta.descricao || '',
            imageUrl: ferramenta.imageUrl || '',
            logoUrl: ferramenta.logoUrl || '',
            materiais: ferramenta.materiais || '',
            especificacoes: ferramenta.especificacoes || '', // Carregar especificacoes
            manutencao: ferramenta.manutencao || '',
            precaucoes: ferramenta.precaucoes || '',
            passos: ferramenta.passos?.length > 0
                ? ferramenta.passos
                : [{ description: '', imageUrl: '' }],
            titulos: ferramenta.titulos || { dados: '', epis: '', manutencao: '', precaucoes: '' }
        });
        setCurrentFerramentaId(ferramenta.id);
        setCurrentFerramentaId(ferramenta.id);
        setIsEditing(false); // Carrega em modo de visualização
        setIsDirty(false);
        setSearchTerm(''); // Limpa a busca
        setSearchOpen(false); // Fecha o dropdown
    };

    // Upload de imagem para Vercel Blob
    const uploadImage = async (file, pathPrefix) => {
        const filename = `${pathPrefix}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/upload?filename=${filename}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha no upload da imagem');
        }

        const newBlob = await response.json();
        return newBlob.url;
    };


    // Upload da imagem principal
    const handleMainImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadingMain(true);
        try {
            const pathPrefix = `ferramentas/${localData.codigo || 'new'}/main`;
            const url = await uploadImage(file, pathPrefix);

            setLocalData(prev => ({ ...prev, imageUrl: url }));
            setIsDirty(true);

            toast({
                title: 'Imagem enviada',
                description: 'A imagem foi carregada com sucesso!'
            });
        } catch (error) {
            console.error('Erro ao enviar imagem:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar a imagem.',
                variant: 'destructive'
            });
        } finally {
            setUploadingMain(false);
        }
    };

    // Upload do LOGO
    const handleLogoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Reaproveitando estado de loading principal ou criando um específico se necessário.
        // Vou usar um toast de feedback direto.
        try {
            const pathPrefix = `ferramentas/${localData.codigo || 'new'}/logo`;
            const url = await uploadImage(file, pathPrefix);

            setLocalData(prev => ({ ...prev, logoUrl: url }));
            setIsDirty(true);

            toast({
                title: 'Logo atualizado',
                description: 'O logo foi carregado com sucesso!'
            });
        } catch (error) {
            console.error('Erro ao enviar logo:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar o logo.',
                variant: 'destructive'
            });
        }
    };

    // Upload de imagem de um passo
    const handleStepImageUpload = async (index, event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadingStep(index);
        try {
            const pathPrefix = `ferramentas/${localData.codigo || 'new'}/step_${index}`;
            const url = await uploadImage(file, pathPrefix);

            updateStep(index, 'imageUrl', url);
            setIsDirty(true);

            toast({
                title: 'Imagem enviada',
                description: `Imagem do passo ${index + 1} carregada!`
            });
        } catch (error) {
            console.error('Erro ao enviar imagem:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar a imagem.',
                variant: 'destructive'
            });
        } finally {
            setUploadingStep(null);
        }
    };

    // Salvar ferramenta
    const handleSave = async () => {
        try {
            setSaving(true);

            if (!localData.codigo.trim()) {
                toast({ title: 'Campo obrigatório', description: 'O código é obrigatório.', variant: 'destructive' });
                setSaving(false);
                return;
            }

            if (!localData.nome.trim()) {
                toast({ title: 'Campo obrigatório', description: 'O nome é obrigatório.', variant: 'destructive' });
                setSaving(false);
                return;
            }

            const passosValidos = localData.passos.filter(p => p.description?.trim());

            const dataToSave = {
                codigo: localData.codigo.trim().toUpperCase(),
                nome: localData.nome.trim(),
                descricao: localData.descricao?.trim() || '',
                nome: localData.nome.trim(),
                descricao: localData.descricao?.trim() || '',
                imageUrl: localData.imageUrl?.trim() || '',
                logoUrl: localData.logoUrl?.trim() || '',
                materiais: localData.materiais?.trim() || '',
                especificacoes: localData.especificacoes?.trim() || '', // Salvar especificacoes
                manutencao: localData.manutencao?.trim() || '',
                precaucoes: localData.precaucoes?.trim() || '',
                passos: passosValidos,
                titulos: localData.titulos || {},
                updatedAt: serverTimestamp()
            };

            console.log('Salvando ferramenta:', dataToSave);

            if (!currentFerramentaId) {
                dataToSave.createdAt = serverTimestamp();
                const docRef = await addDoc(collection(db, colecaoNome), dataToSave);
                console.log('Item criado com ID:', docRef.id);
                setCurrentFerramentaId(docRef.id);
                toast({ title: 'Sucesso', description: `${categoriaNome} cadastrado(a) com sucesso!` });
            } else {
                await updateDoc(doc(db, colecaoNome, currentFerramentaId), dataToSave);
                console.log('Item atualizado:', currentFerramentaId);
                toast({ title: 'Sucesso', description: `${categoriaNome} atualizado(a) com sucesso!` });
            }

            setIsEditing(false);
            setIsDirty(false);
            loadFerramentas();
        } catch (error) {
            console.error('Erro ao salvar ferramenta:', error);
            toast({ title: 'Erro', description: `Não foi possível salvar: ${error.message}`, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };


    // Excluir item
    const handleDelete = async () => {
        try {
            await deleteDoc(doc(db, colecaoNome, currentFerramentaId));
            toast({ title: 'Sucesso', description: 'Item excluído com sucesso!' });
            setIsDeleteDialogOpen(false);
            handleNew();
            loadFerramentas();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
        }
    };

    // Imprimir (Browser)
    const handlePrint = () => {
        window.print();
    };

    // Baixar PDF Oficial
    const handleDownloadPdf = async () => {
        try {
            toast({ title: 'Gerando PDF...', description: 'Aguarde um momento.' });

            // Dynamic import to avoid SSR issues with react-pdf
            const { pdf } = await import('@react-pdf/renderer');
            const { default: PopDocument } = await import('./PopDocument');

            const blob = await pdf(<PopDocument data={localData} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `POP-${localData.codigo || 'Novo'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({ title: 'Sucesso', description: 'PDF baixado com sucesso!' });
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            toast({ title: 'Erro', description: 'Falha ao gerar PDF.', variant: 'destructive' });
        }
    };

    // Gerenciamento de passos
    const addStep = () => {
        setLocalData(prev => ({
            ...prev,
            passos: [...prev.passos, { description: '', imageUrl: '' }]
        }));
        setIsDirty(true);
    };

    const updateStep = (index, field, value) => {
        setLocalData(prev => ({
            ...prev,
            passos: prev.passos.map((step, i) =>
                i === index ? { ...step, [field]: value } : step
            )
        }));
        setIsDirty(true);
    };

    const deleteStep = (index) => {
        if (localData.passos.length <= 1) return;
        setLocalData(prev => ({
            ...prev,
            passos: prev.passos.filter((_, i) => i !== index)
        }));
        setIsDirty(true);
    };

    const moveStep = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= localData.passos.length) return;

        setLocalData(prev => {
            const newPassos = [...prev.passos];
            [newPassos[index], newPassos[newIndex]] = [newPassos[newIndex], newPassos[index]];
            return { ...prev, passos: newPassos };
        });
        setIsDirty(true);
    };

    // Filtrar ferramentas na busca
    const filteredFerramentas = ferramentas.filter(f =>
        f.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Helper para obter configuração da seção (título, cor, ícone)
    const getSectionConfig = (id, defaultTitle, defaultColor = 'text-gray-900', defaultIcon = null) => {
        let cardConfig = { titulo: defaultTitle, cor: defaultColor, icone: defaultIcon };

        if (categoria?.cards) {
            // Mapeamento de IDs legados
            const mapId = {
                'especificacoes': 'dados',
                'materiais': 'epis',
            }[id] || id;

            const card = categoria.cards.find(c => c.id === mapId) || categoria.cards.find(c => c.id === id);

            if (card) {
                cardConfig = {
                    titulo: card.titulo,
                    cor: card.cor || defaultColor,
                    icone: card.icone
                };
            }
        }

        // Título efetivo: Override local > Configuração da categoria > Default
        const effectiveTitle = localData.titulos?.[id] || cardConfig.titulo;

        return { ...cardConfig, titulo: effectiveTitle, originalTitle: cardConfig.titulo };
    };

    const configDados = getSectionConfig('dados', 'Dados Técnicos');
    const configEpis = getSectionConfig('epis', 'EPIs Necessários');
    const configManutencao = getSectionConfig('manutencao', 'Manutenção');
    const configPrecaucoes = getSectionConfig('precaucoes', 'Precauções de Segurança', 'text-red-700');

    // Renderizador de Cabeçalho Editável
    const renderSectionHeader = (id, config) => {
        const isEditingThisTitle = editingTitleId === id;

        if (isEditing && isEditingThisTitle) {
            return (
                <div className="flex items-center gap-2 mb-3 border-b border-gray-200 pb-1">
                    <Input
                        value={localData.titulos?.[id] !== undefined ? localData.titulos[id] : config.titulo}
                        onChange={(e) => {
                            const val = e.target.value;
                            setLocalData(prev => ({
                                ...prev,
                                titulos: { ...prev.titulos, [id]: val }
                            }));
                            setIsDirty(true);
                        }}
                        className="h-7 text-xs font-bold uppercase tracking-wider"
                        autoFocus
                        onBlur={() => {
                            // Se vazio, remove o override e volta ao original
                            if (!localData.titulos?.[id]?.trim()) {
                                const newTitulos = { ...localData.titulos };
                                delete newTitulos[id];
                                setLocalData(prev => ({ ...prev, titulos: newTitulos }));
                            }
                            setEditingTitleId(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.target.blur();
                            }
                        }}
                    />
                    <button onClick={() => setEditingTitleId(null)} className="text-green-600 hover:text-green-800">
                        <CheckCircle2 className="w-4 h-4" />
                    </button>
                </div>
            );
        }

        const Icon = id === 'precaucoes' ? AlertTriangle : null;

        return (
            <h3 className={`text-xs font-bold uppercase tracking-wider ${config.cor} mb-3 border-b border-gray-200 pb-1 flex justify-between items-center group`}>
                <span className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" />}
                    {config.titulo}
                </span>
                {isEditing && (
                    <button
                        onClick={() => {
                            // Se ainda não tem override, inicia com o titulo atual
                            if (localData.titulos?.[id] === undefined) {
                                setLocalData(prev => ({
                                    ...prev,
                                    titulos: { ...prev.titulos, [id]: config.titulo }
                                }));
                            }
                            setEditingTitleId(id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 print:hidden p-1 rounded hover:bg-gray-100"
                        title="Renomear título desta seção"
                    >
                        <Edit2 className="w-3 h-3" />
                    </button>
                )}
            </h3>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 print:p-0 print:bg-white">
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        -webkit-print-color-adjust: exact;
                    }
                    .print-frame {
                        position: fixed;
                        top: 10mm;
                        left: 10mm;
                        right: 10mm;
                        bottom: 10mm;
                        border: 2px solid #1f2937; /* gray-900 */
                        z-index: 50;
                        pointer-events: none;
                    }
                    /* Content spacing for fixed header/footer */
                    /* Content spacing for fixed header/footer */
                    .print-content-spacing {
                        margin-top: 45mm;
                        margin-bottom: 40mm;
                    }
                    /* Ensure content flows properly */
                    .break-inside-avoid {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }
            `}</style>

            {/* Print Frame Border */}
            <div className="hidden print:block print-frame"></div>

            {/* HEADER FIXO DE IMPRESSÃO - Repete em todas as páginas */}
            <div className="hidden print:flex fixed top-[10mm] left-[10mm] right-[10mm] h-[30mm] bg-white border-b-2 border-gray-800 items-center justify-between px-8 z-50">
                <div className="flex items-center gap-4">
                    {/* Logo Fixo */}
                    <div className="w-16 h-16 flex items-center justify-center">
                        {localData.logoUrl ? (
                            <img src={localData.logoUrl} alt="Logo" className="max-w-full max-h-full" />
                        ) : (
                            <span className="text-[10px] text-gray-400">Logo</span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Manual de Processos</h2>
                        <h1 className="text-lg font-black uppercase text-gray-900 leading-tight">POP - Procedimento<br />Operacional Padrão</h1>
                    </div>
                </div>
                <div className="text-right">
                    <div className="border border-gray-300 rounded px-2 py-0.5 mb-1 inline-block">
                        <span className="text-[10px] font-bold uppercase text-gray-400 mr-2">Código</span>
                        <span className="font-mono font-bold text-gray-900">{localData.codigo || '---'}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium">
                        Data: {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>

            {/* FOOTER FIXO DE IMPRESSÃO - Repete em todas as páginas */}
            <div className="hidden print:flex fixed bottom-[10mm] left-[10mm] right-[10mm] h-[25mm] bg-white border-t border-gray-200 items-center justify-between px-8 z-50">
                <div className="grid grid-cols-3 gap-8 text-center w-full">
                    <div className="flex flex-col gap-1">
                        <div className="h-6 border-b border-gray-900"></div>
                        <span className="text-[8px] font-bold uppercase text-gray-500">Elaboração</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="h-6 border-b border-gray-900"></div>
                        <span className="text-[8px] font-bold uppercase text-gray-500">Aprovação</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="h-6 border-b border-gray-900"></div>
                        <span className="text-[8px] font-bold uppercase text-gray-500">Data</span>
                    </div>
                </div>
            </div>

            {/* BARRA DE FERRAMENTAS FLUTUANTE / TOPO */}
            <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">

                {/* ÁREA DE BUSCA (Esquerda) */}
                <div className="relative w-80 z-[100]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            ref={searchInputRef}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setSearchOpen(true);
                            }}
                            onFocus={() => setSearchOpen(true)}
                            placeholder="Pesquisar POP..."
                            autoComplete="off"
                            className="pl-10 h-10 bg-white shadow-sm border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent rounded-lg"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => { setSearchTerm(''); setSearchOpen(false); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <Plus className="h-4 w-4 rotate-45" />
                            </button>
                        )}
                    </div>

                    {/* Dropdown de Resultados */}
                    {searchOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 max-h-80 overflow-y-auto z-[200]">
                            {filteredFerramentas.length > 0 ? (
                                filteredFerramentas.map((f) => (
                                    <div
                                        key={f.id}
                                        onClick={() => handleSelect(f)}
                                        className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-800">{f.nome}</span>
                                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500">{f.codigo}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                    Nenhum resultado encontrado.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Overlay para fechar ao clicar fora */}
                    {searchOpen && (
                        <div
                            className="fixed inset-0 z-[-1]"
                            onClick={() => setSearchOpen(false)}
                        />
                    )}
                </div>

                {/* BOTÕES DE AÇÃO (Direita) */}
                <div className="flex gap-2">
                    <Button onClick={handleDownloadPdf} size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        <FileDown className="h-4 w-4" /> Baixar PDF
                    </Button>
                    <Button variant="outline" onClick={handleNew} size="sm" className="gap-1 bg-white shadow-sm hover:bg-gray-50">
                        <FilePlus className="h-4 w-4" /> Novo
                    </Button>
                    {/* Botões de Edição também aqui fora */}
                    {currentFerramentaId && !isEditing && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1 bg-white shadow-sm hover:bg-gray-50">
                                <Edit2 className="w-4 h-4" /> Editar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1 bg-white shadow-sm"
                            >
                                <Trash2 className="w-4 h-4" /> Excluir
                            </Button>
                        </>
                    )}
                    {isEditing && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (currentFerramentaId) {
                                        setIsEditing(false);
                                    } else {
                                        handleNew();
                                    }
                                }}
                                className="gap-1 bg-white shadow-sm"
                            >
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={saving || !isDirty} size="sm" className="bg-gray-900 text-white gap-1 hover:bg-gray-800 shadow-sm">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />} Salvar
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* WRAPPER A4 - SIMULAÇÃO DE FOLHA */}
            <div className="mx-auto max-w-[210mm] min-h-[297mm] bg-white shadow-2xl border border-gray-200 print:shadow-none print:border-none print:w-full print:m-0 flex flex-col relative print:min-h-0 print:block">

                {/* HEADER DO DOCUMENTO (FIXO) - Hidden in Print (replaced by fixed header) */}
                <div className="border-b-2 border-gray-800 p-8 flex items-center justify-between bg-white print:hidden">
                    <div className="flex items-center gap-4">

                        {/* LOGO DA EMPRESA (Upload) */}
                        <div className="relative group">
                            <input
                                type="file"
                                ref={logoImageInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleLogoUpload}
                            />
                            <div
                                onClick={() => isEditing && logoImageInputRef.current?.click()}
                                className={`w-16 h-16 bg-gray-900 text-white flex items-center justify-center rounded overflow-hidden ${isEditing ? 'cursor-pointer hover:bg-gray-800 transition-colors relative' : ''}`}
                                title={isEditing ? "Clique para alterar o logo" : "Logo da Empresa"}
                            >
                                {localData.logoUrl ? (
                                    <img
                                        src={localData.logoUrl}
                                        alt="Logo Classe A"
                                        className="w-full h-full object-contain p-1 bg-white"
                                    />
                                ) : (
                                    <Wrench className="w-8 h-8" />
                                )}

                                {/* Overlay de edição */}
                                {isEditing && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">Manual de Processos</h2>
                            <h1 className="text-xl font-black uppercase text-gray-900 leading-tight">Procedimento Operacional<br />Padronizado (POP)</h1>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="border border-gray-300 rounded px-3 py-1 mb-1">
                            <span className="text-[10px] font-bold uppercase text-gray-400 block">Código</span>
                            <span className="font-mono font-bold text-gray-900">{localData.codigo || '---'}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                            Revisão: 01 | Data: {new Date().toLocaleDateString()}
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-8 md:p-12 space-y-8 print:p-0 print:mx-8 print-content-spacing">


                    {/* ============ LAYOUT PRINCIPAL ============ */}
                    <div className="grid md:grid-cols-[300px_1fr] gap-8 print:grid-cols-[250px_1fr] print:gap-6">

                        {/* === COLUNA ESQUERDA === */}
                        <div className="space-y-6 md:sticky md:top-4 md:self-start">

                            {/* ÁREA DA FOTO */}
                            <div className="relative h-64 w-full bg-white rounded border border-gray-300 overflow-hidden flex items-center justify-center p-2 print:h-48 print:border-gray-800">
                                {localData.imageUrl ? (
                                    <img
                                        src={localData.imageUrl}
                                        alt={localData.nome}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="text-center p-4 text-gray-300">
                                        <span className="text-xs font-medium">Sem Imagem</span>
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
                                        className="h-8 w-8 bg-white shadow border border-gray-200"
                                        onClick={() => mainImageInputRef.current?.click()}
                                        disabled={uploadingMain}
                                    >
                                        <Camera className="w-4 h-4 text-gray-500" />
                                    </Button>
                                </div>
                            </div>

                            {/* DADOS TÉCNICOS - Dynamic */}
                            <div className="bg-white rounded border border-gray-300 p-4 print:border-gray-800 break-inside-avoid">
                                {renderSectionHeader('dados', configDados)}

                                {isEditing ? (
                                    <RichTextEditor
                                        value={localData.especificacoes}
                                        onChange={(html) => { setLocalData(prev => ({ ...prev, especificacoes: html })); setIsDirty(true); }}
                                        placeholder={`${configDados.titulo}...`}
                                    />
                                ) : (
                                    <div className="text-sm text-gray-800 leading-snug" dangerouslySetInnerHTML={{ __html: localData.especificacoes || "---" }} />

                                )}
                            </div>

                            {/* EPIs NECESSÁRIOS - Dynamic */}
                            <div className="bg-white rounded border border-gray-300 p-4 print:border-gray-800 break-inside-avoid">
                                {renderSectionHeader('epis', configEpis)}

                                {isEditing ? (
                                    <RichTextEditor
                                        value={localData.materiais}
                                        onChange={(html) => { setLocalData(prev => ({ ...prev, materiais: html })); setIsDirty(true); }}
                                        placeholder={`${configEpis.titulo}...`}
                                    />
                                ) : (
                                    <div className="text-sm text-gray-800 leading-snug" dangerouslySetInnerHTML={{ __html: localData.materiais || "---" }} />

                                )}
                            </div>

                            {/* MANUTENÇÃO / FERRAMENTAS - Dynamic */}
                            <div className="bg-white rounded border border-gray-300 p-4 print:border-gray-800 break-inside-avoid">
                                {renderSectionHeader('manutencao', configManutencao)}

                                {isEditing ? (
                                    <RichTextEditor
                                        value={localData.manutencao}
                                        onChange={(html) => { setLocalData(prev => ({ ...prev, manutencao: html })); setIsDirty(true); }}
                                        placeholder={`${configManutencao.titulo}...`}
                                    />
                                ) : (
                                    <div className="text-sm text-gray-800 leading-snug" dangerouslySetInnerHTML={{ __html: localData.manutencao || "---" }} />

                                )}
                            </div>
                        </div>

                        {/* === COLUNA DIREITA === */}
                        <div className="space-y-8">

                            {/* HEADER DA FERRAMENTA */}
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
                                                            placeholder="FERR0001"
                                                            className="font-mono"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-xs text-gray-500 mb-1 block">Nome da Ferramenta *</label>
                                                        <Input
                                                            value={localData.nome}
                                                            onChange={(e) => { setLocalData(prev => ({ ...prev, nome: e.target.value })); setIsDirty(true); }}
                                                            placeholder="Ex: Forno Combinado"
                                                            className="text-lg font-semibold"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
                                                    <Input
                                                        id="descricao"
                                                        value={localData.descricao}
                                                        onChange={(e) => { setLocalData(prev => ({ ...prev, descricao: e.target.value })); setIsDirty(true); }}
                                                        onFocus={() => setActiveField('descricao')}
                                                        placeholder="Breve descrição do equipamento..."
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">
                                                    {localData.nome || 'Nova Ferramenta'}
                                                </h2>
                                                <p className="text-gray-600 font-serif italic text-lg border-l-4 border-gray-300 pl-4" dangerouslySetInnerHTML={{ __html: localData.descricao }} />
                                            </>
                                        )}
                                    </div>

                                </div>
                            </div>

                            {/* PROCEDIMENTO OPERACIONAL (POP) - Clean */}
                            <div>
                                <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                                        <ListOrdered className="w-5 h-5 text-gray-400" />
                                        Descrição do Procedimento
                                    </h2>
                                    {isEditing && (
                                        <Button variant="outline" size="sm" onClick={addStep} className="gap-1 print:hidden">
                                            <Plus className="w-4 h-4" />
                                            Adicionar Passo
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {localData.passos?.length > 0 ? (
                                        localData.passos.map((passo, idx) => (
                                            <div
                                                key={idx}
                                                className="relative pl-10 group break-inside-avoid"
                                            >
                                                <div className="absolute left-0 top-0 w-6 h-6 rounded bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
                                                    {idx + 1}
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
                                                            <RichTextEditor
                                                                value={passo.description}
                                                                onChange={(html) => updateStep(idx, 'description', html)}
                                                                placeholder={`Descreva o passo ${idx + 1}...`}
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
                                                        <p className="text-gray-900 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: passo.description || "---" }} />
                                                        {passo.imageUrl && (
                                                            <img
                                                                src={passo.imageUrl}
                                                                alt={`Passo ${idx + 1}`}
                                                                className="mt-2 max-w-[200px] border border-gray-200 shadow-sm print:max-w-[150px]"
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

                            {/* PRECAUÇÕES DE SEGURANÇA - Dynamic */}
                            <div className="bg-red-50 border border-red-200 p-4 rounded print:border-red-900 mt-6 break-inside-avoid">
                                {renderSectionHeader('precaucoes', configPrecaucoes)}

                                {isEditing ? (
                                    <RichTextEditor
                                        value={localData.precaucoes}
                                        onChange={(html) => { setLocalData(prev => ({ ...prev, precaucoes: html })); setIsDirty(true); }}
                                        placeholder={`${configPrecaucoes.titulo}...`}
                                    />
                                ) : (
                                    <div className="text-sm text-red-900 leading-snug" dangerouslySetInnerHTML={{ __html: localData.precaucoes || "---" }} />

                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER DO DOCUMENTO (FIXO) - Hidden in Print */}
                <div className="mt-auto pt-8 border-t border-gray-200 print:hidden">
                    <div className="grid grid-cols-3 gap-8 text-center">
                        <div className="flex flex-col gap-2">
                            <div className="h-8 border-b border-gray-900 pointer-events-none"></div>
                            <span className="text-[10px] font-bold uppercase text-gray-500">Elaboração</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="h-8 border-b border-gray-900 pointer-events-none"></div>
                            <span className="text-[10px] font-bold uppercase text-gray-500">Aprovação</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="h-8 border-b border-gray-900 pointer-events-none"></div>
                            <span className="text-[10px] font-bold uppercase text-gray-500">Data</span>
                        </div>
                    </div>
                </div>

            </div> {/* END A4 WRAPPER */}


            {/* Dialog de confirmação de exclusão */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir a ferramenta{' '}
                            <strong>{localData.nome}</strong>?
                            <br />
                            <span className="text-red-500">Esta ação não pode ser desfeita.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
