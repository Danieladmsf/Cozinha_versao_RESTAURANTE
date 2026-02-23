import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { id } = params;
    const VR_API_URL = 'http://localhost:8000'; // Tenta local primeiro
    // Nota: Em contêiner, 'localhost' é o contêiner. O usuário roda no host.
    // Mas Next.js server-side roda no ambiente Node. Se for dev local, é localhost.

    console.log(`🔍 Buscando item VR Soft ${id}...`);

    try {
        // 1. Tentar conectar na API Python Real
        // Timeout curto para não travar a UI se não tiver rodando
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        // Query real que usaríamos
        const query = `SELECT * FROM produtos WHERE id = ${id} OR codigo = ${id}`;

        const auth = Buffer.from('admin:VrSoft@2026').toString('base64');

        const response = await fetch(`${VR_API_URL}/query/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({ query }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                console.log("✅ Item encontrado na API Real!");
                return NextResponse.json({ source: 'real', data: data[0] });
            }
        }

        console.log("⚠️ Falha ou Item não encontrado na API Real. Usando Mock.");
        throw new Error("API não acessível ou item não encontrado");

    } catch (error) {
        // 2. FALLBACK MOCK (Para ajudar com as "ideias" mesmo sem conexão)
        console.log(`⚠️ Usando dados MOCK para item ${id}`);

        if (id == '1855') {
            return NextResponse.json({
                source: 'mock',
                note: 'Dados simulados (API VR Soft não detectada)',
                data: {
                    id: 1855,
                    codigo: 1855,
                    descricao: 'AGUA COCO 100% NATURAL F.PROPRIA 300ML',
                    descricao_reduzida: 'AGUA COCO 300ML',
                    preco_venda: 6.50,
                    unidade: 'UN',
                    grupo: 'BEBIDAS',
                    subgrupo: 'NATURAIS',
                    custo_ult_compra: 2.10,
                    estoque_atual: 42,
                    ativo: true
                }
            });
        }

        return NextResponse.json({
            error: 'Item não encontrado (Mock disponível apenas para 1855)',
            real_error: error.message
        }, { status: 404 });
    }
}
