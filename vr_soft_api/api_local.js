/**
 * VR Soft API - Versão Local com Cache
 * Roda na sua máquina local usando os dados extraídos como cache
 * Sincroniza quando você executa EXTRAIR_DADOS.bat no servidor virtual
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_PORT = process.env.PORT || 5001;
const DATA_DIR = path.join(__dirname, 'dados_extraidos');

console.log('='.repeat(50));
console.log('VR Soft API - Local (Cache Mode)');
console.log('='.repeat(50));
console.log(`Porta: ${API_PORT}`);
console.log(`Dados: ${DATA_DIR}`);
console.log('');

// Carrega dados do cache
function loadCache(filename) {
    const filepath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filepath)) {
        try {
            return JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } catch (e) {
            console.error(`Erro ao carregar ${filename}:`, e.message);
            return null;
        }
    }
    return null;
}

function sendJSON(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data, null, 2));
}

function handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${pathname}`);

    // CORS
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    try {
        // Health check
        if (pathname === '/' || pathname === '/health') {
            const produtos = loadCache('produtos.json');
            const tabelas = loadCache('tabelas.json');
            return sendJSON(res, {
                status: 'online',
                mode: 'cache',
                version: '1.0',
                cache: {
                    produtos: produtos ? produtos.rows.length : 0,
                    tabelas: tabelas ? tabelas.rows.length : 0,
                    lastUpdate: fs.existsSync(DATA_DIR + '/produtos.json')
                        ? fs.statSync(DATA_DIR + '/produtos.json').mtime
                        : null
                }
            });
        }

        // Listar tabelas
        if (pathname === '/tables' || pathname === '/tabelas') {
            const data = loadCache('tabelas.json');
            if (!data) {
                return sendJSON(res, {
                    success: false,
                    error: 'Cache não disponível. Execute EXTRAIR_DADOS.bat no servidor virtual.'
                }, 404);
            }
            return sendJSON(res, {
                success: true,
                count: data.rows.length,
                tables: data.rows.map(r => r.table_name)
            });
        }

        // Listar produtos
        if (pathname === '/produtos') {
            const data = loadCache('produtos.json');
            if (!data) {
                return sendJSON(res, {
                    success: false,
                    error: 'Cache não disponível. Execute EXTRAIR_DADOS.bat no servidor virtual.'
                }, 404);
            }

            const limit = parseInt(url.searchParams.get('limit')) || 100;
            const offset = parseInt(url.searchParams.get('offset')) || 0;
            const search = url.searchParams.get('search') || '';

            let rows = data.rows;

            // Filtro de busca
            if (search) {
                const searchLower = search.toLowerCase();
                rows = rows.filter(r =>
                    (r.descricaocompleta && r.descricaocompleta.toLowerCase().includes(searchLower)) ||
                    (r.id && r.id.toString().includes(search))
                );
            }

            const total = rows.length;
            rows = rows.slice(offset, offset + limit);

            return sendJSON(res, {
                success: true,
                total,
                count: rows.length,
                offset,
                limit,
                data: rows
            });
        }

        // Buscar produto por ID
        if (pathname.startsWith('/produto/')) {
            const id = pathname.split('/')[2];
            const data = loadCache('produtos.json');
            if (!data) {
                return sendJSON(res, {
                    success: false,
                    error: 'Cache não disponível'
                }, 404);
            }

            const produto = data.rows.find(r => r.id === id || r.id === parseInt(id));
            if (!produto) {
                return sendJSON(res, {
                    success: false,
                    error: 'Produto não encontrado'
                }, 404);
            }

            return sendJSON(res, {
                success: true,
                data: produto
            });
        }

        // Buscar dados genéricos do cache
        if (pathname.startsWith('/cache/')) {
            const filename = pathname.split('/')[2] + '.json';
            const data = loadCache(filename);
            if (!data) {
                return sendJSON(res, {
                    success: false,
                    error: `Cache '${filename}' não encontrado`
                }, 404);
            }
            return sendJSON(res, {
                success: true,
                ...data
            });
        }

        // Lista arquivos de cache disponíveis
        if (pathname === '/cache') {
            const files = fs.readdirSync(DATA_DIR)
                .filter(f => f.endsWith('.json'))
                .map(f => {
                    const stats = fs.statSync(DATA_DIR + '/' + f);
                    return {
                        name: f.replace('.json', ''),
                        size: stats.size,
                        modified: stats.mtime
                    };
                });
            return sendJSON(res, {
                success: true,
                files
            });
        }

        // Endpoint de Vendas (Integração Frontend)
        if (pathname === '/vendas/produtos/periodo' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { codigos, data_inicio, data_fim } = JSON.parse(body);
                    const vendasData = loadCache('vendas_diarias.json');

                    if (!vendasData) {
                        return sendJSON(res, { success: true, produtos: [] }); // Retorna vazio se não tiver cache
                    }

                    const start = new Date(data_inicio);
                    const end = new Date(data_fim);
                    const codigosSet = new Set(codigos.map(Number));
                    const aggregated = {};

                    vendasData.rows.forEach(row => {
                        const rowDate = new Date(row.data);
                        const prodId = Number(row.produto_id);

                        if (rowDate >= start && rowDate <= end && codigosSet.has(prodId)) {
                            if (!aggregated[prodId]) {
                                aggregated[prodId] = { codigo: prodId, quantidade_total: 0, numero_vendas: 0 };
                            }
                            aggregated[prodId].quantidade_total += parseFloat(row.quantidade_total || 0);
                            aggregated[prodId].numero_vendas += parseInt(row.numero_vendas || 0);
                        }
                    });

                    return sendJSON(res, {
                        success: true,
                        produtos: Object.values(aggregated)
                    });

                } catch (e) {
                    sendJSON(res, { success: false, error: 'Invalid JSON body' }, 400);
                }
            });
            return;
        }

        sendJSON(res, { error: 'Rota não encontrada', pathname }, 404);

    } catch (err) {
        console.error('Erro:', err.message);
        sendJSON(res, { success: false, error: err.message }, 500);
    }
}

// Verifica se pasta de dados existe
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('⚠️  Pasta de cache criada. Execute EXTRAIR_DADOS.bat no servidor virtual para popular.');
}

// Inicia servidor
const server = http.createServer(handleRequest);

server.listen(API_PORT, '0.0.0.0', () => {
    console.log(`✅ API rodando em http://localhost:${API_PORT}`);
    console.log('');
    console.log('Endpoints:');
    console.log('  GET /health       - Status da API');
    console.log('  GET /produtos     - Listar produtos (?search=termo&limit=100)');
    console.log('  GET /produto/:id  - Buscar produto por ID');
    console.log('  GET /tabelas      - Listar tabelas');
    console.log('  GET /cache        - Listar caches disponíveis');
    console.log('');
    console.log('Para atualizar os dados: Execute EXTRAIR_DADOS.bat no servidor virtual VR');
    console.log('');
});
