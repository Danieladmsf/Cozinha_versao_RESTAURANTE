/**
 * Script para atualizar escalas de trabalho dos funcionários
 * 
 * Regras:
 * - Maioria: Seg a Sex, 05:00 - 13:40, Almoço 11:00 - 12:30
 * - Leticia e Francisca: Também trabalham Sábado
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBLSMO3PJpHxAM4x8lxIPReJK8x1ltwdDI",
    authDomain: "affeto-site.firebaseapp.com",
    projectId: "affeto-site",
    storageBucket: "affeto-site.firebasestorage.app",
    messagingSenderId: "725612478337",
    appId: "1:725612478337:web:e88fa3547ed51ec3a34ed1",
    measurementId: "G-C1L4PRQFQW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Escalas
const ESCALA_PADRAO = {
    work_start: '05:00',
    lunch_start: '11:00',
    lunch_end: '12:30',
    work_end: '13:40',
    work_days: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
};

const ESCALA_COM_SABADO = {
    ...ESCALA_PADRAO,
    work_days: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
};

// Funcionários que trabalham sábado
const TRABALHAM_SABADO = ['Leticia', 'Francisca'];

async function updateSchedules() {
    console.log('🔄 Iniciando atualização de escalas...\n');

    try {
        const querySnapshot = await getDocs(collection(db, 'Employee'));
        const employees = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`📋 Encontrados ${employees.length} funcionários\n`);

        for (const emp of employees) {
            // Verificar se trabalha sábado (pelo primeiro nome)
            const firstName = emp.name?.split(' ')[0] || '';
            const trabalhaSabado = TRABALHAM_SABADO.some(nome =>
                firstName.toLowerCase().includes(nome.toLowerCase())
            );

            const escala = trabalhaSabado ? ESCALA_COM_SABADO : ESCALA_PADRAO;

            // Atualizar no Firestore
            const empRef = doc(db, 'Employee', emp.id);
            await updateDoc(empRef, {
                work_start: escala.work_start,
                lunch_start: escala.lunch_start,
                lunch_end: escala.lunch_end,
                work_end: escala.work_end,
                work_days: escala.work_days
            });

            const diasStr = trabalhaSabado ? 'Seg-Sáb' : 'Seg-Sex';
            console.log(`✅ ${emp.name} atualizado: ${escala.work_start}-${escala.work_end} (${diasStr})`);
        }

        console.log('\n🎉 Todas as escalas foram atualizadas com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao atualizar escalas:', error);
        process.exit(1);
    }
}

updateSchedules();
