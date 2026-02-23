'use client';

import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import RecipeCalculator from "@/lib/recipeCalculator";

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
  HelpCircle
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
import { formatCurrency, formatWeight, parseNumericValue } from "@/lib/formatUtils";
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
import RecipeMetricsDashboard from "./RecipeMetricsDashboard";
import RecipeBook from "./RecipeBook";
import RecipeEquipmentModal from '@/components/receitas/RecipeEquipmentModal';
import RecipeLaborModal from '@/components/receitas/RecipeLaborModal';
import RecipeEngine from '@/lib/recipe-engine/RecipeEngine';
import PopSelectorSidebar from '@/components/receitas/PopSelectorSidebar';
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

  const handleDropPop = (popData, insertPos, targetId) => {
    console.log("🟦 [RecipeTechnical] handleDropPop triggered:", { popData, insertPos, targetId });

    // Resolver PrepIndex para cálculos
    let prepIndex = -1;
    const prepMatch = targetId.match(/prep-(\d+)/);
    if (prepMatch) {
      prepIndex = parseInt(prepMatch[1]);
    } else {
      const editorMatch = targetId.match(/editor-(\d+)/);
      if (editorMatch) {
        prepIndex = parseInt(editorMatch[1]);
      }
    }

    if (popData.type === 'equipment') {
      console.log("⚡ [RecipeTechnical] Equipment POP detected. Opening modal...");
      setPendingPopDrop({ popData, insertPos, targetId });
      setEquipmentModalOpen(true);
    } else if (popData.type === 'labor') {
      console.log("👷 [RecipeTechnical] Labor POP detected. Opening modal...");

      // Calcular tempo sugerido se a preparação for válida
      let calculatedTime = 0;
      if (prepIndex >= 0 && preparationsData[prepIndex]) {
        const metrics = RecipeEngine.calculatePreparationMetrics(preparationsData[prepIndex]);
        calculatedTime = metrics.totalPrepTime || 0; // Segundos
      }

      setSuggestedLaborTime(calculatedTime);
      setPendingPopDrop({ popData, insertPos, targetId });
      setLaborModalOpen(true);
    } else {
      console.log("📝 [RecipeTechnical] Standard POP. Inserting directly...");
      // Direct insertion for non-equipment
      setEditorCommand({
        type: 'insertPop',
        payload: { ...popData },
        pos: insertPos,
        targetId: targetId,
        timestamp: Date.now() // Force update
      });
    }
  };

  const handleEquipmentConfirm = (data) => {
    console.log('💰 [RecipeTechnical] handleEquipmentConfirm called with data:', data);

    if (pendingPopDrop) {
      const popPayload = {
        id: pendingPopDrop.popData.id,
        name: pendingPopDrop.popData.name,
        code: pendingPopDrop.popData.code,
        color: pendingPopDrop.popData.color,
        type: 'equipment',

        // Calculated Data
        cost: data.calculatedCost,
        duration: data.duration,
        capacity: data.capacity,
        calculatedCost: data.calculatedCost
      };

      console.log('💰 [RecipeTechnical] POP Payload to insert:', popPayload);
      console.log('💰 [RecipeTechnical] calculatedCost value:', data.calculatedCost);

      // Atualizar equipment_costs na preparação
      // O targetId é o ID interno do RichTextEditor, precisamos encontrar a preparação correspondente
      // Nota: Por agora, vamos adicionar a um estado global ou usar o índice da preparação ativa
      const targetId = pendingPopDrop.targetId;

      // Adicionar custo ao equipment_costs da preparação correspondente
      setPreparationsData(prev => {
        // Encontrar a preparação pelo targetId
        // Formatos possíveis: "prep-0-note-0", "editor-0", ou outro
        let prepIndex = -1;

        // Tentar formato "prep-X-note-Y"
        const prepMatch = targetId.match(/prep-(\d+)/);
        if (prepMatch) {
          prepIndex = parseInt(prepMatch[1]);
        }

        // Fallback: tentar formato "editor-X"  
        if (prepIndex < 0) {
          const editorMatch = targetId.match(/editor-(\d+)/);
          if (editorMatch) {
            prepIndex = parseInt(editorMatch[1]);
          }
        }

        // Verificar se o índice é válido
        if (prepIndex >= 0 && prepIndex < prev.length) {
          const updatedPreps = [...prev];
          const currentPrep = { ...updatedPreps[prepIndex] };

          // Inicializar equipment_costs se não existir
          if (!currentPrep.equipment_costs) {
            currentPrep.equipment_costs = [];
          }

          // Adicionar o novo custo
          currentPrep.equipment_costs = [
            ...currentPrep.equipment_costs,
            {
              pop_id: pendingPopDrop.popData.id,
              name: pendingPopDrop.popData.name,
              cost: data.calculatedCost,
              duration: data.duration,
              timestamp: Date.now()
            }
          ];

          console.log('💰 [RecipeTechnical] Updated equipment_costs for prep', prepIndex, ':', currentPrep.equipment_costs);

          updatedPreps[prepIndex] = currentPrep;
          return updatedPreps;
        }

        console.warn('⚠️ [RecipeTechnical] Could not find preparation for targetId:', targetId, '(parsed index:', prepIndex, ')');
        return prev;
      });

      setEditorCommand({
        type: 'insertPop',
        payload: popPayload,
        pos: pendingPopDrop.insertPos,
        targetId: pendingPopDrop.targetId,
        timestamp: Date.now()
      });
      console.log("⚡ [RecipeTechnical] Equipment POP Confirmed. Command sent:", { targetId: pendingPopDrop.targetId, calculatedCost: data.calculatedCost });

      // Atualizar recipeData.operational_cost dinamicamente para o dashboard
      const newCost = data.calculatedCost || 0;
      setRecipeData(prev => {
        const currentOperationalCost = parseFloat(prev.operational_cost) || 0;
        const updatedOperationalCost = currentOperationalCost + newCost;
        console.log('💰 [RecipeTechnical] Updating recipeData.operational_cost:', currentOperationalCost, '+', newCost, '=', updatedOperationalCost);
        return {
          ...prev,
          operational_cost: updatedOperationalCost
        };
      });

      setPendingPopDrop(null);
    }
  };

  const handleLaborConfirm = (data) => {
    console.log('👷 [RecipeTechnical] handleLaborConfirm called with data:', data);

    if (pendingPopDrop) {
      const popPayload = {
        id: pendingPopDrop.popData.id,
        name: pendingPopDrop.popData.name,
        code: pendingPopDrop.popData.code,
        color: pendingPopDrop.popData.color,
        type: 'labor',

        // Calculated Data
        cost: data.calculatedCost,
        duration: data.duration,
        calculatedCost: data.calculatedCost,
        role: data.role
      };

      console.log('👷 [RecipeTechnical] Labor POP Payload to insert:', popPayload);

      // Atualizar labor_costs na preparação
      const targetId = pendingPopDrop.targetId;

      setPreparationsData(prev => {
        let prepIndex = -1;
        const prepMatch = targetId.match(/prep-(\d+)/);
        if (prepMatch) prepIndex = parseInt(prepMatch[1]);
        if (prepIndex < 0) {
          const editorMatch = targetId.match(/editor-(\d+)/);
          if (editorMatch) prepIndex = parseInt(editorMatch[1]);
        }

        if (prepIndex >= 0 && prepIndex < prev.length) {
          const updatedPreps = [...prev];
          const currentPrep = { ...updatedPreps[prepIndex] };

          if (!currentPrep.labor_costs) currentPrep.labor_costs = [];

          currentPrep.labor_costs = [
            ...currentPrep.labor_costs,
            {
              employee_id: pendingPopDrop.popData.id,
              name: pendingPopDrop.popData.name,
              role: pendingPopDrop.popData.role,
              cost: data.calculatedCost,
              duration: data.duration,
              timestamp: Date.now()
            }
          ];

          updatedPreps[prepIndex] = currentPrep;
          return updatedPreps;
        }
        return prev;
      });

      setEditorCommand({
        type: 'insertPop',
        payload: popPayload,
        pos: pendingPopDrop.insertPos,
        targetId: pendingPopDrop.targetId,
        timestamp: Date.now()
      });

      // Atualizar recipeData.operational_cost
      const newCost = data.calculatedCost || 0;
      setRecipeData(prev => {
        const currentOperationalCost = parseFloat(prev.operational_cost) || 0;
        const updatedOperationalCost = currentOperationalCost + newCost;
        return {
          ...prev,
          operational_cost: updatedOperationalCost
        };
      });

      setPendingPopDrop(null);
    }
  };

  // ==== FILTRO DE CATEGORIAS (MENU) ====
  const [selectedFilterCategories, setSelectedFilterCategories] = useState([]); // IDs das categorias selecionadas
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all'); // 'all' ou ID da categoria
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false);



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
  // Função para atualizar todos os dados dos ingredientes (preços e dados técnicos)
  // Função para obter dados atualizados dos ingredientes (preços e dados técnicos)
  // Retorna os novos dados de preparação para serem usados no salvamento
  const getRefreshedPreparations = useCallback(async () => {
    console.log("Starting getRefreshedPreparations...");
    try {
      // Buscar TODOS os ingredientes ativos do banco
      const q = query(collection(db, "Ingredient"), where("active", "!=", false));
      const querySnapshot = await getDocs(q);
      console.log(`Fetched ${querySnapshot.size} active ingredients from DB.`);

      const ingredientsMap = new Map();
      querySnapshot.forEach(doc => {
        const data = doc.data();
        // Indexar por ID e também por NOME para facilitar o match
        ingredientsMap.set(doc.id, { id: doc.id, ...data });
        // Opcional: map por nome se nomes forem únicos
        // ingredientsMap.set(data.name, { id: doc.id, ...data });
      });

      let updatedCount = 0;

      // Percorrer preparações e atualizar
      const newPreparations = preparationsData.map(prep => ({
        ...prep,
        ingredients: (prep.ingredients || []).map(ing => {
          console.log(`Checking ingredient: ${ing.name}`);

          // Tentar encontrar pelo nome exato no mapa
          // Iterar values é ineficiente mas seguro para encontrar por nome
          const originalIng = Array.from(ingredientsMap.values()).find(i => i.name === ing.name);

          if (originalIng) {
            console.log(`Found match for ${ing.name}:`, originalIng);

            const tech = originalIng.technical_data || {};

            // Lógica de Recálculo de Pesos (Enforce Standards)
            // Se houver peso bruto definido, recalcular cascata com novos padrões
            const parseVal = (v) => {
              if (!v) return 0;
              return parseFloat(String(v).replace(',', '.'));
            };

            const formatVal = (v) => {
              return String(v.toFixed(3)).replace('.', ',');
            };

            let newWeights = {};

            // 1. Descongelamento (Frozen -> Thawed)
            const weightFrozen = parseVal(ing.weight_frozen);
            if (weightFrozen > 0 && tech.thawing_loss_pct) {
              const loss = parseVal(tech.thawing_loss_pct);
              const val = weightFrozen * (1 - loss / 100);
              newWeights.weight_thawed = formatVal(val);

              // Se não tiver limpeza nem cocção, isso define o peso limpo/cozido também?
              // Não, segue a cascata abaixo.
            }

            // 2. Limpeza (Thawed/Raw -> Clean)
            // Tenta usar o novo Thawed se existir, ou o antigo, ou Raw
            const inputClean = newWeights.weight_thawed ? parseVal(newWeights.weight_thawed) : (parseVal(ing.weight_thawed) || parseVal(ing.weight_raw));

            if (inputClean > 0 && tech.cleaning_loss_pct) {
              const loss = parseVal(tech.cleaning_loss_pct);
              const val = inputClean * (1 - loss / 100);
              newWeights.weight_clean = formatVal(val);
            }

            // 3. Cocção (Clean/Raw -> Cooked)
            const inputCook = newWeights.weight_clean ? parseVal(newWeights.weight_clean) : (parseVal(ing.weight_clean) || parseVal(ing.weight_raw));

            if (inputCook > 0 && tech.cooking_loss_pct) {
              const loss = parseVal(tech.cooking_loss_pct);
              const val = inputCook * (1 - loss / 100);
              newWeights.weight_cooked = formatVal(val);
            }

            updatedCount++;
            return {
              ...ing,
              // Atualizar preços
              current_price: originalIng.current_price,
              unit: originalIng.unit,

              // Atualizar dados técnicos (perdas)
              technical_data: {
                ...tech,
                cleaning_time_min: tech.cleaning_time_min,
                thawing_loss_pct: tech.thawing_loss_pct,
                cleaning_loss_pct: tech.cleaning_loss_pct,
                cooking_loss_pct: tech.cooking_loss_pct,
                labor_role_id: tech.labor_role_id
              },

              // Aplicar novos pesos recalculados (se gerados)
              ...newWeights
            };
          } else {
            console.warn(`No match found for ingredient: ${ing.name}`);
          }
          return ing;
        })
      }));

      console.log(`Sync complete. Updated ${updatedCount} ingredients.`);
      return newPreparations;

    } catch (err) {
      console.error("Erro ao atualizar ingredientes:", err);
      toast({ title: "Aviso", description: "Erro na sincronização. Verifique o console.", variant: "warning" });
      return preparationsData;
    }
  }, [preparationsData, toast]);
  const updateRecipeData = useCallback((key, value) => {
    setRecipeData(prev => ({
      ...prev,
      [key]: value
    }));
  }, [setRecipeData]);

  // Wrapper para salvar com sincronização automática
  // Wrapper para salvar com sincronização automática
  const handleSaveRecipe = async () => {
    console.log("handleSaveRecipe CLICKED!");

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



  // ==== STATES FOR SMART CATEGORY SELECTOR ====
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [groupedCategories, setGroupedCategories] = useState([]);

  useEffect(() => {
    loadCategoriesTree(selectedFilterCategories);
  }, [recipeData.type, selectedFilterCategories]); // Reload when type or filter settings change

  const loadCategoriesTree = async (currentFilters = []) => {
    console.log("🧪 [DEBUG] loadCategoriesTree: Running Type-based Grouping with Custom Format (v2)");
    try {
      const data = await CategoryTree.list();
      setAllCategories(data); // Populate allCategories for the filter menu

      const currentType = recipeData.type || 'receitas';

      // Filtrar categorias baseado nos CategoryTypes selecionados nas configurações
      // Se não houver seleção, mostrar todas. Se houver, filtrar pelo 'type' da categoria

      let recipeCats = data.filter(cat => cat.active !== false);

      if (currentFilters && currentFilters.length > 0) {
        recipeCats = recipeCats.filter(cat => currentFilters.includes(cat.type));
      }

      const roots = recipeCats
        .filter(c => c.level === 1)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      // 1. Agrupar Roots por Tipo
      const rootsByType = {};
      roots.forEach(root => {
        const type = root.type || 'receitas';
        if (!rootsByType[type]) rootsByType[type] = [];
        rootsByType[type].push(root);
      });

      // 2. Definir Ordem e Labels dos Tipos
      const orderedTypes = ['produtos', 'receitas', 'ingredientes', 'contas'];
      const typeLabels = {
        'produtos': 'PRODUTOS',
        'receitas': 'RECEITAS',
        'ingredientes': 'INGREDIENTES',
        'contas': 'CONTAS'
      };

      const presentTypes = Object.keys(rootsByType);

      const sortedTypes = [
        ...orderedTypes.filter(t => presentTypes.includes(t)),
        ...presentTypes.filter(t => !orderedTypes.includes(t))
      ];

      // 3. Criar Grupos (Type as Header -> Flattened Hierarchy as Items)
      const groups = sortedTypes.map(type => {
        const typeRoots = rootsByType[type];
        const typeLabel = typeLabels[type] || type.toUpperCase();

        let typeItems = [];

        // Helper to flatten descendants
        const buildDescendants = (cats, parentId, prefix) => {
          let list = [];
          const children = cats
            .filter(c => c.parent_id === parentId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          for (const child of children) {
            // Label Format: PREFIX > CHILD
            // (Prefix already contains "TYPE | ROOT")
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

        typeRoots.forEach(root => {
          // Base Label: TYPE | ROOT
          // User Requirement: "PRODUTOS | PRODUTOS > MACARRÃO" or "RECEITAS | PRATOS QUENTES"
          const rootLabel = `${typeLabel} | ${root.name}`;

          // Add Root Item
          typeItems.push({
            value: root.id,
            label: rootLabel,
            originalName: root.name,
            id: root.id,
            isRoot: true
          });

          // Add Descendants
          typeItems.push(...buildDescendants(recipeCats, root.id, rootLabel));
        });

        return {
          groupName: typeLabel,
          items: typeItems
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

    // Auto-detect type based on category
    const selectedCat = allCategories.find(c => c.name === value); // value is name here? Based on handleSmartCategorySelect it is originalName
    if (selectedCat && selectedCat.type) {
      if (selectedCat.type !== recipeData.type) {
        console.log(`Auto-setting type to ${selectedCat.type} based on category ${selectedCat.name}`);
        handleSelectChange(setRecipeData, 'type', selectedCat.type);
      }
    }

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
          // Check SOURCE PREPARATION for origin_id (sub_components may not have it directly)
          const sourcePrep = updatedPreparations.find(p => p.id === subComp.source_id);
          const originId = subComp.origin_id || (sourcePrep && sourcePrep.origin_id);
          if (originId) {
            try {
              console.log(`ðŸ”„ [MATRIX] Verificando atualizaÃ§Ãµes para: ${subComp.name} (${originId})`);

              // Buscar dados frescos da receita original
              const recipeRef = doc(db, 'Recipe', originId);
              const recipeSnap = await getDoc(recipeRef);

              if (recipeSnap.exists()) {
                const freshRecipeData = recipeSnap.data();

                // Calcular peso ALVO atual nesta preparaÃ§Ã£o
                // Se user editou "assembly_weight_kg", esse Ã© o alvo.
                // Se nÃ£o, usamos o peso atual calculado (yield_weight se for receita)
                const targetWeightInDerived = parseNumericValue(subComp.assembly_weight_kg) || parseNumericValue(subComp.input_yield_weight) || 0;

                // Peso original da receita fresca, calculado usando o motor oficial
                const matrixMetrics = RecipeCalculator.calculateRecipeMetrics(
                  freshRecipeData.preparations || [],
                  freshRecipeData
                );
                const freshYieldWeight = matrixMetrics.yield_weight || parseNumericValue(freshRecipeData.yield_weight) || 0;

                console.log(`[MATRIX DEBUG] targetWeight=${targetWeightInDerived}, freshYield=${freshYieldWeight}, freshData.yield_weight=${freshRecipeData.yield_weight}, freshData.total_weight=${freshRecipeData.total_weight}`);

                // Escalar apenas se tivermos pesos válidos
                if (targetWeightInDerived > 0 && freshYieldWeight > 0) {
                  // Calcular fator de escala para converter a receita fresca para o peso alvo desta ficha
                  // targetWeightInDerived (ex: 2kg) / freshYieldWeight (ex: 10kg) = 0.2
                  const scalingFactor = targetWeightInDerived / freshYieldWeight;
                  console.log(`[MATRIX REFRESH] Target: ${targetWeightInDerived} / Fresh: ${freshYieldWeight} = Factor: ${scalingFactor}`);

                  // Atualizar valores do sub-componente
                  // NÃƒO ATUALIZAMOS SUB-COMPONENTES DENTRO DO SUB-COMPONENTE (Deep nesting nÃ£o suportado no nÃ­vel de ficha tecninca simples)
                  // Mas atualizamos os custos base

                  // Se a receita mudou de preço, atualizamos
                  const freshTotalCost = parseNumericValue(freshRecipeData.total_cost) || 0;

                  // Escalar ingredientes da receita fresca visualmente para a ficha atual
                  let scaledIngredients = [];
                  // Get ingredients from top-level OR from first preparation (recipes store ingredients inside preparations)
                  const freshIngredients = (freshRecipeData.ingredients && freshRecipeData.ingredients.length > 0)
                    ? freshRecipeData.ingredients
                    : ((freshRecipeData.preparations || [])[0] || {}).ingredients || [];
                  console.log(`[MATRIX DEBUG] freshIngredients count: ${freshIngredients.length}, source: ${freshRecipeData.ingredients?.length > 0 ? 'top-level' : 'preparations[0]'}`);
                  if (freshIngredients.length > 0) {
                    scaledIngredients = RecipeCalculator.scaleIngredients(freshIngredients, scalingFactor);
                  }

                  // Atualizar os inputs baseados na nova receita escalada
                  prep.sub_components[sIndex] = {
                    ...subComp,
                    // Manter o nome original ou atualizar se a matriz mudou de nome? Vamos manter para não confundir.
                    // Atualizar custos unitários/totais base
                    input_yield_weight: String(freshRecipeData.yield_weight).replace('.', ','),
                    input_total_cost: String(freshRecipeData.total_cost).replace('.', ','),

                    // Manter o peso de montagem (é a definição desta ficha)
                    assembly_weight_kg: subComp.assembly_weight_kg,

                    // Injetar os ingredientes escalados para manter a UI coerente
                    ingredients: scaledIngredients

                    // Recalcular custos proporcionais?
                    // O RecipeCalculator fará isso depois, aqui só garantimos que os dados base (input_*) são os mais novos da matriz
                  };

                  console.log(`âœ… [MATRIX] Atualizado ${subComp.name}: Peso Base ${freshYieldWeight}kg -> Alvo ${targetWeightInDerived}kg`);
                  hasUpdates = true;

                  // CRITICAL: Also propagate scaled ingredients to the SOURCE preparation
                  // The UI reads from updatedPreparations[sourcePrepIndex].ingredients, NOT sub_component.ingredients
                  const sourcePrepIndex = updatedPreparations.findIndex(p => p.id === subComp.source_id);
                  if (sourcePrepIndex !== -1 && scaledIngredients.length > 0) {
                    console.log(`[MATRIX] Propagating ${scaledIngredients.length} scaled ingredients to source prep at index ${sourcePrepIndex}`);
                    updatedPreparations[sourcePrepIndex] = {
                      ...updatedPreparations[sourcePrepIndex],
                      ingredients: scaledIngredients
                    };
                  }
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
  const lastLoadedUrlId = React.useRef(null);

  useEffect(() => {
    const recipeId = searchParams.get('id');

    // SÃ³ carrega uma vez quando hÃ¡ ID na URL e ainda nÃ£o carregou
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
      quantity: ingredient.quantity || 1, // Ensure quantity is set, default to 1
      // 🎯 DADOS TÉCNICOS PADRONIZADOS
      technical_data: {
        thawing_loss_pct: ingredient.technical_data?.thawing_loss_pct || 0,
        cleaning_loss_pct: ingredient.technical_data?.cleaning_loss_pct || 0,
        cooking_loss_pct: ingredient.technical_data?.cooking_loss_pct || 0,
        cleaning_time_per_kg: ingredient.technical_data?.cleaning_time_per_kg || 0
      }
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
        current_price: String(ingredient.current_price || '').replace('.', ','),
        // 🎯 DADOS TÉCNICOS PADRONIZADOS
        technical_data: {
          thawing_loss_pct: ingredient.technical_data?.thawing_loss_pct || 0,
          cleaning_loss_pct: ingredient.technical_data?.cleaning_loss_pct || 0,
          cooking_loss_pct: ingredient.technical_data?.cooking_loss_pct || 0,
          cleaning_time_per_kg: ingredient.technical_data?.cleaning_time_per_kg || 0
        }
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

    // Usar loadRecipeById para buscar dados completos da API
    // (a lista de busca contém dados resumidos, sem preparações completas)
    if (selectedRecipe.id) {
      loadRecipeById(selectedRecipe.id);
    }
  }, []);





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



  // ==== FILTRO DE RECEITAS POR TIPO DE CATEGORIA ====
  const typeFilteredRecipes = filteredRecipes.filter(recipe => {
    // 1. Filtro por Tipo de Categoria (CategoryType - Ingredientes, Receitas, Contas, Produtos)
    if (activeCategoryFilter !== 'all') {
      // activeCategoryFilter é o 'value' do CategoryType (ex: 'ingredientes', 'receitas', 'produtos')
      // Precisamos verificar se a CATEGORIA da receita pertence a esse type no CategoryTree

      // Pegar todas as categorias do CategoryTree que pertencem ao tipo selecionado
      const categoriesOfType = allCategories.filter(cat => cat.type === activeCategoryFilter);
      const categoryNamesOfType = categoriesOfType.map(cat => cat.name);

      // Verificar se a categoria da receita está na lista
      const recipeCategory = recipe.category || '';

      // Se a categoria da receita está diretamente na lista, ou
      // Se qualquer ancestor da categoria da receita pertence ao tipo
      if (!categoryNamesOfType.includes(recipeCategory)) {
        // Tentar encontrar pelo categoryId se existir
        if (recipe.category_id) {
          const recipeCatObj = allCategories.find(c => c.id === recipe.category_id);
          if (recipeCatObj && recipeCatObj.type !== activeCategoryFilter) {
            return false;
          }
        } else {
          // Encontrar a categoria pelo nome e verificar o type
          const recipeCatObj = allCategories.find(c => c.name === recipeCategory);
          if (!recipeCatObj || recipeCatObj.type !== activeCategoryFilter) {
            return false;
          }
        }
      }
    }

    return true;
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

        {/* Título Principal */}
        <div className="flex items-center justify-between mb-4">
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

        {/* Sistema de Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="dados-tecnicos">Dados Técnicos</TabsTrigger>
            <TabsTrigger value="book">Receituário</TabsTrigger>
            <TabsTrigger value="pre-preparo">Pré-Preparo</TabsTrigger>
            <TabsTrigger value="ficha-tecnica">Ficha Técnica</TabsTrigger>
          </TabsList>

          <TabsContent value="dados-tecnicos">

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              {/* COLUNA 1: Menu e Ações */}
              <Card className="bg-white shadow-sm border h-full flex flex-col">
                <CardHeader className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-medium text-gray-700">Menu</CardTitle>

                  <Popover open={isCategorySettingsOpen} onOpenChange={setIsCategorySettingsOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-4" align="end">
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-gray-900 border-b pb-2">Configurar Filtros</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {categoryTypes
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map(catType => (
                              <div key={catType.id || catType.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`filter-${catType.value}`}
                                  checked={selectedFilterCategories.includes(catType.value)}
                                  onCheckedChange={(checked) => {
                                    let newCategories = [];
                                    if (checked) {
                                      newCategories = [...selectedFilterCategories, catType.value];
                                    } else {
                                      newCategories = selectedFilterCategories.filter(v => v !== catType.value);
                                      if (activeCategoryFilter === catType.value) setActiveCategoryFilter('all');
                                    }

                                    setSelectedFilterCategories(newCategories);

                                    // Atualizar config e salvar (passando newCategories diretamente)
                                    updateConfig('filter_categories', newCategories);
                                    saveConfiguration(selectedCategoryType, newCategories);
                                  }}
                                />
                                <label
                                  htmlFor={`filter-${catType.value}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {catType.label}
                                </label>
                              </div>
                            ))
                          }
                          {categoryTypes.length === 0 && (
                            <p className="text-xs text-gray-500">Nenhuma categoria encontrada.</p>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </CardHeader>
                <CardContent className="p-4 space-y-3 flex-1">
                  {/* Barra de Busca e Filtros */}
                  <div className="relative search-container flex flex-col gap-2">

                    {/* ABAS DE FILTRO DE CATEGORIA (Agora acima da busca) */}
                    {!configLoading && selectedFilterCategories.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto py-1 px-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent mb-1">
                        <Badge
                          variant={activeCategoryFilter === 'all' ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer whitespace-nowrap px-3 py-1 text-xs",
                            activeCategoryFilter === 'all'
                              ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
                              : "hover:bg-gray-100"
                          )}
                          onClick={() => setActiveCategoryFilter('all')}
                        >
                          Todos
                        </Badge>

                        {selectedFilterCategories.map(catValue => {
                          const catType = categoryTypes.find(c => c.value === catValue);
                          if (!catType) return null;
                          const isActive = activeCategoryFilter === catValue;
                          return (
                            <Badge
                              key={catType.value}
                              variant={isActive ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer whitespace-nowrap px-3 py-1 text-xs",
                                isActive
                                  ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                                  : "hover:bg-gray-100 text-gray-600"
                              )}
                              onClick={() => setActiveCategoryFilter(catType.value)}
                            >
                              {catType.label}
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    <div className="relative">
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
                    </div>

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
                              {searchQueryRecipe.trim() ? 'Nenhuma receita encontrada' : (
                                activeCategoryFilter !== 'all'
                                  ? `Nenhuma receita na categoria selecionada`
                                  : 'Digite para buscar receitas'
                              )}
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
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        onClick={handleSaveRecipe}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1 justify-center text-xs col-span-2"
                      >
                        {saving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        {saving ? 'Sincronizando e Salvando...' : 'Salvar e Sincronizar'}
                      </Button>
                    </div>
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

                  <div className="mt-4">
                    <Label htmlFor="video_url" className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Link do YouTube
                    </Label>
                    <Input
                      id="video_url"
                      name="video_url"
                      value={recipeData.video_url || ''}
                      onChange={handleRecipeInputChange}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* COLUNA 2: Informações de Custo e Peso (COMPACTA) */}
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
            <div className="mt-6 flex relative min-h-[600px]">

              {/* Sidebar POPs */}
              <PopSelectorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

              <div className="flex-1 transition-all duration-300">
                <Card className="bg-white shadow-sm border h-full flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center sticky top-0 z-10 w-full">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={cn("mr-2", sidebarOpen ? "bg-blue-100 text-blue-700" : "text-gray-500")}
                      >
                        {sidebarOpen ? <ChevronsUpDown className="h-4 w-4 rotate-90" /> : <List className="h-4 w-4" />}
                      </Button>
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
                      onDropPop={handleDropPop}
                      prioritizedCommand={editorCommand}
                      onUpdatePreparation={(prepIdx, field, value) => {
                        setPreparationsData(prev => {
                          const newData = [...prev];
                          if (newData[prepIdx]) {
                            newData[prepIdx] = { ...newData[prepIdx], [field]: value };
                          }
                          return newData;
                        });
                        setIsDirty(true);
                      }}
                      onBatchUpdatePreparations={(newPreps) => {
                        setPreparationsData(newPreps);
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
                          onClick={() => {
                            // Fix Race Condition: Force any active input to blur so its onBlur handler fires
                            // (e.g., the Yield scaling input) before we begin the save process.
                            if (document.activeElement && document.activeElement.blur) {
                              document.activeElement.blur();
                            }

                            // Defend against React state batching delay. Let the onBlur state setter finish before we read it to save.
                            setSaving(true);
                            setTimeout(() => {
                              handleSaveRecipe();
                            }, 200);
                          }}
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

          <TabsContent value="book" className="min-h-[600px] bg-white">
            <RecipeBook
              recipeData={{ ...recipeData, preparations: preparationsData }}
              isDraft={true}
              onPreparationsChange={setPreparationsData}
              onRecipeChange={(updates) => setRecipeData(prev => ({ ...prev, ...updates }))}
            />
          </TabsContent>
        </Tabs >

        {/* Modal de Criação de Processo */}
        {
          isProcessCreatorOpen && (
            <ProcessCreatorModalComponent
              isOpen={isProcessCreatorOpen}
              onClose={handleCloseProcessModal}
              onAddPreparation={handleAddPreparationFromModal}
              preparationsLength={preparationsData.length}
              preparationsData={preparationsData} // Passar dados completos para o modal
              currentRecipeId={currentRecipeId}
              contextType={recipeData.type || 'receitas'}
            />
          )
        }



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

        {/* Modal de Custo de Equipamento POP */}
        <RecipeEquipmentModal
          open={equipmentModalOpen}
          onClose={() => setEquipmentModalOpen(false)}
          onConfirm={handleEquipmentConfirm}
          popData={pendingPopDrop?.popData}
          currentYield={recipeData.yield_weight || recipeData.cuba_weight || 1}
        />

        {/* Modal de Custo de Mão de Obra */}
        <RecipeLaborModal
          open={laborModalOpen}
          onClose={() => setLaborModalOpen(false)}
          employeeData={pendingPopDrop?.popData}
          onConfirm={handleLaborConfirm}
          suggestedTime={suggestedLaborTime} // Passar tempo sugerido
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
      </div >
    </div >
  );
}
