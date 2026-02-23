import React, { useState, useEffect } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Label } from "@/components/ui";
import { processTypes } from "@/lib/recipeConstants";
import {
    Layers,
    ThermometerSnowflake,
    Droplets,
    Flame,
    Package,
    CookingPot
} from "lucide-react";

const ProcessEditModal = ({
    isOpen,
    onClose,
    initialProcesses = [],
    onSave
}) => {
    const [selectedProcesses, setSelectedProcesses] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setSelectedProcesses(initialProcesses);
        }
    }, [isOpen, initialProcesses]);

    const handleProcessToggle = (processId) => {
        setSelectedProcesses(prev => {
            if (prev.includes(processId)) {
                return prev.filter(p => p !== processId);
            } else {
                // Maintain standard order
                const newSelection = [...prev, processId];
                const order = ['defrosting', 'cleaning', 'cooking', 'portioning', 'packaging', 'assembly', 'recipe'];
                return newSelection.sort((a, b) => order.indexOf(a) - order.indexOf(b));
            }
        });
    };

    const handleSave = () => {
        onSave(selectedProcesses);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Processos da Etapa</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <div className="grid grid-cols-2 gap-3">
                        {Object.values(processTypes)
                            // Filter out complex ones if needed, but assuming user can select any standard process
                            // EXCEPT maybe 'recipe' which is special? Assuming generic processes.
                            .filter(p => p.id !== 'assembly') // Assembly is usually a different type of stage? Or allow?
                            .sort((a, b) => a.order - b.order)
                            .map(process => {
                                const isSelected = selectedProcesses.includes(process.id);

                                let Icon = Layers;
                                if (process.id === 'defrosting') Icon = ThermometerSnowflake;
                                if (process.id === 'cleaning') Icon = Droplets;
                                if (process.id === 'cooking') Icon = Flame;
                                if (process.id === 'portioning') Icon = Layers;
                                if (process.id === 'assembly') Icon = Layers;
                                if (process.id === 'packaging') Icon = Package;
                                if (process.id === 'recipe') Icon = CookingPot;

                                return (
                                    <div
                                        key={process.id}
                                        onClick={() => handleProcessToggle(process.id)}
                                        className={`
                       cursor-pointer relative p-3 rounded-lg border-2 transition-all duration-200
                       flex flex-col items-center justify-center gap-2 text-center
                       ${isSelected
                                                ? `border-${process.color}-500 bg-${process.color}-50`
                                                : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}
                     `}
                                    >
                                        <Icon
                                            className={`w-6 h-6 ${isSelected ? `text-${process.color}-600` : `text-${process.color}-500 opacity-70`}`}
                                        />
                                        <span className={`text-sm font-medium ${isSelected ? `text-${process.color}-700` : 'text-gray-600'}`}>
                                            {process.label}
                                        </span>

                                        {isSelected && (
                                            <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-${process.color}-500`}></div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Salvar Alterações</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProcessEditModal;
