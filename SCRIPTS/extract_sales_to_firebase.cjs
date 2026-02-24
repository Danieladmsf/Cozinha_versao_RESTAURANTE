const { Client } = require('pg');
const { db } = require('../vr_soft_api/firebase_admin.js');
const { format } = require('date-fns');

const client = new Client({
    host: '10.110.65.232',
    port: 8745,
    database: 'vr',
    user: 'postgres',
    password: 'VrPost@Server'
});

async function runETL() {
    try {
        console.log("Conectando ao banco de dados e Firebase...");

        // 1. BUscar todos os produtos (códigos VR) mapeados no Firebase
        // Isso impede a extração do banco inteiro (milhões de registros) do supermercado.
        const recipesSnapshot = await db.collection('Recipe').get();
        const validCodes = [];

        recipesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.code) {
                // Remover zeros a esquerda pois o id no postgres é Int
                const cleanCode = parseInt(String(data.code).replace(/^0+/, ''), 10);
                if (!isNaN(cleanCode)) {
                    validCodes.push(cleanCode);
                }
            }
        });

        if (validCodes.length === 0) {
            console.log("Nenhum produto com código validado encontrado no Firebase. Cancelando ETL.");
            return;
        }

        console.log(`Encontrados ${validCodes.length} produtos de fabricação/venda mapeados no Firebase.`);

        await client.connect();

        console.log("Baixando os últimos 90 dias de vendas (agregação por hora) APENAS para os produtos mapeados...");
        const query = `
            SELECT 
                v.data,
                v.id_loja,
                vi.id_produto,
                EXTRACT(HOUR FROM v.horainicio) as hora,
                SUM(vi.quantidade) as qtd,
                COUNT(*) as cupons
            FROM pdv.venda v
            JOIN pdv.vendaitem vi ON vi.id_venda = v.id
            WHERE v.data >= CURRENT_DATE - INTERVAL '90 days'
              AND v.cancelado = false
              AND vi.quantidade > 0
              AND vi.id_produto = ANY($1::int[])
            GROUP BY v.data, v.id_loja, vi.id_produto, EXTRACT(HOUR FROM v.horainicio)
            ORDER BY v.data ASC, vi.id_produto ASC, hora ASC
        `;

        const res = await client.query(query, [validCodes]);
        const records = res.rows;
        console.log(`Extração de dados concluída. ${records.length} ocorrências e faixas de horário encontradas.`);

        console.log("Estruturando os dados no formato Nativo Firebase (Firestore)...");
        const dataMap = {};

        // Agrupa tudo em: Map[ 'idloja_idproduto_YYYY-MM-DD' ] = Documento
        for (const row of records) {
            // A data do PG vem como objeto Date. Extraimos só a data YYYY-MM-DD.
            const jsDate = new Date(row.data);
            const dateStr = format(jsDate, 'yyyy-MM-dd');
            const productId = String(row.id_produto);
            const storeId = parseInt(row.id_loja, 10);

            const docId = `${storeId}_${productId}_${dateStr}`;

            if (!dataMap[docId]) {
                dataMap[docId] = {
                    productId: productId,
                    storeId: storeId,
                    date: dateStr,
                    total_quantity: 0,
                    total_coupons: 0,
                    events: []
                };
            }

            const parsedQty = parseFloat(row.qtd);
            const parsedCoupons = parseInt(row.cupons, 10);

            dataMap[docId].total_quantity += parsedQty;
            dataMap[docId].total_coupons += parsedCoupons;

            dataMap[docId].events.push({
                hour: parseInt(row.hora, 10),
                qty: parsedQty,
                coupons: parsedCoupons
            });
        }

        const docsToSave = Object.entries(dataMap);
        console.log(`Serão salvos/atualizados ${docsToSave.length} documentos (1 por dia consolidado de cada produto/loja) no Firestore.`);

        if (docsToSave.length === 0) {
            console.log("Nenhuma venda registrada para os códigos solicitados nestes 90 dias.");
            return;
        }

        console.log("Iniciando Upload (Batching) seguro para o Firebase na collection 'sales_history'...");

        const BATCH_SIZE = 400; // Firebase aceita batches de ate 500 operacoes
        let batch = db.batch();
        let opsCounter = 0;
        let batchCount = 0;
        let totalSalvos = 0;

        for (let i = 0; i < docsToSave.length; i++) {
            const [docId, docData] = docsToSave[i];

            docData.last_updated = new Date().toISOString();

            const docRef = db.collection('sales_history').doc(docId);
            batch.set(docRef, docData, { merge: true });

            opsCounter++;
            totalSalvos++;

            if (opsCounter === BATCH_SIZE || i === docsToSave.length - 1) {
                batchCount++;
                console.log(`Enviando Lote Firebase ${batchCount}... (${totalSalvos} docs agrupados persistidos)`);
                await batch.commit();

                batch = db.batch();
                opsCounter = 0;
            }
        }

        console.log("🎉 CARGA HISTÓRICA DO PDV CONCLUÍDA NO FIREBASE COM SUCESSO! Apenas para os itens mapeados.");

    } catch (err) {
        console.error("Erro no processo de ETL:", err);
    } finally {
        await client.end();
    }
}

runETL();
