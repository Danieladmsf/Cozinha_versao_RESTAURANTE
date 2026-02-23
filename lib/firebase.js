import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
  authDomain: "cozinha-afeto-2026.firebaseapp.com",
  projectId: "cozinha-afeto-2026",
  storageBucket: "cozinha-afeto-2026.firebasestorage.app",
  messagingSenderId: "727272047685",
  appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig);

// Inicializar Firestore com configuração de cache otimizada
// Usar persistência apenas no cliente (browser), memória no servidor (node)
const isBrowser = typeof window !== 'undefined';

export const db = initializeFirestore(app, {
  localCache: isBrowser
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : memoryLocalCache()
});

export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
