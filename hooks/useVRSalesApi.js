'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Firestore Client instance

/**
 * Hook para comunicação com a API VR Soft
 * Busca dados de vendas em tempo real do banco de dados VR
 */

// Helper to check env var robustly
const getIsSyncMode = () => true;

/**
 * Hook principal para gerenciar dados de vendas da API VR
 * Simplificado para usar apenas Firebase Sync
 */
export function useVRSalesApi(options = {}) {
    const {
        refreshInterval = 5 * 60 * 1000 // Mantido para compatibilidade de assinatura
    } = options;

    const [salesData, setSalesData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [apiOnline, setApiOnline] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    // --- FIREBASE SYNC INTEGRATION (Vercel Support) ---
    // If enabled, we listen to Firestore instead of polling the API
    useEffect(() => {
        const useSync = getIsSyncMode();

        // Debug Log to help user verify Vercel config
        console.log('🔍 [useVRSalesApi] Mode Check:', {
            raw: process.env.NEXT_PUBLIC_USE_FIREBASE_SYNC,
            isSyncMode: useSync
        });

        if (useSync) {
            console.log('🔌 [useVRSalesApi] Using Firebase Sync mode');
            setLoading(true); // Initial load state

            const unsub = onSnapshot(
                doc(db, "vr_sales_sync", "current_snapshot"),
                async (docSnapshot) => {
                    // Note: Made callback async to handle chunk fetching
                    if (docSnapshot.exists()) {
                        const meta = docSnapshot.data();
                        console.log(`🔥 [Firebase Sync] Metadata Update: ${meta.cnt || 0} items, Chunks: ${meta.totalChunks || 1}`);

                        let parsedSales = {};

                        try {
                            // Check strategy
                            if (meta.strategy === 'chunked' || meta.totalChunks > 0) {
                                const totalChunks = meta.totalChunks || 1;
                                // We don't want to spam fetches if data hasn't actually changed in a way we care about, 
                                // but for now, simplistic approach: fetch all chunks on metadata change.
                                console.log(`📦 [Firebase Sync] Fetching ${totalChunks} chunks...`);

                                const chunkPromises = [];
                                for (let i = 0; i < totalChunks; i++) {
                                    chunkPromises.push(getDoc(doc(db, "vr_sales_sync", `snapshot_chunk_${i}`)));
                                }

                                const chunkSnapshots = await Promise.all(chunkPromises);

                                chunkSnapshots.forEach(chunkSnap => {
                                    if (chunkSnap.exists()) {
                                        const chunkData = chunkSnap.data();
                                        if (chunkData.items) {
                                            const items = JSON.parse(chunkData.items);
                                            // Convert array back to map { code: item }
                                            items.forEach(item => {
                                                parsedSales[item.codigo] = item;
                                            });
                                        }
                                    }
                                });
                            } else if (meta.sales) {
                                // Fallback for legacy / single doc
                                parsedSales = typeof meta.sales === 'string' ? JSON.parse(meta.sales) : meta.sales;
                            }

                            // Normalization
                            Object.values(parsedSales).forEach(item => {
                                if (item.quantidade !== undefined && item.quantidade_total === undefined) {
                                    item.quantidade_total = item.quantidade;
                                }
                            });

                            console.log(`✅ [Firebase Sync] Reassembled ${Object.keys(parsedSales).length} items`);
                            setSalesData(parsedSales);
                            setLastUpdate(new Date(meta.updatedAt));
                            setApiOnline(true);
                            setError(null);
                            setLoading(false);

                        } catch (e) {
                            console.error('❌ [Firebase Sync] Chunk Parse Error:', e);
                            setError('Error parsing sync data');
                            setLoading(false);
                        }
                    } else {
                        console.warn('⚠️ [Firebase Sync] Document not found');
                        setApiOnline(false);
                        setLoading(false);
                    }
                },
                (err) => {
                    console.error('❌ [Firebase Sync] Error:', err);
                    setError('Firebase Sync Error');
                    setApiOnline(false);
                    setLoading(false);
                }
            );
            return () => unsub();
        }
    }, []);

    return {
        // Estado
        salesData, // Mapa completo: { codigo: { ...dados, daily: {} } }
        loading,
        error,
        apiOnline,
        lastUpdate,

        // Ações (Mantidas para compatibilidade, mas simplificadas)
        refresh: () => console.log('Refresh handled by Firestore Subscription'),
    };
}

export default useVRSalesApi;
