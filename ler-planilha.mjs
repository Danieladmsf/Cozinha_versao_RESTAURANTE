import * as xlsx from 'xlsx';
import fs from 'fs';

const filePath = 'C:/Users/Administrador/Desktop/COZINHA RESTAURANTE/public/Planilha sem título (2).xlsx';

try {
    const workbook = xlsx.readFile(filePath);
    console.log("Abas encontradas:", workbook.SheetNames);
    
    const sheetName = 'DADOS DE VENDA';
    if (!workbook.SheetNames.includes(sheetName)) {
        console.error(`Aba "${sheetName}" não encontrada!`);
        process.exit(1);
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Assumindo que a primeira linha é o cabeçalho
    const headers = data[0];
    console.log("Cabeçalhos:", headers);
    
    // Tentar encontrar a coluna do nome do produto (geralmente "PRODUTO", "NOME", "DESCRICAO", etc)
    let prodColIdx = -1;
    for (let i = 0; i < headers.length; i++) {
        if (typeof headers[i] === 'string' && headers[i].toUpperCase().includes('PRODUTO')) {
            prodColIdx = i;
            break;
        }
    }
    
    if (prodColIdx === -1) {
        prodColIdx = headers.findIndex(h => typeof h === 'string' && h.toUpperCase().includes('DESCRI'));
    }
    
    if (prodColIdx === -1) {
        // Se não achar por nome, imprime as primeiras 5 linhas para a gente inspecionar
        console.log("Não consegui identificar a coluna do produto automaticamente. Amostra de dados:");
        console.log(data.slice(0, 5));
        process.exit(1);
    }
    
    console.log(`\nExtraindo da coluna: ${headers[prodColIdx]} (índice ${prodColIdx})`);
    
    const produtosUnicos = new Set();
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row && row[prodColIdx]) {
            produtosUnicos.add(row[prodColIdx].toString().trim());
        }
    }
    
    console.log(`\nEncontrados ${produtosUnicos.size} produtos únicos.`);
    
    // Filtrar para mostrar os que parecem ser do tipo marmita/rotisseria
    const produtosLista = Array.from(produtosUnicos).filter(p => 
        p.toUpperCase().includes('ARROZ') || 
        p.toUpperCase().includes('FEIJAO') || 
        p.toUpperCase().includes('FEIJÃO') || 
        p.toUpperCase().includes('ROT') || 
        p.toUpperCase().includes('MARMITA') ||
        p.toUpperCase().includes('MONO')
    ).sort();
    
    console.log("\nPossíveis produtos para inserção (amostra com 'ARROZ', 'FEIJAO', etc):");
    produtosLista.forEach(p => console.log(`- ${p}`));
    
    // Salvar num arquivo txt para inspeção completa se precisar
    const allProductsText = Array.from(produtosUnicos).sort().join('\n');
    fs.writeFileSync('produtos_planilha_extraidos.txt', allProductsText);
    console.log("\nLista completa de produtos únicos salva em 'produtos_planilha_extraidos.txt'");

} catch (error) {
    console.error("Erro ao ler planilha:", error.message);
}
