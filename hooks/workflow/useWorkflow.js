'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Employee, DailyAssignment, CategoryTree, MenuConfig, WeeklyMenu as WeeklyMenuEntity } from '@/app/api/entities';
import { useToast } from '@/components/ui/use-toast';
import { useProgramacaoRealtimeData } from '@/hooks/programacao/useProgramacaoRealtimeData';
import { APP_CONSTANTS } from '@/lib/constants';

// Setores disponíveis
export const SECTORS = [
    { id: 'PADARIA', name: 'Padaria', color: '#f59e0b' },
    { id: 'ROTISSERIA', name: 'Rotisseria', color: '#ef4444' },
    { id: 'PICADINHO', name: 'Picadinho', color: '#8b5cf6' },
    { id: 'LIMPEZA', name: 'Limpeza', color: '#3b82f6' },
    { id: 'GERENTE', name: 'Gerência', color: '#22c55e' },
    { id: 'EXPEDICAO', name: 'Expedição', color: '#06b6d4' },
    { id: 'EXTRAS COZINHA', name: 'Extras Cozinha', color: '#ec4899' }
];

// Timeline hours (05:00-14:00)
export const TIMELINE_HOURS = Array.from({ length: 10 }, (_, i) => {
    const hour = i + 5;
    return { hour, label: `${String(hour).padStart(2, '0')}:00` };
});

export const TIMELINE_START = 5; // 05:00
export const TIMELINE_END = 14;  // 14:00
export const TIMELINE_MINUTES = (TIMELINE_END - TIMELINE_START) * 60; // 540 min

// Mapear categorias → setor
const CATEGORY_TO_SECTOR = {
    'rotisseria': 'ROTISSERIA',
    'padaria': 'PADARIA',
    'picadinho': 'PICADINHO',
    'salada': 'PICADINHO',
    'confeitaria': 'PADARIA',
    'acougue': 'ROTISSERIA',
    'sobremesa': 'PADARIA',
    'embalagem': 'EXPEDICAO',
    'processado': 'PICADINHO',
    'acompanhamento': 'PICADINHO',
};

export function useWorkflow() {
    const { toast } = useToast();

    // ===== PROGRAMAÇÃO REAL-TIME (mesma fonte que Programação de Produção) =====
    const {
        currentDate,
        weekDays,
        weekNumber,
        year,
        loading: programacaoLoading,
        connectionStatus,
        recipes: allRecipes,
        orders,
        navigateWeek
    } = useProgramacaoRealtimeData();

    // ===== STATES =====
    const [employees, setEmployees] = useState([]);
    const [categories, setCategories] = useState([]);
    const [categoryMap, setCategoryMap] = useState({});
    const [menuConfig, setMenuConfig] = useState(null);
    const [weeklyMenu, setWeeklyMenu] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [selectedDay, setSelectedDay] = useState(1); // 0=dom, 1=seg
    const [activeSector, setActiveSector] = useState(null);
    const [loadingExtra, setLoadingExtra] = useState(true);

    const loading = programacaoLoading.initial || programacaoLoading.orders || loadingExtra;

    // ===== LOAD EMPLOYEES + CATEGORIES + CONFIG =====
    useEffect(() => {
        const loadExtraData = async () => {
            try {
                setLoadingExtra(true);
                const mockUserId = APP_CONSTANTS?.MOCK_USER_ID || 'mock-user-id';

                const [employeesData, categoriesData, configData] = await Promise.all([
                    Employee.list(),
                    CategoryTree.list(),
                    MenuConfig.query([{ field: 'user_id', operator: '==', value: mockUserId }])
                ]);

                setEmployees(employeesData || []);
                setCategories(categoriesData || []);
                setMenuConfig(configData?.[0] || null);

                // Build category map (same as ProgramacaoCozinhaTabs)
                const map = {};
                if (categoriesData) {
                    categoriesData.forEach(cat => {
                        if (cat.level === 1) {
                            map[cat.id] = cat;
                            map[cat.name.toLowerCase()] = cat;
                        } else if (cat.parent_id) {
                            const parent = categoriesData.find(p => p.id === cat.parent_id);
                            if (parent) {
                                map[cat.id] = parent;
                                map[cat.name.toLowerCase()] = parent;
                            }
                        }
                    });
                }
                setCategoryMap(map);
            } catch (error) {
                console.error('Erro ao carregar dados extras:', error);
            } finally {
                setLoadingExtra(false);
            }
        };
        loadExtraData();
    }, []);

    // ===== LOAD ASSIGNMENTS quando muda semana =====
    useEffect(() => {
        const loadAssignments = async () => {
            try {
                const assignmentsData = await DailyAssignment.query([
                    { field: 'week_number', operator: '==', value: weekNumber },
                    { field: 'year', operator: '==', value: year }
                ]);
                setAssignments(assignmentsData || []);
            } catch (error) {
                console.error('Erro ao carregar assignments:', error);
            }
        };
        if (weekNumber && year) {
            loadAssignments();
        }
    }, [weekNumber, year]);

    // ===== LOAD WEEKLY MENU (Ordem de Produção) =====
    useEffect(() => {
        const loadWeeklyMenu = async () => {
            try {
                const mockUserId = APP_CONSTANTS?.MOCK_USER_ID || 'mock-user-id';
                const weekKey = `${year}-W${weekNumber}`;
                console.log('📅 [useWorkflow] Loading WeeklyMenu for', weekKey);
                const menus = await WeeklyMenuEntity.query([
                    { field: 'user_id', operator: '==', value: mockUserId },
                    { field: 'week_key', operator: '==', value: weekKey }
                ]);
                if (menus && menus.length > 0) {
                    console.log('✅ [useWorkflow] WeeklyMenu found, days:', menus[0].menu_data ? Object.keys(menus[0].menu_data).length : 0);
                    setWeeklyMenu(menus[0]);
                } else {
                    console.log('⚠️ [useWorkflow] No WeeklyMenu for this week');
                    setWeeklyMenu(null);
                }
            } catch (error) {
                console.error('Erro ao carregar WeeklyMenu:', error);
                setWeeklyMenu(null);
            }
        };
        if (weekNumber && year) {
            loadWeeklyMenu();
        }
    }, [weekNumber, year]);

    // ===== EXTRACT RECIPES FROM ORDERS + WEEKLY MENU =====
    // Receitas de um dia (dos pedidos E da Ordem de Produção)
    const getRecipesForDay = useCallback((dayIndex) => {
        const recipesMap = new Map(); // key: recipe_id

        // --- SOURCE 1: WeeklyMenu (Ordem de Produção) ---
        if (weeklyMenu?.menu_data) {
            const menuData = weeklyMenu.menu_data;
            // menu_data pode ter estrutura [mealType][dayIndex][categoryId] ou [dayIndex][categoryId]
            const processMenuDay = (dayData) => {
                if (!dayData || typeof dayData !== 'object') return;
                Object.entries(dayData).forEach(([categoryId, items]) => {
                    if (!Array.isArray(items)) return;
                    items.forEach(item => {
                        if (!item?.recipe_id) return;
                        const recipe = allRecipes.find(r => r.id === item.recipe_id);
                        if (!recipe) return;
                        if (recipesMap.has(item.recipe_id)) return; // Avoid duplicates

                        let mainCategory = null;
                        if (recipe.category_id && categoryMap[recipe.category_id]) {
                            mainCategory = categoryMap[recipe.category_id];
                        } else if (recipe.category?.id && categoryMap[recipe.category.id]) {
                            mainCategory = categoryMap[recipe.category.id];
                        } else if (typeof recipe.category === 'string' && categoryMap[recipe.category.toLowerCase()]) {
                            mainCategory = categoryMap[recipe.category.toLowerCase()];
                        }
                        // Also try the categoryId from menu_data
                        if (!mainCategory && categoryMap[categoryId]) {
                            mainCategory = categoryMap[categoryId];
                        }

                        const categoryLabel = mainCategory?.name
                            || (typeof recipe.category === 'string' ? recipe.category : recipe.category?.name)
                            || 'Sem categoria';

                        recipesMap.set(item.recipe_id, {
                            recipe_id: item.recipe_id,
                            recipe_name: recipe.name || 'Sem nome',
                            recipe,
                            category: mainCategory,
                            category_id: recipe.category_id || recipe.category?.id || mainCategory?.id,
                            category_name: categoryLabel,
                            totalQuantity: item.quantity || 0,
                            unit_type: item.unit_type || recipe.unit_type || '',
                            customers: [],
                            source: 'menu'
                        });
                    });
                });
            };

            // Try each mealType group (PRODUTOS, CONFEITÁRIA, etc.)
            let foundMealTypes = false;
            Object.entries(menuData).forEach(([key, value]) => {
                if (value && typeof value === 'object' && value[dayIndex]) {
                    foundMealTypes = true;
                    processMenuDay(value[dayIndex]);
                }
            });
            // Fallback: try direct dayIndex access
            if (!foundMealTypes && menuData[dayIndex]) {
                processMenuDay(menuData[dayIndex]);
            }
        }

        // --- SOURCE 2: Orders (pedidos com quantidades por cliente) ---
        const dayOrders = orders.filter(order => order.day_of_week === dayIndex);
        console.log('🔍 [getRecipesForDay] dayIndex:', dayIndex, 'menu recipes:', recipesMap.size, 'orders:', dayOrders.length);

        dayOrders.forEach(order => {
            order.items?.forEach(item => {
                if (!item.recipe_id) return;
                const recipe = allRecipes.find(r => r.id === item.recipe_id);
                if (!recipe) return;

                const existing = recipesMap.get(item.recipe_id);
                if (existing) {
                    existing.totalQuantity += (item.quantity || 0);
                    existing.customers.push({
                        name: order.customer_name,
                        quantity: item.quantity || 0,
                        unit_type: item.unit_type || recipe.unit_type
                    });
                } else {
                    // Resolve main category
                    let mainCategory = null;
                    if (recipe.category_id && categoryMap[recipe.category_id]) {
                        mainCategory = categoryMap[recipe.category_id];
                    } else if (recipe.category?.id && categoryMap[recipe.category.id]) {
                        mainCategory = categoryMap[recipe.category.id];
                    } else if (typeof recipe.category === 'string' && categoryMap[recipe.category.toLowerCase()]) {
                        mainCategory = categoryMap[recipe.category.toLowerCase()];
                    }

                    const categoryLabel = mainCategory?.name
                        || (typeof recipe.category === 'string' ? recipe.category : recipe.category?.name)
                        || 'Sem categoria';

                    recipesMap.set(item.recipe_id, {
                        recipe_id: item.recipe_id,
                        recipe_name: recipe.name || 'Sem nome',
                        recipe,
                        category: mainCategory,
                        category_id: recipe.category_id || recipe.category?.id || mainCategory?.id,
                        category_name: categoryLabel,
                        totalQuantity: item.quantity || 0,
                        unit_type: item.unit_type || recipe.unit_type || '',
                        customers: [{
                            name: order.customer_name,
                            quantity: item.quantity || 0,
                            unit_type: item.unit_type || recipe.unit_type
                        }]
                    });
                }
            });
        });

        return Array.from(recipesMap.values());
    }, [orders, allRecipes, categoryMap, weeklyMenu]);

    // Receitas do dia atual (produção)
    const todayRecipes = useMemo(() => getRecipesForDay(selectedDay), [getRecipesForDay, selectedDay]);

    // Receitas do dia seguinte (pré-preparo)
    const tomorrowDay = selectedDay >= 6 ? 0 : selectedDay + 1;
    const tomorrowRecipes = useMemo(() => getRecipesForDay(tomorrowDay), [getRecipesForDay, tomorrowDay]);

    // Guess sector from category (using config map if available)
    const guessSector = useCallback((recipe) => {
        // Obter categoria principal (Level 1)
        let mainCategory = null;
        if (recipe.category_id && categoryMap[recipe.category_id]) {
            mainCategory = categoryMap[recipe.category_id];
        } else if (recipe.category?.id && categoryMap[recipe.category.id]) {
            mainCategory = categoryMap[recipe.category.id];
        } else if (typeof recipe.category === 'string' && categoryMap[recipe.category.toLowerCase()]) {
            mainCategory = categoryMap[recipe.category.toLowerCase()];
        }

        // Se tiver mapa configurado, usar ele primeiro (Busca por ID da categoria)
        if (menuConfig?.workflow_sector_map && mainCategory) {
            // Buscar em qual setor esse ID de categoria está mapeado
            for (const [sectorId, categoryIds] of Object.entries(menuConfig.workflow_sector_map)) {
                if (categoryIds.includes(mainCategory.id)) {
                    return sectorId;
                }
            }
        }

        // Fallback para lógica antiga (guessing por nome)
        const categoryName = (mainCategory?.name || recipe?.category?.name || recipe?.category_name || '').toLowerCase();
        const categoryId = (mainCategory?.id || recipe?.category?.id || '').toLowerCase();

        for (const [key, sector] of Object.entries(CATEGORY_TO_SECTOR)) {
            if (categoryName.includes(key) || categoryId.includes(key)) {
                return sector;
            }
        }
        return 'EXTRAS COZINHA';
    }, [menuConfig, categoryMap]);

    // Update config map locally (after save in modal)
    const updateConfigMap = useCallback((newMap) => {
        setMenuConfig(prev => ({ ...prev, workflow_sector_map: newMap }));
    }, []);

    // Recipes grouped by sector
    const todayBySector = useMemo(() => {
        const map = {};
        SECTORS.forEach(s => { map[s.id] = []; });
        todayRecipes.forEach(r => {
            const sector = guessSector(r);
            map[sector].push(r);
        });
        return map;
    }, [todayRecipes, guessSector]);

    const tomorrowBySector = useMemo(() => {
        const map = {};
        SECTORS.forEach(s => { map[s.id] = []; });
        tomorrowRecipes.forEach(r => {
            const sector = guessSector(r);
            map[sector].push(r);
        });
        return map;
    }, [tomorrowRecipes, guessSector]);

    // ===== EMPLOYEES BY SECTOR =====
    const employeesBySector = useMemo(() => {
        const map = {};
        SECTORS.forEach(s => { map[s.id] = []; });
        employees.forEach(emp => {
            if (map[emp.sector]) {
                map[emp.sector].push(emp);
            }
        });
        return map;
    }, [employees]);

    // Is employee off on selected day?
    const isOffOnDay = useCallback((employee, dayIndex) => {
        if (!employee?.weekly_offs) return false;
        const dayInfo = weekDays.find(d => d.dayNumber === dayIndex);
        if (!dayInfo) return false;
        const dateStr = dayInfo.date.toISOString().split('T')[0];
        return employee.weekly_offs.includes(dateStr);
    }, [weekDays]);

    // ===== DAY ASSIGNMENTS =====
    const dayAssignments = useMemo(() => {
        return assignments.filter(a => a.day_index === selectedDay);
    }, [assignments, selectedDay]);

    // Get assignment for a specific recipe
    const getAssignment = useCallback((recipeId, sourceDay) => {
        return dayAssignments.find(a =>
            a.recipe_id === recipeId && a.source_day === sourceDay
        ) || null;
    }, [dayAssignments]);

    // Recipes already on timeline
    const assignedRecipeKeys = useMemo(() => {
        return new Set(dayAssignments.map(a => `${a.recipe_id}-${a.source_day}`));
    }, [dayAssignments]);

    // Unassigned recipes (not yet on timeline)
    const unassignedTodayRecipes = useMemo(() => {
        return todayRecipes.filter(r => !assignedRecipeKeys.has(`${r.recipe_id}-today`));
    }, [todayRecipes, assignedRecipeKeys]);

    const unassignedTomorrowRecipes = useMemo(() => {
        return tomorrowRecipes.filter(r => !assignedRecipeKeys.has(`${r.recipe_id}-tomorrow`));
    }, [tomorrowRecipes, assignedRecipeKeys]);

    // ===== ASSIGNMENT CRUD =====
    const createAssignment = useCallback(async (data) => {
        try {
            const assignmentData = {
                ...data,
                week_number: weekNumber,
                year: year,
                day_index: selectedDay
            };
            const result = await DailyAssignment.create(assignmentData);
            setAssignments(prev => [...prev, result]);
            return result;
        } catch (error) {
            console.error('Erro ao criar assignment:', error);
            toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
            throw error;
        }
    }, [weekNumber, year, selectedDay, toast]);

    const updateAssignment = useCallback(async (id, data) => {
        // Optimistic update
        const previousAssignments = [...assignments];
        setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));

        try {
            await DailyAssignment.update(id, data);
        } catch (error) {
            console.error('Erro ao atualizar assignment:', error);
            // Revert on failure
            setAssignments(previousAssignments);
            toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
            throw error;
        }
    }, [assignments, toast]);

    const removeAssignment = useCallback(async (id) => {
        try {
            await DailyAssignment.delete(id);
            setAssignments(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error('Erro ao remover assignment:', error);
            toast({ title: 'Erro', description: 'Não foi possível remover.', variant: 'destructive' });
            throw error;
        }
    }, [toast]);

    // ===== TIMELINE HELPERS =====
    const percentToTime = useCallback((percent) => {
        const totalMinutes = (percent / 100) * TIMELINE_MINUTES;
        const hours = Math.floor(totalMinutes / 60) + TIMELINE_START;
        const minutes = Math.round(totalMinutes % 60 / 5) * 5; // Snap to 5-min
        return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    }, []);

    const timeToPercent = useCallback((timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        const totalMinutes = (h - TIMELINE_START) * 60 + m;
        return Math.max(0, Math.min(100, (totalMinutes / TIMELINE_MINUTES) * 100));
    }, []);

    const getTimelineWidth = useCallback((startTime, endTime) => {
        if (!startTime || !endTime) return 10;
        return Math.max(3, timeToPercent(endTime) - timeToPercent(startTime));
    }, [timeToPercent]);

    // Sector summary for tabs
    const sectorSummary = useMemo(() => {
        return SECTORS.map(s => ({
            ...s,
            employeeCount: employeesBySector[s.id]?.length || 0,
            todayCount: todayBySector[s.id]?.length || 0,
            tomorrowCount: tomorrowBySector[s.id]?.length || 0,
            assignmentCount: dayAssignments.filter(a => {
                const recipe = allRecipes.find(r => r.id === a.recipe_id);
                return recipe ? guessSector({ recipe, category_name: recipe.category }) === s.id : false;
            }).length
        })).filter(s => s.employeeCount > 0 || s.todayCount > 0 || s.tomorrowCount > 0);
    }, [employeesBySector, todayBySector, tomorrowBySector, dayAssignments, allRecipes, guessSector]);

    // Day names
    const getDayName = useCallback((dayIndex) => {
        const dayInfo = weekDays.find(d => d.dayNumber === dayIndex);
        return dayInfo?.dayName || '';
    }, [weekDays]);

    return {
        // Real-time programação data
        currentDate,
        weekDays,
        weekNumber,
        year,
        navigateWeek,
        connectionStatus,
        allRecipes,
        orders,

        // Day selection
        selectedDay,
        setSelectedDay,

        // Sector
        activeSector,
        setActiveSector,
        sectorSummary,

        // Employees
        employees,
        employeesBySector,
        isOffOnDay,

        // Daily recipes (from orders)
        todayRecipes,
        tomorrowRecipes,
        todayBySector,
        tomorrowBySector,
        tomorrowDay,

        // Unassigned (not yet on timeline)
        unassignedTodayRecipes,
        unassignedTomorrowRecipes,

        // Assignments
        dayAssignments,
        getAssignment,
        assignedRecipeKeys,
        createAssignment,
        updateAssignment,
        removeAssignment,

        // Timeline helpers
        percentToTime,
        timeToPercent,
        getTimelineWidth,
        getDayName,
        guessSector,

        // Config
        menuConfig,
        updateConfigMap,
        categories,
        loading,
        SECTORS,
        TIMELINE_HOURS
    };
}
