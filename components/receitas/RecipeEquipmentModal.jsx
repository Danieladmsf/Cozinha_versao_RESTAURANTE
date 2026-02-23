'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Clock, Scale, Info, Zap } from 'lucide-react';

export default function RecipeEquipmentModal({ open, onClose, popData, onConfirm }) {
    const [duration, setDuration] = useState(''); // Minutos
    const [recipeYield, setRecipeYield] = useState(1); // Rendimento da Receita (Ex: 1)
    const [capacity, setCapacity] = useState(''); // Capacidade do Equipamento (Ex: 600)

    // Default values if passed in popData (editing)
    useEffect(() => {
        if (open && popData) {
            setDuration(popData.initialDuration || '');
            setCapacity(popData.initialCapacity || '');
            setRecipeYield(popData.recipeYield || 1); // Defaults to 1 if not provided
        }
    }, [open, popData]);

    const calculateCost = () => {
        if (!popData || !duration || !capacity) return 0;

        const hours = parseFloat(duration) / 60;
        const costPerHour = parseFloat(popData.cost);
        const utilizationRatio = Math.min(1, parseFloat(recipeYield) / parseFloat(capacity)); // Max 100% logic? Usually yes, can't use MORE than 100% of oven unless 2 batches.
        // Actually, if Recipe Yield > Capacity (e.g. 1000 empadas vs 500 capacity), it implies 2 batches -> Double Time.
        // But the user enters TOTAL TIME of use accurately covering all batches.
        // So the Ratio is strictly for "What portion of the machine am I paying for?".
        // If I use the WHOLE machine (Yield >= Capacity), I pay 100%.

        const effectiveRatio = Math.min(1, parseFloat(recipeYield) / parseFloat(capacity));

        return (costPerHour * hours) * effectiveRatio;
    };

    const handleConfirm = () => {
        const cost = calculateCost();
        onConfirm({
            id: popData.id,
            duration: parseFloat(duration), // minutes
            capacity: parseFloat(capacity),
            recipeYield: parseFloat(recipeYield),
            calculatedCost: cost,
            ratio: Math.min(1, parseFloat(recipeYield) / parseFloat(capacity))
        });
        onClose();
    };

    if (!popData) return null;

    const estimatedCost = calculateCost();

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-orange-500" />
                        Uso de Equipamento: {popData.name}
                    </DialogTitle>
                    <DialogDescription>
                        Informe os parâmetros para calcular o custo deste equipamento na receita.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Custo Base */}
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex justify-between items-center">
                        <div className="text-sm">
                            <span className="text-gray-500 block">Custo Operacional Base</span>
                            <span className="font-bold text-gray-800">R$ {parseFloat(popData.cost).toFixed(2)} / hora</span>
                        </div>
                        <div className="text-sm text-right">
                            <span className="text-gray-500 block">Potência</span>
                            <span className="font-mono text-gray-600">{popData.power} W</span>
                        </div>
                    </div>

                    {/* Tempo de Uso */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="duration" className="text-right col-span-1">
                            Tempo Total
                        </Label>
                        <div className="col-span-3">
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input
                                    id="duration"
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="pl-9"
                                    placeholder="Minutos de uso (ex: 45)"
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">
                                Tempo total que o equipamento ficará ligado para esta receita (incluindo pré-aquecimento).
                            </p>
                        </div>
                    </div>

                    <Separator className="my-2" />

                    {/* Lógica de Capacidade */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Scale className="w-4 h-4" />
                            <span>Ocupação do Equipamento</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs text-gray-500 mb-1 block">Rendimento da Receita</Label>
                                <Input
                                    value={recipeYield}
                                    // onChange={(e) => setRecipeYield(e.target.value)} // Normally read-only from context, but editable for correction
                                    onChange={(e) => setRecipeYield(e.target.value)}
                                    type="number"
                                />
                                <span className="text-[10px] text-gray-400">Unidades/Kg produzidos</span>
                            </div>
                            <div>
                                <Label className="text-xs text-blue-600 font-bold mb-1 block">Capacidade Total *</Label>
                                <Input
                                    value={capacity}
                                    onChange={(e) => setCapacity(e.target.value)}
                                    type="number"
                                    placeholder="Ex: 600"
                                    className="border-blue-200 focus:ring-blue-500"
                                    autoFocus
                                />
                                <span className="text-[10px] text-gray-400">Quanto cabe no total?</span>
                            </div>
                        </div>
                    </div>

                    {/* Resultado Prévio */}
                    <div className="bg-gray-100 p-4 rounded-lg flex items-center justify-between mt-2">
                        <span className="font-medium text-gray-600">Custo Alocado:</span>
                        <div className="text-right">
                            <span className="text-xl font-bold text-green-600">
                                R$ {estimatedCost.toFixed(4)}
                            </span>
                            <span className="block text-[10px] text-gray-500">
                                ({(Math.min(1, parseFloat(recipeYield || 0) / parseFloat(capacity || 1)) * 100).toFixed(1)}% da capacidade)
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={!duration || !capacity || parseFloat(capacity) <= 0}>
                        Confirmar e Inserir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
