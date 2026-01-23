'use client';

import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

import React, { useCallback, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Card, CardContent, CardHeader, CardTitle, CardFooter,
  Input,
  Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Textarea,
  Badge,
  useToast
} from "@/components/ui";
import {
  Plus,
  Trash2,
  Save,
  CookingPot,
  Settings,
  Printer,
  Search,
  ClipboardList,
  ClipboardCheck,
  FilePlus,
  Loader2,
  Edit,
  List,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  StickyNote,
  ChevronsUpDown,
  Package2
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CategoryTree } from "@/app/api/entities";
import { cn } from "@/lib/utils";

// Componente de refresh
import { RefreshButton } from "@/components/ui/refresh-button";

// Componente de criaÃ§Ã£o de processo
import ProcessCreatorModalComponent from "./ProcessCreatorModal";
import ProcessEditModal from "./ProcessEditModal"; // Nova Importação

// Drag and Drop


// Hooks customizados organizados
import {
  useRecipeState,
  useRecipeOperations,
  useRecipeInterface,
  useRecipeCalculations,
  useRecipeSearch,
  useRecipeConfig,
  useRecipeCategories
} from "@/hooks/ficha-tecnica";
import { useIngredientSearch } from "@/hooks/ficha-tecnica/useIngredientSearch";
import useRecipeZustandStore from '@/lib/recipe-engine/RecipeStore.js';
import { formatCurrency, formatWeight } from "@/lib/formatUtils";
import { RECIPE_TYPES } from "@/lib/recipeConstants";
import {
  calculateRecipeMetrics,
  updateRecipeMetrics,
  calculateCubaCost,
  updatePreparationsMetrics
} from "@/lib/recipeMetricsCalculator";
import { highlightSearchTerm } from "@/lib/searchUtils";


// Componentes organizados
import ProcessCreatorModal from "./ProcessCreatorModal";
import IngredientTable from "./IngredientTable";
import { RecipeSelectorContent } from "./RecipeSelectorModal";
import AddAssemblyItemModal from "./AddAssemblyItemModal";
import RecipeTechnicalPrintDialog from "./RecipeTechnicalPrintDialog";
import RecipeCollectDialog from "./RecipeCollectDialog";
import RecipeSimplePrintDialog from "./RecipeSimplePrintDialog";
import DraggablePreparationList from "./DraggablePreparationList";
import { IngredientSelectorContent } from "./IngredientSelectorContent";
export default function RecipeTechnical() {
  const { toast } = useToast();

  // ==== HOOKS DE ESTADO (CONECTADOS) ====
  const {
    // Estados principais
    loading, setLoading,
    saving, setSaving,
    error, setError,
    isEditing, setIsEditing,
    currentRecipeId, setCurrentRecipeId,
    isDirty, setIsDirty,

    // Estados de dados
    recipeData, setRecipeData,
    preparationsData, setPreparationsData,
    groups, setGroups,

    // Estados de interface
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    searchOpen, setSearchOpen,


    // Estados de modais
    searchModalOpen, setSearchModalOpen,
    isProcessCreatorOpen, setIsProcessCreatorOpen,
    isAssemblyItemModalOpen, setIsAssemblyItemModalOpen,
    isRecipeCopyModalOpen, setIsRecipeCopyModalOpen,
    isDetailedProcessDialogOpen, setDetailedProcessDialogOpen,
    isPrintDialogOpen, setIsPrintDialogOpen,
    isPrintCollectDialogOpen, setIsPrintCollectDialogOpen,
    isPrintSimpleDialogOpen, setIsPrintSimpleDialogOpen,

    // Estados de dados externos
    categories, setCategories,
    ingredients, setIngredients,
    recipes, setRecipes,
    allCategories, setAllCategories,
    selectedCategory, setSelectedCategory,

    // Estados de processos
    selectedProcesses, setSelectedProcesses,
    currentPrepIndex, setCurrentPrepIndex,
    currentPrepIndexForAssembly, setCurrentPrepIndexForAssembly,
    currentItemType, setCurrentItemType,

    // Estados de ingredientes
    ingredientSearchTerm, setIngredientSearchTerm,
    currentIngredient, setCurrentIngredient,
    processFormData, setProcessFormData,

    // Estados de cÃ³pia de receita
    sourceRecipeSearch, setSourceRecipeSearch,
    selectedSourceRecipe, setSelectedSourceRecipe,
    filteredSourceRecipes, setFilteredSourceRecipes,
    selectedStageLevel, setSelectedStageLevel,
    sourceRecipeStages, setSourceRecipeStages,
    recipePreview, setRecipePreview,

    // FunÃ§Ãµes de reset
    resetModals,
    resetRecipeData
  } = useRecipeState();

  // Estados para Modal de Edição de Processos
  const [isProcessEditModalOpen, setIsProcessEditModalOpen] = useState(false);
  const [processEditData, setProcessEditData] = useState({ prepIndex: null, initialProcesses: [] });

  // Filters for recipe selector - Memoized to prevent re-renders
  const recipeSelectorFilters = React.useMemo(() => ({ type: 'receitas' }), []);

  // ==== SANITIZATION EFFECT ====
  // Fixes "zombie" items that might have been created without IDs in previous versions
  useEffect(() => {
    if (preparationsData && preparationsData.length > 0) {
      const hasMissingIds = preparationsData.some(p => !p.id);
      if (hasMissingIds) {
        console.warn("Sanitizing preparations: Found items without IDs. Fixing...");
        setPreparationsData(prev => prev.map((p, index) => ({
          ...p,
          id: p.id || String(Date.now() + index) // Ensure unique ID
        })));
      }
    }
  }, [preparationsData, setPreparationsData]);

  // ==== HOOKS DE OPERAÃ‡Ã•ES (CONECTADOS) ====
  const {
    parseNumericValue,
    addPreparation,
    updatePreparation,
    removePreparation,
    addIngredientToPreparation,
    updateIngredient,
    removeIngredient,
    updateRecipe,
    removeRecipe,
    addSubComponent,
    updateSubComponent,
    removeSubComponent,
    saveRecipe,
    loadRecipe
  } = useRecipeOperations();

  const handleOpenProcessEditModal = useCallback((prepIndex, currentProcesses) => {
    setProcessEditData({ prepIndex, initialProcesses: currentProcesses || [] });
    setIsProcessEditModalOpen(true);
  }, []);

  const handleUpdateProcesses = useCallback((newProcesses) => {
    if (processEditData.prepIndex !== null) {
      setPreparationsData(prev => {
        const newPreparations = [...prev];
        if (newPreparations[processEditData.prepIndex]) {
          newPreparations[processEditData.prepIndex] = {
            ...newPreparations[processEditData.prepIndex],
            processes: newProcesses
          };
        }
        return newPreparations;
      });
      setIsDirty(true);
    }
  }, [processEditData.prepIndex]);

  // Função de Sincronização - REFATORADA para usar source_recipe_id
  const handleSyncPreparation = useCallback(async (prepIndex) => {
    const prep = preparationsData[prepIndex];
    if (!prep) return;

    // Identificar IDs únicos de receitas fonte (nova estrutura)
    const sourceIds = [...new Set([
      prep.source_recipe_id, // ID na preparação
      ...(prep.ingredients?.map(i => i.source_recipe_id).filter(Boolean) || [])
    ].filter(Boolean))];

    console.log("[SYNC] Source Recipe IDs:", sourceIds);

    if (sourceIds.length === 0) {
      toast({ title: "Nada para sincronizar", description: "Esta etapa não possui vínculo com receita base." });
      return;
    }

    try {
      toast({ title: "Sincronizando...", description: "Buscando atualizações da receita base." });

      // Buscar receitas fonte atualizadas
      const sourceRecipes = {};
      for (const id of sourceIds) {
        const docRef = doc(db, "Recipe", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          sourceRecipes[id] = { id: docSnap.id, ...docSnap.data() };
          console.log("[SYNC] Loaded source recipe:", sourceRecipes[id].name);
        }
      }

      if (Object.keys(sourceRecipes).length === 0) {
        toast({ title: "Erro", description: "Receita base não encontrada.", variant: "destructive" });
        return;
      }

      // Construir mapa de ingredientes da fonte para lookup
      // Chave: ingredient_id (ID base do insumo, não o ID único da instância)
      const sourceIngredientMap = new Map();
      for (const recipe of Object.values(sourceRecipes)) {
        (recipe.preparations || []).forEach(p => {
          (p.ingredients || []).forEach(ing => {
            // Usar ingredient_id como chave primária (fallback para id)
            const key = ing.ingredient_id || ing.id;
            if (key) {
              sourceIngredientMap.set(key, {
                ...ing,
                _sourceRecipeId: recipe.id,
                _sourceRecipeName: recipe.name
              });
            }
          });
        });
      }

      // Atualizar ingredientes existentes mantendo estrutura
      const updatedIngredients = (prep.ingredients || []).map(ing => {
        // Se tem source_ingredient_id, buscar atualização
        if (ing.source_ingredient_id) {
          const sourceIng = sourceIngredientMap.get(ing.source_ingredient_id);
          if (sourceIng) {
            const parseNum = (val) => {
              if (val === undefined || val === null) return 0;
              return parseFloat(String(val).replace(',', '.')) || 0;
            };

            // Calcular proporções do pai
            const parentRaw = parseNum(sourceIng.weight_raw);
            const parentClean = parseNum(sourceIng.weight_clean) || parentRaw;
            const parentPreCook = parseNum(sourceIng.weight_pre_cooking) || parentClean;
            const parentCooked = parseNum(sourceIng.weight_cooked) || parentPreCook;

            const childRaw = parseNum(ing.weight_raw);

            // Aplicar proporções
            const cleanRatio = parentRaw > 0 ? parentClean / parentRaw : 1;
            const preCookRatio = parentClean > 0 ? parentPreCook / parentClean : 1;
            const cookRatio = parentPreCook > 0 ? parentCooked / parentPreCook : 1;

            const newCleanVal = childRaw * cleanRatio;
            const newPreCookVal = newCleanVal * preCookRatio;

            const newClean = newCleanVal.toFixed(3);
            const newPreCook = newPreCookVal.toFixed(3);
            const newCooked = (newPreCookVal * cookRatio).toFixed(3);

            return {
              ...ing,
              // Atualizar campos de custo
              price: sourceIng.price,
              cost_clean: sourceIng.cost_clean,
              // Atualizar pesos com proporções
              weight_clean: newClean,
              weight_pre_cooking: newPreCook,
              weight_cooked: newCooked,
              // Manter rastreamento
              source_recipe_id: sourceIng._sourceRecipeId,
              source_recipe_name: sourceIng._sourceRecipeName
            };
          }
        }
        // Ingrediente manual ou sem link - manter como está
        return ing;
      });

      // Atualizar state
      setPreparationsData(prev => {
        const newData = [...prev];
        if (newData[prepIndex]) {
          newData[prepIndex] = {
            ...newData[prepIndex],
            ingredients: updatedIngredients
          };
        }
        return newData;
      });

      setIsDirty(true);
      toast({
        title: "Sincronizado!",
        description: `${updatedIngredients.length} ingredientes atualizados.`,
        className: "bg-green-100 border-green-500"
      });

    } catch (error) {
      console.error("[SYNC] Error:", error);
      toast({ title: "Erro", description: "Falha ao sincronizar receita.", variant: "destructive" });
    }

  }, [preparationsData]);

  // ==== HOOKS DE INTERFACE (CONECTADOS) ====
  const updateRecipeData = useCallback((key, value) => {
    setRecipeData(prev => ({
      ...prev,
      [key]: value
    }));
  }, [setRecipeData]);

  const {
    handleTabChange,
    handleSearchFocus,
    handleSearchBlur,
    openModal,
    closeModal,
    openProcessCreatorModal,
    closeProcessCreatorModal,
    handleInputChange,
    handleSelectChange,
    handleNumberInputChange,
    handleProcessSelection,
    handleSave,
    handleClear,
    formatDisplayValue
  } = useRecipeInterface({
    recipeData,
    preparationsData,
    updateRecipeData
  });

  // ==== HOOKS DE CÃLCULOS (CONECTADOS) ====
  const {
    calculateRecipeMetrics: hookCalculateRecipeMetrics,
    formatters
  } = useRecipeCalculations();

  // ==== HOOKS DE BUSCA (CONECTADOS) ====
  const {
    searchQuery: searchQueryRecipe,
    searchOpen: searchOpenRecipe,
    filteredRecipes,
    loading: searchLoading,
    handleSearchChange,
    handleSearchFocus: handleSearchFocusRecipe,
    handleSearchBlur: handleSearchBlurRecipe,
    handleRecipeSelect,
    getSearchStats,
    refreshRecipes,
    setSearchQuery: setRecipeSearchQuery
  } = useRecipeSearch();

  // ==== HOOKS DE CONFIGURAÃ‡ÃƒO (CONECTADOS) ====
  const {
    config,
    configSaving,
    loading: configLoading,
    categoryTypes,
    selectedCategoryType,
    updateConfig,
    saveConfiguration,
    saveRecipe: saveRecipeConfig,
    getProcessTypes,
    setSelectedCategoryType
  } = useRecipeConfig();

  // ==== HOOKS DE CATEGORIAS (CONECTADOS) ====
  const {
    categories: availableCategories,
    loading: categoriesLoading,
    error: categoriesError,
    getCategoryInfo,
    getCategoryDisplayName,
    getCategoriesWithCurrent,
    reloadCategories
  } = useRecipeCategories();

  // ==== HOOKS DE INGREDIENTES (CONECTADOS) ====
  const {
    ingredients: availableIngredients,
    loading: ingredientsLoading,
    searchTerm: ingredientModalSearchTerm,
    filteredIngredients,
    handleSearchChange: handleIngredientSearchChange,
    loadIngredients,
    getIngredientById,
    clearSearch: clearIngredientSearch
  } = useIngredientSearch();

  // Estados para modal de ingredientes
  const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
  const [currentPrepIndexForIngredient, setCurrentPrepIndexForIngredient] = useState(null);

  // Estados para modal de embalagens (Packaging)
  const [packagingModalOpen, setPackagingModalOpen] = useState(false);
  const [currentPrepIndexForPackaging, setCurrentPrepIndexForPackaging] = useState(null);

  // Estados para modal de receitas
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [currentPrepIndexForRecipe, setCurrentPrepIndexForRecipe] = useState(null);

  // Ref para o input de nome da receita
  const nameInputRef = useRef(null);



  // ==== STATES FOR SMART CATEGORY SELECTOR ====
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [groupedCategories, setGroupedCategories] = useState([]);

  useEffect(() => {
    loadCategoriesTree();
  }, [recipeData.type]); // Reload when type changes

  const loadCategoriesTree = async () => {
    try {
      const data = await CategoryTree.list();
      const currentType = recipeData.type || 'receitas';

      // Filter only recipe categories of the selected type
      const recipeCats = data.filter(cat => cat.type === currentType && cat.active !== false);

      const roots = recipeCats
        .filter(c => c.level === 1)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const groups = roots.map(root => {
        // Flatten descendants
        const buildDescendants = (cats, parentId, prefix) => {
          let list = [];
          const children = cats
            .filter(c => c.parent_id === parentId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          for (const child of children) {
            const label = `${prefix} > ${child.name}`;
            list.push({
              value: child.id,
              label: label,
              originalName: child.name,
              id: child.id
            });
            list = [...list, ...buildDescendants(cats, child.id, label)];
          }
          return list;
        };

        const descendants = buildDescendants(recipeCats, root.id, root.name);

        // The root itself is also an option
        const rootItem = {
          value: root.id,
          label: root.name,
          originalName: root.name,
          id: root.id,
          isRoot: true
        };

        return {
          groupName: root.name,
          items: [rootItem, ...descendants]
        };
      });

      setGroupedCategories(groups);

    } catch (error) {
      console.error("Erro ao carregar Ã¡rvore de categorias", error);
    }
  };

  const getSelectedCategoryLabel = () => {
    if (!recipeData.category) return "Selecione a categoria";
    const found = groupedCategories.flatMap(g => g.items).find(c => c.originalName === recipeData.category);
    return found ? found.label : recipeData.category;
  };

  const handleSmartCategorySelect = (originalName) => {
    handleCategoryChange(originalName);
    setCategorySelectorOpen(false);
  };

  // ==== FUNÃ‡Ã•ES DE CARREGAMENTO (como no Editar Cliente) ====
  const loadRecipeById = async (recipeId) => {
    if (!recipeId) return;

    try {
      setLoading(true);

      const result = await loadRecipe(recipeId);

      console.log('ðŸ”´ [LOAD] Receita carregada do Firebase:', {
        recipeId,
        success: result.success,
        preparations: result.preparations?.map(p => ({
          id: p.id,
          title: p.title,
          notes: p.notes
        }))
      });

      if (result.success) {

        // Atualizar estados com os dados da receita (como no Editar Cliente)
        setRecipeData(result.recipe);
        setPreparationsData(result.preparations || []);
        setCurrentRecipeId(recipeId);
        setIsEditing(true);
        setIsDirty(false);

        toast({
          title: "Receita carregada",
          description: `"${result.recipe.name}" foi carregada para ediÃ§Ã£o.`
        });
      } else {
        toast({
          title: "Erro ao carregar",
          description: "NÃ£o foi possÃ­vel carregar a receita.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // ==== HANDLERS ESPECÃFICOS ====
  const handleRecipeInputChange = (e) => {
    handleInputChange(setRecipeData, e);
    setIsDirty(true);
  };

  const handleCategoryChange = (value) => {
    handleSelectChange(setRecipeData, 'category', value);
    setIsDirty(true);
  };

  // ==== HELPER DE ATUALIZAÃ‡ÃƒO DE MATRIZ ====
  const refreshMatrixRecipes = async (preparations) => {
    let updatedPreparations = JSON.parse(JSON.stringify(preparations));
    let hasUpdates = false;

    // Iterar sobre todas as preparaÃ§Ãµes
    for (let pIndex = 0; pIndex < updatedPreparations.length; pIndex++) {
      const prep = updatedPreparations[pIndex];

      // Verificar se hÃ¡ sub-componentes que sÃ£o receitas importadas (Matriz)
      if (prep.sub_components && prep.sub_components.length > 0) {

        for (let sIndex = 0; sIndex < prep.sub_components.length; sIndex++) {
          const subComp = prep.sub_components[sIndex];

          // Se tiver origin_id, significa que Ã© uma receita importada E vinculada
          if (subComp.origin_id) {
            try {
              console.log(`ðŸ”„ [MATRIX] Verificando atualizaÃ§Ãµes para: ${subComp.name} (${subComp.origin_id})`);

              // Buscar dados frescos da receita original
              const recipeRef = doc(db, 'Recipe', subComp.origin_id);
              const recipeSnap = await getDoc(recipeRef);

              if (recipeSnap.exists()) {
                const freshRecipeData = recipeSnap.data();

                // Calcular peso ALVO atual nesta preparaÃ§Ã£o
                // Se user editou "assembly_weight_kg", esse Ã© o alvo.
                // Se nÃ£o, usamos o peso atual calculado (yield_weight se for receita)
                const targetWeightInDerived = parseNumericValue(subComp.assembly_weight_kg) || parseNumericValue(subComp.input_yield_weight) || 0;

                // Peso original da receita fresca
                const freshYieldWeight = parseNumericValue(freshRecipeData.yield_weight) || 0;

                // Escalar apenas se tivermos pesos vÃ¡lidos
                if (targetWeightInDerived > 0 && freshYieldWeight > 0) {
                  // Calcular fator de escala para converter a receita fresca para o peso alvo desta ficha
                  // targetWeightInDerived (ex: 2kg) / freshYieldWeight (ex: 10kg) = 0.2
                  const scalingFactor = targetWeightInDerived / freshYieldWeight;

                  // Atualizar valores do sub-componente
                  // NÃƒO ATUALIZAMOS SUB-COMPONENTES DENTRO DO SUB-COMPONENTE (Deep nesting nÃ£o suportado no nÃ­vel de ficha tecninca simples)
                  // Mas atualizamos os custos base

                  // Se a receita mudou de preÃ§o, atualizamos
                  const freshTotalCost = parseNumericValue(freshRecipeData.total_cost) || 0;

                  // Atualizar os inputs baseados na nova receita escalada
                  prep.sub_components[sIndex] = {
                    ...subComp,
                    // Manter o nome original ou atualizar se a matriz mudou de nome? Vamos manter para nÃ£o confundir.
                    // Atualizar custos unitÃ¡rios/totais base
                    input_yield_weight: String(freshRecipeData.yield_weight).replace('.', ','),
                    input_total_cost: String(freshRecipeData.total_cost).replace('.', ','),

                    // Manter o peso de montagem (Ã© a definiÃ§Ã£o desta ficha)
                    assembly_weight_kg: subComp.assembly_weight_kg,

                    // Recalcular custos proporcionais?
                    // O RecipeCalculator farÃ¡ isso depois, aqui sÃ³ garantimos que os dados base (input_*) sÃ£o os mais novos da matriz
                  };

                  console.log(`âœ… [MATRIX] Atualizado ${subComp.name}: Peso Base ${freshYieldWeight}kg -> Alvo ${targetWeightInDerived}kg`);
                  hasUpdates = true;
                }
              }
            } catch (error) {
              console.error(`âŒ [MATRIX] Erro ao buscar receita ${subComp.name}:`, error);
            }
          }
        }
      }
    }

    return { updatedPreparations, hasUpdates }; // Retornar objeto para saber se houve mudanÃ§as
  };

  const handlePrepTimeChange = (e) => {
    handleNumberInputChange(setRecipeData, 'prep_time', e.target.value);
    setIsDirty(true);
  };

  const handleSaveRecipe = async () => {
    if (!recipeData.name || recipeData.name.trim() === '') {
      toast({ title: "Erro de validaÃ§Ã£o", description: "O nome da receita Ã© obrigatÃ³rio.", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      // Limpar notas vazias antes de salvar (apenas notas sem conteÃºdo)
      const cleanedPreparations = preparationsData.map(prep => ({
        ...prep,
        notes: (prep.notes || []).filter(note => note.content && note.content.trim())
      }));

      console.log('ðŸ”µ [SAVE] PreparaÃ§Ãµes limpas antes de salvar:', JSON.stringify(cleanedPreparations.map(p => ({
        id: p.id,
        title: p.title,
        notes: p.notes
      })), null, 2));

      let finalPreparationsData = JSON.parse(JSON.stringify(cleanedPreparations));
      let recipeDataToSave = { ...recipeData };

      // ðŸ”„ SYNC MATRIZ: Atualizar receitas importadas antes de salvar
      try {
        const { updatedPreparations: matrixUpdatedPreps, hasUpdates } = await refreshMatrixRecipes(finalPreparationsData);
        if (hasUpdates) {
          finalPreparationsData = matrixUpdatedPreps;
          toast({
            title: "Receitas Matriz Sincronizadas",
            description: "Os valores base foram atualizados com as versÃµes mais recentes.",
            className: "bg-blue-50 border-blue-200 text-blue-800"
          });
        }
      } catch (err) {
        console.error("Erro ao sincronizar matrizes:", err);
      }

      // OBRIGATÃ“RIO: Recalcular mÃ©tricas ANTES de qualquer lÃ³gica de escala
      // Isso garante que total_yield_weight_prep esteja atualizado com as mudanÃ§as recentes nos ingredientes
      const freshMetrics = updateRecipeMetrics(finalPreparationsData, recipeData, recipeData);
      if (freshMetrics.updatedPreparations) {
        finalPreparationsData = freshMetrics.updatedPreparations;
      }

      // AUTO-ESCALA V2: Escalar cada etapa individualmente baseado no peso definido na montagem
      const finalAssemblyStep = finalPreparationsData.slice().reverse().find(p => p.processes?.some(pr => ['assembly', 'portioning'].includes(pr)));

      if (finalAssemblyStep && finalAssemblyStep.sub_components && finalAssemblyStep.sub_components.length > 0 && finalAssemblyStep.assembly_config) {

        const unitsQuantity = parseNumericValue(finalAssemblyStep.assembly_config.units_quantity) || 1;
        const weightFields = ['weight_frozen', 'weight_thawed', 'weight_raw', 'weight_clean', 'weight_pre_cooking', 'weight_cooked', 'weight_portioned'];

        // Iterar sobre cada componente da montagem e escalar sua fonte individualmente
        finalAssemblyStep.sub_components.forEach(sc => {
          // Peso ALVO deste componente (considerando quantidade de unidades na receita final)
          const componentTargetWeight = (parseNumericValue(sc.assembly_weight_kg) || 0) * unitsQuantity;

          if (componentTargetWeight <= 0) return;

          if (sc.type !== 'recipe') {
            // Se for ETAPA (Preparation)
            const sourcePrep = finalPreparationsData.find(p => p.id === sc.source_id);

            if (sourcePrep) {
              // Calcular peso ATUAL da etapa
              const currentPrepWeight = sourcePrep.total_yield_weight_prep || 0;

              if (currentPrepWeight > 0 && Math.abs(componentTargetWeight - currentPrepWeight) > 0.001) {
                const scalingFactor = componentTargetWeight / currentPrepWeight;

                // Escalar INGREDIENTES
                if (sourcePrep.ingredients) {
                  sourcePrep.ingredients = sourcePrep.ingredients.map(ing => {
                    const scaledIng = { ...ing };
                    weightFields.forEach(field => {
                      if (scaledIng[field]) {
                        const value = parseNumericValue(scaledIng[field]);
                        if (value > 0) {
                          scaledIng[field] = String((value * scalingFactor).toFixed(3)).replace('.', ',');
                        }
                      }
                    });
                    return scaledIng;
                  });
                }

                // Escalar RECEITAS internas da etapa
                if (sourcePrep.recipes) {
                  sourcePrep.recipes = sourcePrep.recipes.map(recipe => {
                    const scaledRecipe = { ...recipe };
                    if (scaledRecipe.used_weight) {
                      const value = parseNumericValue(scaledRecipe.used_weight);
                      if (value > 0) {
                        scaledRecipe.used_weight = String((value * scalingFactor).toFixed(3)).replace('.', ',');
                      }
                    }
                    return scaledRecipe;
                  });
                }
              }
            }
          }
        });

        toast({
          title: "Auto-Escala Aplicada",
          description: "Os ingredientes foram ajustados individualmente."
        });
      }

      const newMetrics = updateRecipeMetrics(finalPreparationsData, recipeDataToSave, recipeDataToSave);

      // REFATORADO: Extrair parent_recipes usando serviço centralizado
      const { extractParentRecipes } = await import('@/lib/services/recipeImportService');
      const parentRecipes = extractParentRecipes(finalPreparationsData);
      // (Lógica de heurísticas removida - sistema refatorado)

      recipeDataToSave = {
        ...recipeDataToSave,
        ...newMetrics,
        parent_recipes: parentRecipes // Nova estrutura limpa
      };

      console.log('ðŸŸ¢ [SAVE] Enviando para saveRecipeConfig:', JSON.stringify(finalPreparationsData.map(p => ({
        id: p.id,
        title: p.title,
        notes: p.notes
      })), null, 2));

      const result = await saveRecipeConfig(recipeDataToSave, finalPreparationsData);

      console.log('ðŸŸ¡ [SAVE] Resultado do saveRecipeConfig:', result.success);

      if (result.success) {
        setIsDirty(false);
        toast({ title: "Receita Salva", description: `"${result.recipe.name}" foi salva com sucesso.` });

        // REFATORADO: Propagar mudanças usando serviço centralizado (Client-Side)
        // O erro de IndexedDB foi corrigido no firebase.js
        if (result.recipe && result.recipe.id) {
          const { propagateChangesToChildren } = await import('@/lib/services/recipePropagationService');

          propagateChangesToChildren(result.recipe.id, result.recipe).then(propagationResult => {
            if (propagationResult.count > 0) {
              toast({
                title: "AtualizaÃ§Ã£o em Cadeia",
                description: `Atualizadas ${propagationResult.count} receitas derivadas.`,
                className: "bg-blue-100 border-blue-500"
              });
            }
          }).catch(err => {
            console.error('Erro na propagaÃ§Ã£o:', err);
          });
        }

        setPreparationsData(finalPreparationsData);
        setRecipeData(recipeDataToSave);

        if (result.recipe && result.recipe.id && !recipeData.id) {
          setCurrentRecipeId(result.recipe.id);
          setIsEditing(true);
        }

        try {
          await refreshRecipes();
          if (isEditing && recipeDataToSave.name) {
            setRecipeSearchQuery(recipeDataToSave.name);
          }
        } catch (error) {
          console.error("Falha ao atualizar a lista de receitas apÃ³s salvar.", error);
        }
      }
    } catch (error) {
      toast({ title: "Erro inesperado", description: "Ocorreu um erro inesperado ao salvar a receita.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClearRecipe = () => {
    handleClear(resetRecipeData, resetModals, setActiveTab);
    // Forçar a aba correta e dar foco no nome
    setActiveTab('dados-tecnicos');
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 100);
  };

  const handleRefresh = () => {
    if (currentRecipeId) {
      loadRecipeById(currentRecipeId);
    } else {
      toast({
        title: "Nenhuma receita selecionada",
        description: "Por favor, busque e selecione uma receita para atualizar.",
        variant: "destructive"
      });
    }
  };

  // ==== FUNÃ‡ÃƒO DE RECÃLCULO AUTOMÃTICO ====
  const recalculateRecipeMetrics = useCallback(() => {
    const hasValidData = (preparationsData && preparationsData.length > 0) ||
      (recipeData && (recipeData.name || recipeData.id));

    if (!hasValidData) {
      return;
    }

    try {
      if (!preparationsData || preparationsData.length === 0) {
        // ... (o cÃ³digo para zerar as mÃ©tricas permanece o mesmo)
        return;
      }

      const metricsResult = updateRecipeMetrics(preparationsData, recipeData, recipeData);

      const newMetrics = metricsResult;
      const hasSignificantChange =
        Math.abs((newMetrics.total_weight || 0) - (recipeData.total_weight || 0)) > 0.001 ||
        Math.abs((newMetrics.total_cost || 0) - (recipeData.total_cost || 0)) > 0.01 ||
        Math.abs((newMetrics.cuba_cost || 0) - (recipeData.cuba_cost || 0)) > 0.01;

      if (hasSignificantChange) {
        setRecipeData(prev => {
          const updatedData = {
            ...prev,
            total_weight: newMetrics.total_weight,
            total_cost: newMetrics.total_cost,
            cost_per_kg_raw: newMetrics.cost_per_kg_raw,
            cost_per_kg_yield: newMetrics.cost_per_kg_yield,
            weight_field_name: newMetrics.weight_field_name,
            cost_field_name: newMetrics.cost_field_name,
            yield_weight: newMetrics.yield_weight,
            cuba_weight: newMetrics.cuba_weight,
            cuba_cost: newMetrics.cuba_cost
          };
          return updatedData;
        });

        if (metricsResult.updatedPreparations) {
          setPreparationsData(metricsResult.updatedPreparations);
        }

        setIsDirty(true);
      }
    } catch (error) {
      console.error("[UI] Error during recalculateRecipeMetrics:", error);
    }
  }, [preparationsData, recipeData, setRecipeData, setPreparationsData, setIsDirty]);

  // ==== EFFECT PARA RECÃLCULO AUTOMÃTICO (DEBOUNCED) ====
  useEffect(() => {
    const handler = setTimeout(() => {
      recalculateRecipeMetrics();
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [preparationsData, recalculateRecipeMetrics]);

  // ==== EFFECT PARA DEBUG DOS ESTADOS INICIAIS ====
  // Debug effect removed for production

  // ==== EFFECT PARA RECÃLCULO AUTOMÃTICO (REMOVIDO) ====
  // O useEffect a seguir foi removido para evitar o recÃ¡lculo automÃ¡tico dos
  // ingredientes a cada alteraÃ§Ã£o, o que impedia a ediÃ§Ã£o manual dos campos.
  // O cÃ¡lculo agora Ã© feito apenas ao salvar a receita.

  // ==== EFFECT PARA REFRESH AUTOMÃTICO DE INGREDIENTES ====
  useEffect(() => {
    // Refresh automÃ¡tico de ingredientes quando componente monta
    const refreshIngredients = async () => {
      try {
        await useRecipeZustandStore.getState().refreshIngredientsIfNeeded();
      } catch (error) {
      }
    };

    refreshIngredients();

    // Refresh periÃ³dico a cada 30 segundos se a pÃ¡gina estiver ativa
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshIngredients();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // ==== EFFECT PARA CARREGAR RECEITA DA URL ====
  const searchParams = useSearchParams();
  const hasLoadedFromUrl = React.useRef(false);

  useEffect(() => {
    const recipeId = searchParams.get('id');

    // SÃ³ carrega uma vez quando hÃ¡ ID na URL e ainda nÃ£o carregou
    if (recipeId && !hasLoadedFromUrl.current) {
      hasLoadedFromUrl.current = true;
      loadRecipeById(recipeId);
    }
  }, [searchParams]);

  const handleOpenProcessModal = () => {
    openProcessCreatorModal(setIsProcessCreatorOpen, setSelectedProcesses);
  };

  const handleCloseProcessModal = () => {
    closeProcessCreatorModal(setIsProcessCreatorOpen, setSelectedProcesses);
  };

  const handleProcessToggle = (processId, checked) => {
    handleProcessSelection(setSelectedProcesses, processId, checked);
  };

  const handleCreateProcess = () => {
    if (selectedProcesses.length === 0) return;

    // Criar tÃ­tulo do processo
    const prepCount = preparationsData.length;
    const processLabels = selectedProcesses
      .map(id => processTypes[id]?.label || id)
      .join(' + ');

    const newPreparation = {
      title: `${prepCount + 1}Âº Etapa: ${processLabels}`,
      processes: selectedProcesses,
      ingredients: [],
      sub_components: [],
      instructions: "",
      assembly_config: selectedProcesses.includes('assembly') ? {
        container_type: 'cuba',
        total_weight: '',
        units_quantity: '1',
        notes: ''
      } : undefined
    };

    addPreparation(preparationsData, setPreparationsData, newPreparation);
    handleCloseProcessModal();
    setIsDirty(true);
  };

  // Ref para armazenar a preparação pendente de criação (aguardando itens)
  const pendingPreparationRef = useRef(null);

  // FunÃ§Ã£o para adicionar preparaÃ§Ã£o do modal (usada pelo ProcessCreatorModal)
  // Função para adicionar preparação do modal (usada pelo ProcessCreatorModal)
  // AUTO-POPULATE: Ao adicionar uma etapa, ela é automaticamente incluída nas montagens existentes.
  const handleAddPreparationFromModal = useCallback((newPreparation, options = {}) => {
    // Ensure ID exists and is unique
    const prepWithId = {
      ...newPreparation,
      id: newPreparation.id || String(Date.now() + Math.random())
    };

    // DEFER CREATION LOGIC:
    // Se a opção deferCreation estiver ativa, NÃO adicionamos a preparação ao estado ainda.
    // Apenas guardamos no ref e abrimos o modal.
    if (options.deferCreation) {
      console.log('⏳ [DEFER] Deferindo criação da etapa:', prepWithId.title);
      pendingPreparationRef.current = prepWithId;

      setIsProcessCreatorOpen(false);
      const targetIndex = preparationsData.length; // Virtual index for modal purposes (will be appended)

      if (options.openIngredientSelector) {
        setCurrentPrepIndexForIngredient(targetIndex);
        // Note: Ingredient Selector uses index to find prep, but here prep doesn't exist yet.
        // We need to handle this in handleSelectMultipleIngredients by checking pendingPreparationRef.
        setIngredientModalOpen(true);
      } else if (options.openRecipeSelector) {
        setCurrentPrepIndexForRecipe(targetIndex);
        setRecipeModalOpen(true);
      } else if (options.openAssemblySelector) {
        setCurrentPrepIndexForAssembly(targetIndex);
        setIsAssemblyItemModalOpen(true);
      } else if (options.openPackagingSelector) {
        setCurrentPrepIndexForPackaging(targetIndex);
        setPackagingModalOpen(true);
      }
      return;
    }

    setPreparationsData(prev => {
      let updatedPreparations = [...prev];
      const nextIndex = updatedPreparations.length + 1;

      // Fix Titulo Duplicado: Se o título sugerir que é uma "Xº Etapa" e estiver duplicado, ajusta.
      // Isso é apenas um fallback visual, o ideal é o modal mandar certo, mas garante consistência.
      if (prepWithId.title && prepWithId.title.match(/^\d+º Etapa:/)) {
        // Se o título vier com número duplicado (ex: usuário deletou uma do meio e adicionou outra), 
        // a lista re-ordena visualmente por índice no DraggablePreparationList, mas aqui garantimos o dado.
        // Mas cuidado para não sobrescrever títulos customizados.
        // Vamos confiar que o componente de lista corrige a visualização (linha 172 do DraggablePreparationList).
      }

      // Verificar se a nova etapa é uma montagem
      const isAssembly = prepWithId.processes?.includes('assembly');

      console.log('🔄 [AUTO-POPULATE MODAL] Nova etapa:', prepWithId.title);
      console.log('🔄 [AUTO-POPULATE MODAL] É montagem?', isAssembly);

      if (isAssembly) {
        // Se for montagem: adicionar todas as etapas anteriores (não-montagem) como sub_components
        const previousSteps = updatedPreparations.filter(p => !p.processes?.includes('assembly'));
        console.log('🔄 [AUTO-POPULATE MODAL] Montagem criada - adicionando etapas anteriores:', previousSteps.map(p => p.title));

        prepWithId.sub_components = previousSteps.map(step => ({
          id: String(Date.now() + Math.random()),
          name: step.title,
          type: 'preparation',
          source_id: step.id,
          assembly_weight_kg: 0,
          origin_id: step.id // Marca como item de matriz (bloqueado)
        }));
      } else {
        // Se NÃO for montagem: adicionar esta etapa em todas as montagens existentes (e porcionamentos)
        const assemblies = updatedPreparations.filter(p => p.processes?.includes('assembly') || p.processes?.includes('portioning'));
        console.log('🔄 [AUTO-POPULATE MODAL] Etapa normal - adicionando em montagens/porcionamentos:', assemblies.map(p => p.title));

        updatedPreparations = updatedPreparations.map(prep => {
          if (prep.processes?.includes('assembly') || prep.processes?.includes('portioning')) {
            // Adicionar a nova etapa como sub_component da montagem
            const newSubComponent = {
              id: String(Date.now() + Math.random()),
              name: prepWithId.title,
              type: 'preparation',
              source_id: prepWithId.id,
              assembly_weight_kg: 0,
              // origin_id removido para permitir edição/remoção local
            };

            console.log('🔄 [AUTO-POPULATE MODAL] Adicionando sub_component em:', prep.title);

            return {
              ...prep,
              sub_components: [...(prep.sub_components || []), newSubComponent]
            };
          }
          return prep;
        });
      }

      const updated = [...updatedPreparations, prepWithId];

      // AUTO-SORT: Garantir que porcionamento/montagem sejam sempre os últimos
      const regularSteps = updated.filter(p =>
        !p.processes?.includes('assembly') && !p.processes?.includes('portioning')
      );
      const finalSteps = updated.filter(p =>
        p.processes?.includes('assembly') || p.processes?.includes('portioning')
      );

      console.log('🔄 [AUTO-SORT] Reorganizando:', {
        regular: regularSteps.length,
        final: finalSteps.length
      });

      const sorted = [...regularSteps, ...finalSteps];

      // AUTO-RENAME: Renumerar os títulos para manter sequência correta
      const renumbered = sorted.map((prep, index) => {
        const stepNumber = index + 1;
        // Só renumera se o título seguir o padrão "Xº Etapa: ..."
        if (prep.title && prep.title.match(/^\d+º Etapa:/)) {
          const titleWithoutNumber = prep.title.replace(/^\d+º Etapa:/, '').trim();
          return {
            ...prep,
            title: `${stepNumber}º Etapa: ${titleWithoutNumber}`
          };
        }
        return prep;
      });

      console.log('🔢 [AUTO-RENAME] Títulos renumerados');

      return renumbered;
    });

    setIsDirty(true);
    setIsProcessCreatorOpen(false);

    // UX AUTOMATION: Abrir modal correspondente imediatamente após criar a etapa (Synchronous)
    const targetIndex = preparationsData.length;

    if (options.openIngredientSelector) {
      setCurrentPrepIndexForIngredient(targetIndex);
      setIngredientModalOpen(true);
    } else if (options.openRecipeSelector) {
      setCurrentPrepIndexForRecipe(targetIndex);
      setRecipeModalOpen(true);
    } else if (options.openAssemblySelector) {
      setCurrentPrepIndexForAssembly(targetIndex);
      setIsAssemblyItemModalOpen(true);
    } else if (options.openPackagingSelector) {
      setCurrentPrepIndexForPackaging(targetIndex);
      setPackagingModalOpen(true);
    }

  }, [preparationsData.length]); // Added dependency on length to ensure accuracy

  // Check and remove empty pending step
  // This function is no longer needed with the deferred creation logic
  // const checkAndRemovePendingStep = (index) => {
  //   if (index === null || index === undefined) return;

  //   // Só prosseguir se o índice fechado for o mesmo que acabou de ser criado
  //   if (pendingCreationStepIndexRef.current !== index) return;

  //   // Resetar ref
  //   pendingCreationStepIndexRef.current = null;

  //   setPreparationsData(prev => {
  //     const prep = prev[index];
  //     // Se a preparação existir e estiver vazia (sem ingredientes/receitas)
  //     if (prep && (!prep.ingredients || prep.ingredients.length === 0)) {
  //       // REMOVER A PREPARAÇÃO
  //       console.log("Creation cancelled, removing empty step:", index);
  //       toast({
  //         title: "Criação cancelada",
  //         description: "Etapa removida por estar vazia.",
  //         variant: "secondary"
  //       });
  //       const newPreps = [...prev];
  //       newPreps.splice(index, 1);
  //       return newPreps;
  //     }
  //     return prev;
  //   });
  // };

  // ==== HANDLERS DE INGREDIENTES ====
  const handleOpenIngredientModal = (prepIndex) => {
    setCurrentPrepIndexForIngredient(prepIndex);
    setIngredientModalOpen(true);
    clearIngredientSearch();
  };

  const handleCloseIngredientModal = () => {
    // If pending creation was active, clearing it implies cancel
    if (pendingPreparationRef.current) {
      console.log("Creation cancelled, clearing pending preparation.");
      pendingPreparationRef.current = null;
    }
    setIngredientModalOpen(false);
    setCurrentPrepIndexForIngredient(null);
    clearIngredientSearch();
  };

  const handleOpenPackagingModal = (prepIndex) => {
    setCurrentPrepIndexForPackaging(prepIndex);
    setPackagingModalOpen(true);
    clearIngredientSearch();
  };

  const handleClosePackagingModal = () => {
    // If pending creation was active, clearing it implies cancel
    if (pendingPreparationRef.current) {
      console.log("Creation cancelled, clearing pending preparation.");
      pendingPreparationRef.current = null;
    }
    setPackagingModalOpen(false);
    setCurrentPrepIndexForPackaging(null);
    clearIngredientSearch();
  };

  // ==== HANDLERS DE RECEITAS ====
  // REFATORADO: Sistema de dependências limpo, sem modo de reparo manual

  const handleOpenRecipeModal = (prepIndex) => {
    setCurrentPrepIndexForRecipe(prepIndex);
    setRecipeModalOpen(true);
  };

  const handleCloseRecipeModal = () => {
    // If pending creation was active, clearing it implies cancel
    if (pendingPreparationRef.current) {
      console.log("Creation cancelled, clearing pending preparation.");
      pendingPreparationRef.current = null;
    }
    setRecipeModalOpen(false);
    setCurrentPrepIndexForRecipe(null);
  };

  const handleSelectRecipe = async (recipe) => {
    // CHECK DEFERRAL FIRST
    if (pendingPreparationRef.current) {
      // We are in deferred creation mode.
      // 1. Build the new preparation with the imported recipe
      const pendingPrep = pendingPreparationRef.current;

      try {
        // Import logic reuse?
        // Need to import recipe items into the PENDING prep.
        const { importRecipeAsPreparation } = await import('@/lib/services/recipeImportService');

        // Index is basically length of data (since we are appending)
        const { preparation } = await importRecipeAsPreparation(
          recipe.id,
          { prepIndex: preparationsData.length }
        );

        // Merge imported ingredients into pending prep
        const finalizedPrep = {
          ...pendingPrep,
          ingredients: [...pendingPrep.ingredients, ...preparation.ingredients],
          source_recipe_id: preparation.source_recipe_id,
          source_recipe_name: preparation.source_recipe_name
        };

        // NOW create the step using standard flow (but without options to avoid recursion loop)
        // We can reused handleAddPreparationFromModal or setPreparationsData directly.
        // Reuse handleAddPreparationFromModal but force NO deferral options.
        // Wait, handleAddPreparationFromModal does logic for assembly auto-populate. Good to reuse.
        handleAddPreparationFromModal(finalizedPrep, { deferCreation: false });

        toast({
          title: "Etapa Criada",
          description: "Receita selecionada e etapa adicionada com sucesso.",
        });

      } catch (err) {
        console.error(err);
        toast({ title: "Erro", description: "Falha ao importar receita deferred.", variant: "destructive" });
      }

      pendingPreparationRef.current = null;
      handleCloseRecipeModal();
      return;
    }


    if (currentPrepIndexForRecipe !== null) {
      const prepIndex = currentPrepIndexForRecipe;
      handleCloseRecipeModal();

      try {
        // REFATORADO: Usar serviço centralizado de import
        const { importRecipeAsPreparation } = await import('@/lib/services/recipeImportService');

        const { preparation, parentInfo } = await importRecipeAsPreparation(
          recipe.id,
          { prepIndex: preparationsData.length }
        );

        // Adicionar ingredientes à preparação existente
        setPreparationsData(prev => {
          const newPreparations = [...prev];
          if (newPreparations[prepIndex]) {
            newPreparations[prepIndex] = {
              ...newPreparations[prepIndex],
              ingredients: [
                ...(newPreparations[prepIndex].ingredients || []),
                ...preparation.ingredients
              ],
              // Marcar source_recipe_id
              source_recipe_id: preparation.source_recipe_id,
              source_recipe_name: preparation.source_recipe_name
            };
          }
          return newPreparations;
        });

        setIsDirty(true);
        toast({
          title: "Receita Importada",
          description: `${preparation.ingredients.length} ingredientes importados de "${parentInfo.name}".`,
          className: "bg-green-100 border-green-500"
        });

      } catch (err) {
        console.error("Erro ao importar receita:", err);
        toast({ title: "Erro", description: "Falha ao importar receita.", variant: "destructive" });
      }
    }
  };

  // ==== HANDLERS DE MONTAGEM/PORCIONAMENTO ====
  const openAddAssemblyItemModal = (prepIndex) => {
    setCurrentPrepIndexForAssembly(prepIndex);
    setIsAssemblyItemModalOpen(true);
  };

  const handleCloseAssemblyItemModal = () => {
    setIsAssemblyItemModalOpen(false);
    setCurrentPrepIndexForAssembly(0);
  };

  const handleAddAssemblyItem = (itemData) => {
    if (currentPrepIndexForAssembly === null) return;

    const prepIndex = currentPrepIndexForAssembly;
    const targetPrep = preparationsData[prepIndex];

    if (!targetPrep) return;

    // PREVENÇÃO DE DUPLICIDADE: Verificar se o item já existe na montagem
    // Verifica por source_id (para itens internos) ou origin_id (para importados)
    const alreadyExists = targetPrep.sub_components?.some(sc =>
      (sc.source_id && sc.source_id === itemData.id) ||
      (sc.origin_id && sc.origin_id === itemData.id) ||
      (sc.id === itemData.id) // Fallback
    );

    if (alreadyExists) {
      toast({
        title: "Item duplicado",
        description: `O item "${itemData.name}" já foi adicionado a esta montagem.`,
        variant: "warning"
      });
      return;
    }

    setPreparationsData(prev => {
      const newPreparations = [...prev];
      const targetPrep = newPreparations[prepIndex];

      if (!targetPrep) return prev;

      // Determine the correct type based on the itemData
      let itemType = 'preparation'; // default
      if (itemData.isRecipe) {
        itemType = 'recipe';
      } else if (itemData.isIngredient) {
        itemType = 'ingredient';
      }

      const newSubComponent = {
        id: `${itemData.id}_${Date.now()}`,
        source_id: itemData.id,
        origin_id: itemData.id, // Explicitly store origin_id for Matrix Recipe logic
        name: itemData.name,
        type: itemType, // Use the corrected type
        // Pass the price through for ingredients
        current_price: itemData.current_price || 0,
        input_yield_weight: String(itemData.yield_weight || 0).replace('.', ','),
        input_total_cost: String(itemData.total_cost || 0).replace('.', ','),
        weight_portioned: '',
        yield_weight: '',
        total_cost: '',
        assembly_weight_kg: ''
      };

      // Adicionar aos sub_components
      newPreparations[prepIndex] = {
        ...targetPrep,
        sub_components: [...(targetPrep.sub_components || []), newSubComponent]
      };

      return newPreparations;
    });

    setIsDirty(true);

    toast({
      title: "Item adicionado",
      description: `"${itemData.name}" foi adicionado Ã  preparaÃ§Ã£o.`
    });

    handleCloseAssemblyItemModal();
  };

  const handleSelectIngredient = (ingredient) => {
    // Determine active index (Ingredient OR Packaging)
    const prepIndex = currentPrepIndexForIngredient !== null ? currentPrepIndexForIngredient : currentPrepIndexForPackaging;

    if (prepIndex !== null) {
      // Fechar modal imediatamente para evitar mÃºltiplas chamadas se for um único
      // Mas para múltiplas chamadas manteremos aberto ou fecharemos depois?
      // O IngredientSelectorContent chama onSelect e espera fechar.
      // Vamos manter a lógica de fechar, mas talvez o caller (handleSelectMultipleIngredients) controle isso.
      // O handleSelectIngredient foi feito para single select. Vamos adaptá-lo ou usar outro.
      // Vamos usar handleSelectMultipleIngredients que chama a lógica interna de adição sem fechar o modal a cada item.

      // REFACTORED: Logic extracted to addIngredientToState to be reused
      addIngredientToState(prepIndex, ingredient);
    }
  };

  const addIngredientToState = (prepIndex, ingredient) => {
    // Verificar se o ingrediente jÃ¡ existe na preparaÃ§Ã£o
    const currentPrep = preparationsData[prepIndex];
    const ingredientExists = currentPrep?.ingredients?.some(
      ing => ing.ingredient_id === ingredient.id || ing.name === ingredient.name || ing.id === ingredient.id
    );

    if (ingredientExists) {
      toast({
        title: "Ingrediente jÃ¡ existe",
        description: `"${ingredient.name}" jÃ¡ foi adicionado a esta preparaÃ§Ã£o.`,
        variant: "destructive"
      });
      return;
    }

    // Criar um novo ingrediente com ID Ãºnico para evitar duplicatas
    const newIngredient = {
      ...ingredient,
      id: `${ingredient.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID Ãºnico robusto
      ingredient_id: ingredient.id, // Manter referÃªncia ao ingrediente original
      // Inicializar campos de peso como strings
      weight_frozen: '',
      weight_thawed: '',
      weight_raw: '',
      weight_clean: '',
      weight_pre_cooking: '',
      weight_cooked: '',
      weight_portioned: '',
      current_price: String(ingredient.current_price || '').replace('.', ','),
      quantity: ingredient.quantity || 1 // Ensure quantity is set, default to 1
    };

    setPreparationsData(prev => {
      const newPreparations = [...prev];
      if (newPreparations[prepIndex]) {
        newPreparations[prepIndex] = {
          ...newPreparations[prepIndex],
          ingredients: [...(newPreparations[prepIndex].ingredients || []), newIngredient]
        };
      }
      return newPreparations;
    });
    setIsDirty(true);
  };

  const handleSelectMultipleIngredients = (selectedItems) => {
    // CHECK DEFERRAL FIRST
    if (pendingPreparationRef.current) {
      // We are in deferred creation mode.
      const pendingPrep = pendingPreparationRef.current;

      // Transform selectedItems to ingredients format
      const newIngredients = selectedItems.map(ingredient => ({
        ...ingredient,
        id: `${ingredient.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ingredient_id: ingredient.id,
        quantity: ingredient.quantity || 1, // Ensure quantity is set
        weight_frozen: '',
        weight_thawed: '',
        weight_raw: '',
        weight_clean: '',
        weight_pre_cooking: '',
        weight_cooked: '',
        weight_portioned: '',
        current_price: String(ingredient.current_price || '').replace('.', ',')
      }));

      const finalizedPrep = {
        ...pendingPrep,
        ingredients: [...pendingPrep.ingredients, ...newIngredients]
      };

      // Add step to list
      handleAddPreparationFromModal(finalizedPrep, { deferCreation: false });

      toast({
        title: "Etapa Criada",
        description: `${newIngredients.length} itens adicionados com sucesso.`,
      });

      pendingPreparationRef.current = null;

      // Close modals
      handleCloseIngredientModal();
      handleClosePackagingModal();
      return;
    }

    const prepIndex = currentPrepIndexForIngredient ?? currentPrepIndexForPackaging;

    if (prepIndex !== null) {
      let addedCount = 0;
      selectedItems.forEach(item => {
        // Check existence logic is inside addIngredientToState but calling it in loop acts async on state?
        // setPreparationsData updates based on prev, so it is safe to call multiple times in loop.
        addIngredientToState(prepIndex, item);
        addedCount++;
      });

      if (addedCount > 0) {
        toast({
          title: "Itens adicionados",
          description: `${addedCount} itens foram adicionados à preparação.`
        });
      }
    }

    // Close modals
    handleCloseIngredientModal();
    handleClosePackagingModal();
  };

  // Handler para quando uma receita Ã© selecionada na busca
  const handleRecipeSelection = useCallback((selectedRecipe) => {
    if (!selectedRecipe) {
      return;
    }


    // Popular dados bÃ¡sicos da receita - usar todos os dados da receita selecionada
    const newRecipeData = {
      ...selectedRecipe, // Usar todos os dados da receita
      // Garantir valores padrÃ£o para campos que podem estar undefined
      name: selectedRecipe.name || "",
      name_complement: selectedRecipe.name_complement || "",
      category: selectedRecipe.category || "",
      prep_time: selectedRecipe.prep_time || 0,
      total_weight: selectedRecipe.total_weight || 0,
      yield_weight: selectedRecipe.yield_weight || 0,
      cuba_weight: selectedRecipe.cuba_weight || 0,
      total_cost: selectedRecipe.total_cost || 0,
      cost_per_kg_raw: selectedRecipe.cost_per_kg_raw || 0,
      cost_per_kg_yield: selectedRecipe.cost_per_kg_yield || 0,
      instructions: selectedRecipe.instructions || "",
      active: selectedRecipe.active !== undefined ? selectedRecipe.active : true
    };

    setRecipeData(newRecipeData);

    // Se hÃ¡ dados de preparaÃ§Ã£o, carregÃ¡-los tambÃ©m
    if (selectedRecipe.preparations && Array.isArray(selectedRecipe.preparations)) {
      setPreparationsData(selectedRecipe.preparations);
    } else {
      setPreparationsData([]);
    }

    // Marcar como editando uma receita existente
    setIsEditing(true);
    setCurrentRecipeId(selectedRecipe.id);
    setIsDirty(false); // NÃ£o estÃ¡ sujo ainda, acabou de carregar

    // ForÃ§ar recÃ¡lculo das mÃ©tricas apÃ³s um pequeno delay para garantir que os estados foram atualizados
    setTimeout(() => {
      recalculateRecipeMetrics();
    }, 100);
  }, [setRecipeData, setPreparationsData, setIsEditing, setCurrentRecipeId, setIsDirty, recalculateRecipeMetrics]);





  // ==== EARLY RETURNS ====
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }



  // ==== FILTRO DE RECEITAS POR TIPO ====
  const typeFilteredRecipes = filteredRecipes.filter(recipe => {
    const currentType = recipeData.type || RECIPE_TYPES.RECIPE;
    // Receitas antigas sem tipo são consideradas como RECIPE
    const itemType = recipe.type || RECIPE_TYPES.RECIPE;
    return itemType === currentType;
  });

  // Função para destacar o termo buscado em azul
  const highlightMatch = (text) => {
    const { before, match, after, hasMatch } = highlightSearchTerm(text, searchQueryRecipe);

    if (!hasMatch) return text;

    return (
      <>
        {before}
        <span className="text-blue-600 font-semibold">{match}</span>
        {after}
      </>
    );
  };

  // ==== RENDER PRINCIPAL ====

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Título Principal */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-blue-600">
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Ficha Técnica</h1>
            {isDirty && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                Não salvo
              </span>
            )}
          </div>
        </div>

        {/* Sistema de Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="dados-tecnicos">Dados Técnicos</TabsTrigger>
            <TabsTrigger value="pre-preparo">Pré-Preparo</TabsTrigger>
            <TabsTrigger value="ficha-tecnica">Ficha Técnica</TabsTrigger>
          </TabsList>

          <TabsContent value="dados-tecnicos">

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              {/* COLUNA 1: Menu e Ações */}
              <Card className="bg-white shadow-sm border h-full flex flex-col">
                <CardHeader className="bg-gray-50 border-b border-gray-100 px-6 py-3">
                  <CardTitle className="text-base font-medium text-gray-700">Menu</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 flex-1">
                  {/* Barra de Busca */}
                  <div className="relative search-container">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQueryRecipe}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={handleSearchFocusRecipe}
                      onBlur={handleSearchBlurRecipe}
                      placeholder="Buscar receita..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />

                    {searchOpenRecipe && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                        <div className="p-2">
                          {searchLoading ? (
                            <div className="p-3 text-center text-gray-500 flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Carregando receitas...
                            </div>
                          ) : typeFilteredRecipes.length === 0 ? (
                            <div className="p-3 text-center text-gray-500">
                              {searchQueryRecipe.trim() ? 'Nenhuma receita encontrada' : 'Digite para buscar receitas'}
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {typeFilteredRecipes.map(recipe => (
                                <div
                                  key={recipe.id}
                                  className="p-2 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
                                  onClick={() => handleRecipeSelect(recipe.id, handleRecipeSelection)}
                                >
                                  <CookingPot className="h-4 w-4 text-gray-400" />
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{highlightMatch(recipe.name)}</div>
                                    {recipe.category && (
                                      <div className="text-xs text-gray-500">{recipe.category}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsPrintDialogOpen(true)}
                      className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-1 justify-start text-xs px-2"
                    >
                      <Printer className="h-3 w-3" />
                      Ficha Completa
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsPrintCollectDialogOpen(true)}
                      className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-1 justify-start text-xs px-2"
                    >
                      <ClipboardCheck className="h-3 w-3" />
                      Ficha Coleta
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsPrintSimpleDialogOpen(true)}
                      className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-1 justify-start text-xs px-2"
                    >
                      <ClipboardList className="h-3 w-3" />
                      Ajustável
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleClearRecipe}
                      className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-1 justify-start text-xs px-2"
                    >
                      <FilePlus className="h-3 w-3" />
                      Nova Ficha
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <RefreshButton
                      text="Atualizar"
                      onClick={handleRefresh}
                      className="justify-center text-xs"
                    />
                    <Button
                      onClick={handleSaveRecipe}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1 justify-center text-xs"
                    >
                      {saving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {/* COLUNA 1: Informações Básicas */}
              <Card className="bg-white shadow-sm border h-full flex flex-col overflow-hidden">
                <CardHeader className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                  <CardTitle className="text-lg font-semibold text-gray-700">
                    Crie uma nova Receita ou Produto
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6 overflow-y-auto flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      Tipo de Item
                    </Label>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => {
                          handleSelectChange(setRecipeData, 'type', RECIPE_TYPES.RECIPE);
                          handleSelectChange(setRecipeData, 'category', '');
                        }}
                        disabled={isEditing}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${(recipeData.type === RECIPE_TYPES.RECIPE || !recipeData.type)
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                          } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Receita - Base
                      </button>
                      <button
                        onClick={() => {
                          handleSelectChange(setRecipeData, 'type', RECIPE_TYPES.PRODUCT);
                          handleSelectChange(setRecipeData, 'category', '');
                        }}
                        disabled={isEditing}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${recipeData.type === RECIPE_TYPES.PRODUCT
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                          } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Produto
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
                      Nome Principal *
                    </Label>
                    <Input
                      ref={nameInputRef}
                      id="name"
                      name="name"
                      value={recipeData.name || ''}
                      onChange={handleRecipeInputChange}
                      placeholder="Ex: Maminha Assada"
                      required
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                        Tempo (min)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={recipeData.prep_time || 0}
                        onChange={handlePrepTimeChange}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        Categoria
                      </Label>
                      <Popover open={categorySelectorOpen} onOpenChange={setCategorySelectorOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={categorySelectorOpen}
                            className="w-full justify-between font-normal"
                          >
                            {getSelectedCategoryLabel()}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar categoria..." />
                            <CommandList>
                              <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                              {groupedCategories.map((group) => (
                                <CommandGroup key={group.groupName} heading={group.groupName}>
                                  {group.items.map((category) => (
                                    <CommandItem
                                      key={category.value}
                                      value={category.label}
                                      onSelect={() => handleSmartCategorySelect(category.originalName)}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          recipeData.category === category.originalName ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {category.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* COLUNA 2: Informações de Custo e Peso (COMPACTA) */}
              <Card className="bg-white backdrop-blur-sm bg-opacity-90 border border-gray-100 h-full flex flex-col overflow-hidden">
                <CardHeader className="py-4 px-6 border-b bg-gray-50/50">
                  <CardTitle className="text-lg font-medium text-gray-700">
                    Métricas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-y-auto flex-1">
                  <div className="divide-y divide-gray-100">
                    {/* PESOS */}
                    <div className="flex justify-between items-center p-4 hover:bg-gray-50">
                      <span className="text-sm text-gray-500">Peso Bruto</span>
                      <span className="font-semibold text-gray-700 flex items-center">
                        <span className="text-xs text-gray-400 mr-1">kg</span>
                        {formatDisplayValue(recipeData.total_weight, 'weight')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 hover:bg-blue-50 bg-blue-50/10">
                      <span className="text-sm text-blue-600 font-medium">Peso Líquido</span>
                      <span className="font-bold text-blue-700 flex items-center">
                        <span className="text-xs text-blue-400 mr-1">kg</span>
                        {formatDisplayValue(recipeData.yield_weight, 'weight')}
                      </span>
                    </div>

                    {/* CUSTOS */}
                    <div className="flex justify-between items-center p-4 hover:bg-gray-50 border-t-2 border-dashed border-gray-200">
                      <span className="text-sm text-gray-500">Custo/Kg (Bruto)</span>
                      <span className="font-semibold text-gray-700 flex items-center">
                        <span className="text-xs text-gray-400 mr-1">R$</span>
                        {formatDisplayValue(recipeData.cost_per_kg_raw, 'currency')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 hover:bg-green-50 bg-green-50/10">
                      <span className="text-sm text-green-600 font-medium">Custo/Kg (Liq)</span>
                      <span className="font-bold text-green-700 flex items-center">
                        <span className="text-xs text-green-400 mr-1">R$</span>
                        {formatDisplayValue(recipeData.cost_per_kg_yield, 'currency')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 hover:bg-pink-50 bg-pink-50/10">
                      <span className="text-sm text-pink-600 font-medium">{recipeData.cost_field_name || 'Custo final'}</span>
                      <span className="font-bold text-pink-700 flex items-center">
                        <span className="text-xs text-pink-400 mr-1">R$</span>
                        {formatDisplayValue(
                          calculateCubaCost(recipeData.cuba_weight, recipeData.cost_per_kg_yield),
                          'currency'
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* COLUNA 3: Lista de Preparo (Ficha Técnica) */}
            </div>

            {/* Lista de Preparo (Full Width) */}
            <div className="mt-6 space-y-6">
              <Card className="bg-white shadow-sm border h-full flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center sticky top-0 z-10 w-full">
                  <div className="flex items-center gap-2 text-gray-700">
                    <CookingPot className="h-5 w-5 text-orange-500" />
                    <h2 className="text-lg font-semibold">Processos</h2>
                  </div>
                  <Button
                    onClick={handleOpenProcessModal}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Novo
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 bg-gray-50/50">
                  <DraggablePreparationList
                    preparations={preparationsData}
                    setPreparations={setPreparationsData}
                    onDirty={setIsDirty}
                    isProduct={recipeData.type === RECIPE_TYPES.PRODUCT}
                    onOpenIngredientModal={handleOpenIngredientModal}
                    onOpenPackagingModal={handleOpenPackagingModal}
                    onOpenRecipeModal={handleOpenRecipeModal}
                    onOpenProcessEditModal={handleOpenProcessEditModal}
                    onSyncPreparation={handleSyncPreparation} // Nova Prop
                    onOpenAddAssemblyItemModal={openAddAssemblyItemModal}
                    onUpdatePreparation={(prepIdx, field, value) => {
                      setPreparationsData(prev => {
                        const newData = [...prev];
                        if (newData[prepIdx]) {
                          newData[prepIdx][field] = value;
                        }
                        return newData;
                      });
                      setIsDirty(true);
                    }}
                    updateIngredientWrapper={(prepIdx, ingIdx, field, value) => {
                      updateIngredient(
                        preparationsData,
                        setPreparationsData,
                        prepIdx,
                        ingIdx,
                        field,
                        value
                      );
                      setIsDirty(true);
                    }}
                    updateRecipeWrapper={(prepIdx, recIdx, field, value) => {
                      updateRecipe(
                        preparationsData,
                        setPreparationsData,
                        prepIdx,
                        recIdx,
                        field,
                        value
                      );
                      setIsDirty(true);
                    }}
                    removeIngredientWrapper={(prepIdx, ingIdx) => {
                      removeIngredient(
                        preparationsData,
                        setPreparationsData,
                        prepIdx,
                        ingIdx
                      );
                      setIsDirty(true);
                    }}
                    removeRecipeWrapper={(prepIdx, recIdx) => {
                      removeRecipe(
                        preparationsData,
                        setPreparationsData,
                        prepIdx,
                        recIdx
                      );
                      setIsDirty(true);
                      toast({
                        title: "Receita removida",
                        description: "A receita foi removida da preparaÃ§Ã£o."
                      });
                    }}
                    removePreparationWrapper={(prepId) => removePreparation(preparationsData, setPreparationsData, prepId)}
                  />

                  {/* Save Button - Inside card, only when processes exist */}
                  {preparationsData.length > 0 && (
                    <div className="p-4 border-t border-gray-100 flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleSaveRecipe}
                        disabled={saving}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {saving ? 'Salvando...' : 'Salvar Receita'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pre-preparo">
            <Card className="bg-white shadow-sm border">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-lg font-medium text-gray-700">Pré-Preparo</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center text-gray-500 py-12">
                  <CookingPot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Aguardando estrutura</p>
                  <p className="text-sm">Esta funcionalidade será implementada em breve.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ficha-tecnica">
            <Card className="bg-white shadow-sm border">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-lg font-medium text-gray-700">Ficha Técnica</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center text-gray-500 py-12">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Aguardando estrutura</p>
                  <p className="text-sm">Esta funcionalidade será implementada em breve.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Criação de Processo */}
        {isProcessCreatorOpen && (
          <ProcessCreatorModalComponent
            isOpen={isProcessCreatorOpen}
            onClose={handleCloseProcessModal}
            onAddPreparation={handleAddPreparationFromModal}
            preparationsLength={preparationsData.length}
            preparationsData={preparationsData} // Passar dados completos para o modal
            currentRecipeId={currentRecipeId}
            contextType={recipeData.type || 'receitas'}
          />
        )}



        {/* Modal Unificado de Seleção de Itens (Ingredientes ou Receitas) */}
        <Dialog
          open={ingredientModalOpen || recipeModalOpen || packagingModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIngredientModalOpen(false);
              setRecipeModalOpen(false);
              setPackagingModalOpen(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
            {/* Cabeçalho Customizado Dinâmico */}
            <div className="px-6 pt-6 pb-2">
              <DialogHeader className="mb-4">
                <DialogTitle>
                  {ingredientModalOpen ? 'Adicionar Ingrediente' :
                    packagingModalOpen ? 'Adicionar Embalagem' :
                      recipeModalOpen ? 'Selecionar Receita' : 'Adicionar Item'}
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-hidden p-6 pt-2">
              {/* Conteúdo Contextual Direto (Sem Abas) */}

              {/* Contexto: Ingredientes */}
              {ingredientModalOpen && (
                <IngredientSelectorContent
                  ingredients={availableIngredients || []}
                  mode="ingredients"
                  onSelect={handleSelectMultipleIngredients}
                  onCancel={handleCloseIngredientModal}
                  isLoading={ingredientsLoading}
                />
              )}

              {/* Contexto: Embalagens */}
              {packagingModalOpen && (
                <IngredientSelectorContent
                  ingredients={availableIngredients || []}
                  mode="packaging"
                  onSelect={handleSelectMultipleIngredients}
                  onCancel={handleClosePackagingModal}
                  isLoading={ingredientsLoading}
                />
              )}

              {/* Contexto: Receitas */}
              {recipeModalOpen && (
                <RecipeSelectorContent
                  onSelectRecipe={(recipe) => {
                    handleSelectRecipe(recipe);
                    // O handleSelectRecipe já deve fechar, mas garantimos aqui
                    setRecipeModalOpen(false);
                  }}
                  currentRecipeId={currentRecipeId}
                  filters={recipeSelectorFilters} // Filtrar apenas Receitas (bases, molhos, etc) - NÃO os produtos finais (que estão como receitas_-_base)
                  onCancel={() => setRecipeModalOpen(false)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de AdiÃ§Ã£o de Item Ã  Montagem/Porcionamento - Usando componente organizado */}
        <AddAssemblyItemModal
          isOpen={isAssemblyItemModalOpen}
          onClose={handleCloseAssemblyItemModal}
          preparationsData={preparationsData}
          currentPrepIndex={currentPrepIndexForAssembly}
          ingredients={availableIngredients || []}
          currentRecipeId={currentRecipeId}
          onAddItem={(itemData) => handleAddAssemblyItem(itemData)}
        />

        {/* Modal de Edição de Processos */}
        <ProcessEditModal
          isOpen={isProcessEditModalOpen}
          onClose={() => setIsProcessEditModalOpen(false)}
          initialProcesses={processEditData.initialProcesses}
          onSave={handleUpdateProcesses}
        />

        {/* DiÃ¡logo de ImpressÃ£o da Ficha TÃ©cnica Completa */}
        <RecipeTechnicalPrintDialog
          recipe={recipeData}
          preparations={preparationsData}
          isOpen={isPrintDialogOpen}
          onClose={() => setIsPrintDialogOpen(false)}
        />

        {/* DiÃ¡logo de ImpressÃ£o da Ficha de Coleta */}
        <RecipeCollectDialog
          recipe={recipeData}
          preparations={preparationsData}
          isOpen={isPrintCollectDialogOpen}
          onClose={() => setIsPrintCollectDialogOpen(false)}
        />

        {/* DiÃ¡logo de ImpressÃ£o da Receita AjustÃ¡vel */}
        <RecipeSimplePrintDialog
          recipe={recipeData}
          preparations={preparationsData}
        />
      </div>
    </div>
  );
}
