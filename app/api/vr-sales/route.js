
import { NextResponse } from 'next/server';
import { query } from '@/lib/vr-db';

// Enhanced Logging and Real DB Check
export async function POST(request) {
    try {
        const body = await request.json();


        const { codigos, data_inicio, data_fim, storeId, dayOfWeek } = body; // Added dayOfWeek

        console.log(`🔍 [API] Request: ${codigos?.length} items for ${data_inicio} to ${data_fim} (Store: ${storeId || 'ALL'}, DOW: ${dayOfWeek !== undefined ? dayOfWeek : 'ALL'})`);

        if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
            return NextResponse.json({ success: true, produtos: [] });
        }


        // Helper to safe parse int
        const safeInt = (val) => {
            const parsed = parseInt(val);
            return isNaN(parsed) ? null : parsed;
        };

        // Ensure dates cover the full day
        const startDateFull = data_inicio.length === 10 ? `${data_inicio} 00:00:00` : data_inicio;
        const endDateFull = data_fim.length === 10 ? `${data_fim} 23:59:59` : data_fim;

        console.log(`🔍 [API] Adjusted Range: ${startDateFull} to ${endDateFull}`);

        // Validate filters
        const targetStoreId = storeId ? parseInt(storeId) : null;
        const targetDayOfWeek = (dayOfWeek !== undefined && dayOfWeek !== null) ? parseInt(dayOfWeek) : null;

        // Query 1: LOGESTOQUE for real-time sales (Type 4)
        const sqlLog = `
            SELECT 
                l.id_produto as codigo, 
                SUM(l.quantidade) as quantidade_total,
                COUNT(*) as numero_vendas,
                COUNT(DISTINCT l.datahora::date) as dias_vendidos,
                MAX(l.datahora) as ultima_venda
            FROM logestoque l
            WHERE 
                l.datahora >= $2::timestamp 
                AND l.datahora <= $3::timestamp
                AND l.id_produto = ANY($1::int[])
                AND l.id_tipomovimentacao = 4
                ${targetStoreId ? `AND l.id_loja = ${targetStoreId}` : ''}
                ${targetDayOfWeek !== null ? `AND EXTRACT(DOW FROM l.datahora) = ${targetDayOfWeek}` : ''}
            GROUP BY l.id_produto
        `;

        // Query 2: VENDA View for consolidated/historical sales (Fallback)
        const sqlVenda = `
            SELECT 
                v.id_produto as codigo, 
                SUM(v.quantidade) as quantidade_total,
                COUNT(*) as numero_vendas,
                MAX(v.data) as ultima_venda
            FROM venda v
            WHERE 
                v.data >= $2::timestamp 
                AND v.data <= $3::timestamp
                AND v.id_produto = ANY($1::int[])
                ${targetStoreId ? `AND v.id_loja = ${targetStoreId}` : ''}
                ${targetDayOfWeek !== null ? `AND EXTRACT(DOW FROM v.data) = ${targetDayOfWeek}` : ''}
            GROUP BY v.id_produto
        `;

        const queryParams = [codigos, startDateFull, endDateFull];

        console.log(`📊 [API] Executing Dual Query Strategy...`);

        // Execute both queries in parallel
        const [rowsLog, rowsVenda] = await Promise.all([
            query(sqlLog, queryParams).catch(err => { console.error('Logestoque Error:', err); return []; }),
            query(sqlVenda, queryParams).catch(err => { console.error('Venda Error:', err); return []; })
        ]);

        console.log(`✅ [API] Results: Logestoque=${rowsLog.length}, Venda=${rowsVenda.length}`);

        // Merge Strategy: Use MAX quantity found in either source
        const mergedSales = {};

        // Process Venda first (Base)
        rowsVenda.forEach(row => {
            mergedSales[row.codigo] = {
                codigo: row.codigo,
                quantidade_total: parseFloat(row.quantidade_total),
                numero_vendas: parseInt(row.numero_vendas),
                ultima_venda: row.ultima_venda,
                source: 'venda'
            };
        });

        // Process Logestoque (Overlay/Max)
        rowsLog.forEach(row => {
            const code = row.codigo;
            const logQty = parseFloat(row.quantidade_total);

            if (!mergedSales[code]) {
                // New entry from Logestoque
                mergedSales[code] = {
                    codigo: row.codigo,
                    quantidade_total: logQty,
                    numero_vendas: parseInt(row.numero_vendas),
                    ultima_venda: row.ultima_venda,
                    source: 'logestoque'
                };
            } else {
                // Entry exists: Check MAX
                const vendaQty = mergedSales[code].quantidade_total;
                if (logQty > vendaQty) { // Only update if Logestoque has MORE
                    mergedSales[code].quantidade_total = logQty;
                    mergedSales[code].numero_vendas = Math.max(mergedSales[code].numero_vendas, parseInt(row.numero_vendas));
                    // Always take latest date
                    if (new Date(row.ultima_venda) > new Date(mergedSales[code].ultima_venda)) {
                        mergedSales[code].ultima_venda = row.ultima_venda;
                    }
                    mergedSales[code].source = 'logestoque_override';
                }
            }
        });

        const produtos = Object.values(mergedSales);

        return NextResponse.json({
            success: true,
            produtos: produtos
        });

    } catch (error) {
        console.error('❌ [API] DB Error:', error);
        return NextResponse.json(
            { success: false, error: error.message, details: error.toString() },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        await query('SELECT 1');
        return NextResponse.json({ status: 'online', service: 'vr-sales-proxy', db: 'connected' });
    } catch (error) {
        console.error('❌ [API] Health Check Failed:', error);
        return NextResponse.json({ status: 'offline', error: error.message }, { status: 500 });
    }
}
