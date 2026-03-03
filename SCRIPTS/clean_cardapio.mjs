import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'public', 'Cardapio_Recuperado.txt');
const content = fs.readFileSync(filePath, 'utf16le');

const lines = content.split('\n').map(l => l.trim()).filter(l => l);

const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const menuByDay = {
    'Segunda': [],
    'Terça': [],
    'Quarta': [],
    'Quinta': [],
    'Sexta': [],
    'Sábado': [],
    'Domingo': []
};

let currentDay = null;

for (let line of lines) {
    // Fix encoding issues from the raw text
    if (line.includes('Segunda:')) currentDay = 'Segunda';
    else if (line.includes('Ter├ºa:') || line.includes('Terça:')) currentDay = 'Terça';
    else if (line.includes('Quarta:')) currentDay = 'Quarta';
    else if (line.includes('Quinta:')) currentDay = 'Quinta';
    else if (line.includes('Sexta:')) currentDay = 'Sexta';
    else if (line.includes('S├íbado:') || line.includes('Sábado:')) currentDay = 'Sábado';
    else if (line.includes('Domingo:')) currentDay = 'Domingo';
    else if (currentDay && line.startsWith('-')) {
        // Exclude deleted IDs
        if (!line.includes('??? (ID Deletado:')) {
            // Fix encoding in recipe names
            let cleanLine = line
                .replace('Refei├º├úo', 'Refeição')
                .replace('Feij├úo', 'Feijão')
                .replace('Lingui├ºa', 'Linguiça')
                .replace('[creme/pur├¬]', '[creme/purê]')
                .replace('S├íbado', 'Sábado')
                .replace('Ter├ºa', 'Terça');
            menuByDay[currentDay].push(cleanLine);
        }
    }
}

let output = '';
for (const day of daysOfWeek) {
    const items = menuByDay[day];
    if (items.length > 0) {
        output += `${day}:\n`;
        // Remove exact duplicates
        const uniqueItems = [...new Set(items)];
        for (const item of uniqueItems) {
            output += `  ${item}\n`;
        }
        output += '\n';
    }
}

// Write the result back as UTF-8
fs.writeFileSync(filePath, output.trim(), 'utf8');
console.log('File successfully cleaned and formatted as UTF-8.');
