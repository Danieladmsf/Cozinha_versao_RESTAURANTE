'use client';

import { useState, useEffect } from 'react';

/**
 * Hook centralizado para obter os dias da semana disponíveis
 * Lê a configuração do localStorage e retorna os dias ordenados
 * 
 * @returns {number[]} Array de dias disponíveis (0=Domingo, 1=Segunda, ..., 6=Sábado)
 */
export const useAvailableDays = () => {
    const [availableDays, setAvailableDays] = useState([1, 2, 3, 4, 5]); // Padrão: Segunda a Sexta

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

        loadDays();

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
