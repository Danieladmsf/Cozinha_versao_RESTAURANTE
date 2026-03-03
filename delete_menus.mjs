
import { db } from './lib/firebase.js';
import { doc, deleteDoc } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Limpando Lixeira de Duplicatas no WeeklyMenu...");

    try {
        await deleteDoc(doc(db, "WeeklyMenu", "AmaohXzP4W9T4jrVE4iM"));
        console.log(`✅ Deletado: AmaohXzP4W9T4jrVE4iM (Antigo Erro W09)`);

        await deleteDoc(doc(db, "WeeklyMenu", "n3fIyOnAfO6jhySPviW2"));
        console.log(`✅ Deletado: n3fIyOnAfO6jhySPviW2 (Antigo Erro W10)`);

        console.log("\n🚀 Conflitos resolvidos! Agora a interface só vai ler o Cardápio correto.");
    } catch (e) {
        console.error("❌ Erro ao deletar:", e);
    }

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
