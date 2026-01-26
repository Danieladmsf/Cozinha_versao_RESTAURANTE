'use client';

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, AlertTriangle, Loader2, CheckCircle, Clock, Hourglass } from "lucide-react";
import {
    formattedQuantity as utilFormattedQuantity,
    formatCurrency as utilFormatCurrency
} from "@/components/utils/orderUtils";

const RuptureTab = ({
    ruptureLoading,
    ruptureItems,
    ruptureNotes,
    setRuptureNotes,
    updateRuptureItem,
    saveRuptureData,
    showSuccessEffect,
    existingRupture,
    groupItemsByCategory,
    getOrderedCategories,
    generateCategoryStyles
}) => {
    if (ruptureLoading) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 text-purple-500 animate-spin" />
                    <p className="text-purple-600">Carregando dados de ruptura...</p>
                </CardContent>
            </Card>
        );
    }

    if (ruptureItems.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                    <h3 className="font-semibold text-lg text-gray-700 mb-2">Nenhum Item Disponível</h3>
                    <p className="text-gray-500 text-sm">
                        Não há itens disponíveis no cardápio para registrar ruptura neste dia.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Efeito de Sucesso Overlay */}
            {showSuccessEffect && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-500">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-purple-600 mb-2">Ruptura Salva!</h2>
                            <p className="text-gray-600">Os dados foram salvos com sucesso</p>
                            <div className="mt-4 flex items-center justify-center text-purple-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                <span className="ml-2 text-sm">Processando...</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status de Ruptura Salva */}
            {existingRupture && !showSuccessEffect && (
                <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="p-4">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-purple-700">Ruptura Registrada</h3>
                                <p className="text-sm text-purple-600">Este registro já foi processado e salvo. Atualize os dados se necessário.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabela de Ruptura por Categoria */}
            {getOrderedCategories(
                groupItemsByCategory(ruptureItems, (item) => item.category)
            ).map(({ name: categoryName, data: categoryData }) => {
                const { headerStyle } = generateCategoryStyles(categoryData.categoryInfo.color);
                return (
                    <div key={categoryName} className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-all duration-300">
                        <div
                            className="py-4 px-6 relative border-b border-gray-100/50"
                            style={headerStyle}
                        >
                            <div className="flex items-center">
                                <div
                                    className="w-5 h-5 rounded-full mr-3 shadow-sm border-2 border-white/30 ring-2 ring-white/20"
                                    style={{ backgroundColor: categoryData.categoryInfo.color }}
                                />
                                <h3 className="text-lg font-semibold text-gray-800">{categoryName}</h3>
                            </div>
                        </div>
                        <div className="p-6 bg-gradient-to-b from-white to-gray-50/30">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-purple-100 bg-purple-50">
                                            <th className="text-left p-2 text-xs font-medium text-purple-700">Item</th>
                                            <th className="text-left p-2 pl-4 text-xs font-medium text-purple-700">Hora Ruptura</th>
                                            <th className="text-left p-2 pl-4 text-xs font-medium text-purple-700">Previsão Duração</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categoryData.items.map((item, index) => {
                                            const globalIndex = ruptureItems.findIndex(ri => ri.recipe_id === item.recipe_id);
                                            return (
                                                <tr key={`rupture-${categoryName}-${item.recipe_id}-${index}`} className="border-b border-purple-50">
                                                    <td className="p-2 w-1/3">
                                                        <div>
                                                            <p className="font-medium text-purple-900 text-xs">{item.recipe_name}</p>
                                                            <p className="text-xs text-purple-600">
                                                                {utilFormattedQuantity(item.ordered_quantity)} {item.ordered_unit_type}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-left align-middle pl-4">
                                                        <Input
                                                            type="time"
                                                            value={item.rupture_time || ''}
                                                            onChange={(e) => updateRuptureItem(globalIndex, 'rupture_time', e.target.value)}
                                                            className="text-left text-xs h-8 w-[120px] border-purple-300 focus:border-purple-500 block"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-left align-middle pl-4">
                                                        <Input
                                                            type="datetime-local"
                                                            value={item.expected_duration || ''}
                                                            onChange={(e) => updateRuptureItem(globalIndex, 'expected_duration', e.target.value)}
                                                            className="text-left text-xs h-8 w-[170px] border-purple-300 focus:border-purple-500 block"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Observações Gerais */}
            <Card className="border-purple-200">
                <CardContent className="p-4">
                    <label className="block text-sm font-medium text-purple-700 mb-2">
                        Observações Gerais sobre Ruptura
                    </label>
                    <Textarea
                        value={ruptureNotes}
                        onChange={(e) => setRuptureNotes(e.target.value)}
                        placeholder="Observações sobre motivos da ruptura ou ajustes necessários..."
                        className="min-h-[80px] border-purple-300 focus:border-purple-500"
                        rows={3}
                    />
                </CardContent>
            </Card>

            {/* Botão de Salvar */}
            <Button
                onClick={saveRuptureData}
                className={`w-full text-white transition-all duration-500 ${showSuccessEffect
                    ? 'bg-green-600 hover:bg-green-700 scale-105 shadow-lg'
                    : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                disabled={showSuccessEffect}
            >
                {showSuccessEffect ? (
                    <>
                        <CheckCircle className="w-4 h-4 mr-2 animate-bounce" />
                        Ruptura Salva!
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4 mr-2" />
                        {existingRupture ? 'Atualizar Ruptura' : 'Salvar Ruptura'}
                    </>
                )}
            </Button>
        </div>
    );
};

export default RuptureTab;
