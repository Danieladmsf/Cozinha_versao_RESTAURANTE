import xlsx from 'xlsx';

const filePath = "C:\\Users\\Administrador\\Desktop\\COZINHA RESTAURANTE\\public\\Planilha sem título (2).xlsx";
const workbook = xlsx.readFile(filePath);

const pesosSheet = workbook.Sheets["PESOS"];
const pesosData = xlsx.utils.sheet_to_json(pesosSheet, { header: 1, defval: "" });

// Print first 5 rows fully
pesosData.slice(0, 5).forEach((row, i) => {
    console.log(`Row ${i}:`);
    row.forEach((col, j) => {
        if (col) console.log(`  [${j}]: ${col}`);
    });
});
