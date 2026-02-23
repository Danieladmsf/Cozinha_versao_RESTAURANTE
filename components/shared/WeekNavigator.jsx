'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, getWeek, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

/**
 * WeekNavigator - Componente centralizado para navegação entre semanas
 * 
 * @param {Date} currentDate - Data atual da semana
 * @param {number} weekNumber - Número da semana (opcional, calculado se não fornecido)
 * @param {Function} onNavigateWeek - Callback para navegação (-1 = anterior, +1 = próxima)
 * @param {Function} onDateChange - Callback para mudança de data via calendário (opcional)
 * @param {boolean} showCalendar - Se deve mostrar popover com calendário (default: true)
 * @param {string} weekRange - 'workdays' (Seg-Sex 5 dias) | 'full' (Dom-Sáb 7 dias) (default: 'full')
 */
export default function WeekNavigator({
    currentDate,
    weekNumber: externalWeekNumber,
    onNavigateWeek,
    onDateChange,
    showCalendar = true,
    weekRange = 'full'
}) {
    const weekNumber = externalWeekNumber ?? getWeek(currentDate, { weekStartsOn: 1 });

    // Determinar início da semana baseado no weekRange
    const weekStartsOn = weekRange === 'workdays' ? 1 : 0; // 1 = Segunda, 0 = Domingo
    const weekStart = startOfWeek(currentDate, { weekStartsOn });

    // Formatar intervalo de datas da semana
    const formatWeekRange = () => {
        const firstDay = weekStart;
        const daysToAdd = weekRange === 'workdays' ? 4 : 6; // 4 = até sexta, 6 = até sábado
        const lastDay = addDays(weekStart, daysToAdd);
        return `${format(firstDay, 'dd/MM')} - ${format(lastDay, 'dd/MM')}`;
    };

    // Handler para navegação via botões
    const handleNavigate = (direction) => {
        if (onNavigateWeek) {
            onNavigateWeek(direction);
        } else if (onDateChange) {
            // Fallback: usar onDateChange se onNavigateWeek não foi passado
            const newDate = direction > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
            onDateChange(newDate);
        }
    };

    const handleCalendarSelect = (date) => {
        if (onDateChange) {
            onDateChange(date);
        }
    };

    const CenterContent = () => (
        <div className="h-14 w-[200px] px-4 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 justify-center">
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-gray-800 text-sm">Semana {weekNumber}</span>
            </div>
            <p className="text-xs text-gray-500 font-medium leading-none mt-0.5">{formatWeekRange()}</p>
        </div>
    );

    return (
        <div className="flex items-center justify-center gap-4">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate(-1)}
                className="h-14 w-14 rounded-full hover:bg-gray-100 border border-gray-200"
            >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
            </Button>

            {showCalendar && onDateChange ? (
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="cursor-pointer hover:opacity-80 transition-opacity outline-none inline-flex items-center self-center p-0 m-0 border-none bg-transparent">
                            <CenterContent />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={currentDate}
                            onSelect={handleCalendarSelect}
                            locale={ptBR}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            ) : (
                <CenterContent />
            )}

            <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate(1)}
                className="h-14 w-14 rounded-full hover:bg-gray-100 border border-gray-200"
            >
                <ChevronRight className="w-5 h-5 text-gray-600" />
            </Button>
        </div>
    );
}

