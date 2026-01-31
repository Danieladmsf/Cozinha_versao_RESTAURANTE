
import xlsx from 'xlsx';

const FILE_PATH = 'c:/APP COZINHA/PEDIDOS  ROTISSERIA (DESCONTÃO).xlsx';

function inspect() {
    console.log(`Reading file: ${FILE_PATH}`);
    const workbook = xlsx.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    console.log('--- Inspecting Columns A, B, C (Indices 0, 1, 2) ---');
    // Print first 50 rows where Column B (index 1) is not null
    let count = 0;
    rows.forEach((row, i) => {
        // Check B (1)
        if (row[1] !== undefined && row[1] !== null && count < 50) {
            console.log(`Row ${i}: [A] ${row[0]} | [B Code?] ${row[1]} | [C Name?] ${row[2]} | [D] ${row[3]}`);
            count++;
        }
    });

    if (count === 0) {
        console.log("Column B appears empty in the first 50 non-empty matches. Dumping first 10 absolute rows:");
        rows.slice(0, 10).forEach((row, i) => {
            console.log(`Row ${i} (First 5 cols): ${row.slice(0, 5)}`);
        });
    }
}

inspect();
