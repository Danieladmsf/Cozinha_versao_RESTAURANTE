'use client';

import { useState, useEffect } from 'react';
import { MenuConfig as MenuConfigEntity } from "@/app/api/entities";
import { APP_CONSTANTS } from "@/lib/constants";

/**
 * Hook centralizado para obter os dias da semana disponíveis
 * Lê a configuração do localStorage e sincroniza com o banco via Firebase
 * 
 * @returns {number[]} Array de dias disponíveis (0=Domingo, 1=Segunda, ..., 6=Sábado)
 */
export const useAvailableDays = () => {
    const [availableDays, setAvailableDays] = useState([0, 1, 2, 3, 4, 5, 6]); // Padrão: Todos os dias

    useEffect(() => {
        const loadDays = () => {
            try {
                const savedConfig = localStorage.getItem('menuConfig');
                if (savedConfig) {
                    const config = JSON.parse(savedConfig);
                    if (config.available_days && Array.isArray(config.available_days)) {
                        setAvailableDays(config.available_days.sort((a, b) => a - b));
                    }
                }
            } catch (error) {
                console.warn('useAvailableDays: Erro ao carregar configuração de dias:', error);
            }
        };

        const fetchRemoteConfig = async () => {
            try {
                const configs = await MenuConfigEntity.query([
                    { field: 'user_id', operator: '==', value: APP_CONSTANTS.MOCK_USER_ID },
                    { field: 'is_default', operator: '==', value: true }
                ]);

                if (configs && configs.length > 0) {
                    const config = configs[0];
                    if (config.available_days && Array.isArray(config.available_days)) {
                        const remoteDays = [...config.available_days].sort((a, b) => a - b);
                        setAvailableDays(remoteDays);

                        // Update localStorage cache to keep it in sync
                        const savedConfig = localStorage.getItem('menuConfig');
                        const localConfig = savedConfig ? JSON.parse(savedConfig) : {};
                        localConfig.available_days = remoteDays;
                        localStorage.setItem('menuConfig', JSON.stringify(localConfig));
                    }
                }
            } catch (error) {
                console.warn('useAvailableDays: Erro ao buscar configuração do Firebase:', error);
            }
        };

        // 1. Initial quick render from cache
        loadDays();

        // 2. Fetch from Firebase right away to ensure we're not lagging behind
        fetchRemoteConfig();

        // Escutar mudanças no localStorage (para atualizar quando configuração mudar)
        const handleStorageChange = (e) => {
            if (e.key === 'menuConfig') {
                loadDays();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return availableDays;
};

/**
 * Mapeamento de índices de dias para nomes em português
 */
export const DAY_NAMES = {
    0: "Domingo",
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta",
    6: "Sábado"
};

/**
 * Mapeamento de índices de dias para nomes completos
 */
export const DAY_NAMES_FULL = {
    0: "Domingo",
    1: "Segunda-feira",
    2: "Terça-feira",
    3: "Quarta-feira",
    4: "Quinta-feira",
    5: "Sexta-feira",
    6: "Sábado"
};

export default useAvailableDays;
