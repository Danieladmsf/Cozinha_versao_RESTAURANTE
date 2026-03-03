
import { db } from './lib/firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

async function main() {
    console.log("🛠️ Aplicando estrutura exata (Clone do W6) no nosso W09...");

    // Pega o nosso dado sujo do W09 que tem extras
    const ourW09Snap = await getDoc(doc(db, "WeeklyMenu", "2026-W09"));
    const dataW09 = ourW09Snap.data();

    // Pega o nosso dado sujo do W10 que tem extras
    const ourW10Snap = await getDoc(doc(db, "WeeklyMenu", "2026-W10"));
    const dataW10 = ourW10Snap.data();

    if (dataW09 && dataW09.menu_data) {
        // Criar um payload limpo, SÓ com o que a v6 tinha
        const purePayloadW09 = {
            week_key: "2026-W9",  // frontend strips leading zero! '2026-W09' breaks the hook logic!
            updatedAt: dataW09.updatedAt,
            createdAt: dataW09.createdAt,
            week_start: dataW09.week_start,
            user_id: dataW09.user_id,
            menu_data: dataW09.menu_data
        };

        // Salvar num documento com o ID EXATO que o frontend busca (2026-W9 em vez de 2026-W09)
        console.log(`- Salvando 2026-W9 puro...`);
        await setDoc(doc(db, "WeeklyMenu", "2026-W9"), purePayloadW09);
    }

    if (dataW10 && dataW10.menu_data) {
        // Criar um payload limpo, SÓ com o que a v6 tinha
        const purePayloadW10 = {
            week_key: "2026-W10",
            updatedAt: dataW10.updatedAt,
            createdAt: dataW10.createdAt,
            week_start: dataW10.week_start,
            user_id: dataW10.user_id,
            menu_data: dataW10.menu_data
        };

        console.log(`- Salvando 2026-W10 puro...`);
        await setDoc(doc(db, "WeeklyMenu", "2026-W10"), purePayloadW10);
    }

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
