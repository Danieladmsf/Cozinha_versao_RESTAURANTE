'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook para comunicação com a API VR Soft
 * Busca dados de vendas em tempo real do banco de dados VR
 */

// URL base da API VR - configurável via variável de ambiente
const VR_API_BASE_URL = process.env.NEXT_PUBLIC_VR_API_URL || 'http://localhost:5005';

/**
 * Busca dados de vendas de um produto específico
 * @param {number} productCode - Código do produto no VR
 * @returns {Promise<Object>} Dados de vendas
 */
async function fetchProductSales(productCode) {
    try {
        const response = await fetch(`${VR_API_BASE_URL}/vendas/produto/${productCode}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro ao buscar vendas do produto ${productCode}:`, error);
        return null;
    }
}

/**
 * Busca dados de vendas de múltiplos produtos em lote
 * @param {number[]} productCodes - Lista de códigos de produtos
 * @returns {Promise<Object>} Dados de vendas agrupados por código
 */
async function fetchMultipleProductSales(productCodes) {
    try {
        const response = await fetch(`${VR_API_BASE_URL}/vendas/produtos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ codigos: productCodes }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar vendas em lote:', error);
        return null;
    }
}

/**
 * Busca histórico de vendas de um produto
 * @param {number} productCode - Código do produto no VR
 * @returns {Promise<Object>} Histórico de vendas
 */
async function fetchProductHistory(productCode) {
    try {
        const response = await fetch(`${VR_API_BASE_URL}/vendas/produto/${productCode}/historico`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro ao buscar histórico do produto ${productCode}:`, error);
        return null;
    }
}

/**
 * Verifica status da API VR
 * @returns {Promise<boolean>} true se API está online
 */
async function checkApiStatus() {
    try {
        const response = await fetch(`${VR_API_BASE_URL}/`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // timeout de 5 segundos
        });
        if (!response.ok) return false;
        const data = await response.json();
        return data.status === 'online';
    } catch (error) {
        console.error('API VR offline:', error);
        return false;
    }
}

/**
 * Hook principal para gerenciar dados de vendas da API VR
 * @param {Object} options - Opções de configuração
 * @param {number} options.refreshInterval - Intervalo de atualização em ms (default: 5 min)
 * @param {boolean} options.autoRefresh - Se deve atualizar automaticamente
 */
export function useVRSalesApi(options = {}) {
    const {
        refreshInterval = 5 * 60 * 1000, // 5 minutos
        autoRefresh = true
    } = options;

    const [salesData, setSalesData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [apiOnline, setApiOnline] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    const productCodesRef = useRef([]);
    const intervalRef = useRef(null);

    // Verificar status da API
    const checkStatus = useCallback(async () => {
        const online = await checkApiStatus();
        setApiOnline(online);
        return online;
    }, []);

    // Buscar vendas de um produto
    const getProductSales = useCallback(async (productCode) => {
        if (!productCode) return null;

        setLoading(true);
        setError(null);

        try {
            const data = await fetchProductSales(productCode);
            if (data) {
                setSalesData(prev => ({
                    ...prev,
                    [productCode]: data
                }));
            }
            return data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Armazenar últimos parâmetros de busca para refresh
    const lastPeriodRef = useRef({ codes: [], startDate: null, endDate: null });

    // Buscar vendas de múltiplos produtos em um período
    const getProductSalesInPeriod = useCallback(async (productCodes, startDate, endDate) => {
        if (!productCodes || productCodes.length === 0) return null;

        // Filtrar códigos válidos (não nulos e numéricos)
        const validCodes = productCodes.filter(code => code && !isNaN(code));
        if (validCodes.length === 0) return null;

        // Atualizar ref para refresh
        lastPeriodRef.current = { codes: validCodes, startDate, endDate };

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${VR_API_BASE_URL}/vendas/produtos/periodo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    codigos: validCodes,
                    data_inicio: startDate, // YYYY-MM-DD
                    data_fim: endDate       // YYYY-MM-DD
                }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            if (data && data.produtos) {
                const salesMap = {};
                data.produtos.forEach(prod => {
                    salesMap[prod.codigo] = prod;
                });
                setSalesData(prev => ({
                    ...prev,
                    ...salesMap
                }));
                setLastUpdate(new Date());
            }
            return data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ... (getProductHistory placeholder)
    // Buscar histórico de um produto
    const getProductHistory = useCallback(async (productCode) => {
        if (!productCode) return null;
        return await fetchProductHistory(productCode);
    }, []);

    // Atualizar dados (refresh)
    const refresh = useCallback(async () => {
        const { codes, startDate, endDate } = lastPeriodRef.current;
        if (codes && codes.length > 0 && startDate && endDate) {
            return await getProductSalesInPeriod(codes, startDate, endDate);
        }
        return null;
    }, [getProductSalesInPeriod]);

    // Setup auto-refresh
    useEffect(() => {
        if (autoRefresh && refreshInterval > 0) {
            intervalRef.current = setInterval(() => {
                refresh();
            }, refreshInterval);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [autoRefresh, refreshInterval, refresh]);

    // Verificar status inicial da API
    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    return {
        // Estado
        salesData,
        loading,
        error,
        apiOnline,
        lastUpdate,

        // Ações
        getProductSales,
        getProductSalesInPeriod,
        getProductHistory,
        refresh,
        checkStatus,
    };
}

export default useVRSalesApi;
