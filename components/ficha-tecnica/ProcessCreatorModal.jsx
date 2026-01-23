'use client';

import React, { useCallback, useState, useEffect } from "react";
import {
  Button,
  Label,
} from "@/components/ui";
import {
  CookingPot,
  Package,
  Layers,
  ThermometerSnowflake,
  Droplets,
  Flame
} from "lucide-react";
import { processTypes } from "@/lib/recipeConstants";
import RecipeSelectorModal from "./RecipeSelectorModal";

const ProcessCreatorModalComponent = ({
  isOpen,
  onClose,
  onAddPreparation,
  preparationsLength,
  preparationsData, // Adicionado para receber os dados
  contextType = 'receitas',
  currentRecipeId,
}) => {
  const [loading, setLoading] = useState(false);
  // Se o contexto for produto, iniciar na aba de produtos, senão processos
  const [activeTab, setActiveTab] = useState(contextType === 'receitas_-_base' ? 'products' : 'processes');
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [showSimpleProcessSelector, setShowSimpleProcessSelector] = useState(false);

  // Effect to sync tab with context type if modal re-opens
  useEffect(() => {
    if (isOpen) {
      console.log('[ProcessCreatorModal] contextType:', contextType, '-> activeTab:', contextType === 'receitas_-_base' ? 'products' : 'processes');
      setActiveTab(contextType === 'receitas_-_base' ? 'products' : 'processes');
    }
  }, [contextType, isOpen]);

  const handleProcessToggle = useCallback((processId, checked) => {
    setSelectedProcesses(prev =>
      checked ? [...prev, processId] : prev.filter((id) => id !== processId)
    );
  }, []);

  const handleCreateProcess = useCallback(() => {
    if (selectedProcesses.length === 0) return;

    // Se apenas "Receita" foi selecionado (na aba Processos), abrir modal de seleção
    if (selectedProcesses.length === 1 && selectedProcesses[0] === 'recipe') {
      setShowRecipeSelector(true);
      return;
    }

    // Calular próximo número de etapa baseado no maior existente
    let nextStepNumber = preparationsLength + 1;
    if (preparationsData && preparationsData.length > 0) {
      const numbers = preparationsData.map(p => {
        const match = p.title?.match(/^(\d+)º Etapa:/);
        return match ? parseInt(match[1], 10) : 0;
      });
      const maxNumber = Math.max(...numbers, 0);
      // Se o máximo for maior ou igual ao tamanho (ex: deletou do meio), usa max + 1
      if (maxNumber >= preparationsLength) {
        nextStepNumber = maxNumber + 1;
      }
    }

    const processLabels = selectedProcesses
      .map(id => processTypes[id]?.label || id)
      .join(' + ');

    const newPreparation = {
      title: `${nextStepNumber}º Etapa: ${processLabels}`,
      processes: selectedProcesses,
      ingredients: [],
      instructions: "",
      assembly_config: selectedProcesses.includes('assembly') ? {
        container_type: 'cuba',
        total_weight: '',
        units_quantity: '1',
        notes: ''
      } : undefined
    };



    // Se for processo "Receita", sinaliza para abrir seletor
    const isRecipeProcess = selectedProcesses.length === 1 && selectedProcesses[0] === 'recipe';
    const isAssemblyOrPortioning = selectedProcesses.includes('assembly') || selectedProcesses.includes('portioning');

    let options = {};
    if (isRecipeProcess) {
      options = { openRecipeSelector: true };
    } else if (isAssemblyOrPortioning) {
      // 1. Encontrar todas as etapas anteriores válidas (não assembly/portioning)
      const existingSteps = preparationsData || [];
      const validPreviousSteps = existingSteps.filter(p =>
        !p.processes.includes('portioning') &&
        !p.processes.includes('assembly') &&
        p.title // Garantir que tem título
      );

      // 2. Criar sub-componentes baseados nessas etapas
      const initialSubComponents = validPreviousSteps.map(step => ({
        id: String(Date.now() + Math.random()),
        name: step.title,
        type: 'preparation',
        source_id: step.id,
        assembly_weight_kg: 0,
        yield_weight: step.total_yield_weight_prep || 0,
        total_cost: step.total_cost_prep || 0
      }));

      newPreparation.sub_components = initialSubComponents;
      // Não abre o seletor manual, pois já populamos automaticamente
      options = {};
    } else {
      options = { openIngredientSelector: true };
    }

    onAddPreparation(newPreparation, options);
    setSelectedProcesses([]);
    onClose();
  }, [selectedProcesses, preparationsLength, onAddPreparation, onClose]);

  const handleSelectRecipe = useCallback(async (recipeDataOrArray) => {
    if (activeTab === "products") {
      // Normalize to array
      const recipesToImport = Array.isArray(recipeDataOrArray) ? recipeDataOrArray : [recipeDataOrArray];

      // Calculate base index from existing titles
      let baseNumber = 0;
      if (preparationsData && preparationsData.length > 0) {
        const numbers = preparationsData.map(p => {
          const match = p.title?.match(/^(\d+)º Etapa:/);
          return match ? parseInt(match[1], 10) : 0;
        });
        baseNumber = Math.max(...numbers, 0);
      }

      // Loop properly through ALL items
      for (let i = 0; i < recipesToImport.length; i++) {
        // Calculate the specific step number for this item in the batch
        const targetStepNumber = baseNumber + 1 + i;

        await handleSelectProductRecipe(recipesToImport[i], { forceStepNumber: targetStepNumber });
      }
      return;
    }

    setLoading(true);
    try {
      // REFATORADO: Usar serviço centralizado de import
      const { importRecipeAsPreparation } = await import('@/lib/services/recipeImportService');

      // Normalize to array
      const recipesToImport = Array.isArray(recipeDataOrArray) ? recipeDataOrArray : [recipeDataOrArray];

      console.warn('[ProcessCreator] handleSelectRecipe START', {
        isArray: Array.isArray(recipeDataOrArray),
        count: recipesToImport.length,
        currentPreparationsCount: preparationsData.length,
        existingTitles: preparationsData.map(p => p.title)
      });

      // Calculate base index from existing titles to ensure continuity
      let baseNumber = 0;
      if (preparationsData && preparationsData.length > 0) {
        const numbers = preparationsData.map(p => {
          const match = p.title?.match(/^(\d+)º Etapa:/);
          return match ? parseInt(match[1], 10) : 0;
        });
        baseNumber = Math.max(...numbers, 0);
      }

      for (let i = 0; i < recipesToImport.length; i++) {
        const recipeData = recipesToImport[i];

        // Calculate next number: max existing + 1 + current iteration loop
        // We subtract 1 because importRecipeAsPreparation ADDS 1 internally to the passed index.
        // baseNumber is the MAX existing (e.g. 1).
        // If i=0: target is 2. indexForService should be 1 (since service does +1).
        const targetStepNumber = baseNumber + 1 + i;
        const indexForService = targetStepNumber - 1;

        const { preparation, parentInfo } = await importRecipeAsPreparation(
          recipeData.id,
          { prepIndex: indexForService }
        );

        // FORCE TITLE UPDATE to ensure sequential numbering matches the loop
        // This overrides any potential issue in the service or default assignment
        preparation.title = `${targetStepNumber}º Etapa: ${parentInfo.name}`;

        // Adicionar preparação estruturada
        onAddPreparation(preparation);
        console.log(`[ProcessCreator] Importando ${i + 1}/${recipesToImport.length}: ${preparation.title}`);
      }

    } catch (error) {
      console.error("Erro ao importar receita:", error);
    } finally {
      setLoading(false);
      setShowRecipeSelector(false);
      setSelectedProcesses([]);
      onClose();
    }
  }, [preparationsLength, preparationsData, onAddPreparation, onClose, activeTab]);

  const handleSelectProductRecipe = async (recipeData, options = {}) => {
    // Logic for "Produtos" tab: Import structure
    setLoading(true);
    try {
      // Fetch full recipe details
      const response = await fetch(`/api/recipes?id=${recipeData.id}`);
      const result = await response.json();

      if (result.success && result.data) {
        const fullRecipe = result.data;
        const preparations = fullRecipe.preparations || [];

        // 1. Filter valid preparations (excluding portioning/assembly)
        const validPreparations = preparations.filter(prep => {
          const hasExcludedProcess = prep.processes && (
            prep.processes.length === 1 && (
              prep.processes.includes('portioning') ||
              prep.processes.includes('assembly')
            )
          );
          return !hasExcludedProcess;
        });

        if (validPreparations.length === 0) {
          console.warn("No suitable preparations found to import.");
          setLoading(false);
          setShowRecipeSelector(false);
          onClose();
          return;
        }

        // 2. Consolidate into SINGLE Card
        let consolidatedIngredients = [];
        let uniqueProcesses = new Set();
        let stepTitles = [];

        validPreparations.forEach((prep, index) => {
          // 1. Header Ingredient REMOVED per user request (redundant)
          /*
          const headerIngredient = {
            id: String(Date.now() + Math.random()),
            name: prep.title || `ETAPA ${index + 1}`,
            current_price: 0,
            weight_raw: 0,
            weight_cooked: 0,
            is_header: true,
            header_theme: theme,
            ingredient_id: null
          };
          consolidatedIngredients.push(headerIngredient);
          */

          // Accumulate processes
          if (prep.processes) {
            prep.processes.forEach(p => uniqueProcesses.add(p));
          }

          // Accumulate ingredients with new IDs
          if (prep.ingredients) {
            const newIngs = prep.ingredients.map(ing => ({
              ...ing,
              id: String(Date.now() + Math.random()), // New Client ID
              ingredient_id: ing.ingredient_id || ing.id,

              // Mapeamento ROBUSTO de pesos e custos
              // Prioriza o campo específico (ex: weight_raw), depois o campo genérico (ex: gross_weight)
              weight_raw: ing.weight_raw || ing.gross_weight || ing.amount || 0,
              weight_clean: ing.weight_clean || ing.net_weight || 0,
              weight_cooked: ing.weight_cooked || 0,
              weight_frozen: ing.weight_frozen || 0,
              weight_thawed: ing.weight_thawed || 0,
              weight_pre_cooking: ing.weight_pre_cooking || 0,
              weight_portioned: ing.weight_portioned || 0,
              yield_weight: ing.yield_weight || 0,

              cost_raw: ing.cost_raw || 0,
              cost_clean: ing.cost_clean || 0,
              cost_cooked: ing.cost_cooked || 0,
              current_price: ing.current_price || ing.price || 0,

              // Preservar nome e unidade
              name: ing.name,
              unit: ing.unit,
            }));
            consolidatedIngredients = [...consolidatedIngredients, ...newIngs];
          }

          // Track step titles
          stepTitles.push(prep.title || `Etapa ${index + 1}`);

          // Accumulate NOTES properly
          if (prep.notes) {
            const notesList = Array.isArray(prep.notes) ? prep.notes : [prep.notes];
            notesList.forEach(note => {
              const noteContent = typeof note === 'object' ? note.content : note;
              if (noteContent && typeof noteContent === 'string' && noteContent.trim() !== '') {
                const noteRow = {
                  id: String(Date.now() + Math.random()),
                  name: noteContent, // We use 'name' to store the content
                  is_note_row: true, // Special flag
                  current_price: 0,
                  weight_raw: 0,
                  weight_cooked: 0,
                  yield_weight: 0,
                  ingredient_id: null
                };
                consolidatedIngredients.push(noteRow);
              }
            });
          }
        });

        // Default to 'cooking' if no processes found (unlikely)
        const finalProcesses = uniqueProcesses.size > 0
          ? Array.from(uniqueProcesses)
          : ['cooking'];

        const prepCount = preparationsLength;
        const newPreparation = {
          title: `${(() => {
            // Use explicit override if provided (for batch imports)
            if (options.forceStepNumber) {
              return options.forceStepNumber;
            }

            let nextNum = preparationsLength + 1;
            if (preparationsData?.length > 0) {
              const nums = preparationsData.map(p => { const m = p.title?.match(/^(\d+)º Etapa:/); return m ? parseInt(m[1]) : 0; });
              const max = Math.max(...nums, 0);
              if (max >= preparationsLength) nextNum = max + 1;
            }
            return nextNum;
          })()
            }º Etapa: ${recipeData.name}`,
          processes: finalProcesses,
          ingredients: consolidatedIngredients,
          instructions: `Importado de: ${recipeData.name}. Etapas consolidadas: ${stepTitles.join(', ')}.`,
          notes: [], // Notes are now interleaved as ingredients
          assembly_config: undefined,
          origin_id: recipeData.id // MARCAR COMO MATRIZ para bloquear edição
        };

        onAddPreparation(newPreparation);
      }
    } catch (error) {
      console.error("Error importing product recipe:", error);
    } finally {
      setLoading(false);
      setShowRecipeSelector(false);
      onClose();
    }
  };

  const handleCreatePortioningStep = useCallback(() => {
    const prepCount = preparationsLength;

    // 1. Encontrar todas as etapas anteriores válidas (não assembly/portioning)
    const existingSteps = preparationsData || [];
    const validPreviousSteps = existingSteps.filter(p =>
      !p.processes.includes('portioning') &&
      !p.processes.includes('assembly') &&
      p.title // Garantir que tem título
    );

    // 2. Criar sub-componentes baseados nessas etapas
    const initialSubComponents = validPreviousSteps.map(step => ({
      id: String(Date.now() + Math.random()),
      name: step.title,
      type: 'preparation',
      source_id: step.id,
      assembly_weight_kg: 0,
      yield_weight: step.total_yield_weight_prep || 0,
      total_cost: step.total_cost_prep || 0
    }));

    const newPreparation = {
      title: `${(() => {
        let nextNum = preparationsLength + 1;
        if (preparationsData?.length > 0) {
          const nums = preparationsData.map(p => { const m = p.title?.match(/^(\d+)º Etapa:/); return m ? parseInt(m[1]) : 0; });
          const max = Math.max(...nums, 0);
          if (max >= preparationsLength) nextNum = max + 1;
        }
        return nextNum;
      })()
        }º Etapa: Porcionamento`,
      processes: ['portioning'],
      ingredients: [],
      sub_components: initialSubComponents, // JA INICIA COM OS ITENS
      instructions: "Porcionamento Final e Montagem",
      assembly_config: {
        container_type: 'cuba',
        total_weight: '',
        units_quantity: '1',
        notes: ''
      }
    };

    onAddPreparation(newPreparation);
    onClose();
  }, [preparationsLength, preparationsData, onAddPreparation, onClose]);

  const handleCreatePackagingStep = useCallback(() => {
    const prepCount = preparationsLength;

    const newPreparation = {
      title: `${(() => {
        let nextNum = preparationsLength + 1;
        if (preparationsData?.length > 0) {
          const nums = preparationsData.map(p => { const m = p.title?.match(/^(\d+)º Etapa:/); return m ? parseInt(m[1]) : 0; });
          const max = Math.max(...nums, 0);
          if (max >= preparationsLength) nextNum = max + 1;
        }
        return nextNum;
      })()
        }º Etapa: Embalagem`,
      processes: ['packaging'],
      ingredients: [],
      instructions: "Embalagem do produto",
      assembly_config: undefined
    };

    onAddPreparation(newPreparation, { openPackagingSelector: true, deferCreation: true });
    onClose();
  }, [preparationsLength, onAddPreparation, onClose]);

  const handleCreateSimpleProcess = useCallback((processId) => {
    const processLabel = processTypes[processId]?.label || processId;
    const prepCount = preparationsLength;

    // Configurações específicas por tipo
    let defaultInstruction = "";
    if (processId === 'defrosting') defaultInstruction = "Processo de descongelamento controlado.";
    if (processId === 'cleaning') defaultInstruction = "Higienização e corte.";
    if (processId === 'cooking') defaultInstruction = "Processo de cocção.";

    const newPreparation = {
      title: `${(() => {
        let nextNum = preparationsLength + 1;
        if (preparationsData?.length > 0) {
          const nums = preparationsData.map(p => { const m = p.title?.match(/^(\d+)º Etapa:/); return m ? parseInt(m[1]) : 0; });
          const max = Math.max(...nums, 0);
          if (max >= preparationsLength) nextNum = max + 1;
        }
        return nextNum;
      })()
        }º Etapa: ${processLabel}`,
      processes: [processId],
      ingredients: [],
      instructions: defaultInstruction,
      assembly_config: undefined
    };

    onAddPreparation(newPreparation, { openIngredientSelector: true, deferCreation: true });
    setShowSimpleProcessSelector(false);
    onClose();
  }, [preparationsLength, onAddPreparation, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {!showRecipeSelector && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <CookingPot className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Criar Nova Etapa de Processo</h3>
            </div>

            {/* ÚNICO MODO: Botões de Ação */}
            <div className="space-y-4">
              {/* Main View */}
              {!showSimpleProcessSelector ? (
                <div className="py-4">

                  <Button
                    onClick={() => setShowRecipeSelector(true)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2"
                  >
                    <CookingPot className="w-4 h-4" />
                    Selecionar Receita
                  </Button>

                  <Button
                    onClick={() => setShowSimpleProcessSelector(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 mt-3"
                  >
                    <Layers className="w-4 h-4" />
                    Adicionar Ingrediente
                  </Button>

                  <Button
                    onClick={() => handleCreatePackagingStep()}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2 mt-3"
                  >
                    <Package className="w-4 h-4" />
                    Adicionar Embalagem
                  </Button>

                  <Button
                    onClick={handleCreatePortioningStep}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 mt-3"
                  >
                    <Package className="w-4 h-4" />
                    Finalizar com Porcionamento
                  </Button>

                </div>
              ) : (
                // Sub-selection View (Grid filtrado para ingredientes)
                <div className="py-4 space-y-4">
                  <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Selecione os Processos Desejados
                  </Label>

                  <div className="grid grid-cols-2 gap-3">
                    {Object.values(processTypes)
                      .filter(p => ['defrosting', 'cleaning', 'cooking'].includes(p.id))
                      .sort((a, b) => a.order - b.order)
                      .map(process => {
                        const isSelected = selectedProcesses.includes(process.id);

                        // Map icons
                        let Icon = Layers;
                        if (process.id === 'defrosting') Icon = ThermometerSnowflake;
                        if (process.id === 'cleaning') Icon = Droplets;
                        if (process.id === 'cooking') Icon = Flame;

                        return (
                          <div
                            key={process.id}
                            onClick={() => handleProcessToggle(process.id, !isSelected)}
                            className={`
                              cursor-pointer relative p-3 rounded-lg border-2 transition-all duration-200
                              flex flex-col items-center justify-center gap-2 text-center
                              ${isSelected
                                ? `border-${process.color}-500 bg-${process.color}-50`
                                : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}
                            `}
                          >
                            <Icon
                              className={`w-6 h-6 ${isSelected ? `text-${process.color}-600` : `text-${process.color}-500 opacity-70`}`}
                            />
                            <span className={`text-sm font-medium ${isSelected ? `text-${process.color}-700` : 'text-gray-600'}`}>
                              {process.label}
                            </span>

                            {isSelected && (
                              <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-${process.color}-500`}></div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowSimpleProcessSelector(false);
                        setSelectedProcesses([]);
                      }}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={handleCreateProcess}
                      disabled={selectedProcesses.length === 0}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      Criar Etapa
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>

            {/* Modal de seleção de receitas */}
          </div>
        </div>
      )}

      {/* Modal de seleção de receitas */}
      <RecipeSelectorModal
        isOpen={showRecipeSelector}
        onClose={() => setShowRecipeSelector(false)}
        onSelectRecipe={handleSelectRecipe}
        currentRecipeId={currentRecipeId}
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span>Importando estrutura da receita...</span>
          </div>
        </div>
      )}
    </>
  );
};

export default ProcessCreatorModalComponent;
