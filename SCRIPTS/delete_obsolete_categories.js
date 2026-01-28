
import { db } from '../lib/firebase.js';
import {
    collection,
    getDocs,
    deleteDoc,
    query,
    where,
    writeBatch
} from 'firebase/firestore';

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

    const collectionRef = collection(db, 'CategoryTree');
    const snapshot = await getDocs(collectionRef);

    const batch = writeBatch(db);
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
    process.exit(0);
}

deleteCategories();
