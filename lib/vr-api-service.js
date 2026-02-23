

// Use internal API route instead of direct localhost:5001
const API_BASE_URL = '/api';

export class VrApiService {
    /**
     * Checks if the VR API (Proxy) is online
     * @returns {Promise<boolean>}
     */
    static async checkStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/vr-sales`, {
                method: 'GET',
                cache: 'no-store'
            });
            return response.ok;
        } catch (error) {
            console.warn('⚠️ VR API Proxy Offline:', error);
            return false;
        }
    }

    /**
     * Fetches sales data for a batch of products over a date range
     * @param {Array<number>} productCodes - List of product codes (integers)
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     * @param {number|null} storeId - Optional VR Store ID
     * @param {number|null} dayOfWeek - Optional Day of Week (0-6)
     * @returns {Promise<Object>} Map of code -> sales data
     */
    static async getSalesBatch(productCodes, startDate, endDate, storeId = null, dayOfWeek = null) {
        if (!productCodes || productCodes.length === 0) return {};

        try {
            const body = {
                codigos: productCodes,
                data_inicio: startDate,
                data_fim: endDate
            };

            if (storeId) {
                body.storeId = storeId;
            }

            if (dayOfWeek !== null && dayOfWeek !== undefined) {
                body.dayOfWeek = dayOfWeek;
            }

            const response = await fetch(`${API_BASE_URL}/vr-sales`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`API Proxy Error: ${response.statusText}`);
            }

            const data = await response.json();

            // Transform array response to a map for easier lookup
            // data.produtos = [{ codigo: 123, quantidade_total: 50, ... }, ...]
            const salesMap = {};
            if (data && data.produtos) {
                data.produtos.forEach(item => {
                    salesMap[item.codigo] = item;
                });
            }

            return salesMap;
        } catch (error) {
            console.error('❌ Error fetching VR sales via Proxy:', error);
            return {}; // Return empty map on error
        }
    }
}
