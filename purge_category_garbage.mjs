
import { db } from './lib/firebase.js';
import { collection, doc, deleteDoc, getDocsFromServer } from 'firebase/firestore';

async function main() {
    console.log("🧹 INICIANDO VARREDURA E LIMPEZA DA TABELA CATEGORY 🧹");

    const allowedNames = [
        // As 11 Receitas
        "Bovino", "Aves", "Suínos", "Pescado", "Refogado", "Saladas",
        "Guarnição", "Acompanhamento", "Molhos e Patês", "Sushi e Japonesa", "Refeições / Produtos",

        // Os 17 Produtos/Ingredientes
        "MARMITA 3 DIVISORIAS (ALMOÇO)", "MACARRÃO (ALMOÇO)", "MONO ARROZ (ALMOÇO)",
        "MONO FEIJÃO (ALMOÇO)", "MONO GUARNIÇÃO (ALMOÇO)", "MONO PROTEINAS (ALMOÇO)",
        "MASSAS (TARDE)", "SALADAS COZIDAS (TARDE)", "MOLHOS (TARDE)", "PATES (TARDE)",
        "PRODUTOS", "EMBALAGENS", "TEMPEROS", "GRÃOS E CEREAIS", "CARNES", "LATICÍNIOS", "VEGETAIS"
    ];

    const snap = await getDocsFromServer(collection(db, 'Category'));
    console.log(`Encontrados ${snap.size} documentos no total.`);

    let deletedCount = 0;
    let keptCount = 0;

    for (const d of snap.docs) {
        const data = d.data();
        const name = data.name || data.description || "Sem Nome";

        if (!allowedNames.includes(name)) {
            console.log(`🗑️ LIXO DETECTADO -> APAGANDO: [${data.type || 'sem-tipo'}] ${name}`);
            await deleteDoc(doc(db, "Category", d.id));
            deletedCount++;
        } else {
            // console.log(`✅ MANTIDO: ${name}`);
            keptCount++;
        }
    }

    console.log(`\n🎉 Limpeza Concluída!`);
    console.log(`- Apagados: ${deletedCount} (Sobras Contaminadas)`);
    console.log(`- Mantidos: ${keptCount} (Oficiais)`);

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
