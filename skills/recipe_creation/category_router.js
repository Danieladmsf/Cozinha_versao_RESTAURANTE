
import { db } from '../../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    Timestamp
} from 'firebase/firestore';

/**
 * Ensures the category hierarchy exists and returns metadata for the recipe.
 */
export async function ensureCategoryHierarchy(subCategoryName) {
    console.log(`🔎 Routing Category for: "${subCategoryName}"`);

    const PRODUCT_CATS = ["Rotisseria", "Padaria", "Legumes Processados", "Confeitária", "Salgados", "Panificação"];

    // Default: Food (Receitas - Base)
    let rootName = "Receitas - Base";
    let rootType = "receitas";
    let recipeType = "receitas";

    // Logic for "Produto" types
    // Note: Confeitária now has accent to match user data
    if (["Confeitária", "Salgados", "Panificação"].includes(subCategoryName)) {
        rootName = "Padaria";
        rootType = "receitas_-_base"; // Maps to "Produtos"
        recipeType = "receitas_-_base";
    } else if (PRODUCT_CATS.includes(subCategoryName)) {
        rootName = subCategoryName;
        rootType = "receitas_-_base";
        recipeType = "receitas_-_base";
    }

    let rootId = await getOrCreateCategory(rootName, null, rootType, 0);

    if (subCategoryName === rootName) {
        return { id: rootId, name: rootName, recipeType };
    }

    let subId = await getOrCreateCategory(subCategoryName, rootId, rootType, 1);

    return { id: subId, name: subCategoryName, recipeType };
}

async function getOrCreateCategory(name, parentId, type, level) {
    let q = parentId
        ? query(collection(db, "Category"), where("name", "==", name), where("parentId", "==", parentId))
        : query(collection(db, "Category"), where("name", "==", name), where("parentId", "==", null));

    const snap = await getDocs(q);

    if (!snap.empty) {
        return snap.docs[0].id;
    }

    const d = await addDoc(collection(db, "Category"), {
        name,
        parentId,
        type,
        level,
        active: true,
        createdAt: Timestamp.now()
    });
    console.log(`✅ Category Created: ${name} (Type: ${type})`);
    return d.id;
}
