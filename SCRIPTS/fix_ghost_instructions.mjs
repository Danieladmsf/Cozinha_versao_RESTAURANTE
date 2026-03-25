import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig, 'fix-ghosts');
const db = getFirestore(app);

// Função para capitalizar texto (ex: ARROZ BRANCO -> Arroz Branco)
function toTitleCase(str) {
    return str.replace(/\\w\\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

async function fixGhosts() {
    console.log("Iniciando limpeza de textos fantasma nas instruções...");
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
                    if (prep.instructions.includes('ROTISSERIA')) {
                        console.log("Found instruction with ROTISSERIA:", prep.instructions);
                    }
                    
                    // Regex para pegar o código, "ROTISSERIA", extrair o nome e ignorar o "BENDITO KG" ou "BENDITO UN"
                    // Ex: "008028 - ROTISSERIA ARROZ BRANCO BENDITO KG"
                    const dirtyMatch = prep.instructions.match(/\d{4,6}\s*\-\s*ROTISSERIA\s+(.*?)\s+BENDITO\s*(KG|UN|\.)?/i);
                    
                    if (dirtyMatch) {
                        const cleanName = toTitleCase(dirtyMatch[1].trim());
                        // Substitui o trecho sujo pelo trecho limpo
                        prep.instructions = prep.instructions.replace(dirtyMatch[0], cleanName);
                        // Também podemos ter instâncias onde tem "Seguir a receita do: Seguir a receita do:" por causa de scripts repetidos
                        prep.instructions = prep.instructions.replace('Seguir a receita do: Seguir a receita do:', 'Seguir a receita do:');
                        changed = true;
                    }

                    // Regex para outro padrão comum: "Rotisseria File Frango Parmegiana (Domingo)" -> sem o 008028
                    const dirtyMatch2 = prep.instructions.match(/ROTISSERIA\s+(.*?)\s+BENDITO\s*(KG|UN|\.)?/i);
                    if (!dirtyMatch && dirtyMatch2) {
                        const cleanName = toTitleCase(dirtyMatch2[1].trim());
                        prep.instructions = prep.instructions.replace(dirtyMatch2[0], cleanName);
                        prep.instructions = prep.instructions.replace('Seguir a receita do: Seguir a receita do:', 'Seguir a receita do:');
                        changed = true;
                    }
                }
                
                // Limpeza no Título também, pois as vezes a etapa leva o nome sujo
                if (prep.title) {
                    if (prep.title.includes('ROTISSERIA')) {
                        console.log("Found title with ROTISSERIA:", prep.title);
                    }
                    const dirtyTitle = prep.title.match(/\d{4,6}\s*\-\s*ROTISSERIA\s+(.*?)\s+BENDITO\s*(KG|UN|\.)?/i);
                    if (dirtyTitle) {
                        const cleanName = toTitleCase(dirtyTitle[1].trim());
                        prep.title = prep.title.replace(dirtyTitle[0], cleanName);
                        changed = true;
                    }
                    else {
                        const dirtyTitle2 = prep.title.match(/ROTISSERIA\\s+(.*?)\\s+BENDITO\\s*(KG|UN|\\.)?/i);
                        if (dirtyTitle2) {
                            const cleanName = toTitleCase(dirtyTitle2[1].trim());
                            prep.title = prep.title.replace(dirtyTitle2[0], cleanName);
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
            console.log(`Corrigido documento: ${data.name || doc.id}`);
            
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
    
    console.log(`\\nFinalizado! Limpeza efetuada em ${updatedCount} receitas.`);
}

fixGhosts().catch(console.error);
