import { db } from '../lib/firebase.js';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';

async function updateArrozNotes() {
    console.log("📝 Adicionando notas à receita Arroz Branco...\n");

    try {
        const q = query(collection(db, "Recipe"), where("name", "==", "Arroz Branco"));
        const snap = await getDocs(q);

        if (snap.empty) {
            console.log("❌ Receita 'Arroz Branco' não encontrada");
            process.exit(1);
        }

        const recipeDoc = snap.docs[0];
        const data = recipeDoc.data();

        // Criar as notas no formato correto
        const notes = [
            {
                title: "Preparo Inicial",
                content: "Lavar o arroz em água corrente até a água sair clara (opcional, remove excesso de amido). Descascar e picar a cebola em cubos pequenos. Descascar e picar o alho finamente.",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                title: "Refogado",
                content: "Aquecer o óleo em panela grossa. Refogar cebola até dourar levemente (~2 min). Adicionar alho e refogar por mais 30 segundos (não deixar queimar).",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                title: "Cocção",
                content: "Adicionar o arroz e mexer bem, tostando levemente (~1 min). Adicionar a água FERVENTE e o sal. Tampar e cozinhar em fogo BAIXO por 15-18 minutos.",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                title: "Finalização",
                content: "Desligar o fogo e deixar descansar tampado por 5 minutos. Soltar com garfo antes de servir.",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        // Atualizar preparations com as notes
        if (data.preparations && data.preparations[0]) {
            data.preparations[0].notes = notes;
        }

        await updateDoc(doc(db, "Recipe", recipeDoc.id), {
            preparations: data.preparations,
            updatedAt: Timestamp.now()
        });

        console.log("✅ Notas adicionadas com sucesso!");
        console.log("\n📋 Notas criadas:");
        notes.forEach((note, i) => {
            console.log(`   ${i + 1}º Passo - ${note.title}`);
        });

        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("❌ Erro:", error);
        process.exit(1);
    }
}

updateArrozNotes();
