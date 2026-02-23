const { db } = require('./firebase_admin');

async function listMacarraoRecipes() {
    console.log('🚀 Buscando receitas de Macarrão no Firestore (Busca Ampla)...');

    try {
        const snapshot = await db.collection('Recipe').get();
        if (snapshot.empty) {
            console.log('❌ Nenhuma receita encontrada.');
            return;
        }

        const recipes = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(r => {
                const name = (r.name || '').toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents

                return name.includes('macarrao') ||
                    name.includes('macarronada') ||
                    name.includes('bolonhesa') ||
                    name.includes('brocolis') ||
                    name.includes('penne') ||
                    name.includes('fusilli') ||
                    name.includes('spaghetti') ||
                    name.includes('espaguete');
            });

        console.log(`✅ Encontradas ${recipes.length} receitas relevantes.`);
        console.log('---------------------------------------------------');

        recipes.forEach(r => {
            console.log(`ID: ${r.id}`);
            console.log(`Nome: ${r.name}`);
            console.log(`Código (code): ${r.code}`);
            console.log(`Código (product_code): ${r.product_code}`);
            console.log(`Código (external_code): ${r.external_code}`);

            // Check formatted code for matching logic
            const code = r.code || r.product_code || r.external_code;
            console.log(`> Código Efetivo: ${code} (Tipo: ${typeof code})`);
            console.log('---------------------------------------------------');
        });

    } catch (error) {
        console.error('❌ Erro ao buscar receitas:', error);
    }
}

listMacarraoRecipes();
