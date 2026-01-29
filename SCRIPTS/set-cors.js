
import admin from 'firebase-admin';
import fs from 'fs';

// Tenta verificar se keys existem, se não, usa application default credentials
// Se o user não tiver serviceAccountKey.json, isso pode falhar, mas é a melhor tentativa automática.
// Alternativamente, instrui o user.

const serviceAccountPath = './serviceAccountKey.json';

const corsConfiguration = [
    {
        origin: ["*"],
        method: ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
        responseHeader: ["Content-Type", "x-goog-resumable"],
        maxAgeSeconds: 3600
    }
];

async function setCors() {
    try {
        // Config inicial
        let app;
        if (fs.existsSync(serviceAccountPath)) {
            console.log("📌 Usando serviceAccountKey.json encontrado...");
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                // Pega o project ID do JSON ou default
                storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
            });
        } else {
            console.log("⚠️ serviceAccountKey.json não encontrado.");
            console.log("Tentando inicializar com Application Default Credentials...");
            // Fallback arriscado se não tiver var de ambiente, mas vale tentar ou parar
            app = admin.initializeApp({
                storageBucket: "cozinha-afeto-2026.firebasestorage.app"
            });
        }

        const bucket = admin.storage().bucket();
        console.log(`Configurando CORS para o bucket: ${bucket.name}...`);

        await bucket.setCorsConfiguration(corsConfiguration);

        console.log("✅ Configuração CORS aplicada com sucesso! Upload deve funcionar agora.");
        console.log("🔄 Reinicie o navegador se necessário.");

    } catch (error) {
        console.error("❌ Erro ao configurar CORS:", error);
        console.log("\n--- INSTRUÇÕES MANUAIS ---");
        console.log("Se este script falhou por falta de credenciais, você precisa:");
        console.log("1. Ir no Console Firebase > Configurações > Contas de Serviço.");
        console.log("2. Gerar nova chave privada (JSON).");
        console.log("3. Salvar como 'serviceAccountKey.json' na raiz deste projeto.");
        console.log("4. Rodar este script novamente: node scripts/set-cors.js");
    }
}

setCors();
