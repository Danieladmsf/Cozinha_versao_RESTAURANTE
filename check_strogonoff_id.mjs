
import { db } from './lib/firebase.js';
import { doc, getDoc, collection, query, where, getDocsFromServer } from 'firebase/firestore';

async function main() {
    const idToCheck = 'mMgLYJ43UCi3k8YBERPx';
    console.log(`🔍 Verificando o ID do Strogonoff: ${idToCheck}`);

    const recipeSnap = await getDoc(doc(db, 'Recipe', idToCheck));

    if (recipeSnap.exists()) {
        const data = recipeSnap.data();
        console.log(`\n✅ Este ID (${idToCheck}) existe atualmente na Tabela RECIPE!`);
        console.log(`   Nome: ${data.name}`);
        console.log(`   Status Ativo: ${data.active}`);

        if (data.createdAt) {
            const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt.seconds * 1000);
            console.log(`   Criado em: ${d.toLocaleString('pt-BR')}`);
        }
    } else {
        console.log(`\n❌ Este ID (${idToCheck}) NÃO EXISTE na tabela Recipe. Ele NUNCA FOI UMA FICHA TÉCNICA (ou foi deletado).`);
    }

    // Is it in product?
    const prodSnap = await getDoc(doc(db, 'Product', idToCheck));
    if (prodSnap.exists()) {
        const pd = prodSnap.data();
        console.log(`\n⚠️ Ele FOI ENCONTRADO na tabela PRODUCT. Isso indica que ele é uma FICHA ANTIGA BICHADA.`);
        console.log(`   Nome em Product: ${pd.name}`);
        if (pd.createdAt) {
            const pt = pd.createdAt.toDate ? pd.createdAt.toDate() : new Date(pd.createdAt.seconds * 1000);
            console.log(`   Data de invenção: ${pt.toLocaleString('pt-BR')}`);
        }
    }

    console.log(`\n🔍 Buscando a Nova Ficha Técnica do Strogonoff na tabela Recipe...`);
    // The name we generated was simply "Strogonoff de Carne" without the rotisseria tags
    const q = query(collection(db, 'Recipe'), where('name', '==', 'Strogonoff de Carne'));
    const newSnaps = await getDocsFromServer(q);

    if (newSnaps.empty) {
        console.log(`   ❌ Nova ficha não encontrada com o nome exato "Strogonoff". Buscando variantes...`);
        const allRec = await getDocsFromServer(collection(db, "Recipe"));
        allRec.forEach(d => {
            const n = d.data().name.toLowerCase();
            if (n.includes('strogonoff')) {
                console.log(`   👉 POSSÍVEL NOVO ID OFICIAL: ${d.id} | ${d.data().name}`);
            }
        });
    } else {
        newSnaps.forEach(d => {
            const data = d.data();
            console.log(`   👉 NOVO ID OFICIAL: ${d.id}`);
            console.log(`      Nome: ${data.name}`);
            if (data.createdAt) {
                const dt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt.seconds * 1000);
                console.log(`      Criado em: ${dt.toLocaleString('pt-BR')}`);
            }
        });
    }

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
