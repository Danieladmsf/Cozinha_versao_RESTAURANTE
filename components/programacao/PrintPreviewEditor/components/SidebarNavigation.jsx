import React, { useState, useMemo } from 'react';
import { GripVertical, ChevronDown, ChevronRight, ArrowLeft, ChevronLeft, ChevronRight as ChevronRightNav, X, Download, Printer, RefreshCw, Plus, Trash2, Building2, FolderOpen, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { formatRecipeName } from '../utils/formatUtils';

/**
 * Componente de navegação lateral do Editor de Impressão
 * Sidebar hierárquica: Empresa → Categoria Nível 1 → Subcategoria
 */
export function SidebarNavigation({
  blocks,
  selectedBlock,
  blockStatus,
  draggedIndex,
  // Handlers de blocos
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  scrollToBlock,
  handleFixBlock,
  handleDuplicateBlock,
  handleDeleteBlock,
  // Props de categorias
  categoryOrder,
  draggedCategoryIndex,
  handleCategoryDragStart,
  handleCategoryDragOver,
  handleCategoryDrop,
  handleCategoryDragEnd,
  extractCategoriesFromBlocks,
  // Estados de expansão
  expandedSections,
  toggleSection,
  // Props de controle
  onClose,
  totalEdits,
  handleClearAllEdits,
  handleDownloadPDF,
  handlePrintFinal,
  isGeneratingPDF,
  weekDays,
  selectedDay,
  onDayChange,
  weekNumber,
  year,
  onWeekNavigate
}) {
  // Estado local para controlar expansão da árvore hierárquica
  const [expandedCompanies, setExpandedCompanies] = useState({});
  const [expandedL1Categories, setExpandedL1Categories] = useState({});

  // Construir árvore hierárquica: Empresa → Cat L1 → Subcategoria
  const hierarchy = useMemo(() => {
    if (!blocks || !Array.isArray(blocks)) return {};

    const tree = {};
    blocks.forEach((block, blockIndex) => {
      const company = block.customerName || 'Sem Empresa';
      const l1Cat = block.parentCategory || 'Outros';
      const subcat = block.subcategoryName || block.title;

      if (!tree[company]) tree[company] = {};
      if (!tree[company][l1Cat]) tree[company][l1Cat] = [];
      tree[company][l1Cat].push({ block, blockIndex, subcat });
    });

    return tree;
  }, [blocks]);

  const toggleCompany = (company) => {
    setExpandedCompanies(prev => ({ ...prev, [company]: !prev[company] }));
  };

  const toggleL1Category = (key) => {
    setExpandedL1Categories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Contar blocos por empresa
  const countBlocksForCompany = (company) => {
    const l1Cats = hierarchy[company] || {};
    return Object.values(l1Cats).reduce((sum, arr) => sum + arr.length, 0);
  };

  return (
    <div className="sidebar-navigation">
      {/* Painel de Controles */}
      <div style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
        {/* Linha de Controles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '11px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            title="Voltar"
            style={{ height: '28px', width: '28px', padding: 0, flexShrink: 0 }}
          >
            <ArrowLeft style={{ width: '14px', height: '14px' }} />
          </Button>
          <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
            Editor{totalEdits > 0 && `(${totalEdits})`}
          </span>
          <span style={{ color: '#cbd5e1', margin: '0 2px' }}>|</span>
          {totalEdits > 0 && (
            <>
              <button
                onClick={handleClearAllEdits}
                title="Limpar edições"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '0',
                  whiteSpace: 'nowrap'
                }}
              >
                Limpar
              </button>
              <span style={{ color: '#cbd5e1', margin: '0 2px' }}>|</span>
            </>
          )}
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            title="Baixar PDF"
            style={{
              background: 'none',
              border: 'none',
              color: '#059669',
              fontWeight: '600',
              cursor: isGeneratingPDF ? 'not-allowed' : 'pointer',
              padding: '0',
              opacity: isGeneratingPDF ? 0.5 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            PDF
          </button>
          <span style={{ color: '#cbd5e1', margin: '0 2px' }}>|</span>
          <button
            onClick={handlePrintFinal}
            title="Imprimir"
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '0',
              whiteSpace: 'nowrap'
            }}
          >
            Print
          </button>
        </div>

        {/* Indicador de Geração de PDF */}
        {isGeneratingPDF && (
          <div style={{
            backgroundColor: '#d1fae5',
            border: '1px solid #059669',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <RefreshCw style={{
              width: '14px',
              height: '14px',
              color: '#059669',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#047857' }}>
              Gerando PDF...
            </span>
          </div>
        )}

        {/* Navegação de Dias */}
        {weekDays && weekDays.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            {/* Navegação Semana */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '10px' }}>
              <button
                onClick={() => onWeekNavigate && onWeekNavigate(-1)}
                className="nav-button"
                style={{
                  height: '28px',
                  width: '28px',
                  padding: 0,
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                }}
              >
                <ChevronLeft style={{ width: '16px', height: '16px' }} />
              </button>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', minWidth: '90px', textAlign: 'center' }}>
                Semana {weekNumber}/{year}
              </span>
              <button
                onClick={() => onWeekNavigate && onWeekNavigate(1)}
                className="nav-button"
                style={{
                  height: '28px',
                  width: '28px',
                  padding: 0,
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                }}
              >
                <ChevronRightNav style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Lista de Dias */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {weekDays.map((day, index) => {
                const isSelected = selectedDay === day.dayNumber;
                return (
                  <React.Fragment key={day.dayNumber}>
                    <button
                      onClick={() => onDayChange && onDayChange(day.dayNumber)}
                      title={day.fullDate}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#2563eb' : 'transparent',
                        color: isSelected ? 'white' : '#475569',
                        transition: 'all 0.2s',
                        minWidth: '45px'
                      }}
                    >
                      {day.dayDate}
                    </button>
                    {index < weekDays.length - 1 && (
                      <span style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '300' }}>|</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Árvore Hierárquica: Empresa → Cat L1 → Subcategoria */}
      <div className="sidebar-content" style={{ paddingTop: '4px', overflowY: 'auto' }}>
        {Object.entries(hierarchy).map(([companyName, l1Categories]) => {
          const isCompanyExpanded = expandedCompanies[companyName] || false;
          const blockCount = countBlocksForCompany(companyName);

          return (
            <div key={companyName} style={{ borderBottom: '1px solid #f1f5f9' }}>
              {/* Nível 0: Empresa */}
              <div
                onClick={() => toggleCompany(companyName)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: isCompanyExpanded ? '#eff6ff' : 'transparent',
                  transition: 'background 0.15s',
                  userSelect: 'none'
                }}
                onMouseEnter={(e) => { if (!isCompanyExpanded) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                onMouseLeave={(e) => { if (!isCompanyExpanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {isCompanyExpanded
                  ? <ChevronDown style={{ width: '14px', height: '14px', color: '#3b82f6', flexShrink: 0 }} />
                  : <ChevronRight style={{ width: '14px', height: '14px', color: '#94a3b8', flexShrink: 0 }} />
                }
                <Building2 style={{ width: '14px', height: '14px', color: isCompanyExpanded ? '#3b82f6' : '#64748b', flexShrink: 0 }} />
                <span style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: isCompanyExpanded ? '#1e40af' : '#1e293b',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {companyName}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#94a3b8',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  flexShrink: 0
                }}>
                  {blockCount}
                </span>
              </div>

              {/* Nível 1: Categorias */}
              {isCompanyExpanded && (
                <div style={{ paddingLeft: '8px' }}>
                  {Object.entries(l1Categories).map(([l1CatName, subcatBlocks]) => {
                    const l1Key = `${companyName}::${l1CatName}`;
                    const isL1Expanded = expandedL1Categories[l1Key] || false;

                    return (
                      <div key={l1Key}>
                        {/* Header da Categoria L1 */}
                        <div
                          onClick={() => toggleL1Category(l1Key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 10px',
                            cursor: 'pointer',
                            backgroundColor: isL1Expanded ? '#f0fdf4' : 'transparent',
                            borderRadius: '4px',
                            margin: '1px 4px',
                            transition: 'background 0.15s',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => { if (!isL1Expanded) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                          onMouseLeave={(e) => { if (!isL1Expanded) e.currentTarget.style.backgroundColor = isL1Expanded ? '#f0fdf4' : 'transparent'; }}
                        >
                          {isL1Expanded
                            ? <ChevronDown style={{ width: '12px', height: '12px', color: '#16a34a', flexShrink: 0 }} />
                            : <ChevronRight style={{ width: '12px', height: '12px', color: '#94a3b8', flexShrink: 0 }} />
                          }
                          <FolderOpen style={{ width: '12px', height: '12px', color: isL1Expanded ? '#16a34a' : '#64748b', flexShrink: 0 }} />
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: isL1Expanded ? '#15803d' : '#475569',
                            flex: 1
                          }}>
                            {l1CatName}
                          </span>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '600',
                            color: '#94a3b8',
                            flexShrink: 0
                          }}>
                            {subcatBlocks.length}
                          </span>
                        </div>

                        {/* Nível 2: Blocos (Páginas de Impressão) */}
                        {isL1Expanded && (
                          <div style={{ paddingLeft: '16px', paddingBottom: '4px' }}>
                            {subcatBlocks.map(({ block, blockIndex, subcat }) => {
                              const status = blockStatus[block.id];
                              const isAdjusted = status && !status.isOverflowing;
                              const needsFix = status && status.isOverflowing;
                              const isSelected = selectedBlock === block.id;

                              // Extrair subcategorias contidas neste bloco
                              const containedSubcats = block.items ? Object.keys(block.items) : [];

                              return (
                                <div key={block.id} style={{ marginBottom: '4px' }}>
                                  <div
                                    onClick={() => scrollToBlock(block.id)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '5px 8px',
                                      cursor: 'pointer',
                                      backgroundColor: isSelected ? '#dbeafe' : 'transparent',
                                      borderRadius: '4px',
                                      transition: 'background 0.15s',
                                      borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent'
                                    }}
                                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? '#dbeafe' : 'transparent'; }}
                                  >
                                    <FileText style={{ width: '11px', height: '11px', color: '#94a3b8', flexShrink: 0 }} />
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: '500',
                                      color: isSelected ? '#1e40af' : '#374151',
                                      flex: 1,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      Página de Impressão
                                    </span>
                                    <span style={{ fontSize: '9px', color: '#94a3b8', flexShrink: 0 }}>
                                      {block.fontSize}px
                                    </span>
                                    {needsFix && (
                                      <div
                                        className="sidebar-badge badge-warning clickable"
                                        onClick={(e) => { e.stopPropagation(); handleFixBlock(block.id, e); }}
                                        title="Clique para corrigir"
                                        style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '3px' }}
                                      >
                                        Fix
                                      </div>
                                    )}
                                    {isAdjusted && (
                                      <div style={{
                                        fontSize: '8px',
                                        padding: '1px 4px',
                                        borderRadius: '3px',
                                        backgroundColor: '#d1fae5',
                                        color: '#059669',
                                        fontWeight: '600'
                                      }}>
                                        OK
                                      </div>
                                    )}
                                  </div>

                                  {/* Lista de subcategorias dentro do bloco */}
                                  {containedSubcats.length > 0 && (
                                    <div style={{ paddingLeft: '24px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                      {containedSubcats.map(catName => (
                                        <div key={catName} style={{ fontSize: '9px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></div>
                                          {catName}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
