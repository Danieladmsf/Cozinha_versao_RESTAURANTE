import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryTree } from "@/app/api/entities";
import { useRecipeStore } from '@/hooks/ficha-tecnica/useRecipeStore';
import { Button } from "@/components/ui/button";

export default function RecipeBasicInfoForm() {
  const { recipe, actions, computed } = useRecipeStore();
  const {
    validationErrors = {},
    isLoading = false,
    formatDisplayValue = (val) => val
  } = computed;

  const [open, setOpen] = useState(false);
  const [groupedCategories, setGroupedCategories] = useState([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await CategoryTree.list();

      // Filtrar apenas categorias de receitas
      const recipeCats = data.filter(cat => cat.type === "receitas" && cat.active !== false);

      const roots = recipeCats
        .filter(c => c.level === 1)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const groups = roots.map(root => {
        // Função para achatar os descendentes deste raiz
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

        // O próprio raiz também é uma opção selecionável
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
      console.error("Erro ao carregar categorias", error);
    }
  };

  const handleInputChange = (e) => {
    actions.setRecipeField(e.target.name, e.target.value);
  };

  const handleSelectCategory = (originalName) => {
    actions.setRecipeField('category', originalName);
    setOpen(false);
  };

  const handlePrepTimeChange = (e) => {
    actions.setRecipeField('prep_time', e.target.value);
  };

  // Helper to find selected label. The recipe.category stores the NAME, not ID.
  // So we need to match by originalName.
  const getSelectedLabel = () => {
    if (!recipe.category) return "Selecione a categoria";
    const found = groupedCategories.flatMap(g => g.items).find(c => c.originalName === recipe.category);
    return found ? found.label : recipe.category;
  };

  return (
    <Card className="bg-white shadow-sm border">
      <CardHeader className="bg-gray-50 border-b border-gray-200 px-6 py-4 rounded-t-lg">
        <CardTitle className="text-lg font-semibold text-gray-700">
          Informações Básicas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 items-start">
          <div>
            <Label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <span className="text-blue-500 mr-1.5">●</span> Nome Principal *
            </Label>
            <Input
              id="name"
              name="name"
              value={recipe.name || ''}
              onChange={handleInputChange}
              placeholder="Ex: Maminha Assada"
              required
              disabled={isLoading}
              className={`w-full ${validationErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              aria-describedby={validationErrors.name ? 'name-error' : undefined}
            />
            {validationErrors.name && (
              <p id="name-error" className="text-sm text-red-600 mt-1">
                {validationErrors.name}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="name_complement" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <span className="text-purple-500 mr-1.5">●</span> Complemento (opcional)
            </Label>
            <Input
              id="name_complement"
              name="name_complement"
              value={recipe.name_complement || ''}
              onChange={handleInputChange}
              placeholder="Ex: ao molho de mostarda"
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="cuba_weight" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <span className="text-pink-500 mr-1.5">●</span> {recipe.weight_field_name || 'Peso da Cuba'} (kg)
              <span className="ml-auto text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">Calculado automaticamente</span>
            </Label>
            <Input
              id="cuba_weight"
              name="cuba_weight"
              type="text"
              value={formatDisplayValue(recipe.cuba_weight, 'weight')}
              readOnly
              placeholder="Calculado pela soma das etapas de finalização"
              className="w-full bg-gray-50 text-gray-600 cursor-not-allowed"
              title="Este valor é calculado automaticamente pela soma das etapas de Porcionamento e Montagem"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2 flex flex-col">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Categoria
            </Label>

            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    "w-full justify-between font-normal",
                    validationErrors.category ? "border-red-500" : ""
                  )}
                  disabled={isLoading}
                >
                  {getSelectedLabel()}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar categoria..." />
                  <CommandList>
                    <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                    {groupedCategories.map((group) => (
                      <CommandGroup key={group.groupName} heading={group.groupName}>
                        {group.items.map((category) => (
                          <CommandItem
                            key={category.value}
                            value={category.value}
                            onSelect={() => handleSelectCategory(category.originalName)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                recipe.category === category.originalName ? "opacity-100" : "opacity-0"
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

            {validationErrors.category && (
              <p className="text-sm text-red-600 mt-1">
                {validationErrors.category}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              Tempo de Preparo (min)
            </Label>
            <Input
              type="number"
              min="0"
              value={recipe.prep_time || 0}
              onChange={handlePrepTimeChange}
              disabled={isLoading}
              className={`transition-all duration-200 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 hover:border-gray-400 ${validationErrors.prep_time ? 'border-red-500' : ''}`}
              aria-describedby={validationErrors.prep_time ? 'prep-time-error' : undefined}
            />
            {validationErrors.prep_time && (
              <p id="prep-time-error" className="text-sm text-red-600 mt-1">
                {validationErrors.prep_time}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_url" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Link do YouTube
            </Label>
            <Input
              id="video_url"
              name="video_url"
              value={recipe.video_url || ''}
              onChange={handleInputChange}
              placeholder="https://youtube.com/watch?v=..."
              disabled={isLoading}
              className="w-full focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}