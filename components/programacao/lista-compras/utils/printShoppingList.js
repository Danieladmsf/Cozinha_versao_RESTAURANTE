/**
 * Utilitário de impressão da Lista de Compras
 * Abre uma nova janela do navegador com HTML puro e imprime diretamente.
 * Isso contorna todos os problemas de CSS @media print com Radix UI, 
 * overflow:hidden, flex layouts, etc.
 */

function buildSupplierHTML(ingredientesPorFornecedor) {
  let html = '';
  const entries = Object.entries(ingredientesPorFornecedor);

  entries.forEach(([supId, supData], index) => {
    html += `
      <div class="section">
        <h3>FORNECEDOR: ${supData.name.toUpperCase()}</h3>
        <table>
          <thead>
            <tr>
              <th style="text-align:left; width:40%">INGREDIENTE</th>
              <th style="width:20%">QUANTIDADE</th>
              <th style="width:15%">UNIDADE</th>
              <th style="width:25%">PESO (kg)</th>
            </tr>
          </thead>
          <tbody>
            ${supData.ingredientes.map((ing, i) => `
              <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
                <td style="text-align:left; font-weight:600">${ing.name}</td>
                <td>${ing.totalQuantity.toFixed(3)}</td>
                <td>${ing.unit}</td>
                <td style="font-weight:700">${ing.totalWeight.toFixed(3)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  });

  return html;
}

function buildCategoryHTML(ingredientesPorCategoria) {
  let html = '';
  const entries = Object.entries(ingredientesPorCategoria);

  entries.forEach(([catId, catData]) => {
    html += `
      <div class="section">
        <h3>${catData.name.toUpperCase()}</h3>
        <table>
          <thead>
            <tr>
              <th style="text-align:left; width:40%">INGREDIENTE</th>
              <th style="width:20%">QUANTIDADE</th>
              <th style="width:15%">UNIDADE</th>
              <th style="width:25%">PESO (kg)</th>
            </tr>
          </thead>
          <tbody>
            ${catData.ingredientes.map((ing, i) => `
              <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
                <td style="text-align:left; font-weight:600">${ing.name}</td>
                <td>${ing.totalQuantity.toFixed(3)}</td>
                <td>${ing.unit}</td>
                <td style="font-weight:700">${ing.totalWeight.toFixed(3)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  });

  return html;
}

function buildAlphabeticalHTML(ingredientesConsolidados) {
  return `
    <div class="section">
      <table>
        <thead>
          <tr>
            <th style="text-align:left; width:40%">INGREDIENTE</th>
            <th style="width:20%">QUANTIDADE</th>
            <th style="width:15%">UNIDADE</th>
            <th style="width:25%">PESO (kg)</th>
          </tr>
        </thead>
        <tbody>
          ${ingredientesConsolidados.map((ing, i) => `
            <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
              <td style="text-align:left; font-weight:600">${ing.name}</td>
              <td>${ing.totalQuantity.toFixed(3)}</td>
              <td>${ing.unit}</td>
              <td style="font-weight:700">${ing.totalWeight.toFixed(3)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function printShoppingList({
  activeTab,
  ingredientesPorFornecedor,
  ingredientesPorCategoria,
  ingredientesConsolidados
}) {
  // Determinar título
  const titles = {
    'por-fornecedor': 'Lista de Compras — Por Fornecedor',
    'por-categoria': 'Lista de Compras — Por Categoria',
    'alfabetica': 'Lista de Compras — Ordem Alfabética'
  };
  const title = titles[activeTab] || 'Lista de Compras';

  // Gerar conteúdo da aba ativa
  let bodyContent = '';
  if (activeTab === 'por-fornecedor') {
    bodyContent = buildSupplierHTML(ingredientesPorFornecedor);
  } else if (activeTab === 'por-categoria') {
    bodyContent = buildCategoryHTML(ingredientesPorCategoria);
  } else {
    bodyContent = buildAlphabeticalHTML(ingredientesConsolidados);
  }

  // Montar HTML completo
  const fullHTML = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #111;
          padding: 20px;
          background: white;
        }
        h1 {
          text-align: center;
          font-size: 22px;
          margin-bottom: 6px;
          text-transform: uppercase;
          border-bottom: 3px solid #333;
          padding-bottom: 10px;
        }
        .print-date {
          text-align: center;
          font-size: 11px;
          color: #666;
          margin-bottom: 12px;
        }
        .section {
          margin-bottom: 12px;
        }
        tr { page-break-inside: avoid; break-inside: avoid; }
        h3 {
          font-size: 15px;
          background: #e5e7eb;
          padding: 8px 12px;
          margin-bottom: 0;
          border: 1px solid #d1d5db;
          border-bottom: none;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          page-break-inside: auto;
          break-inside: auto;
        }
        th {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 6px 10px;
          text-align: center;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
        }
        td {
          border: 1px solid #d1d5db;
          padding: 5px 10px;
          text-align: center;
        }
        tr.even { background: #ffffff; }
        tr.odd { background: #f9fafb; }
        @media print {
          body { padding: 0; }
          @page { margin: 15mm 10mm; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="print-date">Impresso em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
      ${bodyContent}
    </body>
    </html>`.trim();

  // Abrir nova janela e escrever o HTML — MESMO PADRÃO do EscalaCozinhaTab
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('Popup bloqueado! Habilite popups para imprimir.');
    return;
  }

  printWindow.document.write(fullHTML);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}
