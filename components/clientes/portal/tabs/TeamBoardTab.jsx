'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
    Users,
    Plus,
    Trash2,
    X,
    Loader2,
    Building2,
    DollarSign,
    Calendar,
    Briefcase,
    GripVertical,
    Lightbulb,
    Palmtree,
    Banknote,
    MessageSquare
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Employee } from "@/app/api/entities";

// Setores disponíveis
const SECTORS = [
    { id: 'PADARIA', name: 'Padaria', color: '#f59e0b' },
    { id: 'ROTISSERIA', name: 'Rotisseria', color: '#ef4444' },
    { id: 'PICADINHO', name: 'Picadinho', color: '#8b5cf6' },
    { id: 'LIMPEZA', name: 'Limpeza', color: '#3b82f6' },
    { id: 'GERENTE', name: 'Gerência', color: '#22c55e' },
    { id: 'EXPEDICAO', name: 'Expedição', color: '#06b6d4' },
    { id: 'EXTRAS COZINHA', name: 'Extras Cozinha', color: '#ec4899' }
];

// Cargos disponíveis
const ROLES = [
    'Líder',
    '1º Gerente',
    '2º Gerente',
    'Cozinheira',
    'Cozinha Jr',
    'Aux. de Cozinha',
    'Aux. Cozinha',
    'Aux. Senior',
    'Padeiro',
    'Aux. Padaria',
    '1º Expedição',
    'Extra',
    'Aux. Limpeza',
    'Feiras'
];

const TeamBoardTab = () => {
    const { toast } = useToast();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [draggedEmployee, setDraggedEmployee] = useState(null);
    const [dragOverSector, setDragOverSector] = useState(null);
    const [hoveredSector, setHoveredSector] = useState(null);
    const [hoveredEmployee, setHoveredEmployee] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        sector: '',
        salary: '',
        admission_date: '',
        vacation_start: '',
        vacation_end: '',
        notes: '',
        show_salary: true,
        show_vacation: true,
        show_notes: true
    });

    // Carregar funcionários
    const loadEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const data = await Employee.list();
            setEmployees(data || []);
        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar os funcionários.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    // Agrupar funcionários por setor
    const employeesBySector = SECTORS.reduce((acc, sector) => {
        acc[sector.id] = employees.filter(e => e.sector === sector.id);
        return acc;
    }, {});

    // Calcular custo por setor
    const getSectorCost = (sectorId) => {
        const sectorEmployees = employeesBySector[sectorId] || [];
        return sectorEmployees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
    };

    // Calcular custo total
    const getTotalCost = () => {
        return employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
    };

    // Formatar moeda
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    // Formatar data
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // ===== DRAG AND DROP =====
    const handleDragStart = (e, employee) => {
        setDraggedEmployee(employee);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', employee.id);
        e.target.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedEmployee(null);
        setDragOverSector(null);
    };

    const handleDragOver = (e, sectorId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverSector !== sectorId) {
            setDragOverSector(sectorId);
        }
    };

    const handleDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragOverSector(null);
        }
    };

    const handleDrop = async (e, newSectorId) => {
        e.preventDefault();
        setDragOverSector(null);

        if (!draggedEmployee) return;
        if (draggedEmployee.sector === newSectorId) return;

        const oldSectorId = draggedEmployee.sector;
        const oldSectorName = SECTORS.find(s => s.id === oldSectorId)?.name;
        const newSectorName = SECTORS.find(s => s.id === newSectorId)?.name;

        // Salvar setor original apenas se não tiver um já definido (primeira movimentação)
        const originalSector = draggedEmployee.original_sector || oldSectorId;

        try {
            setEmployees(prev => prev.map(emp =>
                emp.id === draggedEmployee.id
                    ? { ...emp, sector: newSectorId, original_sector: originalSector }
                    : emp
            ));

            await Employee.update(draggedEmployee.id, {
                sector: newSectorId,
                original_sector: originalSector
            });

            toast({
                title: "Setor alterado",
                description: `${draggedEmployee.name} movido de ${oldSectorName} para ${newSectorName}.`
            });

        } catch (error) {
            console.error('Erro ao mover funcionário:', error);
            loadEmployees();
            toast({
                title: "Erro",
                description: "Não foi possível mover o funcionário.",
                variant: "destructive"
            });
        }

        setDraggedEmployee(null);
    };
    // ===== FIM DRAG AND DROP =====

    const openNewModal = () => {
        setEditingEmployee(null);
        setFormData({
            name: '',
            role: '',
            sector: '',
            salary: '',
            admission_date: '',
            vacation_start: '',
            vacation_end: '',
            notes: '',
            show_salary: true,
            show_vacation: true,
            show_notes: true
        });
        setShowModal(true);
    };

    // Abrir modal para editar
    const openEditModal = (employee) => {
        setEditingEmployee(employee);
        setFormData({
            name: employee.name || '',
            role: employee.role || '',
            sector: employee.sector || '',
            salary: employee.salary?.toString() || '',
            admission_date: employee.admission_date || '',
            vacation_start: employee.vacation_start || '',
            vacation_end: employee.vacation_end || '',
            notes: employee.notes || '',
            show_salary: employee.show_salary !== false,
            show_vacation: employee.show_vacation !== false,
            show_notes: employee.show_notes !== false
        });
        setShowModal(true);
    };

    // Salvar funcionário
    const handleSave = async () => {
        if (!formData.name || !formData.sector) {
            toast({
                title: "Campos obrigatórios",
                description: "Nome e setor são obrigatórios.",
                variant: "destructive"
            });
            return;
        }

        try {
            setSaving(true);
            const employeeData = {
                name: formData.name,
                role: formData.role,
                sector: formData.sector,
                salary: formData.salary ? parseFloat(formData.salary) : 0,
                admission_date: formData.admission_date || null,
                vacation_start: formData.vacation_start || null,
                vacation_end: formData.vacation_end || null,
                notes: formData.notes || '',
                show_salary: formData.show_salary,
                show_vacation: formData.show_vacation,
                show_notes: formData.show_notes
            };

            if (editingEmployee) {
                await Employee.update(editingEmployee.id, employeeData);
                toast({
                    title: "Funcionário atualizado",
                    description: `${formData.name} foi atualizado com sucesso.`
                });
            } else {
                await Employee.create(employeeData);
                toast({
                    title: "Funcionário cadastrado",
                    description: `${formData.name} foi cadastrado com sucesso.`
                });
            }

            setShowModal(false);
            loadEmployees();
        } catch (error) {
            console.error('Erro ao salvar funcionário:', error);
            toast({
                title: "Erro",
                description: "Não foi possível salvar o funcionário.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    // Excluir funcionário
    const handleDelete = async (employee) => {
        if (!confirm(`Tem certeza que deseja excluir ${employee.name}?`)) return;

        try {
            setDeleting(employee.id);
            await Employee.delete(employee.id);
            toast({
                title: "Funcionário excluído",
                description: `${employee.name} foi removido.`
            });
            loadEmployees();
        } catch (error) {
            console.error('Erro ao excluir funcionário:', error);
            toast({
                title: "Erro",
                description: "Não foi possível excluir o funcionário.",
                variant: "destructive"
            });
        } finally {
            setDeleting(null);
        }
    };

    // Obter iniciais do nome
    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Carregando equipe...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Tabs defaultValue="employees" className="w-full space-y-4">
                <div className="flex justify-between items-center">
                    <TabsList>
                        <TabsTrigger value="employees" className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Funcionários
                        </TabsTrigger>
                        <TabsTrigger value="vacations" className="flex items-center gap-2">
                            <Palmtree className="w-4 h-4" />
                            Análise de Férias
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="employees" className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-800">Quadro de Equipe</h2>
                            <Badge variant="secondary">{employees.length} funcionários</Badge>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {formatCurrency(getTotalCost())}/mês
                            </Badge>
                        </div>
                        <Button onClick={openNewModal} size="sm" className="gap-1">
                            <Plus className="w-4 h-4" />
                            Novo Colaborador
                        </Button>
                    </div>

                    {/* Dica de arrastar */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 p-2 rounded-lg border border-blue-100">
                        <Lightbulb className="w-4 h-4 text-blue-500" />
                        <span><strong>Dica:</strong> Arraste e solte os funcionários para mover entre setores</span>
                    </div>

                    {/* Stats por Setor com Custo */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        {SECTORS.map(sector => {
                            const sectorCost = getSectorCost(sector.id);
                            const sectorEmployees = employeesBySector[sector.id] || [];

                            return (
                                <div
                                    key={sector.id}
                                    className="relative"
                                    onMouseEnter={() => setHoveredSector(sector.id)}
                                    onMouseLeave={() => setHoveredSector(null)}
                                >
                                    <Card className="border cursor-pointer hover:shadow-md transition-shadow" style={{ borderLeftColor: sector.color, borderLeftWidth: 3 }}>
                                        <CardContent className="p-3">
                                            <div className="text-2xl font-bold">{sectorEmployees.length}</div>
                                            <div className="text-xs text-gray-500">{sector.name}</div>
                                            <div className="text-xs font-medium text-green-600 mt-1">
                                                {formatCurrency(sectorCost)}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Tooltip ao passar o mouse */}
                                    {hoveredSector === sector.id && sectorEmployees.length > 0 && (
                                        <div className="absolute z-50 top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border p-3 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="font-semibold text-sm mb-2 pb-2 border-b" style={{ color: sector.color }}>
                                                {sector.name} - Detalhes
                                            </div>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {sectorEmployees.map(emp => (
                                                    <div key={emp.id} className="text-xs bg-gray-50 p-2 rounded">
                                                        <div className="font-medium">{emp.name}</div>
                                                        <div className="flex justify-between text-gray-500 mt-1">
                                                            <span className="flex items-center gap-1">
                                                                <Banknote className="w-3 h-3" />
                                                                {formatCurrency(emp.salary || 0)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Palmtree className="w-3 h-3" />
                                                                {formatDate(emp.vacation_date)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-2 pt-2 border-t text-xs font-semibold text-green-600">
                                                Total: {formatCurrency(sectorCost)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Grid de Setores */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {SECTORS.map(sector => (
                            <Card
                                key={sector.id}
                                className={`overflow-visible transition-all duration-200 ${dragOverSector === sector.id
                                    ? 'ring-2 ring-blue-400 bg-blue-50/50 scale-[1.02]'
                                    : ''
                                    }`}
                                onDragOver={(e) => handleDragOver(e, sector.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, sector.id)}
                            >
                                <CardHeader className="py-3 px-4" style={{ backgroundColor: sector.color + '20', borderBottom: `2px solid ${sector.color}` }}>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-semibold">{sector.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs bg-white">
                                                {formatCurrency(getSectorCost(sector.id))}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs">
                                                {employeesBySector[sector.id]?.length || 0}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-2 space-y-2 min-h-[120px]">
                                    {employeesBySector[sector.id]?.length === 0 ? (
                                        <div className={`text-center text-sm py-4 rounded-lg border-2 border-dashed ${dragOverSector === sector.id
                                            ? 'border-blue-400 text-blue-600 bg-blue-50'
                                            : 'border-gray-200 text-gray-400'
                                            }`}>
                                            {dragOverSector === sector.id ? 'Solte aqui!' : 'Nenhum colaborador'}
                                        </div>
                                    ) : (
                                        employeesBySector[sector.id].map(emp => (
                                            <div
                                                key={emp.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, emp)}
                                                onDragEnd={handleDragEnd}
                                                className="relative flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 cursor-grab active:cursor-grabbing group"
                                                onClick={() => openEditModal(emp)}
                                                onMouseEnter={() => setHoveredEmployee(emp.id)}
                                                onMouseLeave={() => setHoveredEmployee(null)}
                                            >
                                                <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                                    style={{ backgroundColor: sector.color }}
                                                >
                                                    {getInitials(emp.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">{emp.name}</div>
                                                    <div className="text-xs text-gray-500 truncate">{emp.role} • {formatCurrency(emp.salary || 0)}</div>
                                                    {/* Indicador de setor original se foi movimentado */}
                                                    {emp.original_sector && emp.original_sector !== emp.sector && (
                                                        <div
                                                            className="text-xs mt-1 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"
                                                            style={{
                                                                backgroundColor: `${SECTORS.find(s => s.id === emp.original_sector)?.color}20`,
                                                                color: SECTORS.find(s => s.id === emp.original_sector)?.color
                                                            }}
                                                        >
                                                            <span>↩</span>
                                                            <span>Veio de: {SECTORS.find(s => s.id === emp.original_sector)?.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(emp);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                                                    disabled={deleting === emp.id}
                                                >
                                                    {deleting === emp.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    )}
                                                </button>

                                                {/* Tooltip customizado */}
                                                {hoveredEmployee === emp.id && (emp.show_salary !== false || emp.show_vacation !== false || (emp.notes && emp.show_notes !== false)) && (
                                                    <div className="absolute z-50 left-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border p-3 animate-in fade-in zoom-in-95 duration-150">
                                                        <div className="font-semibold text-sm mb-2 pb-2 border-b" style={{ color: sector.color }}>
                                                            {emp.name}
                                                        </div>
                                                        <div className="space-y-1 text-xs">
                                                            {emp.show_salary !== false && (
                                                                <div className="flex items-center gap-2 text-gray-600">
                                                                    <Banknote className="w-3 h-3" />
                                                                    <span>Salário: {formatCurrency(emp.salary || 0)}</span>
                                                                </div>
                                                            )}
                                                            {emp.show_vacation !== false && (
                                                                <div className="flex items-center gap-2 text-gray-600">
                                                                    <Palmtree className="w-3 h-3" />
                                                                    <span>Férias: {
                                                                        (emp.vacation_start || emp.vacation_end)
                                                                            ? `${formatDate(emp.vacation_start)} - ${formatDate(emp.vacation_end)}`
                                                                            : 'Não definido'
                                                                    }</span>
                                                                </div>
                                                            )}
                                                            {emp.show_notes !== false && (
                                                                <div className="mt-2 pt-2 border-t">
                                                                    <div className="flex items-start gap-2 text-gray-600">
                                                                        <MessageSquare className="w-3 h-3 mt-0.5" />
                                                                        <span>{emp.notes || 'Sem observações'}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="vacations" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Em Férias Agora */}
                        <Card className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Palmtree className="w-4 h-4 text-blue-500" />
                                    Em Férias Agora
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {employees.filter(emp => {
                                    if (!emp.vacation_start || !emp.vacation_end) return false;
                                    const now = new Date();
                                    const start = new Date(emp.vacation_start + 'T00:00:00');
                                    const end = new Date(emp.vacation_end + 'T23:59:59');
                                    return now >= start && now <= end;
                                }).length === 0 ? (
                                    <div className="text-sm text-gray-500 italic">Ninguém em férias no momento.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {employees.filter(emp => {
                                            if (!emp.vacation_start || !emp.vacation_end) return false;
                                            const now = new Date();
                                            const start = new Date(emp.vacation_start + 'T00:00:00');
                                            const end = new Date(emp.vacation_end + 'T23:59:59');
                                            return now >= start && now <= end;
                                        }).map(emp => (
                                            <div key={emp.id} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                                    style={{ backgroundColor: SECTORS.find(s => s.id === emp.sector)?.color }}>
                                                    {getInitials(emp.name)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm">{emp.name}</div>
                                                    <div className="text-xs text-blue-700">
                                                        Retorna em {formatDate(emp.vacation_end)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Próximas Férias */}
                        <Card className="border-l-4 border-l-orange-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-orange-500" />
                                    Próximas Férias
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {employees.filter(emp => {
                                    if (!emp.vacation_start) return false;
                                    const now = new Date();
                                    const start = new Date(emp.vacation_start + 'T00:00:00');
                                    return start > now;
                                }).length === 0 ? (
                                    <div className="text-sm text-gray-500 italic">Nenhuma férias agendada.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {employees.filter(emp => {
                                            if (!emp.vacation_start) return false;
                                            const now = new Date();
                                            const start = new Date(emp.vacation_start + 'T00:00:00');
                                            return start > now;
                                        })
                                            .sort((a, b) => new Date(a.vacation_start) - new Date(b.vacation_start))
                                            .slice(0, 5)
                                            .map(emp => (
                                                <div key={emp.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                                            style={{ backgroundColor: SECTORS.find(s => s.id === emp.sector)?.color }}>
                                                            {getInitials(emp.name)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-sm">{emp.name}</div>
                                                            <div className="text-xs text-gray-500">
                                                                A partir de {formatDate(emp.vacation_start)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Sem Férias Agendadas */}
                        <Card className="border-l-4 border-l-red-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-red-500" />
                                    Sem Férias Agendadas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {employees.filter(emp => !emp.vacation_start).length === 0 ? (
                                        <div className="text-sm text-gray-500 italic">Todos com férias agendadas!</div>
                                    ) : (
                                        employees.filter(emp => !emp.vacation_start)
                                            .map(emp => (
                                                <div key={emp.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                                                    <span className="font-medium text-gray-700">{emp.name}</span>
                                                    <Badge variant="outline" className="text-[10px]" style={{ color: SECTORS.find(s => s.id === emp.sector)?.color, borderColor: SECTORS.find(s => s.id === emp.sector)?.color }}>
                                                        {SECTORS.find(s => s.id === emp.sector)?.name}
                                                    </Badge>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Mês a Mês */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Cronograma Anual {new Date().getFullYear()}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {Array.from({ length: 12 }).map((_, monthIndex) => {
                                    const currentMonth = new Date(new Date().getFullYear(), monthIndex, 1);
                                    const monthEmployees = employees.filter(emp => {
                                        if (!emp.vacation_start) return false;
                                        const start = new Date(emp.vacation_start + 'T00:00:00');
                                        return start.getMonth() === monthIndex && start.getFullYear() === currentMonth.getFullYear();
                                    });

                                    if (monthEmployees.length === 0) return null;

                                    return (
                                        <div key={monthIndex} className="border rounded-lg p-3 bg-gray-50/50">
                                            <div className="font-semibold text-xs mb-2 text-gray-500 uppercase tracking-wider border-b pb-1">
                                                {currentMonth.toLocaleString('pt-BR', { month: 'long' })}
                                            </div>
                                            <div className="space-y-2">
                                                {monthEmployees.sort((a, b) => new Date(a.vacation_start) - new Date(b.vacation_start)).map(emp => (
                                                    <div key={emp.id} className="text-xs bg-white p-2 rounded border shadow-sm flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SECTORS.find(s => s.id === emp.sector)?.color }}></div>
                                                            <span className="font-medium truncate max-w-[80px]" title={emp.name}>{emp.name}</span>
                                                        </div>
                                                        <span className="text-gray-500 text-[10px]">
                                                            {formatDate(emp.vacation_start).substring(0, 5)} - {formatDate(emp.vacation_end).substring(0, 5)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-semibold text-lg">
                                {editingEmployee ? 'Editar Colaborador' : 'Novo Colaborador'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Users className="w-4 h-4 inline mr-1" />
                                    Nome *
                                </label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Nome completo"
                                />
                            </div>

                            {/* Cargo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Briefcase className="w-4 h-4 inline mr-1" />
                                    Cargo
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full h-10 px-3 border rounded-md text-sm"
                                >
                                    <option value="">Selecione...</option>
                                    {ROLES.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Setor */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Building2 className="w-4 h-4 inline mr-1" />
                                    Setor *
                                </label>
                                <select
                                    value={formData.sector}
                                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                    className="w-full h-10 px-3 border rounded-md text-sm"
                                >
                                    <option value="">Selecione...</option>
                                    {SECTORS.map(sector => (
                                        <option key={sector.id} value={sector.id}>{sector.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Salário */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        <DollarSign className="w-4 h-4 inline mr-1" />
                                        Salário (R$)
                                    </label>
                                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.show_salary}
                                            onChange={(e) => setFormData({ ...formData, show_salary: e.target.checked })}
                                            className="w-3.5 h-3.5 rounded border-gray-300"
                                        />
                                        Exibir
                                    </label>
                                </div>
                                <Input
                                    type="number"
                                    value={formData.salary}
                                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Data de Admissão */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Data de Admissão
                                </label>
                                <Input
                                    type="date"
                                    value={formData.admission_date}
                                    onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                                />
                            </div>

                            {/* Férias */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        <Palmtree className="w-4 h-4 inline mr-1" />
                                        Férias
                                    </label>
                                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.show_vacation}
                                            onChange={(e) => setFormData({ ...formData, show_vacation: e.target.checked })}
                                            className="w-3.5 h-3.5 rounded border-gray-300"
                                        />
                                        Exibir
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-0.5 block">Início</label>
                                        <Input
                                            type="date"
                                            value={formData.vacation_start}
                                            onChange={(e) => setFormData({ ...formData, vacation_start: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-0.5 block">Término</label>
                                        <Input
                                            type="date"
                                            value={formData.vacation_end}
                                            onChange={(e) => setFormData({ ...formData, vacation_end: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Observações */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        <MessageSquare className="w-4 h-4 inline mr-1" />
                                        Observações
                                    </label>
                                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.show_notes}
                                            onChange={(e) => setFormData({ ...formData, show_notes: e.target.checked })}
                                            className="w-3.5 h-3.5 rounded border-gray-300"
                                        />
                                        Exibir
                                    </label>
                                </div>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Anotações sobre o funcionário..."
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 p-4 border-t">
                            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                                Cancelar
                            </Button>
                            <Button className="flex-1" onClick={handleSave} disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamBoardTab;
