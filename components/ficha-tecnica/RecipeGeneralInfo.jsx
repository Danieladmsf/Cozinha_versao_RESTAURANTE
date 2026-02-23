import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from "@/lib/utils";

/**
 * Componente que exibe os Inputs primordiais da Receita (Nome, Tempo, Categoria, Vídeo)
 * Refatorado de RecipeTechnical.jsx(linhas ~2339-2445)
 */
export function RecipeGeneralInfo({
    recipeData,
    groupedCategories,
    categorySelectorOpen,
    setCategorySelectorOpen,
    nameInputRef,
    handleRecipeInputChange,
    handlePrepTimeChange,
    getSelectedCategoryLabel,
    handleSmartCategorySelect
}) {

    return (
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
                        value={recipeData?.name || ''}
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
                            value={recipeData?.prep_time || 0}
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
                                                                recipeData?.category === category.originalName ? "opacity-100" : "opacity-0"
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
                        value={recipeData?.video_url || ''}
                        onChange={handleRecipeInputChange}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full focus:ring-red-500 focus:border-red-500"
                    />
                </div>
            </CardContent>
        </Card>
    );
}

export default RecipeGeneralInfo;
