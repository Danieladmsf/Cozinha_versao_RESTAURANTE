
import { db } from './lib/firebase.js';
import { doc, getDoc, collection, getDocsFromServer, query } from 'firebase/firestore';

async function main() {
    const targetId = '2EEqP64nIUW8vrHhGTA6';
    console.log(`🔍 Buscando informações sobre o ID: ${targetId}`);

    // 1. Check Recipe
    const recipeRef = doc(db, 'Recipe', targetId);
    const recipeSnap = await getDoc(recipeRef);

    if (recipeSnap.exists()) {
        const data = recipeSnap.data();
        console.log(`\n✅ O ID É UMA RECEITA ATIVA (NOVO/EXISTENTE)!`);
        console.log(`   Nome: ${data.name}`);
        console.log(`   Categoria: ${data.category || data.category_id}`);
        if (data.createdAt) {
            const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt.seconds * 1000);
            console.log(`   Criado em: ${d.toLocaleString('pt-BR')}`);
        }
    } else {
        console.log(`\n❌ O ID NÃO EXISTE na coleção Recipe. Ele é um ID ANTIGO que foi DELETADO.`);
    }

    // 2. Check Product just in case
    const prodRef = doc(db, 'Product', targetId);
    const prodSnap = await getDoc(prodRef);
    if (prodSnap.exists()) {
        console.log(`\n⚠️ O ID foi encontrado na coleção PRODUCT (como Produto Antigo). Nome: ${prodSnap.data().name}`);
    }

    // 3. Check WeeklyMenu
    console.log(`\n🔍 Buscando o ID no WeeklyMenu...`);
    const menuSnap = await getDocsFromServer(collection(db, 'WeeklyMenu'));
    let foundInMenu = false;

    menuSnap.forEach(d => {
        const docData = d.data();
        const docString = JSON.stringify(docData);
        if (docString.includes(targetId)) {
            foundInMenu = true;
            console.log(`   🔸 Encontrado na semana: ${docData.week_key || d.id} (ID do Documento: ${d.id})`);
        }
    });

    if (!foundInMenu) {
        console.log(`   ❌ Não encontrado em NENHUMA semana do WeeklyMenu atualmente salva no banco.`);
    }

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
