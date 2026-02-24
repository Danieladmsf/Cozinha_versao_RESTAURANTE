const { db } = require('../vr_soft_api/firebase_admin.js');
const fs = require('fs');
const path = require('path');

const VR_API_DATA = path.join(__dirname, '../vr_soft_api/dados_extraidos/produtos.json');

async function checkRecipeValidity() {
    try {
        console.log('Carregando produtos do cache da API VR...');
        if (!fs.existsSync(VR_API_DATA)) {
            console.error('Cache da API VR não encontrado!');
            return;
        }

        const produtosData = JSON.parse(fs.readFileSync(VR_API_DATA, 'utf8'));
        const produtos = produtosData.rows;

        console.log(`Carregados ${produtos.length} produtos do cache da API VR.\n`);
        console.log('Buscando receitas no Firebase...\n');

        const recipesSnapshot = await db.collection('recipe').get();
        if (recipesSnapshot.empty) {
            console.log('Nenhuma receita encontrada no banco de dados.');
            return;
        }

        console.log(`Encontradas ${recipesSnapshot.size} receitas.\n`);

        let foundValidities = [];
        let notFoundInVR = [];
        let noOriginId = [];

        recipesSnapshot.forEach(doc => {
            const data = doc.data();

            if (!data.origin_id) {
                noOriginId.push(data.name || doc.id);
                return;
            }

            const originIdStr = String(data.origin_id);
            const vrProduct = produtos.find(p => String(p.id) === originIdStr);

            if (vrProduct) {
                foundValidities.push({
                    id: doc.id,
                    name: data.name,
                    origin_id: data.origin_id,
                    validade_dias: vrProduct.qtddiasminimovalidade,
                    vr_name: vrProduct.descricaocompleta
                });
            } else {
                notFoundInVR.push({
                    name: data.name,
                    origin_id: data.origin_id
                });
            }
        });

        console.log('=== RECEITAS COM VALIDADE NA API VR ===');
        foundValidities.forEach(item => {
            console.log(`[${item.origin_id}] ${item.name}`);
            console.log(`    Nome VR: ${item.vr_name}`);
            console.log(`    Validade VR: ${item.validade_dias} dias`);
            console.log('---------------------------------------');
        });

        console.log(`\nResumo:`);
        console.log(`- ${foundValidities.length} receitas mapeadas com validade na API VR`);
        console.log(`- ${notFoundInVR.length} receitas com origin_id mas não encontradas na VR`);
        console.log(`- ${noOriginId.length} receitas sem origin_id`);

    } catch (error) {
        console.error('Erro ao buscar validades:', error);
    }
}

checkRecipeValidity();
