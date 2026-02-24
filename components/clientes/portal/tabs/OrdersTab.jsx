'use client';

import React, { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Utensils, CheckCircle, Loader2, Clock } from "lucide-react";
import {
  parseQuantity as utilParseQuantity,
  formattedQuantity as utilFormattedQuantity,
  formatCurrency as utilFormatCurrency,
  formatWeight as utilFormatWeight
} from "@/components/utils/orderUtils";

import NoteViewer from '@/components/shared/NoteViewer';
import { CategoryLogic } from "@/components/utils/categoryLogic";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

const OrdersTab = ({
  currentOrder,
  orderItems,
  orderTotals,

  generalNotes,
  setGeneralNotes,
  updateOrderItem,
  submitOrder,
  enableEditMode,
  isEditMode,
  showSuccessEffect,
  existingOrder,
  wasteItems,
  existingWaste,
  groupItemsByCategory,
  getOrderedCategories,
  generateCategoryStyles,
  filterItemsByCategoryGroup,
  isSuggestionsLoading // ✅ Prop para indicar carregamento
}) => {
  const { registerInput, handleKeyDown } = useKeyboardNavigation();

  // Estados do Modal de Janela de Vendas
  const [windowModalOpen, setWindowModalOpen] = useState(false);
  const [editingItemForWindow, setEditingItemForWindow] = useState(null);
  const [tempWindowStart, setTempWindowStart] = useState("08:00");
  const [tempWindowEnd, setTempWindowEnd] = useState("13:00");

  const openWindowModal = (item) => {
    setEditingItemForWindow(item);
    if (item.sales_window && item.sales_window !== 'all_day') {
      const parts = item.sales_window.split('-');
      if (parts.length === 2) {
        setTempWindowStart(parts[0]);
        setTempWindowEnd(parts[1]);
      } else {
        setTempWindowStart("08:00");
        setTempWindowEnd(item.sales_window); // fallback se for só hora final
      }
    } else {
      setTempWindowStart("08:00");
      setTempWindowEnd("14:00");
    }
    setWindowModalOpen(true);
  };

  const applyWindowModal = () => {
    if (editingItemForWindow) {
      const newWindow = `${tempWindowStart}-${tempWindowEnd}`;
      updateOrderItem(editingItemForWindow.unique_id, 'sales_window', newWindow);
      if (!isEditMode) enableEditMode();
      setWindowModalOpen(false);
      setEditingItemForWindow(null);
    }
  };

  const clearWindowModal = () => {
    if (editingItemForWindow) {
      updateOrderItem(editingItemForWindow.unique_id, 'sales_window', 'all_day');
      if (!isEditMode) enableEditMode();
      setWindowModalOpen(false);
      setEditingItemForWindow(null);
    }
  };

  // Função para formatar peso baseado na unidade
  const formatWeightByUnit = (item) => {
    const pesoFinal = item.total_weight || item.calculated_total_weight || (item.recipe_cuba_weight * (item.quantity || item.base_quantity || 0)) || 0;
    const unitType = (item.unit_type || '').toLowerCase();

    if (unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade') {
      return `${utilFormattedQuantity(item.quantity || item.base_quantity || 0)} Unid.`;
    }

    return utilFormatWeight(pesoFinal);
  };


  if (!currentOrder?.items || currentOrder.items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="font-semibold text-lg text-gray-700 mb-2">Nenhum Item Disponível</h3>
          <p className="text-gray-500 text-sm">
            Não há itens disponíveis no cardápio para este dia.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Aplicar filtro de categoria se disponível
  const allItems = currentOrder?.items || [];
  const itemsToGroup = filterItemsByCategoryGroup ? filterItemsByCategoryGroup(allItems) : allItems;
  const groupedItems = groupItemsByCategory(itemsToGroup, (item) => item.category);
  const orderedCategories = getOrderedCategories(groupedItems);

  return (
    <div className="space-y-4">
      {/* Efeito de Sucesso Overlay */}
      {showSuccessEffect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Pedido Enviado!</h2>
              <p className="text-gray-600">Seu pedido foi enviado com sucesso</p>
              <div className="mt-4 flex items-center justify-center text-green-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                <span className="ml-2 text-sm">Processando...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status do Pedido Enviado */}
      {!isEditMode && existingOrder && !showSuccessEffect && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-700">Pedido Enviado com Sucesso</h3>
                  <p className="text-sm text-green-600">Este pedido já foi processado e enviado. Clique em "Editar" para fazer alterações.</p>
                </div>
              </div>
              <Button
                onClick={enableEditMode}
                variant="outline"
                size="sm"
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                Editar Pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      )}



      {/* Tabelas de Pedido por Categoria */}
      {orderedCategories.map(({ name: categoryName, data: categoryData }) => {
        const { headerStyle } = generateCategoryStyles(categoryData.categoryInfo.color);

        // Obter configuração das colunas baseada na categoria
        const columnConfig = CategoryLogic.getCategoryColumnConfig(categoryName);
        const tableHeaders = CategoryLogic.getTableHeaders(columnConfig.isCarneCategory);

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
                    <tr className="border-b border-blue-100 bg-blue-50">
                      {tableHeaders.map((header) => (
                        <th key={header.key} className={header.className}>
                          {header.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.items.map((item, index) => {
                      const categoryIndex = orderedCategories.findIndex(cat => cat.name === categoryName);
                      const baseInputId = `qty-${categoryIndex}-${index}`;
                      const percentInputId = `pct-${categoryIndex}-${index}`;
                      const windowInputId = `window-${categoryIndex}-${index}`;

                      return (
                        <tr key={item.unique_id} className="border-b border-blue-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium text-blue-900 text-xs flex items-center gap-2">
                                <span>
                                  {item.vr_product_code && (
                                    <span className="text-orange-500 font-bold mr-1">
                                      #{String(item.vr_product_code).padStart(6, '0')}
                                    </span>
                                  )}
                                  {item.recipe_name}
                                </span>
                                {item.shelf_life && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 border border-green-200" title="Validade (Shelf Life)">
                                    ⏳ {item.shelf_life} {item.shelf_life > 1 ? 'dias' : 'dia'}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-blue-600">
                                {item.tech_sheet_units_quantity > 0 && item.tech_sheet_unit_weight > 0 && (() => {
                                  const isPorcao = item.unit_type && item.unit_type.toLowerCase() === 'porção';
                                  const unitText = isPorcao ? 'Unid.' : (item.unit_type && item.unit_type.toLowerCase() !== 'unid' && item.unit_type.toLowerCase() !== 'unidade' ? item.unit_type : (item.tech_sheet_units_quantity > 1 ? 'unidades' : 'unidade'));

                                  let weightInfo = '';
                                  if (isPorcao) {
                                    weightInfo = ` | Peso: ${utilFormatWeight((item.tech_sheet_units_quantity || 0) * (item.tech_sheet_unit_weight || 0))}`;
                                  }

                                  return (
                                    <>
                                      <span className="text-purple-600 text-[9px]">
                                        (Contém, {item.tech_sheet_units_quantity} {item.tech_sheet_container_type || unitText} de {utilFormatWeight(item.tech_sheet_unit_weight)}){weightInfo}
                                      </span>
                                      <br />
                                    </>
                                  );
                                })()}
                                {(() => {
                                  return utilFormatCurrency(item.unit_price);
                                })()}/{item.unit_type}
                              </p>
                            </div>
                          </td>
                          {/* Coluna de Sugestão de Quantidade */}
                          <td className="p-2 text-center min-w-[100px]">
                            {isSuggestionsLoading ? (
                              <div className="flex justify-center">
                                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                              </div>
                            ) : item.suggestion?.has_suggestion ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-bold text-sm text-amber-700">
                                  {(() => {
                                    const originalValue = parseFloat(item.suggestion.suggested_base_quantity || 0);
                                    const value = utilFormattedQuantity(originalValue);
                                    return value;
                                  })()}
                                </span>

                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          {/* Coluna de Input de Quantidade */}
                          <td className="p-2 text-center">
                            <DecimalInput
                              ref={(ref) => registerInput(baseInputId, ref)}
                              value={item.base_quantity === 0 ? '' : item.base_quantity || ''}
                              onChange={(e) => {
                                if (isEditMode) {
                                  updateOrderItem(item.unique_id, 'base_quantity', e.target.value);
                                }
                              }}
                              placeholder={item.unit_type && (item.unit_type.toLowerCase() === 'unid' || item.unit_type.toLowerCase() === 'unid.') ? 'Auto (Refeições)' : '0'}
                              onKeyDown={(e) => handleKeyDown(e, baseInputId)}
                              className="block mx-auto text-center text-xs h-8 max-w-[60px] border-blue-300 focus:border-blue-500"
                              disabled={!isEditMode}
                            />
                          </td>
                          {columnConfig.showPorcionamento && (
                            <>
                              {/* Coluna de Input de Porcionamento */}
                              <td className="p-2 text-center">
                                <div className="flex items-center justify-center">
                                  <DecimalInput
                                    ref={(ref) => registerInput(percentInputId, ref)}
                                    value={item.adjustment_percentage === 0 ? '' : item.adjustment_percentage || ''}
                                    onChange={(e) => {
                                      if (isEditMode) {
                                        updateOrderItem(item.unique_id, 'adjustment_percentage', e.target.value);
                                      }
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, percentInputId)}
                                    className="text-center text-xs h-8 max-w-[60px] border-blue-300 focus:border-blue-500"
                                    placeholder="0"
                                    disabled={!isEditMode}
                                  />
                                  <span className="text-xs text-gray-500 ml-1">%</span>
                                </div>
                              </td>
                            </>
                          )}
                          {columnConfig.showTotalPedido && (
                            <td className="p-2">
                              <div className="text-center text-xs font-medium text-blue-700">
                                {utilFormattedQuantity(item.quantity)} {item.unit_type}
                              </div>
                            </td>
                          )}
                          <td className="p-2">
                            <div className="text-center text-xs font-medium text-blue-700">
                              {utilFormatCurrency(item.total_price)}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-center text-xs font-medium text-green-700">
                              {formatWeightByUnit(item)}
                            </div>
                          </td>
                          <td className="p-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className={`w-full text-xs h-8 px-2 flex justify-center items-center gap-1 border rounded-md truncate ${isEditMode
                                  ? 'border-blue-300 bg-white text-blue-900 hover:bg-blue-50'
                                  : 'border-transparent bg-purple-50 text-purple-700 hover:border-purple-200'
                                }`}
                              onClick={() => openWindowModal(item)}
                            >
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {item.sales_window === 'all_day' || !item.sales_window
                                  ? 'Dia Todo'
                                  : item.sales_window.includes('-')
                                    ? item.sales_window
                                    : `Até ${item.sales_window}`}
                              </span>
                            </Button>
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


      {/* Resumo do Pedido */}
      <Card className="border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">

            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Total de Peso</p>
              <p className="text-2xl font-bold text-blue-900">{utilFormatWeight(orderTotals.totalWeight || 0)}</p>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">
                {(orderTotals.depreciationAmount > 0 || orderTotals.nonReceivedDiscountAmount > 0) ? 'Valor Original' : 'Valor Total'}
              </p>
              <p className="text-2xl font-bold text-blue-900">{utilFormatCurrency(orderTotals.totalAmount)}</p>
              {(orderTotals.depreciationAmount > 0 || orderTotals.nonReceivedDiscountAmount > 0) && (
                <div className="mt-2">
                  {orderTotals.depreciationAmount > 0 && (
                    <p className="text-xs text-red-600">Quebra (25%): -{utilFormatCurrency(orderTotals.depreciationAmount)}</p>
                  )}
                  {orderTotals.nonReceivedDiscountAmount > 0 && (
                    <p className="text-xs text-orange-600">Não recebido (100%): -{utilFormatCurrency(orderTotals.nonReceivedDiscountAmount)}</p>
                  )}
                  <p className="text-sm font-bold text-green-700">Valor Final: {utilFormatCurrency(orderTotals.finalAmount)}</p>
                </div>
              )}
            </div>
          </div>


          <div className="mb-4">
            <label className="block text-sm font-medium text-blue-700 mb-2">
              Observações Gerais
            </label>
            <Textarea
              ref={(ref) => registerInput('general-notes', ref)}
              value={generalNotes}
              onChange={(e) => isEditMode && setGeneralNotes(e.target.value)}
              onKeyDown={(e) => {
                // Para Textarea, Enter não navega - só Tab
                if (e.key === 'Tab') {
                  handleKeyDown(e, 'general-notes');
                }
              }}
              placeholder="Observações gerais sobre o pedido..."
              className="min-h-[80px] border-blue-300 focus:border-blue-500"
              rows={3}
              disabled={!isEditMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal de Range de Horários para Janela de Oferta */}
      <Dialog open={windowModalOpen} onOpenChange={setWindowModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configurar Janela de Oferta</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Defina o intervalo de tempo em que o produto "{editingItemForWindow?.recipe_name}" fica disponível na vitrine durante o dia.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Início</label>
                <div className="flex items-center">
                  <Input
                    type="time"
                    value={tempWindowStart}
                    onChange={(e) => setTempWindowStart(e.target.value)}
                    className="h-10 text-center font-medium"
                  />
                </div>
              </div>
              <div className="text-gray-400 font-bold px-2 pt-5">às</div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Fim</label>
                <div className="flex items-center">
                  <Input
                    type="time"
                    value={tempWindowEnd}
                    onChange={(e) => setTempWindowEnd(e.target.value)}
                    className="h-10 text-center font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              type="button"
              onClick={clearWindowModal}
              className="text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
            >
              Livre / Dia Todo
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setWindowModalOpen(false)}>Cancelar</Button>
              <Button type="button" onClick={applyWindowModal} className="bg-blue-600 hover:bg-blue-700">Confirmar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersTab;