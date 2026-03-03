import fs from 'fs';
import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, setDoc, serverTimestamp, query, where } from 'firebase/firestore';

async function main() {
    console.log("🛠️ REGISTRANDO PRODUTO ESPECÍFICO 🛠️");

    const categoryName = "PATES (TARDE)".trim();
    const productName = "007574 - PATE DE AZEITONA PRETA BENDITO KG".trim();
    const productCode = "7574";
    const productWeight = 0.15;

    // 1. Procurar ou Criar a Categoria
    const currentTreeSnap = await getDocs(query(collection(db, 'CategoryTree'), where("type", "==", "produtos")));
    let categoryId = null;

    currentTreeSnap.docs.forEach(d => {
        if (d.data().name.toLowerCase().trim() === categoryName.toLowerCase()) {
            categoryId = d.id;
        }
    });

    if (!categoryId) {
        console.log(`Criando nova categoria: ${categoryName}`);
        const newCatRef = doc(collection(db, "Category"));
        categoryId = newCatRef.id;

        await setDoc(newCatRef, {
            name: categoryName,
            type: 'produtos',
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        await setDoc(doc(db, "CategoryTree", categoryId), {
            name: categoryName,
            type: 'produtos',
            active: true,
            level: 1,
            parent_id: null,
            order: 99,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }

    // 2. Procurar se o Produto já existe
    const prodSnap = await getDocs(query(collection(db, 'Product'), where("name", "==", productName)));
    let prodId = null;

    if (!prodSnap.empty) {
        prodId = prodSnap.docs[0].id;
        console.log(`Produto já existe com ID: ${prodId}, atualizando...`);
    } else {
        const newProdRef = doc(collection(db, "Product"));
        prodId = newProdRef.id;
        console.log(`Criando novo produto com ID: ${prodId}`);
    }

    // 3. Atualizar/Inserir o Produto
    await setDoc(doc(db, 'Product', prodId), {
        name: productName,
        code: productCode,
        weigh_base: productWeight,
        category: categoryName,
        category_id: categoryId,
        type: 'produtos',
        active: true,
        updatedAt: serverTimestamp()
    }, { merge: true });

    // Se no DB antigo também exigiam em `CategoryTree` e `Category` ou algo assim - mas Product fica numa collection separada.
    console.log(`✅ Produto registrado com sucesso!`);
    console.log(`   Nome: ${productName}`);
    console.log(`   Categoria: ${categoryName} (ID: ${categoryId})`);

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
