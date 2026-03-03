import xlsx from 'xlsx';

const filePath = "C:\\Users\\Administrador\\Desktop\\COZINHA RESTAURANTE\\public\\Planilha sem título (2).xlsx";
const workbook = xlsx.readFile(filePath);

const pesosSheet = workbook.Sheets["PESOS"];
const pesosData = xlsx.utils.sheet_to_json(pesosSheet, { header: 1 });
console.log("---- PESOS ----");
console.log(JSON.stringify(pesosData.slice(0, 50), null, 2));

const segundaSheet = workbook.Sheets["SEGUNDA"];
const segundaData = xlsx.utils.sheet_to_json(segundaSheet, { header: 1 });
console.log("---- SEGUNDA ----");
console.log(JSON.stringify(segundaData.slice(0, 20), null, 2));
