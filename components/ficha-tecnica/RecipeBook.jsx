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
    Youtube
} from 'lucide-react';
import { useRecipeStore } from '@/hooks/ficha-tecnica/useRecipeStore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from '@/lib/firebase';
import { cn } from "@/lib/utils";

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
    };

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

                                                    return (
                                                        <div key={lineIdx} className="group/line py-0.5">
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
        </div>
    );
}
