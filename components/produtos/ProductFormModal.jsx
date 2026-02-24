'use client';

import React, { useState, useEffect } from "react";
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
import { Plus, Trash, Save } from "lucide-react";

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
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label>Categoria</Label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="">Sem Categoria</option>
                                {fullCategoryTree
                                    .filter(c => c.type === 'produtos' && c.level === 1)
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                    .map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                            </select>
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
