'use client';

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Loader2, Clock, Users, GitBranch, AlertTriangle,
    User, ChefHat, Utensils, Package, Trash2, GripVertical,
    ArrowRight, Sun, Moon, Settings, ChevronDown, ChevronUp,
    Plus, X, ClipboardList
} from 'lucide-react';
import { useWorkflow, SECTORS, TIMELINE_HOURS, TIMELINE_START, TIMELINE_MINUTES } from '@/hooks/workflow/useWorkflow';
import { useWorkflowProcesses } from '@/hooks/workflow/useWorkflowProcesses';
import WeekNavigator from '@/components/shared/WeekNavigator';
import WeekDaySelector from '@/components/shared/WeekDaySelector';
import SectorConfigModal from './SectorConfigModal';

// ==========================================
// RECIPE CARD (arrastável, painel esquerdo)
// ==========================================
function RecipeCard({ recipe, sourceDay, sectorColor, onDragStart, isAssigned }) {
    const handleDragStart = (e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            recipe_id: recipe.recipe_id,
            recipe_name: recipe.recipe_name,
            source_day: sourceDay,
            category_name: recipe.category_name,
        }));
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart?.();
    };

    const isPreparo = sourceDay === 'tomorrow';

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className={`flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none
                ${isAssigned ? 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0' : 'hover:shadow-md hover:scale-[1.01]'}
                ${isPreparo
                    ? 'bg-purple-50/80 border-purple-200 hover:border-purple-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
        >
            <GripVertical className={`w-3.5 h-3.5 flex-shrink-0 ${isAssigned ? 'text-gray-200' : 'text-gray-300'}`} />
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ backgroundColor: isPreparo ? '#8b5cf6' : sectorColor, filter: isAssigned ? 'grayscale(1)' : 'none' }}
            >
                {isPreparo ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
                <div className={`text-xs font-semibold leading-tight line-clamp-2 ${isAssigned ? 'text-gray-500' : 'text-gray-800'}`}>{recipe.recipe_name}</div>
                <div className="text-[10px] text-gray-500 truncate">{recipe.category_name}</div>
            </div>
            {recipe.totalQuantity > 0 && (
                <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                    {String(Number(recipe.totalQuantity).toFixed(2)).replace('.', ',')} {recipe.unit_type}
                </span>
            )}
            {isAssigned && <span className="text-[10px] text-green-600 font-bold ml-1">✓</span>}
        </div>
    );
}


// ==========================================
// TIMELINE BLOCK (receita posicionada na timeline)
// ==========================================
function TimelineBlock({ assignment, recipe, sectorColor, onRemove, onUpdate, timeToPercent, getTimelineWidth, percentToTime }) {
    const isPreparo = assignment.source_day === 'tomorrow';
    const [isResizing, setIsResizing] = useState(false);
    const [preview, setPreview] = useState(null); // { left, width, start, end }
    const latestPreviewRef = useRef(null);

    // Initial values
    const originalLeft = timeToPercent(assignment.start_time);
    const originalWidth = getTimelineWidth(assignment.start_time, assignment.end_time);

    // Display values (preview or original)
    const left = preview ? preview.left : originalLeft;
    const width = preview ? preview.width : originalWidth;
    const displayStart = preview ? preview.start : assignment.start_time;
    const displayEnd = preview ? preview.end : assignment.end_time;

    // Clear preview only when assignment updates (optimistic update propagated)
    useEffect(() => {
        setPreview(null);
    }, [assignment.start_time, assignment.end_time]);

    const handleResizeStart = (e, direction) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);

        const container = e.target.closest('.relative').parentElement; // The .relative container in EmployeeTimelineRow
        // Note: TimelineBlock is absolute inside a relative div.
        // e.target is the handle. Parent is TimelineBlock. OffsetParent is the timeline container.
        const timelineContainer = e.target.closest('.group\\/block').offsetParent;
        const containerWidth = timelineContainer.offsetWidth;
        const startX = e.clientX;

        const initialStartVal = timeToPercent(assignment.start_time);
        const initialEndVal = timeToPercent(assignment.end_time);

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaPercent = (deltaX / containerWidth) * 100;

            let newStartPercent = initialStartVal;
            let newEndPercent = initialEndVal;

            if (direction === 'left') {
                newStartPercent = Math.max(0, Math.min(initialEndVal - 1, initialStartVal + deltaPercent));
            } else {
                newEndPercent = Math.min(100, Math.max(initialStartVal + 1, initialEndVal + deltaPercent));
            }

            const newStart = percentToTime(newStartPercent);
            const newEnd = percentToTime(newEndPercent);

            // Recalculate percent from snapped time to ensure UI matches logic
            const snappedStartPercent = timeToPercent(newStart);
            const snappedEndPercent = timeToPercent(newEnd);
            const snappedWidth = snappedEndPercent - snappedStartPercent;

            const newPreview = {
                left: snappedStartPercent,
                width: snappedWidth,
                start: newStart,
                end: newEnd
            };
            setPreview(newPreview);
            latestPreviewRef.current = newPreview; // Update ref with latest values
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            setIsResizing(false);

            if (latestPreviewRef.current) { // ONLY update if changed
                onUpdate(assignment.id, {
                    start_time: latestPreviewRef.current.start,
                    end_time: latestPreviewRef.current.end
                });
            }
            setPreview(null); // Clear preview state
            latestPreviewRef.current = null; // Clear ref
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div
            className={`absolute h-full top-0 bottom-0 rounded-md border text-[10px] font-medium group/block select-none flex items-center shadow-sm ${isResizing ? 'z-20 ring-2 ring-indigo-400 transition-none' : 'transition-colors duration-200'}`}
            style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: isPreparo ? '#f3e8ff' : '#ffffff',
                borderColor: isPreparo ? '#d8b4fe' : sectorColor,
                color: isPreparo ? '#6b21a8' : '#1e293b',
                touchAction: 'none'
            }}
            title={`${recipe?.name} (${assignment.start_time} - ${assignment.end_time})`}
        >
            {/* Resize Handles */}
            <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 z-10" onMouseDown={(e) => handleResizeStart(e, 'left')} />
            <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 z-10" onMouseDown={(e) => handleResizeStart(e, 'right')} />

            <div className="px-1.5 py-0.5 h-full flex flex-col justify-center overflow-hidden relative pointer-events-none w-full">
                {preview ? (
                    <div className="text-[10px] font-bold text-center w-full">
                        {displayStart}–{displayEnd}
                    </div>
                ) : (
                    <>
                        {/* <span className="truncate w-full block">{recipe?.name || 'Sem nome'}</span> */}
                        <span className="opacity-75 text-[9px] block text-center">{assignment.start_time}–{assignment.end_time}</span>
                    </>
                )}

                <button onClick={(e) => { e.stopPropagation(); onRemove(assignment.id); }} className="absolute top-0.5 right-0.5 opacity-0 group-hover/block:opacity-100 p-0.5 rounded-full hover:bg-red-100 transition-opacity pointer-events-auto">
                    <Trash2 className="w-3 h-3 text-red-500" />
                </button>
            </div>
        </div>
    );
}

function TimelineTrackRow({ title, subtitle, assignments, allRecipes, sectorColor, onRemoveAssignment, onUpdateAssignment, onDrop, timeToPercent, getTimelineWidth, percentToTime, index, onReorder }) {
    const [dragOver, setDragOver] = useState(false);
    const [reorderOver, setReorderOver] = useState(false);
    const timelineRef = useRef(null);

    // --- Reorder drag (left column) ---
    const handleReorderDragStart = (e) => {
        e.dataTransfer.setData('application/x-track-reorder', JSON.stringify({ index }));
        e.dataTransfer.effectAllowed = 'move';
    };

    // --- Row-level drag handlers (reorder) ---
    const handleRowDragOver = (e) => {
        if (e.dataTransfer.types.includes('application/x-track-reorder')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setReorderOver(true);
        }
    };
    const handleRowDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setReorderOver(false);
    };
    const handleRowDrop = (e) => {
        if (!e.dataTransfer.types.includes('application/x-track-reorder')) return;
        e.preventDefault();
        e.stopPropagation();
        setReorderOver(false);
        try {
            const { index: from } = JSON.parse(e.dataTransfer.getData('application/x-track-reorder'));
            if (from !== index) onReorder?.(from, index);
        } catch (err) { console.error(err); }
    };

    // --- Timeline drag handlers (recipe drops) ---
    const handleTimelineDragOver = (e) => {
        if (e.dataTransfer.types.includes('application/x-track-reorder')) return;
        e.preventDefault();
        setDragOver(true);
        e.dataTransfer.dropEffect = 'copy';
    };
    const handleTimelineDragLeave = () => setDragOver(false);
    const handleTimelineDrop = (e) => {
        if (e.dataTransfer.types.includes('application/x-track-reorder')) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (!data.recipe_id) return;
            const rect = timelineRef.current.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;
            const percent = (relativeX / rect.width) * 100;
            const startTime = percentToTime(percent);
            const [sh, sm] = startTime.split(':').map(Number);
            const endMinutes = sh * 60 + sm + 60;
            const eh = Math.min(14, Math.floor(endMinutes / 60));
            const em = endMinutes % 60;
            const endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
            onDrop({ recipe_id: data.recipe_id, recipe_name: data.recipe_name, source_day: data.source_day, start_time: startTime, end_time: endTime });
        } catch (err) { console.error(err); }
    };

    return (
        <div
            className={`flex items-stretch gap-0 relative group/row bg-white rounded-lg border overflow-hidden shadow-sm transition-all pointer-events-auto
                ${reorderOver ? 'border-indigo-400 bg-indigo-50/30 shadow-md ring-2 ring-indigo-300/50' : 'border-gray-100 hover:border-gray-300'}`}
            style={{ minHeight: '44px' }}
            onDragOver={handleRowDragOver}
            onDragLeave={handleRowDragLeave}
            onDrop={handleRowDrop}
        >
            {/* Left Column: Recipe Name (draggable for reorder) */}
            <div
                className="w-[180px] bg-gray-50 border-r border-gray-100 p-2 flex items-center gap-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
                draggable
                onDragStart={handleReorderDragStart}
            >
                <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
                <div className="flex flex-col justify-center min-w-0">
                    <p className="text-[11px] font-bold text-gray-700 leading-tight line-clamp-2" title={title}>{title}</p>
                    {subtitle && <p className="text-[9px] text-gray-400 truncate">{subtitle}</p>}
                </div>
            </div>

            {/* Timeline Area */}
            <div
                ref={timelineRef}
                className={`flex-1 relative transition-colors ${dragOver ? 'bg-indigo-50' : ''}`}
                onDragOver={handleTimelineDragOver}
                onDragLeave={handleTimelineDragLeave}
                onDrop={handleTimelineDrop}
            >
                {/* Grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                    {TIMELINE_HOURS.map(h => (
                        <div key={h.hour} className="flex-1 border-l border-gray-50 first:border-l-0" />
                    ))}
                </div>

                {/* Blocks */}
                {assignments.map(a => (
                    <TimelineBlock
                        key={a.id}
                        assignment={a}
                        recipe={allRecipes.find(r => r.id === a.recipe_id)}
                        sectorColor={sectorColor}
                        onRemove={onRemoveAssignment}
                        onUpdate={onUpdateAssignment}
                        timeToPercent={timeToPercent}
                        getTimelineWidth={getTimelineWidth}
                        percentToTime={percentToTime}
                    />
                ))}
            </div>
        </div>
    );
}

// ==========================================
// EMPLOYEE TIMELINE ROW (linha de drop)
// ==========================================
function EmployeeTimelineRow({ employee, isOff, sectorColor, assignments, allRecipes, onDrop, onRemoveAssignment, onUpdateAssignment, timeToPercent, getTimelineWidth, percentToTime }) {
    const timelineRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (!data.recipe_id) return;

            // Calculate time from drop position
            const rect = timelineRef.current.getBoundingClientRect();
            const dropX = e.clientX - rect.left;
            const percent = (dropX / rect.width) * 100;
            const startTime = percentToTime(percent);

            // Default 1h block
            const [sh, sm] = startTime.split(':').map(Number);
            const endMinutes = sh * 60 + sm + 60;
            const eh = Math.min(14, Math.floor(endMinutes / 60));
            const em = endMinutes % 60;
            const endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

            onDrop({
                recipe_id: data.recipe_id,
                recipe_name: data.recipe_name,
                source_day: data.source_day,
                employee_id: employee.id,
                start_time: startTime,
                end_time: endTime
            });
        } catch (err) {
            console.error('Erro no drop:', err);
        }
    };

    const empAssignments = assignments.filter(a => a.employee_id === employee.id);

    return (
        <div className={`flex items-stretch gap-0 relative group/row ${isOff ? 'opacity-50' : ''}`} style={{ minHeight: '42px' }}>
            {/* Employee name */}
            <div className="w-[140px] flex-shrink-0 pr-2 flex items-center">
                <div className="flex items-center gap-1.5 w-full">
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: isOff ? '#94a3b8' : sectorColor }}
                    >
                        {employee.name?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold text-gray-800 truncate">{employee.name}</div>
                        <div className="text-[10px] text-gray-400 truncate">
                            {isOff ? '⚠️ Folga' : employee.role || ''}
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline drop zone */}
            <div
                ref={timelineRef}
                className={`flex-1 relative rounded-lg transition-all ${dragOver
                    ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-dashed'
                    : 'bg-gray-50/50 hover:bg-gray-50'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                    {TIMELINE_HOURS.map(h => (
                        <div key={h.hour} className="flex-1 border-l border-gray-100" />
                    ))}
                </div>

                {/* Current time indicator */}
                {(() => {
                    const now = new Date();
                    const ch = now.getHours();
                    if (ch >= 5 && ch < 14) {
                        const pos = ((ch - 5) * 60 + now.getMinutes()) / (9 * 60) * 100;
                        return <div className="absolute top-0 bottom-0 w-px bg-red-400 z-20 pointer-events-none" style={{ left: `${pos}%` }} />;
                    }
                    return null;
                })()}

                {/* Assignment blocks */}
                {empAssignments.map(a => {
                    const recipe = allRecipes.find(r => r.id === a.recipe_id);
                    return (
                        <TimelineBlock
                            key={a.id}
                            assignment={a}
                            recipe={recipe}
                            sectorColor={sectorColor}
                            onRemove={onRemoveAssignment}
                            onUpdate={onUpdateAssignment}
                            timeToPercent={timeToPercent}
                            getTimelineWidth={getTimelineWidth}
                            percentToTime={percentToTime}
                        />
                    );
                })}

                {/* Drop hint */}
                {dragOver && empAssignments.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs text-indigo-400 font-medium">Solte aqui para agendar</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function WorkflowBoard() {
    const {
        currentDate,
        weekDays,
        weekNumber,
        year,
        navigateWeek,
        connectionStatus,
        allRecipes,
        selectedDay,
        setSelectedDay,
        activeSector,
        setActiveSector,
        sectorSummary,
        employees,
        employeesBySector,
        isOffOnDay,
        todayRecipes,
        tomorrowRecipes,
        todayBySector,
        tomorrowBySector,
        tomorrowDay,
        unassignedTodayRecipes,
        unassignedTomorrowRecipes,
        dayAssignments,
        createAssignment,
        removeAssignment,
        timeToPercent,
        getTimelineWidth,
        percentToTime,
        getDayName,
        guessSector,
        loading,
        // Config imports
        menuConfig,
        updateConfigMap,
        categories,

        SECTORS,
        TIMELINE_HOURS,
        updateAssignment
    } = useWorkflow();

    const [isDragging, setIsDragging] = useState(false);
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [productionCollapsed, setProductionCollapsed] = useState(true);
    const [prepCollapsed, setPrepCollapsed] = useState(true);
    const [processesCollapsed, setProcessesCollapsed] = useState(true);
    const [processModalOpen, setProcessModalOpen] = useState(false);
    const [processForm, setProcessForm] = useState({ title: '', description: '' });

    // Use custom hook for processes
    const { processes, loading: processesLoading, addProcess, removeProcess } = useWorkflowProcesses();

    // Employee Tabs State
    const [activeEmployeeId, setActiveEmployeeId] = useState(null);
    const [trackOrders, setTrackOrders] = useState({}); // { [employeeId]: [recipeId, ...] }



    const handleAddProcess = async () => {
        if (!processForm.title.trim()) return;

        const success = await addProcess({
            title: processForm.title.trim(),
            description: processForm.description.trim()
        });

        if (success) {
            setProcessForm({ title: '', description: '' });
            setProcessModalOpen(false);
        }
    };

    const handleRemoveProcess = async (id) => {
        await removeProcess(id);
    };

    // Auto-select first sector
    if (!activeSector && sectorSummary.length > 0) {
        setActiveSector(sectorSummary[0].id);
    }

    const currentSector = SECTORS.find(s => s.id === activeSector);
    const sectorEmployees = employeesBySector[activeSector] || [];
    const sectorTodayRecipes = todayBySector[activeSector] || [];
    const sectorTomorrowRecipes = tomorrowBySector[activeSector] || [];

    // Default to first employee when sector changes
    useEffect(() => {
        if (sectorEmployees.length > 0) {
            // Keep current if still valid, otherwise first
            if (!activeEmployeeId || !sectorEmployees.find(e => e.id === activeEmployeeId)) {
                setActiveEmployeeId(sectorEmployees[0].id);
            }
        } else {
            setActiveEmployeeId(null);
        }
    }, [sectorEmployees, activeEmployeeId]);

    // Filter unassigned for current sector
    const sectorUnassignedToday = useMemo(() =>
        unassignedTodayRecipes.filter(r => guessSector(r) === activeSector),
        [unassignedTodayRecipes, guessSector, activeSector]
    );
    const sectorUnassignedTomorrow = useMemo(() =>
        unassignedTomorrowRecipes.filter(r => guessSector(r) === activeSector),
        [unassignedTomorrowRecipes, guessSector, activeSector]
    );

    // Handle drop on employee row
    const handleDrop = useCallback(async (data) => {
        try {
            await createAssignment({
                recipe_id: data.recipe_id,
                employee_id: data.employee_id,
                source_day: data.source_day, // 'today' or 'tomorrow'
                start_time: data.start_time,
                end_time: data.end_time,
                sector: activeSector
            });
        } catch (err) {
            // toast handled in hook
        }
    }, [createAssignment, activeSector]);

    const handleRemoveAssignment = useCallback(async (id) => {
        try {
            await removeAssignment(id);
        } catch (err) { /* handled */ }
    }, [removeAssignment]);

    const handleReorderTracks = useCallback((fromIndex, toIndex) => {
        setTrackOrders(prev => {
            const activeAssignments = dayAssignments.filter(a => a.employee_id === activeEmployeeId);
            const recipeIds = [...new Set(activeAssignments.map(a => a.recipe_id))];
            const currentOrder = prev[activeEmployeeId] || recipeIds;
            const fullOrder = [...currentOrder];
            recipeIds.forEach(id => { if (!fullOrder.includes(id)) fullOrder.push(id); });
            const filtered = fullOrder.filter(id => recipeIds.includes(id));
            const newOrder = [...filtered];
            const [moved] = newOrder.splice(fromIndex, 1);
            newOrder.splice(toIndex, 0, moved);
            return { ...prev, [activeEmployeeId]: newOrder };
        });
    }, [activeEmployeeId, dayAssignments]);

    // ===== RENDER =====
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="ml-3 text-gray-600 text-lg">Carregando fluxo de trabalho...</span>
            </div>
        );
    }

    const todayDayName = getDayName(selectedDay);
    const tomorrowDayName = getDayName(tomorrowDay);

    return (
        <div className="space-y-4">
            {/* ===== HEADER ===== */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                        <GitBranch className="w-6 h-6 text-indigo-500" />
                        Engenharia de Processos
                    </h1>
                    <p className="text-gray-500 text-xs mt-0.5">
                        Arraste receitas para a timeline dos colaboradores
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {connectionStatus === 'connected' && (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 gap-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Ao vivo
                        </Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setConfigModalOpen(true)} title="Configurar Setores">
                        <Settings className="w-5 h-5 text-gray-500" />
                    </Button>
                </div>
            </div>

            {/* ===== CONFIG MODAL ===== */}
            <SectorConfigModal
                open={configModalOpen}
                onOpenChange={setConfigModalOpen}
                categories={categories}
                currentConfig={menuConfig}
                onSave={updateConfigMap}
            />

            {/* ===== WEEK NAVIGATOR ===== */}
            <WeekNavigator
                currentDate={currentDate}
                weekNumber={weekNumber}
                onNavigateWeek={navigateWeek}
            />

            {/* ===== DAY SELECTOR ===== */}
            <WeekDaySelector
                currentDate={currentDate}
                currentDayIndex={selectedDay}
                onDayChange={setSelectedDay}
                weekDays={weekDays}
            />

            {/* ===== SECTOR TABS ===== */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {sectorSummary.map(sector => {
                    const isActive = activeSector === sector.id;
                    return (
                        <button
                            key={sector.id}
                            onClick={() => setActiveSector(sector.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border
                                ${isActive
                                    ? 'bg-white shadow-md border-gray-200'
                                    : 'bg-gray-50 border-transparent hover:bg-white hover:shadow-sm opacity-70 hover:opacity-100'
                                }`}
                            style={isActive ? { borderLeftColor: sector.color, borderLeftWidth: '4px' } : {}}
                        >
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sector.color }} />
                            <span>{sector.name}</span>
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{sector.employeeCount}p</Badge>
                            {(sector.todayCount + sector.tomorrowCount) > 0 && (
                                <Badge className="text-[10px] h-5 px-1.5 bg-amber-100 text-amber-700 hover:bg-amber-100">
                                    {sector.todayCount + sector.tomorrowCount}r
                                </Badge>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ===== MAIN LAYOUT: LEFT PANEL + TIMELINE ===== */}
            {currentSector && (
                <div className="flex gap-4 items-start" style={{ minHeight: '500px' }}>
                    {/* LEFT PANEL: Recipes */}
                    <div className="w-[260px] flex-shrink-0 space-y-3">
                        {/* Produção hoje */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div
                                className="px-3 py-2 border-b border-gray-100 flex items-center gap-2 cursor-pointer select-none hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: currentSector.color + '10' }}
                                onClick={() => setProductionCollapsed(prev => !prev)}
                            >
                                <Sun className="w-4 h-4" style={{ color: currentSector.color }} />
                                <span className="text-xs font-bold text-gray-700">Produção — {todayDayName}</span>
                                <Badge className="ml-auto text-[10px] h-4 px-1.5" style={{ backgroundColor: currentSector.color + '20', color: currentSector.color }}>
                                    {sectorTodayRecipes.length}
                                </Badge>
                                {productionCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
                            </div>
                            {!productionCollapsed && <div className="p-2 space-y-1.5 max-h-[280px] overflow-y-auto">
                                {sectorTodayRecipes.length === 0 ? (
                                    <div className="text-center py-4">
                                        <Utensils className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                                        <p className="text-[10px] text-gray-400">Sem receitas</p>
                                    </div>
                                ) : (
                                    sectorTodayRecipes.map(r => {
                                        const isAssigned = dayAssignments.some(a => a.recipe_id === r.recipe_id && a.source_day === 'today');
                                        return (
                                            <RecipeCard
                                                key={r.recipe_id}
                                                recipe={r}
                                                sourceDay="today"
                                                sectorColor={currentSector.color}
                                                onDragStart={() => setIsDragging(true)}
                                                isAssigned={isAssigned}
                                            />
                                        );
                                    })
                                )}
                            </div>}
                        </div>

                        {/* Pré-preparo amanhã */}
                        <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
                            <div
                                className="px-3 py-2 border-b border-purple-100 flex items-center gap-2 bg-purple-50/50 cursor-pointer select-none hover:opacity-80 transition-opacity"
                                onClick={() => setPrepCollapsed(prev => !prev)}
                            >
                                <Moon className="w-4 h-4 text-purple-500" />
                                <span className="text-xs font-bold text-gray-700">Pré-preparo — {tomorrowDayName}</span>
                                <Badge className="ml-auto text-[10px] h-4 px-1.5 bg-purple-100 text-purple-600">
                                    {sectorTomorrowRecipes.length}
                                </Badge>
                                {prepCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
                            </div>
                            {!prepCollapsed && <div className="p-2 space-y-1.5 max-h-[280px] overflow-y-auto">
                                {sectorTomorrowRecipes.length === 0 ? (
                                    <div className="text-center py-4">
                                        <Utensils className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                                        <p className="text-[10px] text-gray-400">Sem receitas</p>
                                    </div>
                                ) : (
                                    sectorTomorrowRecipes.map(r => {
                                        const isAssigned = dayAssignments.some(a => a.recipe_id === r.recipe_id && a.source_day === 'tomorrow');
                                        return (
                                            <RecipeCard
                                                key={r.recipe_id}
                                                recipe={r}
                                                sourceDay="tomorrow"
                                                sectorColor={currentSector.color}
                                                onDragStart={() => setIsDragging(true)}
                                                isAssigned={isAssigned}
                                            />
                                        );
                                    })
                                )}
                            </div>}
                        </div>

                        {/* Processos */}
                        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
                            <div
                                className="px-3 py-2 border-b border-emerald-100 flex items-center gap-2 bg-emerald-50/50 cursor-pointer select-none hover:opacity-80 transition-opacity"
                                onClick={() => setProcessesCollapsed(prev => !prev)}
                            >
                                <ClipboardList className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-bold text-gray-700">Processos</span>
                                <Badge className="ml-auto text-[10px] h-4 px-1.5 bg-emerald-100 text-emerald-700">
                                    {processes.length}
                                </Badge>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setProcessModalOpen(true); }}
                                    className="p-0.5 rounded hover:bg-emerald-200/50 transition-colors"
                                    title="Adicionar processo"
                                >
                                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                                </button>
                                {processesCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
                            </div>
                            {!processesCollapsed && <div className="p-2 space-y-1.5 max-h-[280px] overflow-y-auto">
                                {processes.length === 0 ? (
                                    <div className="text-center py-4">
                                        <ClipboardList className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                                        <p className="text-[10px] text-gray-400">Sem processos</p>
                                        <button
                                            onClick={() => setProcessModalOpen(true)}
                                            className="mt-1 text-[10px] text-emerald-600 hover:text-emerald-700 font-medium"
                                        >
                                            + Criar processo
                                        </button>
                                    </div>
                                ) : (
                                    processes.map(proc => (
                                        <div
                                            key={proc.id}
                                            className="bg-emerald-50/60 border border-emerald-200/60 rounded-lg px-2.5 py-1.5 group"
                                        >
                                            <div className="flex items-start justify-between gap-1">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-semibold text-gray-800 truncate">{proc.title}</p>
                                                    {proc.description && (
                                                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{proc.description}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveProcess(proc.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 transition-all"
                                                    title="Remover processo"
                                                >
                                                    <X className="w-3 h-3 text-red-400" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>}
                        </div>
                    </div>

                    {/* RIGHT: TIMELINE */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ borderTopColor: currentSector.color, borderTopWidth: '3px' }}>
                        <div className="border-b border-gray-100">
                            {/* Employee Tabs */}
                            <div className="flex items-center gap-1 p-1 overflow-x-auto no-scrollbar">
                                {sectorEmployees.map(emp => (
                                    <button
                                        key={emp.id}
                                        onClick={() => setActiveEmployeeId(emp.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 border ${activeEmployeeId === emp.id
                                            ? 'bg-white shadow-sm text-gray-800 border-gray-200'
                                            : 'text-gray-500 border-transparent hover:bg-gray-50'
                                            }`}
                                        style={activeEmployeeId === emp.id ? { borderTopWidth: '3px', borderTopColor: currentSector.color } : {}}
                                    >
                                        <div
                                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                                            style={{ backgroundColor: activeEmployeeId === emp.id ? currentSector.color : '#94a3b8' }}
                                        >
                                            {emp.name?.substring(0, 2).toUpperCase()}
                                        </div>
                                        {emp.name.split(' ')[0]}
                                    </button>
                                ))}
                                {sectorEmployees.length === 0 && (
                                    <span className="text-xs text-gray-400 px-3 py-2">Sem colaboradores</span>
                                )}
                            </div>
                        </div>

                        {/* Timeline ruler */}
                        <div className="px-3 pt-2 pb-0">
                            <div className="ml-[180px] flex">
                                {TIMELINE_HOURS.map(h => (
                                    <div key={h.hour} className="flex-1 text-center">
                                        <div className="text-[10px] font-semibold text-gray-400">{h.label}</div>
                                        <div className="h-2 border-l border-gray-200 mx-auto w-0 mt-0.5" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Employee Multitrack Container */}
                        <div className="flex-1 overflow-y-auto relative min-h-[300px]">
                            {/* Global Drop Zone for new tracks */}
                            <div
                                className="absolute inset-0 z-0"
                                onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-track-reorder')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (!activeEmployeeId) return;
                                    try {
                                        const data = JSON.parse(e.dataTransfer.getData('application/json'));
                                        if (!data.recipe_id) return;

                                        // Calculate time
                                        const timelineStartX = 180 + 12; // Width of left col + padding equivalent
                                        // Actually we need the ruler container rect. 
                                        // It's safer to use the same logic as EmployeeTimelineRow, 
                                        // but since we are dropping on the container, we need to correct X.

                                        // Simpler: Just default to 08:00 or nearest hour if we can't calculate easily without ref.
                                        // But users want drag to time.
                                        // Let's rely on the row drop if dropping on existing row.
                                        // If dropping on empty space, we need to calculate.

                                        // Let's use the ref of this container.
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const relativeX = e.clientX - rect.left;

                                        // Left column width is fixed roughly (w-[180px] + padding)
                                        const rulerStart = 192; // 180px col + 12px padding
                                        const rulerWidth = rect.width - rulerStart - 12; // minus right padding

                                        if (relativeX < rulerStart) return; // Dropped on left column

                                        const percent = ((relativeX - rulerStart) / rulerWidth) * 100;
                                        const startTime = percentToTime(percent);

                                        // Default 1h block
                                        const [sh, sm] = startTime.split(':').map(Number);
                                        const endMinutes = sh * 60 + sm + 60;
                                        const eh = Math.min(14, Math.floor(endMinutes / 60));
                                        const em = endMinutes % 60;
                                        const endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

                                        // We need createAssignment.
                                        // But updateAssignment was passed to rows.
                                        // WorkflowBoard has createAssignment.
                                        createAssignment({
                                            recipe_id: data.recipe_id,
                                            recipe_name: data.recipe_name,
                                            source_day: data.source_day,
                                            employee_id: activeEmployeeId, // Current selected tab
                                            start_time: startTime,
                                            end_time: endTime,
                                            sector: currentSector.id
                                        });

                                    } catch (err) {
                                        console.error(err);
                                    }
                                }}
                            />

                            {/* Tracks */}
                            <div className="relative z-10 px-3 py-2 space-y-1 pointer-events-none">
                                {(() => {
                                    if (!activeEmployeeId) return <div className="text-center text-gray-400 mt-10">Mudar para um setor com colaboradores</div>;

                                    const activeAssignments = dayAssignments.filter(a => a.employee_id === activeEmployeeId);

                                    // Group assignments by recipe_id
                                    const tracks = [];
                                    const recipeGroups = {};

                                    activeAssignments.forEach(a => {
                                        if (!recipeGroups[a.recipe_id]) {
                                            recipeGroups[a.recipe_id] = {
                                                recipe_id: a.recipe_id,
                                                recipe_name: a.recipe_name,
                                                assignments: []
                                            };
                                            tracks.push(recipeGroups[a.recipe_id]);
                                        }
                                        recipeGroups[a.recipe_id].assignments.push(a);
                                    });

                                    if (tracks.length === 0) {
                                        return (
                                            <div className="text-center py-12 pointer-events-none">
                                                <p className="text-sm text-gray-400">Arraste receitas para planejar o dia de</p>
                                                <p className="text-base font-bold text-gray-600 mt-1">
                                                    {sectorEmployees.find(e => e.id === activeEmployeeId)?.name}
                                                </p>
                                            </div>
                                        );
                                    }

                                    // Sort tracks by stored order
                                    const order = trackOrders[activeEmployeeId] || [];
                                    const sortedTracks = [...tracks].sort((a, b) => {
                                        const ai = order.indexOf(a.recipe_id);
                                        const bi = order.indexOf(b.recipe_id);
                                        if (ai === -1 && bi === -1) return 0;
                                        if (ai === -1) return 1;
                                        if (bi === -1) return -1;
                                        return ai - bi;
                                    });

                                    return sortedTracks.map((track, idx) => {
                                        const recipe = allRecipes.find(r => r.id === track.recipe_id);
                                        return (
                                            <TimelineTrackRow
                                                key={track.recipe_id}
                                                title={track.recipe_name || recipe?.name || 'Sem nome'}
                                                subtitle={recipe?.category_name || ''}
                                                assignments={track.assignments}
                                                allRecipes={allRecipes}
                                                sectorColor={currentSector.color}
                                                onRemoveAssignment={handleRemoveAssignment}
                                                onUpdateAssignment={updateAssignment}
                                                onDrop={(data) => {
                                                    createAssignment({
                                                        ...data,
                                                        employee_id: activeEmployeeId,
                                                        sector: currentSector.id
                                                    });
                                                }}
                                                timeToPercent={timeToPercent}
                                                getTimelineWidth={getTimelineWidth}
                                                percentToTime={percentToTime}
                                                index={idx}
                                                onReorder={handleReorderTracks}
                                            />
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* ===== LEGEND ===== */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100 p-3 mt-4">
                <div className="flex items-center gap-1.5">
                    <Sun className="w-3 h-3 text-amber-500" />
                    <div className="w-8 h-3 rounded border border-gray-200" style={{ borderLeftWidth: '3px', borderLeftColor: '#6366f1', background: 'linear-gradient(135deg, #6366f108, #6366f118)' }} />
                    <span>Produção (hoje)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Moon className="w-3 h-3 text-purple-500" />
                    <div className="w-8 h-3 rounded border border-purple-200" style={{ borderLeftWidth: '3px', borderLeftColor: '#8b5cf6', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' }} />
                    <span>Pré-preparo (amanhã)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span>Hora atual</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span>Arraste da esquerda → Timeline</span>
                </div>
            </div>

            {/* ===== MODAL: Criar Processo ===== */}
            <Dialog open={processModalOpen} onOpenChange={setProcessModalOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-700">
                            <ClipboardList className="w-5 h-5" />
                            Novo Processo
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Título</label>
                            <input
                                type="text"
                                value={processForm.title}
                                onChange={(e) => setProcessForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Ex: Higienização das bancadas"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Descrição do Processo</label>
                            <textarea
                                value={processForm.description}
                                onChange={(e) => setProcessForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Descreva os detalhes do processo..."
                                rows={4}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all resize-none"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setProcessModalOpen(false); setProcessForm({ title: '', description: '' }); }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleAddProcess}
                                disabled={!processForm.title.trim()}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Criar Processo
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div > // Final closing div for the component
    );
}
