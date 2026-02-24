const { db } = require('../vr_soft_api/firebase_admin.js');
const fs = require('fs');
const path = require('path');

const VR_API_DATA = path.join(__dirname, '../vr_soft_api/dados_extraidos/produtos.json');
const VR_COMPLEMENT_DATA = path.join(__dirname, '../vr_soft_api/dados_extraidos/produtocomplemento.json');

async function updateRecipeShelfLife() {
    try {
        console.log('Carregando produtos e complementos do cache API VR...');
        if (!fs.existsSync(VR_API_DATA) || !fs.existsSync(VR_COMPLEMENT_DATA)) {
            console.error('Cache da API VR (produtos ou produtocomplemento) não encontrado!');
            return;
        }

        const produtosData = JSON.parse(fs.readFileSync(VR_API_DATA, 'utf8'));
        const produtos = produtosData.rows || [];

        const complementosData = JSON.parse(fs.readFileSync(VR_COMPLEMENT_DATA, 'utf8'));
        const complementos = complementosData.rows || [];

        console.log(`Carregados ${produtos.length} produtos e ${complementos.length} complementos.\n`);
        console.log('Buscando receitas no Firebase...\n');

        const recipesSnapshot = await db.collection('Recipe').get();
        if (recipesSnapshot.empty) {
            console.log('Nenhuma receita encontrada no banco de dados.');
            return;
        }

        console.log(`Encontradas ${recipesSnapshot.size} receitas na coleção 'Recipe'.\n`);

        const batch = db.batch();
        let updateCount = 0;

        recipesSnapshot.forEach(doc => {
            const data = doc.data();

            if (!data.code) return; // Sem código não tem como validar

            const recipeCodeStr = String(data.code).replace(/^0+/, ''); // Remove zeros à esquerda
            const vrProduct = produtos.find(p => String(p.id) === recipeCodeStr);

            if (vrProduct) {
                // Tenta achar a validade no complemento
                const comps = complementos.filter(c => String(c.id_produto) === recipeCodeStr);
                let validadeBalanca = 0;

                if (comps.length > 0) {
                    // Pega a maior validade registrada entre as lojas
                    validadeBalanca = Math.max(...comps.map(c => Number(c.validade) || 0));
                }

                // Só atualiza se achou uma validade válida > 0
                if (validadeBalanca > 0) {
                    const docRef = db.collection('Recipe').doc(doc.id);
                    batch.update(docRef, { shelf_life: String(validadeBalanca) });
                    updateCount++;
                    console.log(`[UPDATE] ${data.name} (Code: ${data.code}) -> shelf_life: ${validadeBalanca}`);
                }
            }
        });

        if (updateCount > 0) {
            console.log(`\nAplicando ${updateCount} atualizações no banco de dados...`);
            await batch.commit();
            console.log('Atualização concluída com sucesso!');
        } else {
            console.log('\nNenhuma receita precisava de atualização ou nenhuma validade > 0 foi encontrada.');
        }

    } catch (error) {
        console.error('Erro ao atualizar validades:', error);
    }
}

updateRecipeShelfLife();
