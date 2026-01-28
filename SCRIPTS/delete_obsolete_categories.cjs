const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const categoriesToDelete = [
    "Óleos",
    "Refogados - Legumes/Folhas",
    "Carnes",
    "Temperos",
    "Vegetais",
    "Grãos",
    "Guarnição - Básica",
    "Farináceos",
    "Laticínios",
    "Saladas",
    "Frutas",
    "Embalagem"
];

async function deleteCategories() {
    console.log('Searching for categories to delete...');

    const collectionRef = db.collection('category_tree');
    const snapshot = await collectionRef.get();

    const batch = db.batch();
    let deleteCount = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        // Check if the name matches exactly or is in our list
        if (categoriesToDelete.includes(data.name)) {
            console.log(`Found category to delete: ${data.name} (ID: ${doc.id}, Type: ${data.type})`);
            batch.delete(doc.ref);
            deleteCount++;
        }
    });

    if (deleteCount > 0) {
        await batch.commit();
        console.log(`Successfully deleted ${deleteCount} categories.`);
    } else {
        console.log('No matching categories found to delete.');
    }
}

deleteCategories().catch(console.error);
