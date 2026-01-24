/**
 * Script para popular o Firebase com os funcionários e dados fictícios
 * Execute: node scripts/seed_employees.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

// Lista de funcionários com dados fictícios completos
const employees = [
    // PADARIA (5)
    { name: 'Regina', role: 'Líder', sector: 'PADARIA', salary: 3200, admission_date: '2020-03-10', vacation_start: '2026-03-15', vacation_end: '2026-03-29', notes: 'Responsável pela equipe de padaria', show_salary: true, show_vacation: true, show_notes: true },
    { name: 'Letícia', role: 'Aux. Padaria', sector: 'PADARIA', salary: 1850, admission_date: '2022-06-15', vacation_start: '2026-07-10', vacation_end: '2026-07-24', notes: '', show_salary: true, show_vacation: true, show_notes: false },
    { name: 'Francisca', role: 'Aux. Padaria', sector: 'PADARIA', salary: 1850, admission_date: '2021-09-01', vacation_start: '2026-09-20', vacation_end: '2026-10-04', notes: '', show_salary: true, show_vacation: true, show_notes: false },
    { name: 'Andreison', role: 'Padeiro', sector: 'PADARIA', salary: 2800, admission_date: '2019-01-20', vacation_start: '2026-05-05', vacation_end: '2026-05-19', notes: 'Especialista em pães artesanais', show_salary: true, show_vacation: true, show_notes: true },
    { name: 'Viviane', role: 'Aux. Padaria', sector: 'PADARIA', salary: 1850, admission_date: '2023-04-10', vacation_start: '2026-11-12', vacation_end: '2026-11-26', notes: '', show_salary: true, show_vacation: true, show_notes: false },

    // ROTISSERIA (6)
    { name: 'Dejanira', role: 'Cozinheira', sector: 'ROTISSERIA', salary: 2600, admission_date: '2018-08-05', vacation_start: '2026-04-08', vacation_end: '2026-04-22', notes: 'Cozinheira chefe da rotisseria', show_salary: true, show_vacation: true, show_notes: true },
    { name: 'Marlene', role: 'Cozinha Jr', sector: 'ROTISSERIA', salary: 2100, admission_date: '2021-02-14', vacation_start: '2026-06-22', vacation_end: '2026-07-06', notes: '', show_salary: true, show_vacation: true, show_notes: false },
    { name: 'Elaine', role: 'Cozinha Jr', sector: 'ROTISSERIA', salary: 2100, admission_date: '2022-11-08', vacation_start: '2026-08-14', vacation_end: '2026-08-28', notes: '', show_salary: true, show_vacation: true, show_notes: false },
    { name: 'Maria', role: 'Aux. Cozinha', sector: 'ROTISSERIA', salary: 1750, admission_date: '2020-07-20', vacation_start: '2026-02-28', vacation_end: '2026-03-14', notes: '', show_salary: true, show_vacation: true, show_notes: false },
    { name: 'Erica', role: 'Aux. de Cozinha', sector: 'ROTISSERIA', salary: 1750, admission_date: '2023-01-10', vacation_start: '2026-10-05', vacation_end: '2026-10-19', notes: '', show_salary: true, show_vacation: true, show_notes: false },
    { name: 'Mansur', role: 'Aux. Senior', sector: 'ROTISSERIA', salary: 2300, admission_date: '2019-05-15', vacation_start: '2026-12-18', vacation_end: '2027-01-01', notes: 'Experiência em fritura', show_salary: true, show_vacation: true, show_notes: true },

    // PICADINHO (3)
    { name: 'Evelin', role: 'Aux. de Cozinha', sector: 'PICADINHO', salary: 1750, admission_date: '2021-11-22', vacation_start: '2026-03-30', vacation_end: '2026-04-13', notes: '', show_salary: true, show_vacation: true, show_notes: false },
    { name: 'Gisele', role: 'Aux. de Cozinha', sector: 'PICADINHO', salary: 1750, admission_date: '2022-03-05', vacation_start: '2026-07-25', vacation_end: '2026-08-08', notes: '', show_salary: true, show_vacation: true, show_notes: false },
    { name: 'Lidiane', role: 'Aux. de Cozinha', sector: 'PICADINHO', salary: 1750, admission_date: '2020-10-18', vacation_start: '2026-09-10', vacation_end: '2026-09-24', notes: '', show_salary: true, show_vacation: true, show_notes: false },

    // LIMPEZA (1)
    { name: 'Verinha', role: 'Feiras', sector: 'LIMPEZA', salary: 1650, admission_date: '2017-06-01', vacation_start: '2026-05-18', vacation_end: '2026-06-01', notes: 'Responsável pelas compras de feira', show_salary: true, show_vacation: true, show_notes: true },

    // GERENTE (2)
    { name: 'Daniel', role: '1º Gerente', sector: 'GERENTE', salary: 5500, admission_date: '2015-01-15', vacation_start: '2026-01-20', vacation_end: '2026-02-03', notes: 'Gerente principal', show_salary: true, show_vacation: true, show_notes: true },
    { name: 'Gabriela', role: '2º Gerente', sector: 'GERENTE', salary: 4200, admission_date: '2018-04-10', vacation_start: '2026-06-15', vacation_end: '2026-06-29', notes: 'Supervisora de operações', show_salary: true, show_vacation: true, show_notes: true },

    // EXPEDICAO (2)
    { name: 'Maurício', role: '1º Expedição', sector: 'EXPEDICAO', salary: 2400, admission_date: '2019-09-08', vacation_start: '2026-04-22', vacation_end: '2026-05-06', notes: 'Líder da expedição', show_salary: true, show_vacation: true, show_notes: true },
    { name: 'Alexandre', role: 'Extra', sector: 'EXPEDICAO', salary: 1800, admission_date: '2023-07-20', vacation_start: '2026-08-30', vacation_end: '2026-09-13', notes: '', show_salary: true, show_vacation: true, show_notes: false },

    // EXTRAS COZINHA (3)
    { name: 'Ilda', role: 'Cozinheira', sector: 'EXTRAS COZINHA', salary: 2600, admission_date: '2016-02-28', vacation_start: '2026-02-10', vacation_end: '2026-02-24', notes: 'Especialista em sobremesas', show_salary: true, show_vacation: true, show_notes: true },
    { name: 'Denise', role: 'Aux. de Cozinha', sector: 'EXTRAS COZINHA', salary: 1750, admission_date: '2022-08-15', vacation_start: '2026-11-28', vacation_end: '2026-12-12', notes: '', show_salary: true, show_vacation: true, show_notes: false },
    { name: 'Erica S.', role: 'Aux. Limpeza', sector: 'EXTRAS COZINHA', salary: 1650, admission_date: '2021-05-03', vacation_start: '2026-10-15', vacation_end: '2026-10-29', notes: '', show_salary: true, show_vacation: true, show_notes: false }
];

async function clearExistingEmployees() {
    console.log('🗑️  Removendo funcionários existentes...');
    const snapshot = await getDocs(collection(db, 'Employee'));
    let count = 0;
    for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'Employee', docSnap.id));
        count++;
    }
    console.log(`   Removidos ${count} funcionários.`);
}

async function seedEmployees() {
    console.log('\n🌱 Iniciando seed de funcionários com dados completos...\n');

    // Limpar dados existentes
    await clearExistingEmployees();

    console.log('\n📝 Cadastrando funcionários...\n');

    let successCount = 0;
    let totalSalary = 0;

    for (const emp of employees) {
        try {
            const docRef = await addDoc(collection(db, 'Employee'), {
                ...emp,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`   ✅ ${emp.name} (${emp.sector}) - R$ ${emp.salary.toLocaleString('pt-BR')} - Admissão: ${emp.admission_date} - Férias: ${emp.vacation_start} a ${emp.vacation_end}`);
            successCount++;
            totalSalary += emp.salary;
        } catch (error) {
            console.error(`   ❌ Erro ao cadastrar ${emp.name}:`, error.message);
        }
    }

    console.log(`\n✅ Seed concluído! ${successCount}/${employees.length} funcionários cadastrados.`);
    console.log(`💰 Custo total de mão de obra: R$ ${totalSalary.toLocaleString('pt-BR')}`);
    process.exit(0);
}

seedEmployees().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
});
