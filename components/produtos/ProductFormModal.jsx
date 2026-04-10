'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Recipe } from "@/app/api/entities";
import { Plus, Trash, Save, ChevronsUpDown, Check } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export default function ProductFormModal({ isOpen, onClose, onSave, editingProduct, fullCategoryTree = [] }) {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        unit_type: 'un',
        shelf_life_days: '',
        category: '',
        components: []
    });

    const [recipes, setRecipes] = useState([]);
    const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            Recipe.list().then(setRecipes);
            if (editingProduct) {
                setFormData({
                    name: editingProduct.name || '',
                    code: editingProduct.code || '',
                    unit_type: editingProduct.unit_type || 'un',
                    shelf_life_days: editingProduct.shelf_life_days || '',
                    category: editingProduct.category || '',
                    components: editingProduct.components || []
                });
            } else {
                setFormData({ name: '', code: '', unit_type: 'un', shelf_life_days: '', category: '', components: [] });
            }
        }
    }, [isOpen, editingProduct]);

    // Construir árvore de categorias agrupada (mesma lógica de Recipes.jsx)
    const groupedCategories = useMemo(() => {
        const data = fullCategoryTree.filter(c => c.active !== false);
        const roots = data.filter(c => c.level === 1).sort((a, b) => (a.order || 0) - (b.order || 0));

        const rootsByType = {};
        roots.forEach(root => {
            const type = root.type || 'produtos';
            if (!rootsByType[type]) rootsByType[type] = [];
            rootsByType[type].push(root);
        });

        const orderedTypes = ['produtos', 'receitas', 'ingredientes', 'contas'];
        const typeLabels = { 'produtos': 'PRODUTOS', 'receitas': 'RECEITAS', 'ingredientes': 'INGREDIENTES', 'contas': 'CONTAS' };
        const presentTypes = Object.keys(rootsByType);
        const sortedTypes = [
            ...orderedTypes.filter(t => presentTypes.includes(t)),
            ...presentTypes.filter(t => !orderedTypes.includes(t))
        ];

        const buildDescendants = (cats, parentId, prefix) => {
            let list = [];
            const children = cats.filter(c => c.parent_id === parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
            for (const child of children) {
                const label = `${prefix} > ${child.name}`;
                list.push({ value: child.id, label, originalName: child.name, id: child.id });
                list = [...list, ...buildDescendants(cats, child.id, label)];
            }
            return list;
        };

        return sortedTypes.map(type => {
            const typeRoots = rootsByType[type];
            const typeLabel = typeLabels[type] || type.toUpperCase();
            let typeItems = [];
            typeRoots.forEach(root => {
                const rootLabel = `${typeLabel} | ${root.name}`;
                typeItems.push({ value: root.id, label: rootLabel, originalName: root.name, id: root.id, isRoot: true });
                typeItems.push(...buildDescendants(data, root.id, rootLabel));
            });
            return { groupName: typeLabel, items: typeItems };
        });
    }, [fullCategoryTree]);

    const getSelectedCategoryLabel = () => {
        if (!formData.category) return "Selecione a categoria";
        const found = groupedCategories.flatMap(g => g.items).find(c => c.originalName === formData.category);
        return found ? found.label : formData.category;
    };

    const addComponent = () => {
        setFormData(prev => ({
            ...prev,
            components: [...prev.components, { recipe_id: '', weight_kg: 0 }]
        }));
    };

    const updateComponent = (index, field, value) => {
        const newComponents = [...formData.components];
        newComponents[index][field] = value;
        setFormData(prev => ({ ...prev, components: newComponents }));
    };

    const removeComponent = (index) => {
        const newComponents = [...formData.components];
        newComponents.splice(index, 1);
        setFormData(prev => ({ ...prev, components: newComponents }));
    };

    const handleSubmit = () => {
        onSave(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl text-blue-900 border-b pb-2">
                        {editingProduct ? 'Editar SKU (Produto)' : 'Novo SKU Comercial'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome de Venda</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Marmita de Strogonoff"
                                className="border-gray-300"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Código VR (Opcional)</Label>
                            <Input
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                placeholder="Ex: 5690"
                                className="border-gray-300 font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unidade</Label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.unit_type}
                                onChange={e => setFormData({ ...formData, unit_type: e.target.value })}
                            >
                                <option value="un">Unidade (UN)</option>
                                <option value="kg">Kilo (KG)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Validade (Dias)</Label>
                            <Input
                                type="number"
                                value={formData.shelf_life_days}
                                onChange={e => setFormData({ ...formData, shelf_life_days: e.target.value })}
                                placeholder="Ex: 5"
                                className="border-gray-300"
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label>Categoria</Label>
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
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Buscar categoria..." />
                                        <CommandList>
                                            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                                            <CommandItem
                                                value="sem-categoria"
                                                onSelect={() => {
                                                    setFormData(prev => ({ ...prev, category: '' }));
                                                    setCategorySelectorOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        !formData.category ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                Sem Categoria
                                            </CommandItem>
                                            {groupedCategories.map((group) => (
                                                <CommandGroup key={group.groupName} heading={group.groupName}>
                                                    {group.items.map((category) => (
                                                        <CommandItem
                                                            key={category.value}
                                                            value={category.label}
                                                            onSelect={() => {
                                                                setFormData(prev => ({ ...prev, category: category.originalName }));
                                                                setCategorySelectorOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    formData.category === category.originalName ? "opacity-100" : "opacity-0"
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

                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                        <div className="flex justify-between items-center mb-3">
                            <Label className="text-blue-900 font-semibold text-base">Receitas Bases (BOM)</Label>
                            <Button size="sm" variant="outline" onClick={addComponent} className="bg-white hover:bg-blue-50 border-blue-200 text-blue-700">
                                <Plus className="h-4 w-4 mr-1" /> Vincular Receita
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {formData.components.map((comp, idx) => (
                                <div key={idx} className="flex gap-2 items-end bg-white p-3 rounded shadow-sm border border-gray-100">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs text-gray-500">Receita (Processo)</Label>
                                        <select
                                            className="flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background"
                                            value={comp.recipe_id}
                                            onChange={e => updateComponent(idx, 'recipe_id', e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {recipes.sort((a, b) => a.name?.localeCompare(b.name)).map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-28 space-y-1">
                                        <Label className="text-xs text-gray-500">Pocionamento</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                step="0.001"
                                                value={comp.weight_kg}
                                                onChange={e => updateComponent(idx, 'weight_kg', parseFloat(e.target.value))}
                                                className="pr-8"
                                            />
                                            <span className="absolute right-2 top-2 text-xs text-gray-400">kg</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" className="h-9 w-9 p-0 text-red-500 hover:bg-red-50" onClick={() => removeComponent(idx)}>
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {formData.components.length === 0 && (
                                <div className="text-sm text-gray-400 text-center py-4 italic">
                                    Nenhuma receita base vinculada. Clique em "Vincular Receita".
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <DialogFooter className="mt-6 border-t pt-4">
                    <Button variant="ghost" onClick={onClose} className="text-gray-500">Cancelar</Button>
                    <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Produto
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
