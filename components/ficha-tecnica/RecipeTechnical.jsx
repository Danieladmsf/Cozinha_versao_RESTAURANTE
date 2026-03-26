'use client';

import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RecipeEngine as RecipeCalculator } from "@/lib/recipe-engine/RecipeEngine";

import React, { useCallback, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  useToast,
  Checkbox
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
  Package2,
  HelpCircle,
  ChevronLeft
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { RecipeModalsWrapper } from "./RecipeModalsWrapper";
import { RecipeIngredientsTab } from "./RecipeIngredientsTab";

// Drag and Drop


// Hooks customizados organizados
import {
  useRecipeState,
  useRecipeOperations,
  useRecipeInterface,
  useRecipeCalculations,
  useRecipeSearch,
  useRecipeConfig,
  useRecipeCategories,
  useRecipeSync,
  useRecipePopOperations,
  useRecipePreparationModal,
  useRecipeCategorization,
  useRecipeItemSelection,
  useRecipeLoad
} from "@/hooks/ficha-tecnica";
import { useIngredientSearch } from "@/hooks/ficha-tecnica/useIngredientSearch";
import useRecipeZustandStore from '@/lib/recipe-engine/RecipeStore.js';
import { formatCurrency, formatWeight, parseNumericValue } from "@/lib/formatUtils";
import { RECIPE_TYPES } from "@/lib/recipeConstants";
import {
  calculateRecipeMetrics,
  updateRecipeMetrics,
  calculateCubaCost,
  updatePreparationsMetrics
} from "@/lib/recipeMetricsCalculator";
import { highlightSearchTerm } from "@/lib/searchUtils";
import { syncRecipeAcrossRecipes } from "@/lib/services/ingredientSyncService";

// Componentes organizados
import RecipeMenuActions from "./RecipeMenuActions";
import RecipeGeneralInfo from "./RecipeGeneralInfo";
import RecipeMetricsDashboard from "./RecipeMetricsDashboard";
import RecipeBook from "./RecipeBook";
import RecipeEngine from '@/lib/recipe-engine/RecipeEngine';

export default function RecipeTechnical() {
  const { toast } = useToast();
  const router = useRouter();

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
    replacingIngredientContext, setReplacingIngredientContext,

    // Estados de cópia de receita
    sourceRecipeSearch, setSourceRecipeSearch,
    selectedSourceRecipe, setSelectedSourceRecipe,
    filteredSourceRecipes, setFilteredSourceRecipes,
    selectedStageLevel, setSelectedStageLevel,
    sourceRecipeStages, setSourceRecipeStages,
    recipePreview, setRecipePreview,

    // Funções de reset
    resetModals,
    resetRecipeData
  } = useRecipeState();

  // Estados para Modal de Edição de Processos
  const [isProcessEditModalOpen, setIsProcessEditModalOpen] = useState(false);
  const [processEditData, setProcessEditData] = useState({ prepIndex: null, initialProcesses: [] });

  // Add recalculation effect
  useEffect(() => {
    if (preparationsData) {
      const metrics = RecipeEngine.calculateRecipeMetrics(recipeData, preparationsData, recipes);
      setRecipeData(prev => ({ ...prev, ...metrics }));
    }
  }, [preparationsData]); // Recalcular apenas quando preparações mudarem

  // ==== POP Integration State ====
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [laborModalOpen, setLaborModalOpen] = useState(false);
  const [suggestedLaborTime, setSuggestedLaborTime] = useState(0); // Novo estado
  const [pendingPopDrop, setPendingPopDrop] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editorCommand, setEditorCommand] = useState(null);

  const {
    handleDropPop,
    handleEditPop,
    handleEquipmentConfirm,
    handleLaborConfirm
  } = useRecipePopOperations({
    preparationsData,
    setPreparationsData,
    setEquipmentModalOpen,
    setLaborModalOpen,
    setSuggestedLaborTime,
    setPendingPopDrop,
    pendingPopDrop,
    setEditorCommand,
    setRecipeData
  });

  // ==== FILTRO DE CATEGORIAS (MENU) ====
  const [selectedFilterCategories, setSelectedFilterCategories] = useState([]); // IDs das categorias selecionadas
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all'); // 'all' ou ID da categoria
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false);



  // Filters for recipe selector - Memoized to prevent re-renders
  const recipeSelectorFilters = React.useMemo(() => ({ type: 'receitas' }), []);

  // Sanitization effect removido conforme análise técnica das origens dos bugs "Zombies"

  // ==== HOOKS DE OPERAÇÕES (CONECTADOS) ====
  const {
    parseNumericValue,
    addPreparation,
    updatePreparation,
    removePreparation,
    addIngredientToPreparation,
    replaceIngredientInPreparation,
    updateIngredient,
    removeIngredient,
    updateRecipe,
    removeRecipe,
    addSubComponent,
    updateSubComponent,
    removeSubComponent,
    unlockPreparation,
    saveRecipe,
    loadRecipe
  } = useRecipeOperations();

  const handleUnlockPreparation = useCallback((prepIndex) => {
    unlockPreparation(preparationsData, setPreparationsData, prepIndex);
  }, [preparationsData, unlockPreparation]);

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

  const {
    handleSyncPreparation,
    getRefreshedPreparations,
    refreshMatrixRecipes
  } = useRecipeSync({
    preparationsData,
    setPreparationsData,
    setIsDirty,
    parseNumericValue
  });
  const updateRecipeData = useCallback((key, value) => {
    setRecipeData(prev => ({
      ...prev,
      [key]: value
    }));
  }, [setRecipeData]);

  // Wrapper para salvar com sincronização automática
  // Wrapper para salvar com sincronização automática
  const handleSaveRecipe = async () => {

    if (!recipeData.name || recipeData.name.trim() === '') {
      toast({ title: "Erro de validação", description: "O nome da receita é obrigatório.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      // 1. Sincronizar dados dos INGREDIENTES (Novo Feature)
      const updatedPrepsWithIngredients = await getRefreshedPreparations();

      // 2. Atualizar estado local com ingredientes novos
      setPreparationsData(updatedPrepsWithIngredients);

      // 3. Preparar dados para salvamento (Lógica da função original)
      // Limpar notas vazias e SANITIZAR VALORES FANTASMAS (Sanitize on Save)
      const cleanedPreparations = updatedPrepsWithIngredients.map(prep => {
        const processes = prep.processes || [];
        const hasProcess = (processName) => processes.includes(processName);

        const sanitizedIngredients = (prep.ingredients || []).map(ing => {
          const sanitizedIng = { ...ing };

          // Se não tem descongelamento, limpa os campos de descongelamento
          if (!hasProcess('defrosting')) {
            sanitizedIng.weight_frozen = '';
            sanitizedIng.weight_thawed = '';
          }

          // Se não tem limpeza, mas tem cocção, o peso inicial da cocção precisa ser mantido, mas o clean morre
          if (!hasProcess('cleaning')) {
            sanitizedIng.weight_clean = '';
          }

          // Se não tem cocção, morrem os pesos de cocção
          if (!hasProcess('cooking')) {
            sanitizedIng.weight_pre_cooking = '';
            sanitizedIng.weight_cooked = '';
          }

          // Se não tem porcionamento
          if (!hasProcess('portioning')) {
            sanitizedIng.weight_portioned = '';
          }

          return sanitizedIng;
        });

        return {
          ...prep,
          ingredients: sanitizedIngredients,
          notes: (prep.notes || []).filter(note => (note.content && note.content.trim()) || note.photo)
        };
      });

      let finalPreparationsData = JSON.parse(JSON.stringify(cleanedPreparations));
      let recipeDataToSave = { ...recipeData };



      // 4. Sincronizar RECEITAS MATRIZ (Lógica existente)
      try {
        // Função refreshMatrixRecipes precisa estar disponível no escopo ou props.
        if (typeof refreshMatrixRecipes === 'function') {
          const { updatedPreparations: matrixUpdatedPreps, hasUpdates } = await refreshMatrixRecipes(finalPreparationsData);
          if (hasUpdates) {
            finalPreparationsData = matrixUpdatedPreps;
            toast({
              title: "Receitas Matriz Sincronizadas",
              description: "Os valores base foram atualizados com as versões mais recentes.",
              className: "bg-blue-50 border-blue-200 text-blue-800"
            });
          }
        }
      } catch (err) {
        console.error("Erro ao atualizar receitas matriz:", err);
      }

      // 5. Recalcular métricas finais com todos os dados atualizados
      const metrics = RecipeEngine.calculateRecipeMetrics(recipeDataToSave, finalPreparationsData, recipes);
      const finalRecipeData = { ...recipeDataToSave, ...metrics };

      // Atualizar estado local final
      setRecipeData(finalRecipeData);

      // 6. Chamar save original
      await saveRecipeConfig(finalRecipeData, finalPreparationsData);

      // 7. SINCRONIZAÇÃO EM CASCATA: Se essa Ficha Técnica estiver inserida dentro de outras Fichas Técnicas, atualize-as!
      try {
        if (finalRecipeData.id) {
          const fullDataForSync = { ...finalRecipeData, preparations: finalPreparationsData };
          const { updatedCount, logs } = await syncRecipeAcrossRecipes(finalRecipeData.id, fullDataForSync, recipeData?.name);
          if (updatedCount > 0) {
            console.group("🔍 [Rastreador] Cascata de Receitas Matrizes");
            logs.forEach(log => console.info(log));
            console.groupEnd();

            toast({
              title: "Cascata Concluída!",
              description: `${updatedCount} receitas dependentes foram atualizadas com sucesso.`,
            });
          }
        }
      } catch (syncErr) {
        console.error("Erro na cascata de receitas matrizes:", syncErr);
        // Não quebrar o save principal se a cascata falhar
      }

      toast({ title: "Sucesso", description: "Receita salva e sincronizada com sucesso!" });
      setIsDirty(false);

    } catch (error) {
      console.error("Erro no handleSaveRecipe:", error);
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const {
    handleTabChange,
    handleSearchFocus,
    handleSearchBlur,
    openModal,
    closeModal,
    openProcessCreatorModal,
    closeProcessCreatorModal,
    handleProcessCreatorModalClose,
    handleInputChange,
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

  // ==== HOOKS DE CÁLCULOS (CONECTADOS) ====
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

  // ==== HOOKS DE CONFIGURAÇÃO (CONECTADOS) ====
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

  // Carregar preferências salvas quando config mudar
  useEffect(() => {
    if (config?.filter_categories) {
      // Apenas atualizar se for diferente para evitar loops (embora react handle isso)
      // Comparação simples de arrays
      const isDifferent = JSON.stringify(config.filter_categories) !== JSON.stringify(selectedFilterCategories);
      if (isDifferent) {
        setSelectedFilterCategories(config.filter_categories);
      }
    }
  }, [config, selectedFilterCategories]); // Dependência ajustada para objeto config completo ou valores específicos

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

  // ==== HANDLERS PRIMÁRIOS DE INTEGRAÇÃO ====
  const {
    handleSelectChange,
  } = useRecipeInterface({
    recipeData,
    preparationsData,
    updateRecipeData
  });

  const handleCategoryChange = (value) => {
    handleSelectChange(setRecipeData, 'category', value);

    // Auto-detect type based on category
    const selectedCat = allCategoryTreeItems?.find(c => c.name === value) || window.CategoryTree?.list()?.find?.(c => c.name === value);
    if (selectedCat) {
      handleSelectChange(setRecipeData, 'category_id', selectedCat.id);
      if (selectedCat.type && selectedCat.type !== recipeData.type) {
        handleSelectChange(setRecipeData, 'type', selectedCat.type);
      }
    }

    setIsDirty(true);
  };

  // ==== STATES FOR SMART CATEGORY SELECTOR ====
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);

  const {
    allCategories: allCategoryTreeItems,
    groupedCategories,
    loadCategoriesTree,
    getSelectedCategoryLabel,
    handleSmartCategorySelect
  } = useRecipeCategorization({
    recipeData,
    selectedFilterCategories,
    handleCategoryChange,
    setCategorySelectorOpen
  });

  useEffect(() => {
    loadCategoriesTree(selectedFilterCategories);
  }, [recipeData.type, selectedFilterCategories, loadCategoriesTree]);

  // ==== FUNÇÕES DE CARREGAMENTO (como no Editar Cliente) ====
  const { loadRecipeById } = useRecipeLoad({
    setLoading,
    setRecipeData,
    setPreparationsData,
    setCurrentRecipeId,
    setIsEditing,
    setIsDirty,
    toast
  });

  // ==== HANDLERS ESPECÍFICOS ====
  const handleRecipeInputChange = (e) => {
    handleInputChange(setRecipeData, e);
    setIsDirty(true);
  };
  const handlePrepTimeChange = (e) => {
    handleNumberInputChange(setRecipeData, 'prep_time', e.target.value);
    setIsDirty(true);
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

  // ==== FUNÇÃO DE RECÁLCULO AUTOMÁTICO ====
  useEffect(() => {
    console.log("🟠 [RecipeTechnical Render] preparationsData length:", preparationsData?.length);
  }, [preparationsData]);

  const recalculateRecipeMetrics = useCallback(() => {
    const hasValidData = (preparationsData && preparationsData.length > 0) ||
      (recipeData && (recipeData.name || recipeData.id));

    if (!hasValidData) {
      return;
    }

    try {
      if (!preparationsData || preparationsData.length === 0) {
        // ... (o código para zerar as métricas permanece o mesmo)
        return;
      }

      const metricsResult = updateRecipeMetrics(preparationsData, recipeData, recipeData, recipes);

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

  // ==== EFFECT PARA RECÁLCULO AUTOMÁTICO (DEBOUNCED) ====
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

  // ==== EFFECT PARA RECÁLCULO AUTOMÁTICO (REMOVIDO) ====
  // O useEffect a seguir foi removido para evitar o recálculo automático dos
  // ingredientes a cada alteração, o que impedia a edição manual dos campos.
  // O cálculo agora é feito apenas ao salvar a receita.

  // ==== EFFECT PARA REFRESH DO CACHE DE INGREDIENTES ====
  useEffect(() => {
    // Carregamento passivo para o cache principal
    const refreshIngredients = async () => {
      try {
        await useRecipeZustandStore.getState().refreshIngredientsIfNeeded();
      } catch (error) {
        console.error("Falha ao refrescar cache de ingredientes durante o uso da Ficha Técnica.", error);
        toast({
          title: "Aviso de Conexão",
          description: "Falha ao sincronizar o banco de ingredientes atualizado. Você pode estar vendo dados salvos no cache anterior.",
          variant: "destructive"
        });
      }
    };
    refreshIngredients();
  }, [toast]);

  // ==== EFFECT PARA CARREGAR RECEITA DA URL ====
  const searchParams = useSearchParams();
  const lastLoadedUrlId = React.useRef(null);

  useEffect(() => {
    const recipeId = searchParams.get('id');

    // Só carrega uma vez quando há ID na URL e ainda não carregou
    if (recipeId && recipeId !== lastLoadedUrlId.current) {
      lastLoadedUrlId.current = recipeId;
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

    // Criar título do processo
    const prepCount = preparationsData.length;
    const processLabels = selectedProcesses
      .map(id => processTypes[id]?.label || id)
      .join(' + ');

    const newPreparation = {
      title: `${prepCount + 1}º Etapa: ${processLabels}`,
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

  const { handleAddPreparationFromModal } = useRecipePreparationModal({
    preparationsData,
    setPreparationsData,
    setIsDirty,
    setIsProcessCreatorOpen,
    pendingPreparationRef,
    setCurrentPrepIndexForIngredient,
    setIngredientModalOpen,
    setCurrentPrepIndexForRecipe,
    setRecipeModalOpen,
    setCurrentPrepIndexForAssembly,
    setIsAssemblyItemModalOpen,
    setCurrentPrepIndexForPackaging,
    setPackagingModalOpen
  });
  // ==== HANDLERS DE INGREDIENTES ====
  const handleOpenIngredientModal = (prepIndex) => {
    setCurrentPrepIndexForIngredient(prepIndex);
    setIngredientModalOpen(true);
    clearIngredientSearch();
  };

  const handleOpenIngredientReplacementModal = (prepIndex, ingredientIndex) => {
    setReplacingIngredientContext({ prepIndex, ingredientIndex });
    setIngredientModalOpen(true);
    clearIngredientSearch();
  };

  const handleCloseIngredientModal = () => {
    // If pending creation was active, clearing it implies cancel
    if (pendingPreparationRef.current) {
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
      pendingPreparationRef.current = null;
    }
    setRecipeModalOpen(false);
    setCurrentPrepIndexForRecipe(null);
  };

  const handleCloseAssemblyItemModal = () => {
    setIsAssemblyItemModalOpen(false);
    setCurrentPrepIndexForAssembly(null);
  };

  const {
    handleSelectIngredient,
    handleSelectRecipe,
    handleAddAssemblyItem
  } = useRecipeItemSelection({
    preparationsData,
    setPreparationsData,
    setIsDirty,
    toast,
    pendingPreparationRef,
    currentPrepIndexForIngredient,
    currentPrepIndexForPackaging,
    currentPrepIndexForRecipe,
    currentPrepIndexForAssembly,
    handleAddPreparationFromModal,
    handleCloseIngredientModal,
    handleClosePackagingModal,
    handleCloseRecipeModal: () => {
      if (pendingPreparationRef.current) pendingPreparationRef.current = null;
      setRecipeModalOpen(false);
      setCurrentPrepIndexForRecipe(null);
    },
    handleCloseAssemblyItemModal
  });
  const handleSelectMultipleIngredients = useCallback((selectedIngredients) => {
    if (!selectedIngredients || selectedIngredients.length === 0) return;

    if (replacingIngredientContext) {
      // MODO SUBSTITUIÇÃO: Apenas um ingrediente (o primeiro selecionado)
      const newIng = selectedIngredients[0];
      const { prepIndex, ingredientIndex } = replacingIngredientContext;

      replaceIngredientInPreparation(
        preparationsData,
        setPreparationsData,
        prepIndex,
        ingredientIndex,
        {
          ingredient_id: newIng.id,
          name: newIng.name,
          current_price: newIng.current_price || newIng.price || 0,
          unit: newIng.unit || 'kg',
          category: newIng.category,
          category_id: newIng.category_id,
          technical_data: newIng.technical_data || {}
        }
      );

      setReplacingIngredientContext(null); // Limpar contexto
      toast({ title: "Ingrediente substituído", description: "O ingrediente foi trocado mantendo as quantidades." });
    } else {
      // MODO ADIÇÃO (Existente)
      const prepIndex = currentPrepIndexForIngredient ?? currentPrepIndexForPackaging;

      if (prepIndex !== null) {
        selectedIngredients.forEach(ing => {
          addIngredientToPreparation(preparationsData, setPreparationsData, prepIndex, {
            ingredient_id: ing.id,
            name: ing.name,
            current_price: ing.current_price || ing.price || 0,
            unit: ing.unit || 'kg',
            category: ing.category,
            category_id: ing.category_id,
            technical_data: ing.technical_data || {}
          });
        });
      }
    }

    setIngredientModalOpen(false);
    setPackagingModalOpen(false);
    setIsDirty(true);
  }, [
    replacingIngredientContext,
    currentPrepIndexForIngredient,
    currentPrepIndexForPackaging,
    preparationsData,
    setPreparationsData,
    replaceIngredientInPreparation,
    addIngredientToPreparation,
    toast,
    setIngredientModalOpen,
    setPackagingModalOpen,
    setIsDirty
  ]);

  // Handler para quando uma receita é selecionada na busca
  const handleRecipeSelection = useCallback((selectedRecipe) => {
    if (!selectedRecipe) {
      return;
    }

    // Usar loadRecipeById para buscar dados completos da API
    // (a lista de busca contém dados resumidos, sem preparações completas)
    if (selectedRecipe.id) {
      loadRecipeById(selectedRecipe.id);
    }
  }, []);

  const openAddAssemblyItemModal = (prepIndex) => {
    setCurrentPrepIndexForAssembly(prepIndex);
    setIsAssemblyItemModalOpen(true);
  };


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
    if (activeCategoryFilter === 'all') return true;
    return recipe.type === activeCategoryFilter;
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 p-2 md:p-4" style={{ zoom: '80%' }}>
      <div className="max-w-[1600px] ml-0 space-y-6">

        {/* Header e Voltar */}
        <div className="flex items-center gap-4 mb-4 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 border-gray-300 hover:bg-gray-100 h-9"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>

          {/* Título Principal */}
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2 text-blue-600 flex-nowrap">
              <ClipboardList className="h-6 w-6 flex-shrink-0" />
              <h1 className="text-2xl font-bold whitespace-nowrap">Ficha Técnica</h1>
              {isDirty && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                  Não salvo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sistema de Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="dados-tecnicos">Dados Técnicos</TabsTrigger>
            <TabsTrigger value="book">Receituário</TabsTrigger>
          </TabsList>
          <TabsContent value="dados-tecnicos">

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              {/* COLUNA 1: Menu e Ações */}
              <div className="h-full">
                <RecipeMenuActions
                  isCategorySettingsOpen={isCategorySettingsOpen}
                  setIsCategorySettingsOpen={setIsCategorySettingsOpen}
                  categoryTypes={categoryTypes}
                  selectedFilterCategories={selectedFilterCategories}
                  setSelectedFilterCategories={setSelectedFilterCategories}
                  activeCategoryFilter={activeCategoryFilter}
                  setActiveCategoryFilter={setActiveCategoryFilter}
                  updateConfig={updateConfig}
                  saveConfiguration={saveConfiguration}
                  selectedCategoryType={selectedCategoryType}
                  configLoading={configLoading}
                  searchQueryRecipe={searchQueryRecipe}
                  handleSearchChange={handleSearchChange}
                  handleSearchFocusRecipe={handleSearchFocusRecipe}
                  handleSearchBlurRecipe={handleSearchBlurRecipe}
                  searchOpenRecipe={searchOpenRecipe}
                  searchLoading={searchLoading}
                  typeFilteredRecipes={typeFilteredRecipes}
                  highlightMatch={highlightMatch}
                  handleRecipeSelect={handleRecipeSelect}
                  handleRecipeSelection={handleRecipeSelection}
                  setIsPrintDialogOpen={setIsPrintDialogOpen}
                  setIsPrintCollectDialogOpen={setIsPrintCollectDialogOpen}
                  setIsPrintSimpleDialogOpen={setIsPrintSimpleDialogOpen}
                  handleClearRecipe={handleClearRecipe}
                  handleSaveRecipe={handleSaveRecipe}
                  saving={saving}
                />
              </div>

              {/* COLUNA 2: Informações Básicas */}
              <div className="h-full">
                <RecipeGeneralInfo
                  recipeData={recipeData}
                  groupedCategories={groupedCategories}
                  categorySelectorOpen={categorySelectorOpen}
                  setCategorySelectorOpen={setCategorySelectorOpen}
                  nameInputRef={nameInputRef}
                  handleRecipeInputChange={handleRecipeInputChange}
                  handlePrepTimeChange={handlePrepTimeChange}
                  getSelectedCategoryLabel={getSelectedCategoryLabel}
                  handleSmartCategorySelect={handleSmartCategorySelect}
                />
              </div>

              {/* COLUNA 3: Informações de Custo e Peso (COMPACTA) */}
              <Card className="bg-white backdrop-blur-sm bg-opacity-90 border border-gray-100 h-full flex flex-col">
                <CardHeader className="py-4 px-6 border-b bg-gray-50/50">
                  <CardTitle className="text-lg font-medium text-gray-700">
                    Métricas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 bg-gray-50/10">
                  <RecipeMetricsDashboard
                    metricsData={recipeData}
                    variant="list"
                    className="grid-cols-1 gap-0"
                    weightFieldName={recipeData.weight_field_name}
                    costFieldName={recipeData.cost_field_name}
                  />
                </CardContent>
              </Card>

              {/* COLUNA 3: Lista de Preparo (Ficha Técnica) */}
            </div>

            {/* Lista de Preparo (Full Width) */}
            <RecipeIngredientsTab
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              saving={saving}
              setSaving={setSaving}

              recipeData={recipeData}
              preparationsData={preparationsData}
              setPreparationsData={setPreparationsData}
              setIsDirty={setIsDirty}

              handleOpenProcessModal={handleOpenProcessModal}
              handleOpenIngredientModal={handleOpenIngredientModal}
              onOpenProcessEditModal={handleOpenProcessEditModal}
              onUnlockPreparation={handleUnlockPreparation}
              onSyncPreparation={handleSyncPreparation}
              handleOpenPackagingModal={handleOpenPackagingModal}
              handleOpenRecipeModal={handleOpenRecipeModal}
              handleOpenIngredientReplacementModal={handleOpenIngredientReplacementModal}
              handleOpenProcessEditModal={handleOpenProcessEditModal}
              openAddAssemblyItemModal={openAddAssemblyItemModal}

              handleSyncPreparation={handleSyncPreparation}
              handleDropPop={handleDropPop}
              handleEditPop={handleEditPop}
              editorCommand={editorCommand}

              updateIngredient={updateIngredient}
              updateRecipe={updateRecipe}
              removeIngredient={removeIngredient}
              removeRecipe={removeRecipe}
              removePreparation={removePreparation}

              handleSaveRecipe={handleSaveRecipe}
              isProduct={recipeData.type === 'produtos'}
            />
          </TabsContent>

          <TabsContent value="book" className="min-h-[600px] bg-white">
            <RecipeBook
              recipeData={{ ...recipeData, preparations: preparationsData }}
              isDraft={true}
              onPreparationsChange={setPreparationsData}
              onRecipeChange={(updates) => setRecipeData(prev => ({ ...prev, ...updates }))}
            />
          </TabsContent>
        </Tabs >

        {/* Agregador de Modais */}
        <RecipeModalsWrapper
          isProcessCreatorOpen={isProcessCreatorOpen}
          handleCloseProcessModal={handleCloseProcessModal}
          handleAddPreparationFromModal={handleAddPreparationFromModal}
          preparationsData={preparationsData}
          currentRecipeId={currentRecipeId}
          recipeData={recipeData}

          ingredientModalOpen={ingredientModalOpen}
          recipeModalOpen={recipeModalOpen}
          packagingModalOpen={packagingModalOpen}
          setIngredientModalOpen={setIngredientModalOpen}
          setRecipeModalOpen={setRecipeModalOpen}
          setPackagingModalOpen={setPackagingModalOpen}
          availableIngredients={availableIngredients}
          handleSelectMultipleIngredients={handleSelectMultipleIngredients}
          handleCloseIngredientModal={handleCloseIngredientModal}
          handleClosePackagingModal={handleClosePackagingModal}
          ingredientsLoading={ingredientsLoading}
          handleSelectRecipe={handleSelectRecipe}
          recipeSelectorFilters={recipeSelectorFilters}

          isAssemblyItemModalOpen={isAssemblyItemModalOpen}
          handleCloseAssemblyItemModal={handleCloseAssemblyItemModal}
          currentPrepIndexForAssembly={currentPrepIndexForAssembly}
          handleAddAssemblyItem={handleAddAssemblyItem}

          isProcessEditModalOpen={isProcessEditModalOpen}
          setIsProcessEditModalOpen={setIsProcessEditModalOpen}
          processEditData={processEditData}
          handleUpdateProcesses={handleUpdateProcesses}

          equipmentModalOpen={equipmentModalOpen}
          setEquipmentModalOpen={setEquipmentModalOpen}
          handleEquipmentConfirm={handleEquipmentConfirm}
          pendingPopDrop={pendingPopDrop}
          laborModalOpen={laborModalOpen}
          setLaborModalOpen={setLaborModalOpen}
          handleLaborConfirm={handleLaborConfirm}
          suggestedLaborTime={suggestedLaborTime}

          isPrintDialogOpen={isPrintDialogOpen}
          setIsPrintDialogOpen={setIsPrintDialogOpen}
          isPrintCollectDialogOpen={isPrintCollectDialogOpen}
          setIsPrintCollectDialogOpen={setIsPrintCollectDialogOpen}
          isPrintSimpleDialogOpen={isPrintSimpleDialogOpen}
          setIsPrintSimpleDialogOpen={setIsPrintSimpleDialogOpen}
          isReplacing={!!replacingIngredientContext}
        />
      </div >
    </div >
  );
}
