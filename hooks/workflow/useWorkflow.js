'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Employee, DailyAssignment, CategoryTree, MenuConfig, WeeklyMenu as WeeklyMenuEntity } from '@/app/api/entities';
import { useToast } from '@/components/ui/use-toast';
import { useProgramacaoRealtimeData } from '@/hooks/programacao/useProgramacaoRealtimeData';
import { APP_CONSTANTS } from '@/lib/constants';
import { DemandCalculator } from '@/lib/production-engine/DemandCalculator';

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
    const [explodeProducts, setExplodeProducts] = useState(true);

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
    const getRecipesForDay = useCallback((dayIndex, explodeProducts = true) => {
        const recipesMap = new Map(); // key: recipe_id

        const isProduto = (recipe) => {
            let mainCategory = null;
            if (recipe.category_id && categoryMap[recipe.category_id]) {
                mainCategory = categoryMap[recipe.category_id];
            } else if (recipe.category?.id && categoryMap[recipe.category.id]) {
                mainCategory = categoryMap[recipe.category.id];
            } else if (typeof recipe.category === 'string' && categoryMap[recipe.category.toLowerCase()]) {
                mainCategory = categoryMap[recipe.category.toLowerCase()];
            }
            if (mainCategory) {
                return mainCategory.type === 'produtos' || mainCategory.category_type === 'produtos';
            }
            if (typeof recipe.category === 'string' && recipe.category.toLowerCase().includes('produto')) return true;
            return false;
        };

        const addToMap = (r, qt, ut, cName, src) => {
            let mainCategory = null;
            if (r.category_id && categoryMap[r.category_id]) mainCategory = categoryMap[r.category_id];
            else if (r.category?.id && categoryMap[r.category.id]) mainCategory = categoryMap[r.category.id];
            else if (typeof r.category === 'string' && categoryMap[r.category.toLowerCase()]) mainCategory = categoryMap[r.category.toLowerCase()];

            const categoryLabel = r.category_name || mainCategory?.name || (typeof r.category === 'string' ? r.category : r.category?.name) || 'Sem categoria';

            const existing = recipesMap.get(r.id);
            if (existing) {
                existing.totalQuantity += qt;
                if (cName) {
                    existing.customers.push({ name: cName, quantity: qt, unit_type: ut });
                }
            } else {
                recipesMap.set(r.id, {
                    recipe_id: r.id,
                    recipe_name: r.name || 'Sem nome',
                    recipe: r,
                    category: mainCategory,
                    category_id: r.category_id || r.category?.id || mainCategory?.id,
                    category_name: categoryLabel,
                    totalQuantity: qt,
                    unit_type: ut || 'kg',
                    customers: cName ? [{ name: cName, quantity: qt, unit_type: ut }] : [],
                    source: src
                });
            }
        };

        const processRecipeEntry = (recipe, orderedQty, unitType, customerName, source, depth = 0) => {
            if (!recipe) return;

            // Se NÃO for produto OU a explosão estiver desativada, adiciona direto
            if (!explodeProducts || !isProduto(recipe)) {
                if (explodeProducts && depth === 0) console.log(`[Explode] 🛑 Aborting explosion for ${recipe.name}: isProduto=${isProduto(recipe)}`);
                addToMap(recipe, orderedQty, unitType, customerName, source);
                return;
            }

            if (depth === 0) console.log(`[Explode] 💥 Exploding Product: ${recipe.name}`);

            // SE FOR PRODUTO E EXPLOSÃO ATIVADA, EXPLODE NAS RECEITAS INTERNAS
            if (!recipe.preparations || recipe.preparations.length === 0) {
                if (depth === 0) console.log(`[Explode] ⚠️ No preparations found for ${recipe.name}`);
                addToMap(recipe, orderedQty, unitType, customerName, source);
                return;
            }

            // --- NOVO: Preservar o Produto Pai na lista ---
            if (depth === 0) {
                console.log(`[Explode] 📦 Keeping parent Product in the list: ${recipe.name}`);
                // Clone the recipe object to add the flag safely
                const parentHolder = { ...recipe, isExplicitProductHolder: true };
                addToMap(parentHolder, orderedQty, unitType, customerName, source);
            }
            // ----------------------------------------------

            const recipeYieldWeight = DemandCalculator.getRecipeYieldWeight(recipe, allRecipes);
            if (recipeYieldWeight <= 0) {
                addToMap(recipe, orderedQty, unitType, customerName, source);
                return;
            }

            let unitsQuantity = 1;
            const lastPrep = recipe.preparations[recipe.preparations.length - 1];
            if (lastPrep?.assembly_config?.units_quantity) {
                unitsQuantity = DemandCalculator.parseNumber(lastPrep.assembly_config.units_quantity) || 1;
            }

            const assemblyUnitType = (lastPrep?.assembly_config?.unit_type || '').toLowerCase();
            const orderUnitType = (unitType || recipe.unit_type || recipe.container_type || '').toLowerCase();
            const isSoldByWeight = assemblyUnitType === 'kg' || orderUnitType === 'kg' || orderUnitType.includes('cuba');

            let scaleFactor = 1;
            if (isSoldByWeight) {
                scaleFactor = orderedQty / recipeYieldWeight;
            } else {
                scaleFactor = orderedQty / unitsQuantity;
            }

            if (!isFinite(scaleFactor)) {
                scaleFactor = 0;
            }
            if (scaleFactor < 0) scaleFactor = 0;

            console.log(`[Explode]   -> Scale Factor for ${recipe.name}: ${scaleFactor} (ordered: ${orderedQty}, yield: ${recipeYieldWeight}, units: ${unitsQuantity})`);

            let addedSubRecipes = 0;

            recipe.preparations.forEach((prep, index) => {
                let foundSubRecipesInThisPrep = 0;

                if (prep.recipes && Array.isArray(prep.recipes)) {
                    prep.recipes.forEach(sub => {
                        const subDef = allRecipes.find(r => r.id === sub.recipe_id) || allRecipes.find(r => r.name === sub.name);
                        if (subDef) {
                            const subYield = DemandCalculator.getRecipeYieldWeight(subDef, allRecipes);
                            const used = DemandCalculator.parseNumber(sub.used_weight);
                            if (subYield > 0 && used > 0) {
                                const neededQty = used * scaleFactor;
                                console.log(`[Explode]   -> Found nested recipe [${subDef.name}] (used unit: ${used}, subYield: ${subYield}, neededQty: ${neededQty})`);
                                processRecipeEntry(subDef, neededQty, subDef.unit_type || 'kg', customerName, source, depth + 1);
                                foundSubRecipesInThisPrep++;
                            } else {
                                console.log(`[Explode]   -> Skipped nested recipe [${subDef.name}] because subYield=${subYield} or used=${used}`);
                            }
                        } else {
                            console.log(`[Explode]   -> 🔥 Unlinked Recipe in prep.recipes: id=${sub.recipe_id}, name="${sub.name}" (Not Found in allRecipes)`);
                        }
                    });
                }

                if (prep.ingredients && Array.isArray(prep.ingredients)) {
                    prep.ingredients.forEach(ing => {
                        const ingName = (ing.name || '').trim();
                        const subDef = allRecipes.find(r => r.name === ingName);
                        if (subDef) {
                            console.log(`[Explode]   -> 🎉 Ingredient matched recipe: [${subDef.name}]`);
                            const isPkg = ing.isPackaging || ing.is_packaging || (ing.unit === 'un' && !Object.keys(ing).some(k => k.includes('weight') && ing[k] > 0));
                            if (!isPkg) {
                                let qtyRaw = 0;
                                const cand = [ing.weight_raw, ing.weight_frozen, ing.weight_thawed, ing.quantity];
                                for (let c of cand) {
                                    const val = DemandCalculator.parseNumber(c);
                                    if (val > 0) { qtyRaw = val; break; }
                                }
                                if (qtyRaw >= 0) {
                                    console.log(`[Explode]   -> Exploding nested ingredient recipe: ${subDef.name} (qty: ${qtyRaw * scaleFactor})`);
                                    processRecipeEntry(subDef, qtyRaw * scaleFactor, subDef.unit_type || 'kg', customerName, source, depth + 1);
                                    foundSubRecipesInThisPrep++;
                                } else {
                                    console.log(`[Explode]   -> Skipped matched ingredient [${subDef.name}] because qtyRaw=${qtyRaw}`);
                                }
                            } else {
                                console.log(`[Explode]   -> Skipped packging ingredient [${subDef.name}]`);
                            }
                        } else {
                            console.log(`[Explode]   -> 🥔 Raw Ingredient found: "${ingName}" (Not found as a recipe in allRecipes)`);
                        }
                    });
                }

                // MAGIC EXTRACTOR HOOK
                if (foundSubRecipesInThisPrep === 0) {
                    let prepName = prep.title ? prep.title.replace(/^\d+[º°ªaoe\.\-]?\s*[Ee]tapa.*?:?-?\s*/i, '').trim() : '';
                    if (!prepName) prepName = `Preparo ${index + 1} (${recipe.name})`;

                    // Estimate the yield of this step by summing its raw ingredients
                    let stepWeight = 0;
                    if (prep.ingredients && Array.isArray(prep.ingredients)) {
                        prep.ingredients.forEach(ing => {
                            const isPkg = ing.isPackaging || ing.is_packaging || (ing.unit === 'un' && !Object.keys(ing).some(k => k.includes('weight') && ing[k] > 0));
                            if (!isPkg) {
                                const cand = [ing.weight_raw, ing.weight_frozen, ing.weight_thawed, ing.quantity];
                                for (let c of cand) {
                                    const val = DemandCalculator.parseNumber(c);
                                    if (val > 0) { stepWeight += val; break; }
                                }
                            }
                        });
                    }

                    const neededQty = stepWeight > 0 ? (stepWeight * scaleFactor) : scaleFactor;
                    const unitLabel = stepWeight > 0 ? 'kg' : 'un';

                    console.log(`[Explode]   -> 🪄 Magic Hook creating Virtual Recipe for Etapa: [${prepName}]`);

                    const safeIdName = prepName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                    const virtualId = `virtual-${safeIdName}`;

                    const virtualRecipe = {
                        id: virtualId,
                        name: prepName,
                        category: recipe.category, // inherit to get sector
                        category_id: recipe.category_id,
                        category_name: 'RECEITAS', // Override display name in Kanban
                        category_type: 'receitas', // act as a recipe
                        parent_id: recipe.parent_id,
                        unit_type: unitLabel,
                        isVirtual: true,
                        sourceProduct: recipe.name
                    };

                    addToMap(virtualRecipe, neededQty, unitLabel, customerName, source);
                    addedSubRecipes++;
                } else {
                    addedSubRecipes += foundSubRecipesInThisPrep;
                }

            });

            // Fallback for ingredients in the root if preparations are empty
            if (addedSubRecipes === 0 && recipe.ingredients && Array.isArray(recipe.ingredients)) {
                recipe.ingredients.forEach(ing => {
                    const ingName = (ing.name || '').trim();
                    const subDef = allRecipes.find(r => r.name === ingName);
                    if (subDef) {
                        let qtyRaw = DemandCalculator.parseNumber(ing.quantity);
                        if (qtyRaw > 0) {
                            console.log(`[Explode]   -> Found root ingredient linked to recipe [${subDef.name}]`);
                            processRecipeEntry(subDef, qtyRaw * scaleFactor, subDef.unit_type || 'kg', customerName, source, depth + 1);
                            addedSubRecipes++;
                        }
                    } else {
                        console.log(`[Explode]   -> 🥔 Root Raw Ingredient found: "${ingName}"`);
                    }
                });
            }

            if (addedSubRecipes === 0) {
                console.log(`[Explode] ⚠️ 0 sub-recipes added for ${recipe.name}. Added as final item instead.`);
                addToMap(recipe, orderedQty, unitType, customerName, source);
            }
        };

        // --- SOURCE 1: WeeklyMenu (Ordem de Produção) ---
        if (weeklyMenu?.menu_data) {
            const menuData = weeklyMenu.menu_data;
            const processMenuDay = (dayData) => {
                if (!dayData || typeof dayData !== 'object') return;
                Object.entries(dayData).forEach(([categoryId, items]) => {
                    if (!Array.isArray(items)) return;
                    items.forEach(item => {
                        if (!item?.recipe_id) return;
                        const recipe = allRecipes.find(r => r.id === item.recipe_id);
                        if (!recipe) return;
                        processRecipeEntry(recipe, item.quantity || 0, item.unit_type || recipe.unit_type, null, 'menu');
                    });
                });
            };

            let foundMealTypes = false;
            Object.entries(menuData).forEach(([key, value]) => {
                if (value && typeof value === 'object' && value[dayIndex]) {
                    foundMealTypes = true;
                    processMenuDay(value[dayIndex]);
                }
            });
            if (!foundMealTypes && menuData[dayIndex]) {
                processMenuDay(menuData[dayIndex]);
            }
        }

        // --- SOURCE 2: Orders (pedidos com quantidades por cliente) ---
        const dayOrders = orders.filter(order => order.day_of_week === dayIndex);

        dayOrders.forEach(order => {
            order.items?.forEach(item => {
                if (!item.recipe_id) return;
                const recipe = allRecipes.find(r => r.id === item.recipe_id);
                if (!recipe) return;
                processRecipeEntry(recipe, item.quantity || 0, item.unit_type || recipe.unit_type, order.customer_name, 'orders');
            });
        });

        return Array.from(recipesMap.values());
    }, [orders, allRecipes, categoryMap, weeklyMenu]);

    // Receitas do dia atual (produção)
    const todayRecipes = useMemo(() => getRecipesForDay(selectedDay, explodeProducts), [getRecipesForDay, selectedDay, explodeProducts]);

    // Receitas do dia seguinte (pré-preparo)
    const tomorrowDay = selectedDay >= 6 ? 0 : selectedDay + 1;
    const tomorrowRecipes = useMemo(() => getRecipesForDay(tomorrowDay, explodeProducts), [getRecipesForDay, tomorrowDay, explodeProducts]);

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

        // Se tiver mapa configurado, usar ele primeiro (Busca por ID da categoria ou parent_id)
        if (menuConfig?.workflow_sector_map && mainCategory) {
            for (const [sectorId, categoryIds] of Object.entries(menuConfig.workflow_sector_map)) {
                if (categoryIds.includes(mainCategory.id) || (mainCategory.parent_id && categoryIds.includes(mainCategory.parent_id))) {
                    return sectorId;
                }
            }
        }

        // Fallback para lógica antiga (guessing por nome)
        const parentCatName = mainCategory?.parent_id ? (categoryMap[mainCategory.parent_id]?.name || '') : '';
        const categoryName = (mainCategory?.name || parentCatName || recipe?.category?.name || recipe?.category_name || '').toLowerCase();
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
        explodeProducts,
        setExplodeProducts,
        loading,
        SECTORS,
        TIMELINE_HOURS
    };
}
