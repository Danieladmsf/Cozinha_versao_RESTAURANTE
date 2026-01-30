// Script para criar as categorias iniciais de POP no Firebase
// OBS: 'ferramentas' já foi criada no script anterior, mas este script garante que todas existam
// Execute com: node scripts/seed-all-categories.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChG48oQ3log5a-8ghL3ZfaritRMM5EqSs",
    authDomain: "cozinha-afeto-2026.firebaseapp.com",
    projectId: "cozinha-afeto-2026",
    storageBucket: "cozinha-afeto-2026.firebasestorage.app",
    messagingSenderId: "727272047685",
    appId: "1:727272047685:web:4ebca2e3d67b273f5b0f2c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const categorias = [
    {
        id: "ferramentas",
        nome: "Ferramentas",
        icone: "Wrench",
        corPrimaria: "#f97316", // Orange
        ordem: 1,
        colecao: "ferramentas",
        cards: [
            { id: "dados", titulo: "Dados Técnicos", cor: "#3b82f6", icone: "Info" },
            { id: "epis", titulo: "EPIs Necessários", cor: "#f97316", icone: "ShieldCheck" },
            { id: "manutencao", titulo: "Manutenção", cor: "#6b7280", icone: "Settings" },
            { id: "precaucoes", titulo: "Precauções de Segurança", cor: "#dc2626", icone: "Shield" }
        ]
    },
    {
        id: "cortes",
        nome: "Cortes",
        icone: "Scissors",
        corPrimaria: "#10b981", // Emerald
        ordem: 2,
        colecao: "cortes",
        cards: [
            { id: "dados", titulo: "Dados Técnicos", cor: "#3b82f6", icone: "Info" },
            { id: "epis", titulo: "EPIs Necessários", cor: "#f97316", icone: "ShieldCheck" },
            { id: "manutencao", titulo: "Manutenção", cor: "#6b7280", icone: "Settings" },
            { id: "precaucoes", titulo: "Precauções de Segurança", cor: "#dc2626", icone: "Shield" }
        ]
    },
    {
        id: "avisos_sanitarios",
        nome: "Avisos Sanitários",
        icone: "AlertTriangle",
        corPrimaria: "#ef4444", // Red
        ordem: 3,
        colecao: "avisos_sanitarios",
        cards: [
            { id: "dados", titulo: "Informações Gerais", cor: "#3b82f6", icone: "Info" },
            { id: "epis", titulo: "EPIs Necessários", cor: "#f97316", icone: "ShieldCheck" },
            { id: "manutencao", titulo: "Procedimentos", cor: "#6b7280", icone: "Settings" },
            { id: "precaucoes", titulo: "Precauções de Segurança", cor: "#dc2626", icone: "Shield" }
        ]
    }
];

async function seedCategories() {
    console.log('🚀 Iniciando seed de TODAS as categorias de POP...\n');

    const categoriasRef = collection(db, 'pop_categorias');

    for (const categoria of categorias) {
        try {
            const docRef = doc(categoriasRef, categoria.id);
            // Usamos setDoc com merge: true para não sobrescrever dados se já existirem (preserva timestamps originais se quiser, ou remove merge para forçar update)
            await setDoc(docRef, {
                ...categoria,
                updatedAt: serverTimestamp()
            }, { merge: true });

            console.log(`✅ Categoria "${categoria.nome}" atualizada/criada.`);
        } catch (error) {
            console.error(`❌ Erro em "${categoria.nome}":`, error);
        }
    }

    console.log('\n🎉 Seed concluído! As 3 categorias base estão no Firebase.');
    process.exit(0);
}

seedCategories();
