
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '../lib/firebase.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspect() {
  const q = query(collection(db, 'Recipe'), where('name', '==', 'Arroz Branco'));
  const snap = await getDocs(q);
  if (snap.empty) {
      console.log("Nenhuma receita encontrada.");
  } else {
      snap.forEach(doc => {
          console.log(JSON.stringify(doc.data(), null, 2));
      });
  }
  process.exit(0);
}

inspect();
