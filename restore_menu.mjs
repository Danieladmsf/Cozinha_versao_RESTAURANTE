
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, getDocsFromServer, doc, updateDoc } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Tentando restaurar o Cardápio usando backup...");

    if (!fs.existsSync('menus_dump.json')) {
        console.log("❌ Arquivo menus_dump.json não encontrado!");
        process.exit(1);
    }

    const dumpStr = fs.readFileSync('menus_dump.json', 'utf8');
    const dumpData = JSON.parse(dumpStr);

    console.log(`- Backup lido: ${dumpData.length} semanas salvas.`);

    // Encontrar o mapping antigo (ID -> Nome) do arquivo técnico antigo se existir
    // Mas não temos o nome no menus_dump, só os IDs!
    // Como eu apaguei os IDs velhos sem salvar um de/para direto, precisamos tentar inferir
    // Como não posso inferir nomes pelos IDs antigos se apagamos as Fichas,
    // Deixe-me primeiro imprimir um dia inteiro do menus_dump para essa semana e ver o que tem:
    const week = dumpData.find(w => w.week_key === '2026-W10' || w.week_key === '2026-W9');
    if (!week) {
        console.log("❌ Semana atual não encontrada no backup.");
        return;
    }

    console.log("Semana:", week.week_key);
    console.log("Days:", JSON.stringify(week.days || {}, null, 2));

    setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
