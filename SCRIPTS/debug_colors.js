
import { db } from '../lib/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

const MOCK_USER_ID = 'mock-user-id';

async function verifyPortalData() {
    console.log('--- STARTING PORTAL COLOR VERIFICATION ---');

    try {
        // 1. Fetch Categories (CategoryTree)
        const catSnapshot = await getDocs(collection(db, 'CategoryTree'));
        const categories = catSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        console.log(`✅ Loaded ${categories.length} items from CategoryTree.`);
        console.log('CategoryTree Names:', categories.map(c => c.name).join(', '));

        // Check for Mamitas
        const mamitas = categories.find(c => c.name.toLowerCase().includes('mamitas'));
        if (mamitas) {
            console.log('Found Mamitas structure:', JSON.stringify(mamitas, null, 2));
        } else {
            console.log('❌ Mamitas CATEGORY NOT FOUND in "CategoryTree" collection!');
        }

        const rotisseria = categories.find(c => c.name.toLowerCase().includes('rotisseria'));
        if (rotisseria) {
            console.log('Found Rotisseria structure:', JSON.stringify(rotisseria, null, 2));
        } else {
            console.log('❌ Rotisseria CATEGORY NOT FOUND in "Category" collection!');
        }

        // 2. Fetch MenuConfig
        const q = query(
            collection(db, 'MenuConfig'),
            where('user_id', '==', MOCK_USER_ID),
            where('is_default', '==', true)
        );
        const configSnapshot = await getDocs(q);
        const configs = configSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        if (configs.length === 0) {
            console.log('❌ NO MENU CONFIG FOUND for mock-user-id!');
        } else {
            const config = configs[0];
            console.log('✅ Found MenuConfig:', config.id);
            console.log('Colors configured:', Object.keys(config.category_colors || {}).length);

            if (rotisseria) {
                const color = config.category_colors?.[rotisseria.id];
                console.log(`Color for Rotisseria (${rotisseria.id}):`, color);
            }
        }

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    }

    process.exit();
}

verifyPortalData();
