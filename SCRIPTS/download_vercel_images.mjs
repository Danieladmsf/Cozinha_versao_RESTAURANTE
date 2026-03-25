import { list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(fs.createWriteStream(dest))
           .on('error', reject)
           .once('close', () => resolve(dest));
      } else {
        res.resume();
        reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function run() {
    const downloadDir = path.join(__dirname, '../vercel_images_backup');
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir);
    }

    try {
        console.log("Iniciando listagem de imagens do Vercel Blob...");
        console.log(`As imagens serão salvas em: ${downloadDir}`);
        
        let hasMore = true;
        let cursor;
        let count = 0;

        while (hasMore) {
            const listResult = await list({
                token: process.env.BLOB_READ_WRITE_TOKEN,
                limit: 1000,
                cursor,
            });

            for (const blob of listResult.blobs) {
                // Remove barras do pathname para não quebrar a pasta (caso existam subdiretórios no blob)
                const safeName = blob.pathname.replaceAll('/', '_');
                const filepath = path.join(downloadDir, safeName);
                
                try {
                    await downloadImage(blob.url, filepath);
                    console.log(`✅ [${count + 1}] Baixado: ${safeName} (${(blob.size / 1024).toFixed(2)} KB)`);
                    count++;
                } catch (err) {
                    console.error(`❌ Erro ao baixar ${safeName}:`, err.message);
                }
            }

            hasMore = listResult.hasMore;
            cursor = listResult.cursor;
        }

        console.log(`\\n🎉 Sucesso! ${count} imagens foram baixadas na pasta 'vercel_images_backup'.`);
    } catch (e) {
        console.error("\\n❌ Erro fatal ao acessar Vercel Blob:", e.message);
    }
}

run();
