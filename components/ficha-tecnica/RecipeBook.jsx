import React, { useState, useRef } from 'react';
import RecipeEngine from '@/lib/recipe-engine/RecipeEngine';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Camera,
    Clock,
    Users,
    ChefHat,
    Utensils,
    Scale,
    Thermometer,
    AlertTriangle,
    CheckCircle2,
    Package,
    Download,
    Printer,
    UploadCloud,
    Loader2,
    Edit2,
    Save as SaveIcon,
    Trash2,
    Image as ImageIcon,
    ImageOff,
    Youtube,
    Wrench,
    Info,
    ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useRecipeStore } from '@/hooks/ficha-tecnica/useRecipeStore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, getDocs } from 'firebase/firestore'; // Adicionado
import { storage, db } from '@/lib/firebase'; // Adicionado db
import { cn } from "@/lib/utils";

// Paleta de cores para seleção múltipla
const HIGHLIGHT_PALETTE = [
    { name: 'blue', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: 'text-blue-500', indicator: 'bg-blue-400', ring: 'ring-blue-200' },
    { name: 'green', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', icon: 'text-emerald-500', indicator: 'bg-emerald-500', ring: 'ring-emerald-200' },
    { name: 'purple', bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', icon: 'text-purple-500', indicator: 'bg-purple-500', ring: 'ring-purple-200' },
    { name: 'orange', bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', icon: 'text-orange-500', indicator: 'bg-orange-500', ring: 'ring-orange-200' },
    { name: 'rose', bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', icon: 'text-rose-500', indicator: 'bg-rose-500', ring: 'ring-rose-200' },
    { name: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700', icon: 'text-cyan-500', indicator: 'bg-cyan-500', ring: 'ring-cyan-200' },
];

export default function RecipeBook({ recipeData: initialData }) {
    // Conecta ao Store para obter dados reativos
    // IMPORTANTE: 'preparations' são gerenciados separadamente de 'recipe' no store raiz
    const { recipe: storeRecipe, preparations: storePreparations, actions } = useRecipeStore();

    // Sincroniza o store com os dados iniciais recebidos via prop (caso o store esteja vazio ou desatualizado)
    React.useEffect(() => {
        if (initialData && initialData.id) {
            // Se o store estiver vazio ou com outra receita, carrega a atual
            if (!storeRecipe.id || storeRecipe.id !== initialData.id) {
                console.log("Hydrating RecipeStore from props:", initialData.name);
                actions.loadRecipe(initialData);
            }
        }
    }, [initialData, storeRecipe.id, actions]);

    // Usa dados do store preferencialmente para garantir reatividade
    const recipeData = (storeRecipe && storeRecipe.id === initialData?.id) ? {
        ...storeRecipe,
        preparations: storePreparations || []
    } : initialData;

    const [isEditing, setIsEditing] = useState(false);
    const [isMainUploading, setIsMainUploading] = useState(false);
    const [stepUploadingIndex, setStepUploadingIndex] = useState(null); // Armazena o índice da etapa que está fazendo upload
    const [collapsedPhotos, setCollapsedPhotos] = useState({}); // Controla visibilidade das fotos por etapa { [idx]: true/false }
    const fileInputRef = useRef(null);

    // Estados para Ferramentas
    const [isToolModalOpen, setIsToolModalOpen] = useState(false);
    const [availableTools, setAvailableTools] = useState([]);
    const [toolSearchTerm, setToolSearchTerm] = useState('');
    const [activeToolStep, setActiveToolStep] = useState(null); // { prepIndex, lineIndex }
    const [loadingTools, setLoadingTools] = useState(false);
    const [highlightedTools, setHighlightedTools] = useState([]); // Array de IDs selecionados

    // Helper para obter cor da ferramenta baseada na ordem de seleção
    const getToolColor = (toolId) => {
        const index = highlightedTools.indexOf(toolId);
        if (index === -1) return null;
        return HIGHLIGHT_PALETTE[index % HIGHLIGHT_PALETTE.length];
    };

    const toggleToolHighlight = (toolId) => {
        setHighlightedTools(prev => {
            if (prev.includes(toolId)) return prev.filter(id => id !== toolId);
            return [...prev, toolId];
        });
    };

    // Estados locais para edição dos campos de qualidade (sincronizados com recipeData via store ao salvar)
    const [localData, setLocalData] = useState({
        shelf_life: recipeData.shelf_life || '',
        storage_temperature: recipeData.storage_temperature || '',
        ccp_notes: recipeData.ccp_notes || '',
        allergens: recipeData.allergens || '',
        photo_url: recipeData.photo_url || ''
    });

    const handleCreateYield = () => {
        // Tenta buscar métricas de vários lugares possíveis
        const metrics = recipeData.metrics || {};

        // Prioridade: metrics.yield_weight > recipeData.yield_weight > recipeData.net_weight
        const yieldWeight = metrics.yield_weight || recipeData.yield_weight || recipeData.net_weight || 0;

        return {
            value: parseFloat(yieldWeight).toFixed(3),
            unit: 'kg total'
        };
    };

    const yieldData = handleCreateYield();

    // Função auxiliar para salvar receita diretamente via API
    const saveRecipeToFirestore = async (updatedRecipe, updatedPreparations) => {
        if (!updatedRecipe.id) {
            console.warn("Receita sem ID, não é possível salvar.");
            return false;
        }
        try {
            const payload = {
                ...updatedRecipe,
                preparations: updatedPreparations
            };
            const response = await fetch(`/api/recipes?id=${updatedRecipe.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao salvar');
            }
            console.log("✅ Receita salva no Firestore com sucesso!");
            return true;
        } catch (error) {
            console.error("❌ Erro ao salvar no Firestore:", error);
            return false;
        }
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!recipeData.id) {
            alert("⚠️ Por favor, SALVE a receita primeiro antes de enviar uma foto.");
            return;
        }

        setIsMainUploading(true);
        try {
            console.log("Iniciando upload Vercel Blob da foto principal...");
            const pathPrefix = `recipes/${recipeData.id}/main_photo`;
            const downloadURL = await uploadToVercelBlob(file, pathPrefix);

            setLocalData(prev => ({ ...prev, photo_url: downloadURL }));
            actions.setRecipeField('photo_url', downloadURL);

            // AUTO-SAVE: Persiste a foto principal no banco de dados via API
            console.log("Auto-salvando foto principal no Firestore...");
            const updatedRecipe = { ...recipeData, photo_url: downloadURL };
            await saveRecipeToFirestore(updatedRecipe, recipeData.preparations || []);

        } catch (error) {
            console.error("Erro upload Vercel Blob:", error);
            alert(`Erro ao enviar imagem: ${error.message}`);
        } finally {
            setIsMainUploading(false);
        }
    };

    // Função genérica de upload usando Vercel Blob via API Route
    const uploadToVercelBlob = async (file, pathPrefix) => {
        const filename = `${pathPrefix}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;

        const formData = new FormData();
        formData.append('file', file);

        // Chama nossa API Route
        const response = await fetch(`/api/upload?filename=${filename}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Falha no upload para Vercel Blob');
        }

        const newBlob = await response.json();
        return newBlob.url;
    };

    // Função para upload de foto de uma etapa específica E de uma linha específica
    const handleStepImageUpload = async (prepIndex, event, lineIndex) => {
        const file = event.target.files[0];
        if (!file) return;

        // VALIDAÇÃO: Receita precisa estar salva
        if (!recipeData.id) {
            alert("⚠️ Por favor, SALVE a receita antes de enviar fotos.");
            return;
        }

        const uploadId = `${prepIndex}-${lineIndex}`;
        setStepUploadingIndex(uploadId);

        try {
            console.log(`Iniciando upload Vercel Blob para etapa ${prepIndex}, linha ${lineIndex}`);

            // Prefixo único por linha
            const pathPrefix = `recipes/${recipeData.id}/steps/${prepIndex}_line_${lineIndex}`;
            const downloadURL = await uploadToVercelBlob(file, pathPrefix);

            // Atualiza o store
            const currentPrep = recipeData.preparations[prepIndex];
            // Garante array e clona
            let currentPhotos = [...(currentPrep.photos || [])];

            // Preenche buracos com null para evitar undefined (Firestore rejeita undefined)
            if (lineIndex >= currentPhotos.length) {
                // Preenche os índices intermediários
                for (let i = 0; i < lineIndex; i++) {
                    if (currentPhotos[i] === undefined) currentPhotos[i] = null;
                }
            }

            // Coloca a foto na posição exata da linha
            currentPhotos[lineIndex] = downloadURL;

            // Atualiza o estado local/store
            actions.updatePreparation(prepIndex, 'photos', currentPhotos);

            // AUTO-SAVE: Persiste imediatamente no banco de dados
            // Cria uma cópia do array de preparações atualizado para salvar
            const updatedPreparations = [...recipeData.preparations];
            updatedPreparations[prepIndex] = {
                ...updatedPreparations[prepIndex],
                photos: currentPhotos
            };

            // AUTO-SAVE: Persiste imediatamente no banco de dados via API
            console.log("Auto-salvando foto da etapa no Firestore...");
            await saveRecipeToFirestore(recipeData, updatedPreparations);

        } catch (error) {
            console.error("Erro upload Vercel Blob:", error);
            alert(`Erro ao enviar imagem: ${error.message}`);
        } finally {
            setStepUploadingIndex(null);
        }
    };

    const handleDeleteStepImage = (prepIndex, photoIndex) => {
        if (!confirm("Remover esta foto?")) return;

        const currentPrep = recipeData.preparations[prepIndex];
        const newPhotos = [...(currentPrep.photos || [])];
        newPhotos.splice(photoIndex, 1);

        actions.updatePreparation(prepIndex, 'photos', newPhotos);
        actions.updatePreparation(prepIndex, 'photos', newPhotos);
    };

    // === LÓGICA DE FERRAMENTAS ===

    // Carregar ferramentas
    const loadTools = async () => {
        if (availableTools.length > 0) return; // Já carregou
        setLoadingTools(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'ferramentas'));
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setAvailableTools(list);
        } catch (error) {
            console.error("Erro ao carregar ferramentas:", error);
        } finally {
            setLoadingTools(false);
        }
    };

    const openToolModal = (prepIndex, lineIndex) => {
        setActiveToolStep({ prepIndex, lineIndex });
        setToolSearchTerm('');
        setIsToolModalOpen(true);
        loadTools();
    };

    const handleSelectTool = (tool) => {
        if (!activeToolStep) return;
        const { prepIndex, lineIndex } = activeToolStep;

        const currentPrep = recipeData.preparations[prepIndex];
        const currentTools = { ...(currentPrep.tools || {}) };

        // Inicializa array para a linha se não existir
        if (!currentTools[lineIndex]) currentTools[lineIndex] = [];

        // Evita duplicatas na mesma linha
        if (currentTools[lineIndex].some(t => t.id === tool.id)) {
            alert("Ferramenta já adicionada nesta etapa.");
            return;
        }

        // Adiciona ferramenta simplificada
        currentTools[lineIndex].push({
            id: tool.id,
            nome: tool.nome,
            imageUrl: tool.imageUrl,
            codigo: tool.codigo
        });

        // Atualiza store/estado
        actions.updatePreparation(prepIndex, 'tools', currentTools);

        // Auto-save
        const updatedPreparations = [...recipeData.preparations];
        updatedPreparations[prepIndex] = {
            ...updatedPreparations[prepIndex],
            tools: currentTools
        };
        saveRecipeToFirestore(recipeData, updatedPreparations);
    };

    const removeTool = (prepIndex, lineIndex, toolIndex) => {
        const currentPrep = recipeData.preparations[prepIndex];
        const currentTools = { ...(currentPrep.tools || {}) };

        if (currentTools[lineIndex]) {
            currentTools[lineIndex].splice(toolIndex, 1);
            if (currentTools[lineIndex].length === 0) delete currentTools[lineIndex];

            actions.updatePreparation(prepIndex, 'tools', currentTools);

            // Auto-save
            const updatedPreparations = [...recipeData.preparations];
            updatedPreparations[prepIndex] = {
                ...updatedPreparations[prepIndex],
                tools: currentTools
            };
            saveRecipeToFirestore(recipeData, updatedPreparations);
        }
    };

    const filteredTools = toolSearchTerm.trim().length === 0
        ? []
        : availableTools.filter(t =>
            t.nome?.toLowerCase().includes(toolSearchTerm.toLowerCase()) ||
            t.codigo?.toLowerCase().includes(toolSearchTerm.toLowerCase())
        );

    // =============================

    const handleSave = async () => {
        // Salva os campos de texto no store
        actions.setRecipeField('shelf_life', localData.shelf_life);
        actions.setRecipeField('storage_temperature', localData.storage_temperature);
        actions.setRecipeField('ccp_notes', localData.ccp_notes);
        actions.setRecipeField('allergens', localData.allergens);

        // AUTO-SAVE: Persiste no Firestore
        const updatedRecipe = {
            ...recipeData,
            shelf_life: localData.shelf_life,
            storage_temperature: localData.storage_temperature,
            ccp_notes: localData.ccp_notes,
            allergens: localData.allergens
        };

        const success = await saveRecipeToFirestore(updatedRecipe, recipeData.preparations || []);
        if (success) {
            console.log("✅ Controle de Qualidade salvo com sucesso!");
        }

        setIsEditing(false);
    };

    const handlePrint = () => {
        window.print();
    };



    // Coleta todos os ingredientes de todas as preparações para a lista consolidada
    const getAllIngredients = () => {
        if (!recipeData.preparations) return [];

        const allIngs = [];
        recipeData.preparations.forEach(prep => {
            if (prep.ingredients) {
                prep.ingredients.forEach(ing => {
                    // Lógica ajustada para exibir peso "Mise en Place" (Limpo/Pré-Cocção) conforme solicitado pelo usuário
                    // Prioriza: 1. Clean (Limpo), 2. Pre-Cooking (Pré-Cocção), 3. Initial (Bruto)
                    const cleanWeight = RecipeEngine.parseValue(ing.weight_clean);
                    const preCookingWeight = RecipeEngine.parseValue(ing.weight_pre_cooking);
                    const initialWeight = RecipeEngine.getInitialWeight(ing, prep.processes);

                    const weight = preCookingWeight > 0 ? preCookingWeight :
                        cleanWeight > 0 ? cleanWeight :
                            initialWeight;

                    // Se peso validado, usa. Se não, fallback para quantity.
                    const finalQuantity = weight > 0 ? weight : (ing.quantity || 0);

                    allIngs.push({
                        name: ing.name,
                        quantity: finalQuantity,
                        unit: ing.unit || 'kg',
                        prep: prep.name
                    });
                });
            }
        });
        return allIngs;
    };

    const ingredients = getAllIngredients();

    // Coleta todas as ferramentas únicas da receita
    const getAllTools = () => {
        const toolsMap = new Map();
        recipeData.preparations?.forEach(prep => {
            if (prep.tools) {
                Object.values(prep.tools).forEach(lineTools => {
                    lineTools.forEach(tool => {
                        if (!toolsMap.has(tool.id)) {
                            toolsMap.set(tool.id, tool);
                        }
                    });
                });
            }
        });
        return Array.from(toolsMap.values());
    };
    const allTools = getAllTools();

    return (
        <div className="max-w-5xl mx-auto bg-white min-h-screen pb-12 print:p-0 print:max-w-none shadow-lg rounded-xl my-4">
            {/* Força orientação retrato na impressão */}
            <style type="text/css" media="print">
                {`
                @page { size: portrait; margin: 10mm; }
                body { -webkit-print-color-adjust: exact; }
                `}
            </style>

            {/* LAYOUT PRINCIPAL - 2 COLUNAS DESDE O TOPO */}
            <div className="grid md:grid-cols-[350px_1fr] gap-8 p-8 print:grid-cols-[30%_70%] print:gap-6 print:p-4">

                {/* === COLUNA ESQUERDA (FOTO + INGREDIENTES + QUALIDADE) === */}
                {/* Sticky: Fica fixa enquanto o conteúdo da direita cresce */}
                <div className="space-y-6 md:sticky md:top-4 md:self-start">

                    {/* ÁREA DA FOTO (Agora na lateral) */}
                    <div className="relative h-64 w-full bg-gray-900 rounded-xl overflow-hidden group print:h-48 print:rounded-none">
                        {localData.photo_url ? (
                            <img
                                src={localData.photo_url}
                                alt={recipeData.name}
                                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl">
                                <div className="text-center p-4">
                                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-30 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-500">Adicionar Foto</span>
                                </div>
                            </div>
                        )}

                        {/* Botão de Upload (Overlay) */}
                        <div className="absolute bottom-2 right-2 z-10 print:hidden">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 bg-white/90 hover:bg-white text-gray-700 shadow-sm rounded-full"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isMainUploading}
                                title={localData.photo_url ? "Alterar Foto" : "Adicionar Foto"}
                            >
                                {isMainUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* LISTA DE INGREDIENTES */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 print:bg-transparent print:border-none print:p-0">
                        <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-4 flex items-center gap-2 border-b pb-2 border-gray-200">
                            <Utensils className="w-4 h-4" />
                            Ingredientes (Mise en Place)
                        </h3>

                        <ul className="space-y-3 text-sm">
                            {ingredients.map((ing, idx) => (
                                <li key={idx} className="flex justify-between items-start pb-2 border-b border-gray-200 border-dashed last:border-0">
                                    <span className="text-gray-700">{ing.name}</span>
                                    <span className="font-semibold text-gray-900 whitespace-nowrap ml-2">
                                        {/* Formatação inteligente: inteiros para unidades, decimais para kg/L */}
                                        {['unidade', 'un', 'und', 'pcs', 'peça', 'pecas'].includes(ing.unit?.toLowerCase())
                                            ? Math.round(parseFloat(ing.quantity))
                                            : parseFloat(ing.quantity).toFixed(3)
                                        } {ing.unit}
                                    </span>
                                </li>
                            ))}
                            {ingredients.length === 0 && (
                                <li className="text-gray-400 italic text-center py-4">Nenhum ingrediente cadastrado</li>
                            )}
                        </ul>
                    </div>

                    {/* LISTA DE FERRAMENTAS UTILIZADAS (NOVO CARD) */}
                    <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100 print:bg-transparent print:border-none print:p-0">
                        <h3 className="text-xs uppercase tracking-wider text-blue-600 font-bold mb-4 flex items-center gap-2 border-b pb-2 border-blue-200">
                            <Wrench className="w-4 h-4" />
                            Ferramentas Necessárias
                        </h3>

                        <ul className="space-y-2 text-sm">
                            {allTools.map((tool, idx) => {
                                const color = getToolColor(tool.id);
                                const isHighlighted = !!color;

                                return (
                                    <li
                                        key={idx}
                                        onClick={() => toggleToolHighlight(tool.id)}
                                        className={`flex justify-between items-center pb-2 border-b border-dashed last:border-0 rounded-lg transition-all px-3 py-2 cursor-pointer select-none group 
                                        ${isHighlighted
                                                ? `${color.bg} ${color.border} border shadow-sm transform scale-[1.02]`
                                                : 'border-blue-100 hover:bg-gray-50 border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded bg-white border flex items-center justify-center overflow-hidden flex-shrink-0 transition-all ${isHighlighted ? color.border : 'border-gray-200 group-hover:border-orange-200'}`}>
                                                {tool.imageUrl ? (
                                                    <img src={tool.imageUrl} alt={tool.nome} className="w-full h-full object-contain" />
                                                ) : (
                                                    <Wrench className={`w-4 h-4 ${isHighlighted ? color.icon : 'text-gray-300'}`} />
                                                )}
                                            </div>
                                            <span className={`transition-colors font-medium ${isHighlighted ? color.text : 'text-gray-600'}`}>{tool.nome}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isHighlighted && (
                                                <div className={`w-2 h-2 rounded-full ${color.indicator} animate-in zoom-in`} />
                                            )}
                                            <Link
                                                href={`/ferramentas?id=${tool.id}`}
                                                target="_blank"
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors opacity-60 hover:opacity-100"
                                                title="Ver cadastro completo"
                                            >
                                                <Info className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </li>
                                )
                            })}
                            {allTools.length === 0 && (
                                <li className="text-gray-400 italic text-center py-4">Nenhuma ferramenta vinculada</li>
                            )}
                        </ul>
                    </div>

                    {/* CONTROLE DE QUALIDADE */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm print:shadow-none print:border-gray-300">
                        <div className="flex justify-between items-center mb-4 border-b pb-2 border-gray-100">
                            <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Controle de Qualidade
                            </h3>
                            {!isEditing ? (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-blue-600 print:hidden" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="w-3 h-3" />
                                </Button>
                            ) : (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-700 bg-green-50" onClick={handleSave}>
                                    <SaveIcon className="w-3 h-3" />
                                </Button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Validade */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Validade (Shelf Life)</label>
                                {isEditing ? (
                                    <Input
                                        value={localData.shelf_life}
                                        onChange={(e) => setLocalData({ ...localData, shelf_life: e.target.value })}
                                        placeholder="Ex: 24 horas após preparo"
                                        className="h-8 text-sm"
                                    />
                                ) : (
                                    <div className="text-sm font-semibold text-gray-800">{localData.shelf_life || <span className="text-gray-300 italic">Não definido</span>}</div>
                                )}
                            </div>

                            {/* Armazenamento */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Armazenamento</label>
                                {isEditing ? (
                                    <Input
                                        value={localData.storage_temperature}
                                        onChange={(e) => setLocalData({ ...localData, storage_temperature: e.target.value })}
                                        placeholder="Ex: Refrigerado 0°C a 5°C"
                                        className="h-8 text-sm"
                                    />
                                ) : (
                                    <div className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                                        {localData.storage_temperature && <Thermometer className="w-3 h-3 text-blue-500" />}
                                        {localData.storage_temperature || <span className="text-gray-300 italic">Não definido</span>}
                                    </div>
                                )}
                            </div>

                            {/* Alergênicos */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Alergênicos</label>
                                {isEditing ? (
                                    <Textarea
                                        value={localData.allergens}
                                        onChange={(e) => setLocalData({ ...localData, allergens: e.target.value })}
                                        placeholder="Ex: Contém leite. Pode conter traços de soja."
                                        className="text-sm min-h-[60px]"
                                    />
                                ) : (
                                    <div className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                        {localData.allergens || "Nenhum alergênico declarado."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* === COLUNA DIREITA (TÍTULO + INFO + PREPARO) === */}
                <div className="space-y-8">

                    {/* HEADER DA RECEITA */}
                    <div className="border-b border-gray-200 pb-6 print:pb-4">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">{recipeData.name || 'Nova Receita'}</h1>
                                <div className="flex flex-wrap items-center gap-3 text-gray-600 text-sm font-medium">
                                    {recipeData.category && (
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-none hover:bg-blue-200 print:border print:border-gray-300 print:text-black print:bg-transparent">
                                            {recipeData.category}
                                        </Badge>
                                    )}
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-gray-700 print:bg-transparent print:p-0">
                                        <Scale className="w-4 h-4" />
                                        Rendimento: {yieldData.value} {yieldData.unit}
                                    </span>
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-gray-700 print:bg-transparent print:p-0">
                                        <Clock className="w-4 h-4" />
                                        {recipeData.prep_time || 0} min
                                    </span>
                                </div>
                            </div>

                            <div className="hidden md:flex gap-2 print:hidden">
                                {
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={recipeData.video_url ? "text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" : "text-gray-400 border-gray-200 opacity-50"}
                                        onClick={() => recipeData.video_url && window.open(recipeData.video_url, '_blank')}
                                        disabled={!recipeData.video_url}
                                        title={recipeData.video_url ? "Ver Vídeo no YouTube" : "Adicione um link do YouTube na edição"}
                                    >
                                        <Youtube className="w-4 h-4 mr-2" />
                                        Vídeo
                                    </Button>
                                }
                                <Button variant="outline" size="sm" onClick={handlePrint}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* MODO DE PREPARO */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 print:mb-4">
                            <ChefHat className="w-5 h-5 text-orange-500" />
                            Modo de Preparo
                        </h2>

                        <div className="space-y-6 print:space-y-4">
                            {recipeData.instructions ? (
                                <div className="whitespace-pre-wrap text-gray-600 text-sm leading-relaxed border-l-4 border-orange-200 pl-4">
                                    {recipeData.instructions}
                                </div>
                            ) : (
                                recipeData.preparations?.map((prep, idx) => (
                                    <div key={idx} className="relative pl-12 border-l-2 border-orange-100 group hover:border-orange-400 transition-colors ml-2">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-orange-100 border-4 border-white shadow-sm group-hover:bg-orange-500 transition-colors"></div>

                                        {/* Cabeçalho da Etapa com Toggle de Fotos */}
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-bold text-gray-800 text-base flex-1">
                                                {prep.name || prep.title || prep.step_name || prep.etapa || `Etapa ${idx + 1}`}
                                            </h4>

                                            {/* Botão de Recolher/Expandir Fotos */}
                                            <button
                                                onClick={() => setCollapsedPhotos(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors print:hidden"
                                                title={collapsedPhotos[idx] ? "Mostrar Fotos" : "Ocultar Fotos (Somente Texto)"}
                                            >
                                                {collapsedPhotos[idx] ? (
                                                    <ImageIcon className="w-4 h-4" />
                                                ) : (
                                                    <ImageOff className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Renderização Linha a Linha das Instruções com Fotos Individuais */}
                                        <div className="space-y-0.5 mt-1">
                                            {(() => {
                                                // Quebra o texto em linhas
                                                let lines = (prep.instructions || prep.description || "").split('\n').filter(line => line.trim());

                                                // Suporte a numeração manual no texto
                                                if (lines.length === 1 && /\d+\./.test(lines[0])) {
                                                    const splitByNumber = lines[0].split(/(?=\d+\.\s)/).filter(l => l.trim());
                                                    if (splitByNumber.length > 1) lines = splitByNumber;
                                                }

                                                if (lines.length === 0) return <p className="text-gray-500 italic text-sm">Sem instruções definidas.</p>;

                                                // Debug da renderização
                                                // console.log(`Prep ${idx} Photos:`, prep.photos);

                                                return lines.map((line, lineIdx) => {
                                                    const currentPhoto = prep.photos?.[lineIdx];
                                                    const isPhotosHidden = collapsedPhotos[idx];

                                                    // Verifica highlight múltiplo
                                                    const matchingTools = (prep.tools?.[lineIdx] || []).filter(t => highlightedTools.includes(t.id));
                                                    const hasMatch = matchingTools.length > 0;

                                                    // Estilo base
                                                    let containerClasses = "group/line py-1 transition-all duration-300 rounded relative overflow-hidden";
                                                    if (hasMatch) {
                                                        const firstColor = getToolColor(matchingTools[0].id);
                                                        containerClasses += ` shadow-sm pl-4 pr-2 -mx-2 my-1 ${matchingTools.length === 1 ? firstColor.bg + ' ' + firstColor.ring + ' ring-1' : 'bg-gray-50 ring-1 ring-gray-200'}`;
                                                    } else {
                                                        containerClasses += " hover:bg-gray-50/50 px-2 -mx-2";
                                                    }

                                                    return (
                                                        <div key={lineIdx} className={containerClasses}>
                                                            {/* Barra lateral colorida para highlights */}
                                                            {hasMatch && (
                                                                <div className="absolute left-0 top-0 bottom-0 w-2 flex flex-col">
                                                                    {matchingTools.map(t => {
                                                                        const color = getToolColor(t.id);
                                                                        return <div key={t.id} className={`flex-1 w-full ${color.indicator}`} title={t.nome} />;
                                                                    })}
                                                                </div>
                                                            )}
                                                            <div className="flex items-start gap-2">
                                                                {/* Botão de Upload Discreto - Lado Esquerdo (Ao lado do número) */}
                                                                {!isPhotosHidden && (
                                                                    <div className="print:hidden shrink-0 mt-0.5 opacity-0 group-hover/line:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center">
                                                                        {!currentPhoto && (
                                                                            <>
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    className="hidden"
                                                                                    id={`upload-step-${idx}-line-${lineIdx}`}
                                                                                    onChange={(e) => handleStepImageUpload(idx, e, lineIdx)}
                                                                                    disabled={stepUploadingIndex === `${idx}-${lineIdx}`}
                                                                                />
                                                                                <label
                                                                                    htmlFor={`upload-step-${idx}-line-${lineIdx}`}
                                                                                    className="flex items-center justify-center w-5 h-5 rounded-full text-gray-300 hover:text-orange-500 hover:bg-orange-50 cursor-pointer transition-colors"
                                                                                    title="Adicionar foto na linha"
                                                                                >
                                                                                    {stepUploadingIndex === `${idx}-${lineIdx}` ? (
                                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                                    ) : (
                                                                                        <Camera className="w-3 h-3" />
                                                                                    )}
                                                                                </label>
                                                                            </>
                                                                        )}

                                                                        {/* Botão de Ferramenta */}
                                                                        {/* Botão de Ferramenta com Tooltip Customizado */}
                                                                        <button
                                                                            onClick={() => openToolModal(idx, lineIdx)}
                                                                            className={`relative group/btn flex items-center justify-center w-5 h-5 rounded-full cursor-pointer transition-colors ml-1 ${prep.tools?.[lineIdx]?.length > 0 ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50'}`}
                                                                        >
                                                                            <Wrench className="w-3 h-3" />

                                                                            {/* Tooltip flutuante lista as ferramentas */}
                                                                            {prep.tools?.[lineIdx]?.length > 0 && (
                                                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[200px] bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity z-20 shadow-xl">
                                                                                    <div className="font-bold mb-1 border-b border-gray-700 pb-1">Ferramentas:</div>
                                                                                    <ul className="list-disc pl-3 space-y-0.5 text-[10px]">
                                                                                        {prep.tools[lineIdx].map(t => <li key={t.id}>{t.nome}</li>)}
                                                                                    </ul>
                                                                                    {/* Seta do tooltip */}
                                                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                                                                </div>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Texto */}
                                                                <p className="text-gray-700 leading-snug text-sm md:text-base flex-1">
                                                                    {line}
                                                                </p>
                                                            </div>

                                                            {/* Área da Foto - Abaixo do texto */}
                                                            {!isPhotosHidden && currentPhoto && (
                                                                <div className="mt-2 ml-0 md:ml-2">
                                                                    <div className="relative group/line-photo w-full max-w-lg aspect-video rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                                                        <img
                                                                            src={currentPhoto}
                                                                            alt={`Passo ${lineIdx + 1}`}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                        <button
                                                                            onClick={() => handleDeleteStepImage(idx, lineIdx)}
                                                                            className="absolute top-2 right-2 bg-red-500/80 text-white p-1.5 rounded-full opacity-0 group-hover/line-photo:opacity-100 transition-opacity hover:bg-red-600 print:hidden"
                                                                            title="Remover foto"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}


                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                ))
                            )}

                            {(!recipeData.instructions && (!recipeData.preparations || recipeData.preparations.length === 0)) && (
                                <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <p className="text-gray-400">Nenhum modo de preparo cadastrado.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PONTOS CRÍTICOS DE CONTROLE (PCC) */}
                    <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-100 print:bg-white print:border-gray-300 overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-bold text-yellow-800 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Pontos Críticos de Controle (PCC)
                            </h3>
                            {!isEditing && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 print:hidden" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="w-3 h-3" />
                                </Button>
                            )}
                        </div>

                        {isEditing ? (
                            <Textarea
                                value={localData.ccp_notes}
                                onChange={(e) => setLocalData({ ...localData, ccp_notes: e.target.value })}
                                placeholder="Descreva cuidados críticos (temperatura mínima, risco de contaminação cruzada, etc)..."
                                className="text-sm bg-white min-h-[100px]"
                            />
                        ) : (
                            <div className="text-sm text-yellow-900/80 leading-relaxed whitespace-pre-wrap break-words pr-2">
                                {localData.ccp_notes || "Nenhum ponto crítico registrado (ex: Contaminação Cruzada, Temperatura Mínima)."}
                            </div>
                        )}
                    </div>

                </div>
            </div>
            {/* MODAL DE SELEÇÃO DE FERRAMENTAS */}
            {isToolModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 print:hidden">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                        {/* HEADER */}
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-white shrink-0">
                            <h3 className="font-bold text-xl flex items-center gap-2 text-gray-800">
                                <Wrench className="w-5 h-5 text-orange-500" />
                                Selecionar Ferramentas
                            </h3>
                            <button onClick={() => setIsToolModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full p-2">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* CORPO SPLIT */}
                        <div className="flex-1 flex overflow-hidden">

                            {/* COLUNA ESQUERDA: BUSCA */}
                            <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
                                <div className="p-4 border-b">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar ferramenta por nome ou código..."
                                            value={toolSearchTerm}
                                            onChange={(e) => setToolSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all shadow-sm"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                                    {loadingTools ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                            <Loader2 className="w-10 h-10 animate-spin mb-3 text-orange-400" />
                                            <span className="text-sm font-medium">Carregando ferramentas...</span>
                                        </div>
                                    ) : filteredTools.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                                            {toolSearchTerm.trim().length === 0 ? (
                                                <>
                                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                        <Search className="w-8 h-8 text-gray-300" />
                                                    </div>
                                                    <p className="text-gray-500 font-medium">Digite para buscar ferramentas</p>
                                                    <p className="text-xs text-gray-400 mt-1">Busque pelo nome ou código (ex: Faca, FER001)</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Wrench className="w-12 h-12 mb-3 opacity-20" />
                                                    <p className="text-sm font-medium">Nenhuma ferramenta encontrada.</p>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2">
                                            {filteredTools.map(tool => {
                                                // Verifica se já está selecionado
                                                const isSelected = activeToolStep &&
                                                    recipeData.preparations[activeToolStep.prepIndex]?.tools?.[activeToolStep.lineIndex]?.some(t => t.id === tool.id);

                                                return (
                                                    <button
                                                        key={tool.id}
                                                        onClick={() => !isSelected && handleSelectTool(tool)}
                                                        disabled={isSelected}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border shadow-sm transition-all text-left group relative overflow-hidden ${isSelected ? 'bg-blue-50 border-blue-200 opacity-60 cursor-default' : 'bg-white border-gray-100 hover:border-orange-200 hover:shadow-md cursor-pointer'}`}
                                                    >
                                                        <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                                                            {tool.imageUrl ? (
                                                                <img src={tool.imageUrl} alt={tool.nome} className="w-full h-full object-contain" />
                                                            ) : (
                                                                <Wrench className="w-6 h-6 text-gray-300" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0 pr-8">
                                                            <div className={`font-semibold text-sm truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>{tool.nome}</div>
                                                            <div className="text-xs text-gray-500 font-mono mt-0.5">{tool.codigo}</div>
                                                        </div>

                                                        {isSelected ? (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 flex items-center gap-1 bg-blue-100 px-2 py-1 rounded text-xs font-bold">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                OK
                                                            </div>
                                                        ) : (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm border border-orange-100">
                                                                Adicionar
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-gray-50 border-t text-xs text-center text-gray-400 shrink-0">
                                    {filteredTools.length > 0 ? `Encontradas ${filteredTools.length} ferramentas` : 'Lista de ferramentas'}
                                </div>
                            </div>

                            {/* COLUNA DIREITA: SELECIONADOS */}
                            <div className="w-[320px] bg-gray-50 flex flex-col border-l border-gray-200 shadow-inner">
                                <div className="p-4 border-b bg-gray-100/50 flex justify-between items-center">
                                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Selecionados</h4>
                                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {activeToolStep && (recipeData.preparations[activeToolStep.prepIndex]?.tools?.[activeToolStep.lineIndex]?.length || 0)}
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 content-start">
                                    {(!activeToolStep || !recipeData.preparations[activeToolStep.prepIndex]?.tools?.[activeToolStep.lineIndex] ||
                                        recipeData.preparations[activeToolStep.prepIndex].tools[activeToolStep.lineIndex].length === 0) ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-4 opacity-50">
                                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                                <Utensils className="w-8 h-8" />
                                            </div>
                                            <p className="text-gray-600 text-sm font-medium">Nenhuma ferramenta<br />selecionada</p>
                                            <p className="text-xs text-gray-400 mt-2">Selecione itens na lista ao lado para vincular a esta etapa.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {recipeData.preparations[activeToolStep.prepIndex].tools[activeToolStep.lineIndex].map((tool, tIdx) => (
                                                <div key={`${tool.id}-${tIdx}`} className="bg-white border border-gray-200 rounded-xl p-2 flex items-center gap-3 shadow-sm group hover:border-red-200 transition-colors">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        {tool.imageUrl ? (
                                                            <img src={tool.imageUrl} alt={tool.nome} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <Wrench className="w-4 h-4 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-gray-800 truncate">{tool.nome}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono">{tool.codigo}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeTool(activeToolStep.prepIndex, activeToolStep.lineIndex, tIdx)}
                                                        className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Remover"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="p-4 bg-white border-t flex justify-end gap-3 shrink-0">
                            <Button
                                onClick={() => setIsToolModalOpen(false)}
                                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                            >
                                Concluir
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

