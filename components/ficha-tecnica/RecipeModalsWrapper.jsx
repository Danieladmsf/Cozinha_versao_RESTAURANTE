import React from 'react';
import ProcessCreatorModalComponent from "./ProcessCreatorModal";
import UnifiedSelectionModal from "./UnifiedSelectionModal";
import AddAssemblyItemModal from "./AddAssemblyItemModal";
import ProcessEditModal from "./ProcessEditModal";
import RecipeEquipmentModal from "@/components/receitas/RecipeEquipmentModal";
import RecipeLaborModal from "@/components/receitas/RecipeLaborModal";
import RecipeTechnicalPrintDialog from "./RecipeTechnicalPrintDialog";
import RecipeCollectDialog from "./RecipeCollectDialog";
import RecipeSimplePrintDialog from "./RecipeSimplePrintDialog";

/**
 * Agregador de Modais do Ficha Técnica para limpar o arquivo principal.
 */
export function RecipeModalsWrapper({
    // Modal de Criação de Processo
    isProcessCreatorOpen,
    handleCloseProcessModal,
    handleAddPreparationFromModal,
    preparationsData,
    currentRecipeId,
    recipeData,

    // Seleção Unificada
    ingredientModalOpen,
    recipeModalOpen,
    packagingModalOpen,
    setIngredientModalOpen,
    setRecipeModalOpen,
    setPackagingModalOpen,
    availableIngredients,
    handleSelectMultipleIngredients,
    handleCloseIngredientModal,
    handleClosePackagingModal,
    ingredientsLoading,
    handleSelectRecipe,
    recipeSelectorFilters,

    // Assembly Modal
    isAssemblyItemModalOpen,
    handleCloseAssemblyItemModal,
    currentPrepIndexForAssembly,
    handleAddAssemblyItem,

    // Process Edit Modal
    isProcessEditModalOpen,
    setIsProcessEditModalOpen,
    processEditData,
    handleUpdateProcesses,

    // POP Modals
    equipmentModalOpen,
    setEquipmentModalOpen,
    handleEquipmentConfirm,
    pendingPopDrop,
    laborModalOpen,
    setLaborModalOpen,
    handleLaborConfirm,
    suggestedLaborTime,

    // Print Modals
    isPrintDialogOpen,
    setIsPrintDialogOpen,
    isPrintCollectDialogOpen,
    setIsPrintCollectDialogOpen,
    isPrintSimpleDialogOpen,
    setIsPrintSimpleDialogOpen
}) {
    return (
        <>
            {/* Modal de Criação de Processo */}
            {isProcessCreatorOpen && (
                <ProcessCreatorModalComponent
                    isOpen={isProcessCreatorOpen}
                    onClose={handleCloseProcessModal}
                    onAddPreparation={handleAddPreparationFromModal}
                    preparationsLength={preparationsData.length}
                    preparationsData={preparationsData}
                    currentRecipeId={currentRecipeId}
                    contextType={recipeData.type || 'receitas'}
                />
            )}

            {/* Modal Unificado de Seleção de Itens (Ingredientes ou Receitas) */}
            <UnifiedSelectionModal
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
                currentRecipeId={currentRecipeId}
                recipeSelectorFilters={recipeSelectorFilters}
                contextType={recipeData?.type || 'receitas'}
            />

            {/* Modal de AdiÃ§Ã£o de Item Ã  Montagem/Porcionamento */}
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
                initialProcesses={processEditData?.initialProcesses || []}
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
                suggestedTime={suggestedLaborTime}
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
                isOpen={isPrintSimpleDialogOpen}
                onClose={() => setIsPrintSimpleDialogOpen(false)}
            />
        </>
    );
}
