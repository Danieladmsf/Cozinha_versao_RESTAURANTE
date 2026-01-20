'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Mapeamento dos nomes dos dias em português
 */
const dayNames = {
    0: "Domingo",
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta",
    6: "Sábado"
};

/**
 * WeekDaySelector - Componente centralizado para seleção de dias da semana
 * 
 * @param {Date} currentDate - Data de referência para a semana
 * @param {number} currentDayIndex - Índice do dia selecionado (0-6, 0=Domingo)
 * @param {number[]} availableDays - Array de dias disponíveis para seleção (default: todos)
 * @param {Function} onDayChange - Callback quando um dia é selecionado
 * @param {Object[]} weekDays - Array opcional de objetos de dias (se já calculados externamente)
 */
export default function WeekDaySelector({
    currentDate,
    currentDayIndex,
    availableDays = [0, 1, 2, 3, 4, 5, 6],
    onDayChange,
    weekDays: externalWeekDays
}) {
    // Começar a semana no domingo (weekStartsOn: 0)
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

    // Ordenar os dias disponíveis
    const sortedDays = [...availableDays].sort((a, b) => a - b);

    // Usar weekDays externos se fornecidos, senão calcular
    const weekDays = externalWeekDays || sortedDays.map(dayNum => {
        const date = addDays(weekStart, dayNum);
        return {
            dayNumber: dayNum,
            date,
            dayName: format(date, 'EEEE', { locale: ptBR }),
            dayShort: format(date, 'EEE', { locale: ptBR }),
            dayDate: format(date, 'dd/MM'),
            fullDate: format(date, 'dd/MM/yyyy')
        };
    });

    // Determinar número de colunas do grid baseado na quantidade de dias
    const getGridCols = (numDays) => {
        if (numDays <= 3) return 'grid-cols-3';
        if (numDays === 4) return 'grid-cols-4';
        if (numDays === 5) return 'grid-cols-5';
        if (numDays === 6) return 'grid-cols-6';
        return 'grid-cols-7';
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
            <div className={cn("grid divide-x divide-gray-100", getGridCols(weekDays.length))}>
                {weekDays.map(day => {
                    const dayIndex = day.dayNumber;
                    const isSelected = currentDayIndex === dayIndex;
                    const dayDate = day.date;

                    return (
                        <button
                            key={dayIndex}
                            onClick={() => onDayChange(dayIndex)}
                            className={cn(
                                "py-4 px-2 sm:px-4 relative group transition-all duration-200 hover:bg-gray-50 min-w-0 min-h-[100px]",
                                isSelected && "bg-blue-50"
                            )}
                        >
                            <div className="flex flex-col items-center justify-center space-y-1 h-full">
                                {/* Nome do dia */}
                                <span className={cn(
                                    "text-xs sm:text-sm font-medium transition-colors truncate",
                                    isSelected ? "text-blue-600" : "text-gray-600"
                                )}>
                                    {dayNames[dayIndex]}
                                </span>

                                {/* Número do dia */}
                                <span className={cn(
                                    "text-2xl sm:text-3xl font-bold transition-colors",
                                    isSelected ? "text-blue-600" : "text-gray-900"
                                )}>
                                    {format(dayDate, 'dd')}
                                </span>

                                {/* Mês abreviado */}
                                <span className="text-xs text-gray-500 uppercase tracking-wide">
                                    {format(dayDate, 'MMM', { locale: ptBR })}
                                </span>
                            </div>

                            {/* Indicador de seleção */}
                            {isSelected && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
