
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Recipe, CategoryTree } from "@/app/api/entities";
import { useToast } from "@/components/ui/use-toast";
import {
  ChevronRight,
  Loader2,
  Copy,
  FileText,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";
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

export default function BulkRecipeCreator({ onSuccess }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);

  // Combobox state
  const [open, setOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [groupedCategories, setGroupedCategories] = useState([]);

  const [formData, setFormData] = useState({
    category: "",
    recipeNames: "",
    prepTime: "30",
    yieldWeight: "1000" // em gramas
  });
  const { toast } = useToast();

  // Carregar e agrupar a árvore de categorias
  const loadCategories = async () => {
    try {
      const data = await CategoryTree.list();

      // Filtrar categorias de receitas E produtos (ambos são válidos para receitas)
      const recipeCats = data.filter(cat =>
        (cat.type === "receitas" || cat.type === "produtos") && cat.active !== false
      );

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
          label: root.name, // Raiz não precisa de prefixo >
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
      toast({
        title: "Erro",
        description: "Erro ao carregar categorias.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isDialogOpen) {
      loadCategories();
      setSelectedCategoryId("");
      setResults(null);
    }
  }, [isDialogOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handler de seleção no Combobox
  const handleSelectCategory = (categoryId, originalName) => {
    setSelectedCategoryId(categoryId);
    setFormData(prev => ({ ...prev, category: originalName }));
    setOpen(false);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    // Parser avançado: suporta dois formatos
    // Formato 1 (com categoria): CATEGORIA / SUBCATEGORIA CÓDIGO – NOME, ...
    // Formato 2 (simples): CÓDIGO – NOME; CÓDIGO – NOME; ...

    const rawInput = formData.recipeNames.trim();

    if (!rawInput) {
      toast({
        title: "Nenhum dado",
        description: "Insira pelo menos uma receita",
        variant: "destructive"
      });
      return;
    }

    // Detecta o formato baseado na presença de vírgulas vs ponto e vírgula
    const hasCommas = rawInput.includes(',');

    // Se tem vírgulas, assume formato avançado (com categoria)
    // Se tem ponto e vírgula ou nenhum, assume formato simples
    const separator = hasCommas ? ',' : ';';

    const entries = rawInput
      .split(separator)
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0);

    if (entries.length === 0) {
      toast({
        title: "Nenhum nome válido",
        description: "Insira pelo menos um nome de receita",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      const processingResults = [];

      for (const rawEntry of entries) {
        try {
          let code = null;
          let recipeName = rawEntry;
          let category = formData.category; // Usa categoria selecionada como padrão
          let categoryId = selectedCategoryId; // Usa ID selecionado como padrão

          // Regex para extrair: [CATEGORIA / SUBCATEGORIA] [CÓDIGO] – [NOME]
          // Exemplo: "PRODUTOS / MARMITA 3 DIVISÓRIAS 007768 – REFEIÇÃO LAGARTO"

          // Primeiro, tenta encontrar o padrão com código numérico seguido de travessão/hífen
          const codeNameMatch = rawEntry.match(/(\d{4,})\s*[–\-]\s*(.+)$/);

          if (codeNameMatch) {
            code = codeNameMatch[1];
            recipeName = codeNameMatch[2].trim();

            // Extrai a categoria (tudo antes do código)
            const beforeCode = rawEntry.substring(0, rawEntry.indexOf(code)).trim();

            if (beforeCode) {
              // Pega a categoria extraída
              let extractedCat = beforeCode.replace(/\s*\/\s*$/, '').trim();

              // Se a categoria tem " / ", pega apenas a última parte como categoria
              if (extractedCat.includes(' / ')) {
                const catParts = extractedCat.split(' / ');
                category = catParts[catParts.length - 1].trim();
              } else if (extractedCat) {
                category = extractedCat;
              }

              // Buscar o ID da categoria extraída no groupedCategories
              const allItems = groupedCategories.flatMap(g => g.items);
              const foundCat = allItems.find(c =>
                c.originalName === category ||
                c.originalName?.includes(category) ||
                category?.includes(c.originalName)
              );
              if (foundCat) {
                categoryId = foundCat.id;
                category = foundCat.originalName; // Usar nome exato
              }
            }
          } else {
            // Fallback: tenta separar por travessão/hífen sem código
            const separators = [' – ', ' - ', '–', '-'];
            for (const sep of separators) {
              if (rawEntry.includes(sep)) {
                const parts = rawEntry.split(sep);
                const potentialCode = parts[0].trim();

                // Verifica se termina com código numérico
                const codeAtEnd = potentialCode.match(/(\d{4,})$/);
                if (codeAtEnd) {
                  code = codeAtEnd[1];
                  const beforeCode = potentialCode.substring(0, potentialCode.lastIndexOf(code)).trim();
                  if (beforeCode) {
                    let extractedCat = beforeCode.replace(/\s*\/\s*$/, '').trim();
                    if (extractedCat.includes(' / ')) {
                      const catParts = extractedCat.split(' / ');
                      category = catParts[catParts.length - 1].trim();
                    } else if (extractedCat) {
                      category = extractedCat;
                    }

                    // Buscar o ID da categoria extraída
                    const allItems = groupedCategories.flatMap(g => g.items);
                    const foundCat = allItems.find(c =>
                      c.originalName === category ||
                      c.originalName?.includes(category) ||
                      category?.includes(c.originalName)
                    );
                    if (foundCat) {
                      categoryId = foundCat.id;
                      category = foundCat.originalName;
                    }
                  }
                  recipeName = parts.slice(1).join(sep).trim();
                  break;
                } else if (/^\d{4,}$/.test(potentialCode) || /^[A-Z0-9]{3,10}$/i.test(potentialCode)) {
                  code = potentialCode;
                  recipeName = parts.slice(1).join(sep).trim();
                  break;
                }
              }
            }
          }

          const recipeData = {
            name: recipeName,
            code: code,
            category: category || formData.category,
            category_id: categoryId || selectedCategoryId || null,
            prep_time: parseInt(formData.prepTime, 10) || 0,
            yield_weight: parseInt(formData.yieldWeight, 10) || 0,
            total_weight: 0,
            active: true,
            ingredients: []
          };

          const result = await Recipe.create(recipeData);
          processingResults.push({
            name: rawEntry,
            code: code,
            category: category,
            success: true,
            id: result.id
          });
        } catch (err) {
          processingResults.push({
            name: rawEntry,
            success: false,
            error: err.message
          });
        }
      }

      setResults(processingResults);

      const successCount = processingResults.filter(r => r.success).length;

      toast({
        title: "Processamento concluído",
        description: `${successCount} de ${entries.length} receitas criadas.`
      });

      if (successCount > 0 && typeof onSuccess === 'function') {
        onSuccess();
      }

    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro durante o processamento.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category: "",
      recipeNames: "",
      prepTime: "30",
      yieldWeight: "1000"
    });
    setResults(null);
    setSelectedCategoryId("");
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTimeout(resetForm, 300);
  };

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        className="bg-amber-600 hover:bg-amber-700 flex items-center gap-1"
      >
        <Copy className="h-4 w-4 mr-1" />
        Criar Receitas em Massa
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Criar Múltiplas Receitas
            </DialogTitle>
          </DialogHeader>

          {!results ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2 flex flex-col">
                <Label className="mb-1">Categoria de Receita</Label>

                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between font-normal"
                    >
                      {selectedCategoryId
                        ? groupedCategories.flatMap(g => g.items).find((c) => c.value === selectedCategoryId)?.label?.replace(/ > /g, " / ")
                        : "Selecione a categoria..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[550px] p-0" align="start">
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
                                onSelect={() => handleSelectCategory(category.value, category.originalName)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCategoryId === category.value ? "opacity-100" : "opacity-0"
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

              <div className="space-y-2">
                <Label htmlFor="recipeNames">Receitas</Label>
                <Textarea
                  id="recipeNames"
                  name="recipeNames"
                  value={formData.recipeNames}
                  onChange={handleChange}
                  placeholder="PRODUTOS / MARMITA 007768 – REFEIÇÃO LAGARTO, PRODUTOS / MARMITA 008966 – REFEIÇÃO ISCA"
                  required
                  rows={5}
                />
                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Formato avançado (,):</strong> CATEGORIA / SUBCATEGORIA CÓDIGO – NOME, ...</p>
                  <p><strong>Formato simples (;):</strong> CÓDIGO – NOME; CÓDIGO – NOME; ...</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prepTime">Tempo de Preparo (min)</Label>
                  <Input
                    id="prepTime"
                    name="prepTime"
                    type="number"
                    min="0"
                    value={formData.prepTime}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yieldWeight">Rendimento (gramas)</Label>
                  <Input
                    id="yieldWeight"
                    name="yieldWeight"
                    type="number"
                    min="1"
                    value={formData.yieldWeight}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={isProcessing}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ChevronRight className="mr-2 h-4 w-4" />
                      Criar Receitas
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-md p-4 border">
                <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-gray-600" />
                  Resultado da Importação
                </h3>

                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-1 text-sm font-medium">Receita</th>
                        <th className="text-center py-2 px-1 text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-gray-100" : ""}>
                          <td className="py-2 px-1">{result.name}</td>
                          <td className="py-2 px-1 text-center">
                            {result.success ? (
                              <span className="text-green-600 flex items-center justify-center gap-1">
                                <Copy className="h-4 w-4" />
                                Criada
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center justify-center gap-1">
                                Erro
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Total: {results.length} receitas |
                    Sucesso: {results.filter(r => r.success).length} |
                    Falhas: {results.filter(r => !r.success).length}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={closeDialog}>
                  Concluir
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}