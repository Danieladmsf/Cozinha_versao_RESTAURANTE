import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IngredientSelectorContent } from "./IngredientSelectorContent";
import { RecipeSelectorContent } from "./RecipeSelectorModal";

export function UnifiedSelectionModal({
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
    currentRecipeId,
    recipeSelectorFilters
}) {
    const isOpen = ingredientModalOpen || recipeModalOpen || packagingModalOpen;

    const handleOpenChange = (open) => {
        if (!open) {
            setIngredientModalOpen(false);
            setRecipeModalOpen(false);
            setPackagingModalOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
    );
}

export default UnifiedSelectionModal;
