/**
 * API Route temporária para atualizar escalas de funcionários
 * Acesse: /api/update-schedules para executar
 */

import { Employee } from '../entities';

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

// Funcionários que trabalham sábado (incluindo variações com acento)
const TRABALHAM_SABADO = ['Leticia', 'Letícia', 'Francisca'];

export async function GET(request) {
    try {
        // Listar todos os funcionários
        const employees = await Employee.list();

        const results = [];

        for (const emp of employees) {
            // Verificar se trabalha sábado (pelo primeiro nome)
            const firstName = emp.name?.split(' ')[0] || '';
            const trabalhaSabado = TRABALHAM_SABADO.some(nome =>
                firstName.toLowerCase().includes(nome.toLowerCase())
            );

            const escala = trabalhaSabado ? ESCALA_COM_SABADO : ESCALA_PADRAO;

            // Atualizar no Firestore
            await Employee.update(emp.id, {
                work_start: escala.work_start,
                lunch_start: escala.lunch_start,
                lunch_end: escala.lunch_end,
                work_end: escala.work_end,
                work_days: escala.work_days
            });

            const diasStr = trabalhaSabado ? 'Seg-Sáb' : 'Seg-Sex';
            results.push({
                name: emp.name,
                schedule: `${escala.work_start}-${escala.work_end}`,
                days: diasStr,
                trabalhaSabado
            });
        }

        return Response.json({
            success: true,
            message: `${results.length} funcionários atualizados`,
            details: results
        });

    } catch (error) {
        console.error('Erro ao atualizar escalas:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
