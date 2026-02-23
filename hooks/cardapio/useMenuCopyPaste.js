import { useState, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { WeeklyMenu as WeeklyMenuEntity } from "@/app/api/entities";
import { APP_CONSTANTS } from "@/lib/constants";
import { getWeekInfo } from "../shared/weekUtils";
import { addWeeks } from "date-fns";

/**
 * Hook para copiar/colar cardápio entre semanas.
 * 
 * Suporta:
 * - Copiar um dia para a próxima semana
 * - Copiar a semana inteira para a próxima semana
 * - Desfazer colagem (dia ou semana)
 * - Verificar se um dia/semana foi colado
 */
export const useMenuCopyPaste = () => {
    const { toast } = useToast();
    const [copying, setCopying] = useState(false);

    // ─── Helpers ───────────────────────────────────────────────

    const getOrCreateMenu = async (date) => {
        const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
        const { weekKey, weekStart } = getWeekInfo(date);

        const existing = await WeeklyMenuEntity.query([
            { field: 'user_id', operator: '==', value: mockUserId },
            { field: 'week_key', operator: '==', value: weekKey }
        ]);

        if (existing && existing.length > 0) return existing[0];

        // Criar novo menu vazio
        const newMenu = await WeeklyMenuEntity.create({
            user_id: mockUserId,
            week_key: weekKey,
            week_start: weekStart,
            menu_data: {}
        });
        return newMenu;
    };

    const getNextWeekDate = (currentDate) => addWeeks(currentDate, 1);

    // ─── Copiar Dia ────────────────────────────────────────────

    const copyDayToNextWeek = useCallback(async (weeklyMenu, currentDate, dayIndex) => {
        if (!weeklyMenu?.menu_data) {
            toast({ title: "Sem dados", description: "Não há cardápio para copiar neste dia.", variant: "destructive" });
            return null;
        }

        try {
            setCopying(true);
            const nextWeekDate = getNextWeekDate(currentDate);
            const targetMenu = await getOrCreateMenu(nextWeekDate);

            // Deep clone
            const targetMenuData = targetMenu.menu_data ? JSON.parse(JSON.stringify(targetMenu.menu_data)) : {};

            // Backup antes de colar (para undo)
            const pasteBackup = targetMenuData._paste_backup || {};
            const pasteInfo = targetMenuData._paste_info || {};

            // Copiar TODOS os mealTypes para esse dayIndex
            const sourceData = weeklyMenu.menu_data;
            let copiedSomething = false;

            Object.keys(sourceData).forEach(mealType => {
                if (mealType.startsWith('_')) return; // skip metadata keys
                const dayData = sourceData[mealType]?.[dayIndex];
                if (dayData && Object.keys(dayData).length > 0) {
                    // Backup do destino antes de colar
                    if (!pasteBackup[mealType]) pasteBackup[mealType] = {};
                    pasteBackup[mealType][dayIndex] = targetMenuData[mealType]?.[dayIndex]
                        ? JSON.parse(JSON.stringify(targetMenuData[mealType][dayIndex]))
                        : null;

                    // Colar
                    if (!targetMenuData[mealType]) targetMenuData[mealType] = {};
                    targetMenuData[mealType][dayIndex] = JSON.parse(JSON.stringify(dayData));
                    copiedSomething = true;
                }
            });

            if (!copiedSomething) {
                toast({ title: "Dia vazio", description: "Não há itens neste dia para copiar.", variant: "destructive" });
                setCopying(false);
                return null;
            }

            // Marcar como colado
            pasteInfo[dayIndex] = {
                pasted: true,
                pasted_at: new Date().toISOString(),
                source_week: getWeekInfo(currentDate).weekKey
            };

            targetMenuData._paste_info = pasteInfo;
            targetMenuData._paste_backup = pasteBackup;

            await WeeklyMenuEntity.update(targetMenu.id, { menu_data: targetMenuData });

            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const nextWeekInfo = getWeekInfo(nextWeekDate);

            toast({
                title: "✅ Dia copiado!",
                description: `${dayNames[dayIndex]} copiado para Semana ${nextWeekInfo.weekNumber}.`,
            });

            return { targetMenu: { ...targetMenu, menu_data: targetMenuData }, weekKey: nextWeekInfo.weekKey };
        } catch (error) {
            console.error('❌ Erro ao copiar dia:', error);
            toast({ title: "Erro", description: "Não foi possível copiar o dia.", variant: "destructive" });
            return null;
        } finally {
            setCopying(false);
        }
    }, [toast]);

    // ─── Copiar Semana ─────────────────────────────────────────

    const copyWeekToNextWeek = useCallback(async (weeklyMenu, currentDate) => {
        if (!weeklyMenu?.menu_data) {
            toast({ title: "Sem dados", description: "Não há cardápio para copiar nesta semana.", variant: "destructive" });
            return null;
        }

        try {
            setCopying(true);
            const nextWeekDate = getNextWeekDate(currentDate);
            const targetMenu = await getOrCreateMenu(nextWeekDate);

            // Deep clone
            const targetMenuData = targetMenu.menu_data ? JSON.parse(JSON.stringify(targetMenu.menu_data)) : {};
            const sourceData = weeklyMenu.menu_data;

            // Backup completo antes de colar
            const pasteBackup = {};
            const pasteInfo = {};

            Object.keys(sourceData).forEach(mealType => {
                if (mealType.startsWith('_')) return;
                const mealTypeData = sourceData[mealType];
                if (!mealTypeData || typeof mealTypeData !== 'object') return;

                // Backup do target inteiro para este mealType
                pasteBackup[mealType] = targetMenuData[mealType]
                    ? JSON.parse(JSON.stringify(targetMenuData[mealType]))
                    : null;

                // Copiar
                targetMenuData[mealType] = JSON.parse(JSON.stringify(mealTypeData));

                // Marcar todos os dias como colados
                Object.keys(mealTypeData).forEach(dayIdx => {
                    pasteInfo[dayIdx] = {
                        pasted: true,
                        pasted_at: new Date().toISOString(),
                        source_week: getWeekInfo(currentDate).weekKey
                    };
                });
            });

            targetMenuData._paste_info = pasteInfo;
            targetMenuData._paste_backup = pasteBackup;

            await WeeklyMenuEntity.update(targetMenu.id, { menu_data: targetMenuData });

            const nextWeekInfo = getWeekInfo(nextWeekDate);

            toast({
                title: "✅ Semana copiada!",
                description: `Cardápio inteiro copiado para Semana ${nextWeekInfo.weekNumber}.`,
            });

            return { targetMenu: { ...targetMenu, menu_data: targetMenuData }, weekKey: nextWeekInfo.weekKey };
        } catch (error) {
            console.error('❌ Erro ao copiar semana:', error);
            toast({ title: "Erro", description: "Não foi possível copiar a semana.", variant: "destructive" });
            return null;
        } finally {
            setCopying(false);
        }
    }, [toast]);

    // ─── Desfazer Dia ──────────────────────────────────────────

    const undoPastedDay = useCallback(async (weeklyMenu, dayIndex) => {
        if (!weeklyMenu?.menu_data?._paste_backup || !weeklyMenu?.menu_data?._paste_info?.[dayIndex]) {
            toast({ title: "Nada para desfazer", description: "Este dia não foi colado.", variant: "destructive" });
            return null;
        }

        try {
            setCopying(true);
            const menuData = JSON.parse(JSON.stringify(weeklyMenu.menu_data));
            const backup = menuData._paste_backup;

            // Restaurar backup para cada mealType neste dia
            Object.keys(backup).forEach(mealType => {
                if (mealType.startsWith('_')) return;
                if (backup[mealType]?.[dayIndex] !== undefined) {
                    if (!menuData[mealType]) menuData[mealType] = {};
                    if (backup[mealType][dayIndex] === null) {
                        delete menuData[mealType][dayIndex];
                    } else {
                        menuData[mealType][dayIndex] = backup[mealType][dayIndex];
                    }
                }
            });

            // Remover marcação de colado
            delete menuData._paste_info[dayIndex];

            // Se não há mais nenhum dia colado, limpar backup
            if (Object.keys(menuData._paste_info).length === 0) {
                delete menuData._paste_info;
                delete menuData._paste_backup;
            }

            await WeeklyMenuEntity.update(weeklyMenu.id, { menu_data: menuData });

            toast({ title: "↩ Colagem desfeita", description: "O dia foi restaurado ao estado anterior." });

            return { ...weeklyMenu, menu_data: menuData };
        } catch (error) {
            console.error('❌ Erro ao desfazer:', error);
            toast({ title: "Erro", description: "Não foi possível desfazer.", variant: "destructive" });
            return null;
        } finally {
            setCopying(false);
        }
    }, [toast]);

    // ─── Desfazer Semana ───────────────────────────────────────

    const undoPastedWeek = useCallback(async (weeklyMenu) => {
        if (!weeklyMenu?.menu_data?._paste_backup) {
            toast({ title: "Nada para desfazer", description: "Esta semana não foi colada.", variant: "destructive" });
            return null;
        }

        try {
            setCopying(true);
            const menuData = JSON.parse(JSON.stringify(weeklyMenu.menu_data));
            const backup = menuData._paste_backup;

            // Restaurar todos os mealTypes do backup
            Object.keys(backup).forEach(mealType => {
                if (mealType.startsWith('_')) return;
                if (backup[mealType] === null) {
                    delete menuData[mealType];
                } else {
                    menuData[mealType] = backup[mealType];
                }
            });

            // Limpar metadados
            delete menuData._paste_info;
            delete menuData._paste_backup;

            await WeeklyMenuEntity.update(weeklyMenu.id, { menu_data: menuData });

            toast({ title: "↩ Semana restaurada", description: "Todo o cardápio colado foi desfeito." });

            return { ...weeklyMenu, menu_data: menuData };
        } catch (error) {
            console.error('❌ Erro ao desfazer semana:', error);
            toast({ title: "Erro", description: "Não foi possível desfazer.", variant: "destructive" });
            return null;
        } finally {
            setCopying(false);
        }
    }, [toast]);

    // ─── Info helpers ──────────────────────────────────────────

    const isDayPasted = useCallback((weeklyMenu, dayIndex) => {
        return !!weeklyMenu?.menu_data?._paste_info?.[dayIndex]?.pasted;
    }, []);

    const isAnyDayPasted = useCallback((weeklyMenu) => {
        const info = weeklyMenu?.menu_data?._paste_info;
        if (!info) return false;
        return Object.values(info).some(v => v?.pasted);
    }, []);

    const getPasteSource = useCallback((weeklyMenu, dayIndex) => {
        return weeklyMenu?.menu_data?._paste_info?.[dayIndex]?.source_week || null;
    }, []);

    return {
        copying,
        copyDayToNextWeek,
        copyWeekToNextWeek,
        undoPastedDay,
        undoPastedWeek,
        isDayPasted,
        isAnyDayPasted,
        getPasteSource
    };
};
