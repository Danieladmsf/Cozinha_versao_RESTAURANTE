import { useState, useEffect, useCallback } from 'react';
import { WorkflowProcess } from '@/app/api/entities';
import { useToast } from '@/components/ui/use-toast';
import { APP_CONSTANTS } from '@/lib/constants';

const DEFAULT_PROCESSES = [
    {
        title: 'Higienização de bancada',
        description: 'Jogar água e sabão na parte de cima e de baixo. Certifique-se que não tenha nada embaixo das bancadas.',
        order: 1,
    },
    {
        title: 'Receitas prontas para cubas',
        description: 'Após terminar de assar ou cozinhar uma receita, transferir para a cuba e armazenar no pastru quente de baixo para cima.',
        order: 2,
    },
    {
        title: 'Após processar insumos',
        description: 'Guardar no pastru frio insumos que necessitam de refrigeração.',
        order: 3,
    },
    {
        title: 'Abastecimento dos fornos',
        description: 'Abastecer o forno devido com os itens de acordo com a receita.',
        order: 4,
    },
    {
        title: 'Monitoramento dos fornos',
        description: 'Monitorar o cozimento ou assar dos itens dispostos no forno.',
        order: 5,
    },
    {
        title: 'Separar as embalagens',
        description: 'Separar as embalagens de uso do dia.',
        order: 6,
    },
];

export function useWorkflowProcesses() {
    const [processes, setProcesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Load processes
    const loadProcesses = useCallback(async () => {
        try {
            setLoading(true);
            const mockUserId = APP_CONSTANTS?.MOCK_USER_ID || 'mock-user-id';
            const data = await WorkflowProcess.list();

            // Filter by user (though list might typically return all if not filtered in backend, assuming entity matches standard pattern)
            // entities.js list() usually gets all. We might want to filter or query.
            // Let's use query if possible or filter locally. The mock user ID is used in other places.
            // Assuming WorkflowProcess.list() returns all, we filter manually or use query.
            // Let's use query directly to be safe and consistent with other hooks.
            const userProcesses = await WorkflowProcess.query([
                { field: 'user_id', operator: '==', value: mockUserId }
            ]);

            if (userProcesses && userProcesses.length > 0) {
                // Sort by order or title
                const sorted = userProcesses.sort((a, b) => (a.order || 99) - (b.order || 99));
                setProcesses(sorted);
            } else {
                // Seed default processes if empty
                console.log('🌱 Seeding default processes...');
                await seedProcesses(mockUserId);
            }
        } catch (error) {
            console.error('Error loading processes:', error);
            toast({
                title: 'Erro ao carregar processos',
                description: 'Não foi possível carregar os processos.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const seedProcesses = async (userId) => {
        try {
            const created = [];
            for (const proc of DEFAULT_PROCESSES) {
                const newProc = await WorkflowProcess.create({
                    ...proc,
                    user_id: userId,
                    created_at: new Date().toISOString()
                });
                if (newProc) created.push(newProc);
            }
            setProcesses(created);
            toast({
                title: 'Processos padrão criados',
                description: 'Os processos padrão foram adicionados com sucesso.',
            });
        } catch (error) {
            console.error('Error seeding processes:', error);
        }
    };

    const addProcess = async (processData) => {
        try {
            const mockUserId = APP_CONSTANTS?.MOCK_USER_ID || 'mock-user-id';
            const newProcess = await WorkflowProcess.create({
                ...processData,
                user_id: mockUserId,
                created_at: new Date().toISOString(),
                order: processes.length + 1
            });

            if (newProcess) {
                setProcesses(prev => [...prev, newProcess]);
                toast({
                    title: 'Processo criado',
                    description: 'O processo foi criado com sucesso.',
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding process:', error);
            toast({
                title: 'Erro ao criar processo',
                description: 'Não foi possivel criar o processo.',
                variant: 'destructive',
            });
            return false;
        }
    };

    const removeProcess = async (processId) => {
        try {
            await WorkflowProcess.delete(processId);
            setProcesses(prev => prev.filter(p => p.id !== processId));
            toast({
                title: 'Processo removido',
                description: 'O processo foi removido com sucesso.',
            });
            return true;
        } catch (error) {
            console.error('Error removing process:', error);
            toast({
                title: 'Erro ao remover processo',
                description: 'Não foi possível remover o processo.',
                variant: 'destructive',
            });
            return false;
        }
    };

    useEffect(() => {
        loadProcesses();
    }, [loadProcesses]);

    return {
        processes,
        loading,
        addProcess,
        removeProcess,
        refresh: loadProcesses
    };
}
