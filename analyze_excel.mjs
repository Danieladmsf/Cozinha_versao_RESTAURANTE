
import xlsx from 'xlsx';
import fs from 'fs';

const filePath = process.argv[2] || 'C:\\Users\\Administrador\\Desktop\\COZINHA RESTAURANTE\\public\\Planilha sem título (2).xlsx';

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    const workbook = xlsx.readFile(filePath);

    console.log("Planilhas disponíveis:", workbook.SheetNames);

    const sheetName = 'DADOS DE VENDA';
    if (!workbook.SheetNames.includes(sheetName)) {
        console.error(`Planilha '${sheetName}' não encontrada!`);
        process.exit(1);
    }

    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length > 0) {
        console.log("Cabeçalhos:", data[0]);
        console.log("Primeiras 5 linhas:");
        console.log(data.slice(1, 6));
    } else {
        console.log("Planilha vazia.");
    }
} catch (error) {
    console.error("Erro ao ler planilha:", error);
}
