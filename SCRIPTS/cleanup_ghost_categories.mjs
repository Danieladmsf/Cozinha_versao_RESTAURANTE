import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

async function cleanupMenuConfig() {
    try {
        console.log("Fetching MenuConfig...");
        const confSnap = await getDocs(collection(db, 'MenuConfig'));

        for (const d of confSnap.docs) {
            const data = d.data();
            let needsUpdate = false;

            // Fix category_groups: remove groups that don't match real Level 1 categories we saw (CONFEITÁRIA and PROCESSADOS - FLV)
            if (data.category_groups) {
                const filteredGroups = data.category_groups.filter(g =>
                    g.name !== "CONFEITÁRIA" &&
                    g.name !== "PROCESSADOS - FLV"
                );

                if (filteredGroups.length !== data.category_groups.length) {
                    data.category_groups = filteredGroups;
                    needsUpdate = true;
                    console.log(`Will remove ghost categories from category_groups in doc ${d.id}`);
                }
            }

            if (needsUpdate) {
                await updateDoc(doc(db, 'MenuConfig', d.id), {
                    category_groups: data.category_groups
                });
                console.log(`Updated MenuConfig ${d.id}`);
            } else {
                console.log(`No ghost categories found in MenuConfig ${d.id}`);
            }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
cleanupMenuConfig();
