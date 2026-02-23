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
import { Clock, Users } from 'lucide-react';

import FormatUtils from '@/lib/recipe-engine/FormatUtils';

export default function RecipeLaborModal({ open, onClose, employeeData, onConfirm, suggestedTime = 0 }) {
    const [duration, setDuration] = useState(''); // Minutos

    // Reset state when modal opens with new data
    useEffect(() => {
        if (open && employeeData) {
            setDuration(employeeData.initialDuration || '');
        }
    }, [open, employeeData]);

    const calculateCost = () => {
        if (!employeeData || !duration) return 0;

        // Base calculation: Salary / 220 hours = Hourly Rate
        const hourlyRate = (parseFloat(employeeData.salary) || 0) / 220;
        const hours = parseFloat(duration) / 60;

        return hourlyRate * hours;
    };

    const handleConfirm = () => {
        const cost = calculateCost();
        // Base calculation: Salary / 220 hours = Hourly Rate
        const hourlyRate = (parseFloat(employeeData.salary) || 0) / 220;

        onConfirm({
            id: employeeData.id,
            name: employeeData.name,
            role: employeeData.role,
            duration: parseFloat(duration), // minutes
            cost: hourlyRate, // hourly rate saved as base cost
            calculatedCost: cost,
            type: 'labor'
        });
        onClose();
    };

    const handleUseSuggestion = () => {
        if (suggestedTime > 0) {
            // suggestedTime vem em segundos, converter para minutos
            const minutes = Math.ceil(suggestedTime / 60);
            setDuration(String(minutes));
        }
    };

    if (!employeeData) return null;

    const hourlyRate = (parseFloat(employeeData.salary) || 0) / 220;
    const estimatedCost = calculateCost();

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Mão de Obra: {employeeData.name}
                    </DialogTitle>
                    <DialogDescription>
                        Informe o tempo de dedicação deste funcionário nesta etapa.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Informações do Funcionário */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                        <div className="text-sm">
                            <span className="text-gray-500 block">Cargo / Função</span>
                            <span className="font-bold text-blue-800">{employeeData.role}</span>
                        </div>
                        <div className="text-sm text-right">
                            <span className="text-gray-500 block">Custo Hora Estimado</span>
                            <span className="font-mono text-blue-700">R$ {hourlyRate.toFixed(2)} / h</span>
                        </div>
                    </div>

                    {/* Sugestão de Tempo (Se houver) */}
                    {suggestedTime > 0 && (
                        <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-100 flex justify-between items-center">
                            <div className="text-sm">
                                <span className="text-cyan-700 block font-medium flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Tempo Sugerido (Insumos)
                                </span>
                                <span className="text-xs text-cyan-600">
                                    Baseado em {FormatUtils.formatPrepTime(suggestedTime / 60)} de limpeza/preparo.
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleUseSuggestion}
                                className="h-7 text-xs border-cyan-200 text-cyan-700 hover:bg-cyan-100"
                            >
                                Usar Sugestão
                            </Button>
                        </div>
                    )}

                    {/* Tempo de Dedicação */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="duration" className="text-right col-span-1">
                            Tempo
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
                                    placeholder="Minutos de dedicação (ex: 30)"
                                    autoFocus
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">
                                Tempo direto que o funcionário gasta realizando esta tarefa.
                            </p>
                        </div>
                    </div>

                    {/* Resultado Prévio */}
                    <div className="bg-gray-100 p-4 rounded-lg flex items-center justify-between mt-2">
                        <span className="font-medium text-gray-600">Custo de Mão de Obra:</span>
                        <div className="text-right">
                            <span className="text-xl font-bold text-green-600">
                                R$ {estimatedCost.toFixed(4)}
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={!duration || parseFloat(duration) <= 0} className="bg-blue-600 hover:bg-blue-700">
                        Confirmar Alocação
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
