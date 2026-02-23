import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CookingPot, Plus, List, ChevronsUpDown, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import PopSelectorSidebar from '@/components/receitas/PopSelectorSidebar';
import DraggablePreparationList from "./DraggablePreparationList";
import { RECIPE_TYPES } from "@/lib/recipeConstants";

export function RecipeIngredientsTab({
    // Controle de Interface
    sidebarOpen,
    setSidebarOpen,
    saving,
    setSaving,

    // Dados Principais
    recipeData,
    preparationsData,
    setPreparationsData,
    setIsDirty,

    // Ações de Modal
    handleOpenProcessModal,
    handleOpenIngredientModal,
    handleOpenPackagingModal,
    handleOpenRecipeModal,
    handleOpenProcessEditModal,
    openAddAssemblyItemModal,

    // Operações Avançadas
    handleSyncPreparation,
    handleDropPop,
    editorCommand,

    // Wrappers de Operações do CRUD
    updateIngredient,
    updateRecipe,
    removeIngredient,
    removeRecipe,
    removePreparation,

    // Ação de Salvar Central
    handleSaveRecipe
}) {
    return (
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
                            onSyncPreparation={handleSyncPreparation}
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
                            }}
                            removePreparationWrapper={(prepId) => removePreparation(preparationsData, setPreparationsData, prepId)}
                        />

                        {/* Save Button */}
                        {preparationsData.length > 0 && (
                            <div className="p-4 border-t border-gray-100 flex justify-end">
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        // Fix Race Condition: Force any active input to blur so its onBlur handler fires
                                        if (document.activeElement && document.activeElement.blur) {
                                            document.activeElement.blur();
                                        }
                                        // Defend against React state batching delay.
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
    );
}
