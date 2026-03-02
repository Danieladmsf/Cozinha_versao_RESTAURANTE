import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, setDoc, serverTimestamp, query, where } from 'firebase/firestore';

const RAW_DATA = `
MARMITA 3 DIVISORIAS (ALMOÇO)
0004 | Refeição: Arroz, Farofa, [creme/pure] e File Sobre-coxa Assada Bendito UN
8966 | Refeição: Arroz, Farofa, [creme/purê] e Iscas Milanesa
7768 | Refeicao: Arroz, Farofa, [legumes], Lagarto M. Madeira
7625 | Refeicao: Arroz, Farofa, Abobrinha Gratinada e Carne Panela Bendito UN
7660 | Refeicao: Arroz, Farofa, Couve Refogada e Feijoada Bendito UN
7673 | Refeicao: Arroz, Farofa, Ervilha Fresca, File Frango Parmegiana Bendito UN
0001 | Refeição: Arroz, Farofa, Feijão e Kafta Recheada com Queijo Bendito UN
0003 | Refeição: Arroz, Farofa, Feijão e Linguiça Assada Bendito UN
8491 | Refeicao: Arroz, Farofa, Feijão e Medalhao Frango Bendito UN
0002 | Refeição: Arroz, Farofa, Feijão e Pernil ao Molho Ferrugem Bendito UN
7877 | Refeicao: Arroz, Farofa, Purê de Batata e Tirinha Carne Chinesa Bendito UN
9362 | Refeicao: Arroz, Farofa, Purê de Catotia e Isca de Frango a Acebolada Bendito UN
`;

function capitalizeWords(str) {
    if (!str) return '';
    return str.split(' ')
        .map(word => {
            if (word.toLowerCase() === 'e' || word.toLowerCase() === 'de') return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}

async function getOrCreateCategory(catName) {
    const formattedName = catName.trim(); // Mantendo original pra marmita, ou capitalize. O user pediu MARMITA 3 DIVISORIAS (ALMOÇO)

    const treeRef = collection(db, 'CategoryTree');
    const qTree = query(treeRef, where('name', '==', formattedName), where('type', '==', 'produtos'));
    const treeSnap = await getDocs(qTree);

    if (!treeSnap.empty) {
        return { id: treeSnap.docs[0].id, name: treeSnap.docs[0].data().name };
    }

    const catRef = collection(db, 'Category');
    const qCat = query(catRef, where('name', '==', formattedName), where('type', '==', 'produtos'));
    const catSnap = await getDocs(qCat);

    let categoryId = catSnap.empty ? doc(collection(db, 'Category')).id : catSnap.docs[0].id;

    console.log(`[Nova Categoria] Criando categoria em CategoryTree: ${formattedName}`);

    await setDoc(doc(db, 'CategoryTree', categoryId), {
        name: formattedName,
        type: 'produtos',
        level: 1,
        parent_id: null,
        description: `Categoria raiz para ${formattedName}`,
        active: true,
        order: 99,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    }, { merge: true });

    if (catSnap.empty) {
        await setDoc(doc(db, 'Category', categoryId), {
            name: formattedName,
            description: formattedName,
            type: 'produtos',
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
    }

    return { id: categoryId, name: formattedName };
}

async function main() {
    console.log("🛠️ INICIANDO PREENCHIMENTO EM MASSA DE PRODUTOS 🛠️\n");

    const lines = RAW_DATA.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    let currentCategoryName = "";
    let processedCategories = {};
    let successCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!line.includes('|')) {
            currentCategoryName = line;
            console.log(`\n📂 Entrando na categoria: ${currentCategoryName}`);

            if (!processedCategories[currentCategoryName]) {
                processedCategories[currentCategoryName] = await getOrCreateCategory(currentCategoryName);
            }
            continue;
        }

        const parts = line.split('|');
        if (parts.length >= 2) {
            const productCode = parts[0].trim();
            const productName = parts[1].trim();
            const categoryObj = processedCategories[currentCategoryName];

            if (!categoryObj) {
                console.warn(`Aviso: Categoria não encontrada para ${productName}. Pulando...`);
                continue;
            }

            const productQuery = query(collection(db, 'Product'), where('name', '==', productName));
            const productSnap = await getDocs(productQuery);

            // Generate clean DOC ID if not exists, based on Product collection
            const productDoc = productSnap.empty ? doc(collection(db, 'Product')) : productSnap.docs[0].ref;

            await setDoc(productDoc, {
                code: productCode,
                name: productName,
                category: categoryObj.name,
                category_name: categoryObj.name,
                category_id: categoryObj.id,
                active: true,
                updatedAt: serverTimestamp(),
                ...(productSnap.empty ? {
                    createdAt: serverTimestamp(),
                    price: 0,
                    cost: 0
                } : {})
            }, { merge: true });

            console.log(` ✅ Produto processado: ${productCode} - ${productName} (Cat: ${categoryObj.name})`);
            successCount++;
        }
    }

    console.log(`\n🎉 Processamento concluído: ${successCount} produtos gravados/atualizados no Firebase!`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
