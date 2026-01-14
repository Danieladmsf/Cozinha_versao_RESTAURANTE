import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function DatePicker({
  selected,
  onChange,
  placeholder = "Selecione uma data",
  className,
  ...props
}) {
  const [isClient, setIsClient] = useState(false);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Garantir que selected seja uma instância válida de Date, sem ajuste de timezone
  const ensureValidDate = (date) => {
    if (!date) return undefined;

    if (typeof date === 'string') {
      // Se for string no formato ISO, criar objeto Date sem ajuste de timezone
      if (date.includes('T')) {
        return new Date(date);
      }

      // Se for string no formato YYYY-MM-DD, criar um Date às 12h (meio-dia)
      // para evitar problemas de timezone
      const [year, month, day] = date.split('-').map(Number);
      const newDate = new Date();
      newDate.setFullYear(year);
      newDate.setMonth(month - 1);
      newDate.setDate(day);
      newDate.setHours(12, 0, 0, 0);
      return newDate;
    }

    // Se já for Date, usar como está
    return date;
  };

  const selectedDate = ensureValidDate(selected);

  useEffect(() => {
    if (open) {
      setMonth(selectedDate || new Date());
    }
  }, [open, selectedDate]);

  // Manipulador personalizado para garantir consistência nas datas
  const handleDateChange = (date) => {
    if (!date) {
      onChange(null);
      return;
    }

    // Criar uma cópia da data às 12h (meio-dia) para evitar problemas de timezone
    const newDate = new Date(date);
    newDate.setHours(12, 0, 0, 0);

    // Formatar como string YYYY-MM-DD
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // Chamamos o callback com a string formatada
    onChange(dateString);

    // Fechar o popover após selecionar
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate && isClient ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateChange}
          month={month}
          onMonthChange={setMonth}
          locale={ptBR}
          initialFocus
          {...props}
        />
        <div className="border-t border-border p-3 bg-slate-50">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8"
            onClick={() => {
              handleDateChange(new Date());
            }}
          >
            Ir para hoje
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
