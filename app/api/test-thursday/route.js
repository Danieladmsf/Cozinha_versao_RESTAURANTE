import { NextResponse } from 'next/server';
import { query } from '@/lib/vr-db';

export async function GET() {
    try {
        const storeId = 1;
        const productCode = 7875;

        // 90 days ago
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        const startDateStr = startDate.toISOString().split('T')[0] + ' 00:00:00';

        const endDateStr = new Date().toISOString().split('T')[0] + ' 23:59:59';

        const sqlVenda = `
            SELECT 
                v.id_produto as codigo, 
                SUM(v.quantidade) as quantidade_total,
                COUNT(*) as numero_vendas,
                MAX(v.data) as ultima_venda,
                EXTRACT(DOW FROM v.data) as day_of_week
            FROM venda v
            WHERE 
                v.data >= $2::timestamp 
                AND v.data <= $3::timestamp
                AND v.id_produto = $1::int
                AND v.id_loja = 1
            GROUP BY v.id_produto, EXTRACT(DOW FROM v.data)
            ORDER BY day_of_week ASC
        `;

        const queryParams = [productCode, startDateStr, endDateStr];
        const rowsVenda = await query(sqlVenda, queryParams);

        return NextResponse.json({
            success: true,
            message: "VR Sales for product 7875 (last 90 days)",
            rowsVenda
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.stack }, { status: 500 });
    }
}
