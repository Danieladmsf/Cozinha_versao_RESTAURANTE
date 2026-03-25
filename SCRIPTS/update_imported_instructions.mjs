import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig, 'update-instructions');
const db = getFirestore(app);

async function run() {
    console.log("Iniciando migração de textos de instrução importada...");
    const snapshot = await getDocs(collection(db, "Recipe"));
    let updatedCount = 0;

    let batch = writeBatch(db);
    let batchCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let changed = false;
        
        if (data.preparations && Array.isArray(data.preparations)) {
            data.preparations.forEach(prep => {
                if (prep.instructions) {
                    // Padrão 1
                    if (prep.instructions.includes('Importado de:')) {
                        const parts = prep.instructions.split('Importado de:');
                        if (parts.length > 1) {
                            let remain = parts[1].trim();
                            // Extrai até o primeiro ponto ou "Etapas"
                            let name = remain.split('. Etapas')[0].trim();
                            if (name.endsWith('.')) name = name.slice(0, -1);
                            
                            prep.instructions = `Seguir a receita do: ${name}.`;
                            changed = true;
                        }
                    } 
                    // Padrão 2: Importado da receita base: [Nome]
                    else if (prep.instructions.includes('Importado da receita base:')) {
                        const parts = prep.instructions.split('Importado da receita base:');
                        if (parts.length > 1) {
                            let name = parts[1].trim();
                            // Se tiver o formato "008028 - ROTISSERIA ARROZ BRANCO BENDITO KG", podemos limpar
                            if (name.endsWith('.')) name = name.slice(0, -1);
                            
                            prep.instructions = `Seguir a receita do: ${name}.`;
                            changed = true;
                        }
                    }
                }
            });
        }

        if (changed) {
            batch.update(doc.ref, { preparations: data.preparations });
            updatedCount++;
            batchCount++;
            console.log(`Documento atualizado: ${data.name || doc.id}`);
            
            // Limitador de batch do firebase é 500
            if (batchCount === 450) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }
    
    console.log(`Migração concluída! Foram atualizadas ${updatedCount} receitas no total.`);
}

run().catch(console.error);
