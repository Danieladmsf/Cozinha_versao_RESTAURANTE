import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request) {
    try {
        const matrizId = '2Ub3ONFSJqb5hkso17uq';
        const produtoId = 'XzGyM6vETrgxwTOQG3f9';

        const matrizDoc = await adminDb.collection('Recipe').doc(matrizId).get();
        const produtoDoc = await adminDb.collection('Recipe').doc(produtoId).get();

        return NextResponse.json({
            matriz: matrizDoc.data()?.preparations?.[0]?.ingredients?.map(i => ({
                name: i.name,
                raw: i.weight_raw,
                pre: i.weight_pre_cooking,
                cooked: i.weight_cooked,
                clean: i.weight_clean
            })) || [],
            produto: produtoDoc.data()?.preparations?.[0]?.ingredients?.map(i => ({
                name: i.name,
                raw: i.weight_raw,
                pre: i.weight_pre_cooking,
                cooked: i.weight_cooked,
                clean: i.weight_clean
            })) || []
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
