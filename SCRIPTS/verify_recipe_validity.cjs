const { db } = require('../vr_soft_api/firebase_admin.js');
const fs = require('fs');
const path = require('path');

const VR_API_DATA = path.join(__dirname, '../vr_soft_api/dados_extraidos/produtos.json');
const VR_COMPLEMENT_DATA = path.join(__dirname, '../vr_soft_api/dados_extraidos/produtocomplemento.json');

async function checkRecipeValidity() {
    try {
        console.log('Carregando produtos e complementos do cache da API VR...');
        if (!fs.existsSync(VR_API_DATA) || !fs.existsSync(VR_COMPLEMENT_DATA)) {
            console.error('Cache da API VR não encontrado!');
            return;
        }

        const produtosData = JSON.parse(fs.readFileSync(VR_API_DATA, 'utf8'));
        const produtos = produtosData.rows || [];

        const complementosData = JSON.parse(fs.readFileSync(VR_COMPLEMENT_DATA, 'utf8'));
        const complementos = complementosData.rows || [];

        console.log(`Carregados ${produtos.length} produtos do cache da API VR.\n`);
        console.log('Buscando receitas no Firebase...\n');

        const recipesSnapshot = await db.collection('Recipe').get();
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

            if (!data.code) {
                noOriginId.push({ id: doc.id, name: data.name });
                return;
            }

            const recipeCodeStr = String(data.code).replace(/^0+/, ''); // remove leading zeros
            const vrProduct = produtos.find(p => String(p.id) === recipeCodeStr);

            if (vrProduct) {
                // Tenta achar a validade no complemento (ignora loja, ou pega o max validade)
                const comps = complementos.filter(c => String(c.id_produto) === recipeCodeStr);
                let validadeBalanca = 0;
                if (comps.length > 0) {
                    // Pega a maior validade registrada entre as lojas para aquele produto
                    validadeBalanca = Math.max(...comps.map(c => Number(c.validade) || 0));
                }

                foundValidities.push({
                    id: doc.id,
                    name: data.name,
                    origin_id: data.code,
                    validade_dias: validadeBalanca,
                    vr_name: vrProduct.descricaocompleta
                });
            } else {
                notFoundInVR.push({
                    id: doc.id,
                    name: data.name,
                    origin_id: data.code
                });
            }
        });

        console.log('=== RECEITAS COM VALIDADE NA API VR ===');
        foundValidities.forEach(item => {
            console.log(`[Code: ${item.origin_id}] ${item.name}`);
            console.log(`    Nome VR: ${item.vr_name}`);
            console.log(`    Validade VR: ${item.validade_dias} dias`);
            console.log('---------------------------------------');
        });

        console.log(`\nResumo:`);
        console.log(`- ${foundValidities.length} receitas mapeadas com validade na API VR`);
        console.log(`- ${notFoundInVR.length} receitas com 'code' mas não encontradas na VR`);
        console.log(`- ${noOriginId.length} receitas sem 'code'`);

    } catch (error) {
        console.error('Erro ao buscar validades:', error);
    }
}

checkRecipeValidity();
