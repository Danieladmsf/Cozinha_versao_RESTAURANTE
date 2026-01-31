import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Settings, Save, Loader2 } from "lucide-react";
import { MenuConfig, CategoryType } from "@/app/api/entities"; // Import CategoryType
import { APP_CONSTANTS } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";

const TYPE_LABELS = {
    'receitas': 'Receitas',
    'receitas_-_base': 'Receitas - Base',
    'ingredientes': 'Ingredientes',
    'contas': 'Contas',
    'produtos': 'Produtos',
    'equipamentos': 'Equipamentos',
    'funcionarios': 'Funcionários',
    'fornecedores': 'Fornecedores'
};

export default function RecipeSettingsDialog({ isOpen, onClose, onSave }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [visibleTypes, setVisibleTypes] = useState({});
    const [availableTypes, setAvailableTypes] = useState([]);
    const [configId, setConfigId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        try {
            setLoading(true);
            const mockUserId = APP_CONSTANTS.MOCK_USER_ID;

            // Parallel fetch: Config and Types
            const [configs, types] = await Promise.all([
                MenuConfig.query([
                    { field: 'user_id', operator: '==', value: mockUserId },
                    { field: 'is_default', operator: '==', value: true }
                ]),
                CategoryType.list()
            ]);

            setAvailableTypes(types);

            if (configs && configs.length > 0) {
                const config = configs[0];
                setConfigId(config.id);

                // Initialize from config.recipe_visible_types
                // If undefined, default behavior: 'receitas' and 'receitas_-_base' (standard logic)
                // OR default everything to true? Let's default to everything TRUE to let user decide
                if (config.recipe_visible_types) {
                    setVisibleTypes(config.recipe_visible_types);
                } else {
                    const initial = {};
                    types.forEach(t => initial[t.value] = true);
                    setVisibleTypes(initial);
                }
            } else {
                const initial = {};
                types.forEach(t => initial[t.value] = true);
                setVisibleTypes(initial);
            }
        } catch (error) {
            console.error("Error loading config:", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar as configurações.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (typeValue) => {
        setVisibleTypes(prev => ({
            ...prev,
            [typeValue]: !prev[typeValue]
        }));
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const mockUserId = APP_CONSTANTS.MOCK_USER_ID;

            const dataToSave = {
                recipe_visible_types: visibleTypes
            };

            if (configId) {
                await MenuConfig.update(configId, dataToSave);
            } else {
                await MenuConfig.create({
                    user_id: mockUserId,
                    is_default: true,
                    ...dataToSave
                });
            }

            toast({
                title: "Sucesso",
                description: "Configurações salvas com sucesso.",
            });

            onSave(visibleTypes);
            onClose();

        } catch (error) {
            console.error("Error saving config:", error);
            toast({
                title: "Erro",
                description: "Não foi possível salvar as configurações.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Configurar Tipos Visíveis
                    </DialogTitle>
                    <DialogDescription>
                        Escolha quais tipos de categorias (abas principais) devem aparecer na tela de Receitas.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[300px] pr-4">
                    {loading && !availableTypes.length ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {availableTypes.map(type => (
                                <div key={type.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                                    <Label htmlFor={`type-${type.id}`} className="flex-1 cursor-pointer font-medium capitalize">
                                        {TYPE_LABELS[type.value] || type.label || type.value}
                                    </Label>
                                    <Switch
                                        id={`type-${type.id}`}
                                        checked={visibleTypes[type.value] !== false}
                                        onCheckedChange={() => handleToggle(type.value)}
                                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-200 border-2 border-transparent transition-colors cursor-pointer"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
