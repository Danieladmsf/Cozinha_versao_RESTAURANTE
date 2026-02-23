import { Tooltip } from '../Tooltip';
import { formatRecipeName } from '../../utils/formatUtils';

/**
 * Componente de renderização para blocos tipo 'detailed-section'
 * Exibe receitas com quantidade total consolidada (igual ao formato empresa)
 * Formato: QUANTIDADE  NOME_DA_RECEITA
 */
export function DetailedSectionBlock({
  block,
  isSelected,
  isLocked,
  handleEditStart,
  handleEditEnd,
  formatQuantityDisplay,
  isItemEdited,
  getItemEditInfo,
  isItemChanged,
  getItemChangeInfo,
  acceptPortalChange,
  rejectPortalChange,
  getResolutionStatus
}) {
  if (!block.items) return null;

  // Consolidar: somar quantidades de todos os clientes para cada receita
  const consolidatedItems = block.items.map((recipe) => {
    // Somar quantidades de todos os clientes
    let totalQuantity = 0;
    let unitType = '';
    let allNotes = [];

    recipe.clientes.forEach((cliente) => {
      totalQuantity += (parseFloat(cliente.quantity) || 0);
      if (!unitType && cliente.unit_type) unitType = cliente.unit_type;
      if (cliente.notes && cliente.notes.trim()) {
        allNotes.push(cliente.notes.trim());
      }
    });

    return {
      recipe_name: recipe.recipe_name,
      quantity: totalQuantity,
      unit_type: unitType,
      notes: allNotes.length > 0 ? allNotes.join(', ') : '',
      // Manter referência aos clientes originais para edição
      _clientes: recipe.clientes,
      _showTotal: recipe.showTotal
    };
  });

  return (
    <div className="items-container">
      <div className="category-section">
        {consolidatedItems.map((item, idx) => {
          // Verificar estados de edição (verificar se qualquer cliente tem edição)
          const hasAnyEdit = item._clientes.some(c =>
            isItemEdited ? isItemEdited(c.customer_name, item.recipe_name) : false
          );
          const hasAnyChange = item._clientes.some(c =>
            isItemChanged ? isItemChanged(c.customer_name, item.recipe_name) : false
          );

          const edited = hasAnyEdit;
          const changed = hasAnyChange;

          // Determinar classe CSS baseada no estado
          let lineClass = '';
          let lineStyles = {};

          if (edited) {
            lineClass = 'state-edited';
            lineStyles = {
              backgroundColor: '#fef3c7',
              borderLeft: '3px solid #f59e0b',
              paddingLeft: '8px',
              borderRadius: '4px'
            };
          } else if (changed) {
            lineClass = 'state-changed';
            lineStyles = {
              backgroundColor: '#d1fae5',
              borderLeft: '3px solid #10b981',
              paddingLeft: '8px',
              borderRadius: '4px'
            };
          }

          const displayValue = formatQuantityDisplay(item);

          return (
            <div
              key={idx}
              className={`item-line ${lineClass}`}
              style={lineStyles}
            >
              {!hasAnyEdit && changed && (
                <span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '4px' }}>●</span>
              )}
              <span
                className="item-qty"
                contentEditable={false}
                suppressContentEditableWarning
              >
                {displayValue}
              </span>
              <span
                className="item-text"
                contentEditable={false}
                suppressContentEditableWarning
              >
                {formatRecipeName(item.recipe_name)}
                {item.notes && (
                  <span className="notes" style={{ fontStyle: 'italic', color: '#6b7280', marginLeft: '4px' }}>
                    ({item.notes})
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
