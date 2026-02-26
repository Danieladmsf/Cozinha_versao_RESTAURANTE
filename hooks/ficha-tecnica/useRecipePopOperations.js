import { useCallback } from 'react';
import { RecipeEngine } from '@/lib/recipe-engine/RecipeEngine';

/**
 * Hook para gerenciar as inteções de arrastar e soltar (Drag and Drop) de POPs 
 * (Procedimento Operacional Padrão) nos módulos de Processos, bem como suas confirmações (Custos de Equipamento e Mão de Obra).
 */
export function useRecipePopOperations({
    preparationsData,
    setPreparationsData,
    setEquipmentModalOpen,
    setLaborModalOpen,
    setSuggestedLaborTime,
    setPendingPopDrop,
    pendingPopDrop,
    setEditorCommand,
    setRecipeData
}) {

    const handleDropPop = useCallback((popData, insertPos, targetId) => {
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
            setPendingPopDrop({ popData, insertPos, targetId, isEdit: false });
            setEquipmentModalOpen(true);
        } else if (popData.type === 'labor') {
            // Calcular tempo sugerido se a preparação for válida
            let calculatedTime = 0;
            if (prepIndex >= 0 && preparationsData[prepIndex]) {
                const metrics = RecipeEngine.calculatePreparationMetrics(preparationsData[prepIndex]);
                calculatedTime = metrics.totalPrepTime || 0; // Segundos
            }

            setSuggestedLaborTime(calculatedTime);
            setPendingPopDrop({ popData, insertPos, targetId, isEdit: false });
            setLaborModalOpen(true);
        } else {
            // Direct insertion for non-equipment
            setEditorCommand({
                type: 'insertPop',
                payload: { ...popData },
                pos: insertPos,
                targetId: targetId,
                timestamp: Date.now() // Force update
            });
        }
    }, [preparationsData, setPendingPopDrop, setEquipmentModalOpen, setSuggestedLaborTime, setLaborModalOpen, setEditorCommand]);


    const handleEditPop = useCallback((popData, editPos, targetId) => {
        console.log("✏️ [useRecipePopOperations] handleEditPop triggered", { popData, editPos, targetId });

        // Add existing values from attributes
        const populatedData = {
            ...popData,
            initialDuration: popData.duration,
            initialCapacity: popData.capacity
        };

        if (popData.type === 'equipment') {
            setPendingPopDrop({ popData: populatedData, insertPos: editPos, targetId, isEdit: true });
            setEquipmentModalOpen(true);
        } else if (popData.type === 'labor') {
            let calculatedTime = 0;
            const prepMatch = targetId.match(/prep-(\d+)/);
            let prepIndex = prepMatch ? parseInt(prepMatch[1]) : -1;

            if (prepIndex >= 0 && preparationsData[prepIndex]) {
                const metrics = RecipeEngine.calculatePreparationMetrics(preparationsData[prepIndex]);
                calculatedTime = metrics.totalPrepTime || 0;
            }
            setSuggestedLaborTime(calculatedTime);
            setPendingPopDrop({ popData: populatedData, insertPos: editPos, targetId, isEdit: true });
            setLaborModalOpen(true);
        }
    }, [preparationsData, setPendingPopDrop, setEquipmentModalOpen, setSuggestedLaborTime, setLaborModalOpen]);

    const handleEquipmentConfirm = useCallback((data) => {
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

            const targetId = pendingPopDrop.targetId;

            setPreparationsData(prev => {
                let prepIndex = -1;
                const prepMatch = targetId.match(/prep-(\d+)/);
                if (prepMatch) {
                    prepIndex = parseInt(prepMatch[1]);
                }
                if (prepIndex < 0) {
                    const editorMatch = targetId.match(/editor-(\d+)/);
                    if (editorMatch) {
                        prepIndex = parseInt(editorMatch[1]);
                    }
                }

                if (prepIndex >= 0 && prepIndex < prev.length) {
                    const updatedPreps = [...prev];
                    const currentPrep = { ...updatedPreps[prepIndex] };

                    if (!currentPrep.equipment_costs) {
                        currentPrep.equipment_costs = [];
                    }

                    if (pendingPopDrop.isEdit) {
                        // Find the existing pop and update it
                        const existingIdx = currentPrep.equipment_costs.findIndex(eq => eq.pop_id === pendingPopDrop.popData.id);
                        if (existingIdx !== -1) {
                            currentPrep.equipment_costs[existingIdx] = {
                                ...currentPrep.equipment_costs[existingIdx],
                                cost: data.calculatedCost,
                                duration: data.duration,
                                ratio: data.ratio || 1,
                                capacity: data.capacity,
                                recipeYield: data.recipeYield,
                                timestamp: Date.now()
                            };
                        } else {
                            // Fallback if not found (shouldn't happen typically on edit)
                            currentPrep.equipment_costs.push({
                                pop_id: pendingPopDrop.popData.id,
                                name: pendingPopDrop.popData.name,
                                cost: data.calculatedCost,
                                duration: data.duration,
                                ratio: data.ratio || 1,
                                capacity: data.capacity,
                                recipeYield: data.recipeYield,
                                timestamp: Date.now()
                            });
                        }
                    } else {
                        // New insertion
                        currentPrep.equipment_costs = [
                            ...currentPrep.equipment_costs,
                            {
                                pop_id: pendingPopDrop.popData.id,
                                name: pendingPopDrop.popData.name,
                                cost: data.calculatedCost,
                                duration: data.duration,
                                ratio: data.ratio || 1,
                                capacity: data.capacity,
                                recipeYield: data.recipeYield,
                                timestamp: Date.now()
                            }
                        ];
                    }

                    updatedPreps[prepIndex] = currentPrep;
                    return updatedPreps;
                }

                console.warn('⚠️ [RecipeTechnical] Could not find preparation for targetId:', targetId, '(parsed index:', prepIndex, ')');
                return prev;
            });

            setEditorCommand({
                type: pendingPopDrop.isEdit ? 'updatePop' : 'insertPop',
                payload: popPayload,
                pos: pendingPopDrop.insertPos,
                targetId: pendingPopDrop.targetId,
                timestamp: Date.now()
            });

            setRecipeData(prev => {
                const currentOperationalCost = parseFloat(prev.operational_cost) || 0;
                // If edit, we should ideally subtract old cost and add new. 
                // However RecipeEngine recalculates it entirely from preparations anyway on save/effect.
                // We'll just trigger a dirty state.
                return { ...prev };
            });

            setPendingPopDrop(null);
        }
    }, [pendingPopDrop, setPreparationsData, setEditorCommand, setRecipeData, setPendingPopDrop]);


    const handleLaborConfirm = useCallback((data) => {
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

                    if (pendingPopDrop.isEdit) {
                        const existingIdx = currentPrep.labor_costs.findIndex(lb => lb.employee_id === pendingPopDrop.popData.id);
                        if (existingIdx !== -1) {
                            currentPrep.labor_costs[existingIdx] = {
                                ...currentPrep.labor_costs[existingIdx],
                                cost: data.calculatedCost,
                                duration: data.duration,
                                timestamp: Date.now()
                            };
                        } else {
                            currentPrep.labor_costs.push({
                                employee_id: pendingPopDrop.popData.id,
                                name: pendingPopDrop.popData.name,
                                role: pendingPopDrop.popData.role,
                                cost: data.calculatedCost,
                                duration: data.duration,
                                timestamp: Date.now()
                            });
                        }
                    } else {
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
                    }

                    updatedPreps[prepIndex] = currentPrep;
                    return updatedPreps;
                }
                return prev;
            });

            setEditorCommand({
                type: pendingPopDrop.isEdit ? 'updatePop' : 'insertPop',
                payload: popPayload,
                pos: pendingPopDrop.insertPos,
                targetId: pendingPopDrop.targetId,
                timestamp: Date.now()
            });

            setRecipeData(prev => {
                const currentOperationalCost = parseFloat(prev.operational_cost) || 0;
                const newCost = data.calculatedCost || 0;
                const updatedOperationalCost = currentOperationalCost + newCost;
                return {
                    ...prev,
                    operational_cost: updatedOperationalCost
                };
            });

            setPendingPopDrop(null);
        }
    }, [pendingPopDrop, setPreparationsData, setEditorCommand, setRecipeData, setPendingPopDrop]);


    return {
        handleDropPop,
        handleEquipmentConfirm,
        handleLaborConfirm
    };
}
