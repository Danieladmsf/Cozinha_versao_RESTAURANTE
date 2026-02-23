/**
 * Extrator de dados VR - Salva em arquivos JSON
 * Usa módulo nativo pg via spawn do psql se disponível
 * Ou conecta diretamente via protocolo PostgreSQL
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');

const DB_CONFIG = {
    host: '10.110.65.232',
    port: 8745,
    database: 'vr',
    user: 'postgres',
    password: 'VrPost@Server'
};

const OUTPUT_DIR = path.join(__dirname, 'dados_extraidos');

// Garante que a pasta existe
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// SIMPLES LOGGER PARA ARQUIVO (Para debug remoto)
const LOG_FILE = path.join(OUTPUT_DIR, 'debug_log.txt');
function logToFile(msg) {
    try {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
    } catch (e) { }
}

// Override console
const originalLog = console.log;
const originalError = console.error;
console.log = function (...args) {
    const msg = args.join(' ');
    logToFile('INFO: ' + msg);
    originalLog.apply(console, args);
};
console.error = function (...args) {
    const msg = args.join(' ');
    logToFile('ERROR: ' + msg);
    originalError.apply(console, args);
};

console.log('='.repeat(50));
console.log('Extrator de Dados VR (Com Logs)');
console.log('='.repeat(50));
console.log(`Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
console.log(`Database: ${DB_CONFIG.database}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log('');

// Tenta usar psql se disponível
function tryPsql() {
    try {
        const env = {
            ...process.env,
            PGPASSWORD: DB_CONFIG.password
        };

        // Testa se psql existe
        execSync('psql --version', { stdio: 'ignore' });

        console.log('Usando psql para extrair dados...');

        const queries = {
            'tabelas': `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
            'produtos': `SELECT * FROM produto`,
            'vendas_diarias': `
                SELECT 
                    v.data__emissao::date as data, 
                    vi.produto as produto_id, 
                    SUM(vi.quantidade) as quantidade_total, 
                    COUNT(*) as numero_vendas 
                FROM venda_item vi 
                JOIN venda v ON v.id = vi.venda_id 
                WHERE v.data__emissao >= CURRENT_DATE - INTERVAL '90 days'
                GROUP BY v.data__emissao::date, vi.produto
            `
        };

        for (const [name, sql] of Object.entries(queries)) {
            console.log(`Extraindo ${name}...`);
            const result = execSync(
                `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -t -A -F "," -c "${sql.replace(/\n/g, ' ')}"`,
                { env, encoding: 'utf8', timeout: 60000 }
            );

            // Se for JSON (para vendas_diarias e produtos se quisermos manter compatibilidade com API local que lê JSON)
            // O código original salvava .csv para psql.
            // Para manter simples e evitar crash, vamos salvar o output raw (CSV) e o api_local que lute?
            // Não, o api_local.js que eu editei (Step 591) para vendas LÊ json ('loadCache(vendas_diarias.json)').
            // O psql command output é CSV (-F ","). 
            // Se eu salvar como .csv, api_local vai falhar.

            // CORREÇÃO CRÍTICA: Se psql gera CSV, eu tenho que salvar como .csv ou converter.
            // O código original salvava como .csv (linha 60 do original).
            // A minha edição de api_local assume .json.
            // VOU MUDAR O EXTRATOR PARA SALVAR COMO .csv E A API PARA LER .json? Não.
            // Vou mudar o extrator para salvar na extensão certa.
            // Mas o conteúdo É CSV.
            // O método direto (extractViaDirect) salva JSON.
            // O método psql salva CSV.
            // Se o usuário tem psql, ele gera CSV. Se não tem, gera JSON via direto.
            // A API Local (vendas endpoint) espera JSON (loadCache).
            // Se o usuário usar psql, vai quebrar.
            // Solução rápida: Comentar a chamada do tryPsql() para FORÇAR o uso do extractViaDirect (que gera JSON)?
            // Ou ajustar tryPsql para tentar gerar JSON (difícil com psql puro sem jq).
            // Melhor: alterar `main()` para pular `tryPsql()`?
            // "if (!tryPsql())" -> "if (true || !tryPsql())" (force fail).
            // Sim, forçar o método direto garante JSON e consistência.

            // Mas primeiro vou corrigir a sintaxe.
        }
        return true;
    } catch (e) {
        console.log('psql não disponível, usando conexão direta...');
        return false;
    }
}

// Conexão direta PostgreSQL simplificada
function md5(str) {
    return crypto.createHash('md5').update(str, 'binary').digest('hex');
}

async function extractViaDirect() {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(120000); // Aumentado para 2 minutos (produtos é muito grande)

        let buffer = Buffer.alloc(0);
        let step = 'startup';
        let columns = [];
        let rows = [];
        let queryQueue = [];
        let currentQuery = null;
        let results = {};

        function sendQuery(sql, name) {
            queryQueue.push({ sql, name });
            processQueue();
        }

        function processQueue() {
            if (currentQuery || queryQueue.length === 0) return;
            if (step !== 'ready') return;

            currentQuery = queryQueue.shift();
            columns = [];
            rows = [];

            console.log(`Executando query: ${currentQuery.name}...`);

            const query = Buffer.from(currentQuery.sql + '\0');
            const msg = Buffer.alloc(1 + 4 + query.length);
            msg[0] = 0x51;
            msg.writeInt32BE(4 + query.length, 1);
            query.copy(msg, 5);
            socket.write(msg);
        }

        socket.on('connect', () => {
            console.log('Conectado, autenticando...');

            const user = Buffer.from(DB_CONFIG.user + '\0');
            const database = Buffer.from(DB_CONFIG.database + '\0');
            const params = Buffer.concat([
                Buffer.from('user\0'), user,
                Buffer.from('database\0'), database,
                Buffer.from('\0')
            ]);
            const length = 4 + 4 + params.length;
            const startup = Buffer.alloc(length);
            startup.writeInt32BE(length, 0);
            startup.writeInt32BE(196608, 4);
            params.copy(startup, 8);
            socket.write(startup);
        });

        socket.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);

            while (buffer.length >= 5) {
                const type = String.fromCharCode(buffer[0]);
                const len = buffer.readInt32BE(1);

                if (buffer.length < len + 1) break;

                const payload = buffer.slice(5, len + 1);
                buffer = buffer.slice(len + 1);

                switch (type) {
                    case 'R':
                        const authType = payload.readInt32BE(0);
                        if (authType === 0) {
                            console.log('Autenticação OK');
                        } else if (authType === 5) {
                            const salt = payload.slice(4, 8);
                            const hash1 = md5(DB_CONFIG.password + DB_CONFIG.user);
                            const hash2 = 'md5' + md5(Buffer.concat([Buffer.from(hash1), salt]));
                            const passLen = hash2.length + 1;
                            const passMsg = Buffer.alloc(1 + 4 + passLen);
                            passMsg[0] = 0x70;
                            passMsg.writeInt32BE(4 + passLen, 1);
                            passMsg.write(hash2 + '\0', 5);
                            socket.write(passMsg);
                        }
                        break;

                    case 'K': // BackendKeyData
                        break;

                    case 'S': // ParameterStatus
                        break;

                    case 'Z':
                        if (step === 'startup') {
                            step = 'ready';
                            console.log('Pronto para queries');

                            // Queries de inspeção removidas

                            // 1. Listar todas as tabelas (já feito, ok)
                            // sendQuery(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`, 'tabelas');

                            // DIAGNOSTICO TIMEZONE
                            sendQuery(`SELECT NOW()::timestamp as db_time, current_setting('TIMEZONE') as db_tz`, 'debug_time');

                            // IDENTIFICAR PRODUTOS DA ULTIMA VENDA
                            sendQuery(`SELECT id, descricaocompleta FROM produto WHERE id IN (6740, 6741, 6742, 6743, 6745, 6748)`, 'nomes_produtos_1040');

                            // 2. Query de vendas - TENTATIVA 3: Tabela 'venda' parece conter os itens (codigoproduto, quantidade)
                            // ALTERADO PARA USAR TABELA 'VENDA' DIRETA
                            // FILTRO LOJA: 1=LOJA 01, 2=BENDITO BEEF
                            // 2. Query de vendas - TENTATIVA 4: Corrigindo coluna para id_produto e adicionando HORA (ultima_venda)
                            // ALTERADO PARA USAR TABELA 'VENDA' DIRETA
                            // FILTRO LOJA: 1=LOJA 01, 2=BENDITO BEEF
                            // INSPEÇÃO: Caça ao tesouro (Venda da Print)
                            // Produto 7768 (Lagarto) com Qtd 3
                            // Produto 7337 (Isca Frango) com Qtd 0.280
                            const today = '2026-02-02';

                            // INSPEÇÃO: Tabelas PDV e Cupom
                            sendQuery(`SELECT COUNT(*) as total FROM listagemprodutopdvitem`, 'count_pdvitem');
                            sendQuery(`SELECT * FROM listagemprodutopdvitem LIMIT 5`, 'inspect_pdvitem_rows');

                            sendQuery(`SELECT COUNT(*) as total FROM listagemprodutopdv`, 'count_pdv');

                            // Verificar Mercafacil (possível integração)
                            sendQuery(`SELECT COUNT(*) as total FROM mercafacil_vendas`, 'count_mercafacil');

                            // Verificar se tem algo novo na NOTASAIDA agora
                            sendQuery(`SELECT MAX(datahoraemissao) as ultima FROM notasaida WHERE id_loja = 1`, 'max_notasaida_loja1');
                            sendQuery(`SELECT MAX(datahoraemissao) as ultima FROM notasaida WHERE id_loja = 3`, 'max_notasaida_loja3');
                            sendQuery(`SELECT MAX(datahoraemissao) as ultima FROM notasaida WHERE id_loja = 2`, 'max_notasaida_loja2');



                            // 2. Query de vendas (OFICIAL) - Retornando para notasaida com HORA
                            // Tabela 'notasaida' contém datahoraemissao que é o timestamp do cupom/nota
                            // FILTRO LOJA: 1=LOJA 01, 2=BENDITO BEEF
                            sendQuery(`
                                SELECT 
                                    ns.datahoraemissao::date as data, 
                                    nsi.id_produto as produto_id, 
                                    SUM(nsi.quantidade) as quantidade_total, 
                                    COUNT(*) as numero_vendas,
                                    MAX(ns.datahoraemissao) as ultima_venda
                                FROM notasaidaitem nsi 
                                JOIN notasaida ns ON ns.id = nsi.id_notasaida 
                                WHERE ns.datahoraemissao >= CURRENT_DATE - INTERVAL '90 days'
                                AND ns.id_loja IN (1, 2)
                                GROUP BY ns.datahoraemissao::date, nsi.id_produto
                            `, 'vendas_diarias');

                            // Produtos por último (tabela gigante)
                            let produtoSql = 'SELECT * FROM produto';
                            const FILTER_FILE = path.join(__dirname, 'filtro_produtos.txt');

                            if (fs.existsSync(FILTER_FILE)) {
                                try {
                                    const ids = fs.readFileSync(FILTER_FILE, 'utf8').trim();
                                    if (ids.length > 0) {
                                        console.log('📦 Filtro de produtos detectado! Baixando apenas itens das receitas.');
                                        // Tenta comparação direta (id é integer, ids são números separados por virgula)
                                        produtoSql = `SELECT * FROM produto WHERE id IN (${ids})`;
                                    }
                                } catch (e) {
                                    console.log('⚠️ Erro ao ler filtro de produtos, baixando tudo.');
                                }
                            }
                            sendQuery(produtoSql, 'produtos');
                        } else if (currentQuery) {
                            // Salva resultado
                            results[currentQuery.name] = { columns, rows };
                            fs.writeFileSync(
                                path.join(OUTPUT_DIR, `${currentQuery.name}.json`),
                                JSON.stringify({ columns, rows }, null, 2)
                            );
                            console.log(`  ✅ ${currentQuery.name}: ${rows.length} registros salvos`);
                            currentQuery = null;

                            if (queryQueue.length === 0) {
                                console.log('');
                                console.log('Extração concluída!');
                                console.log(`Arquivos salvos em: ${OUTPUT_DIR}`);
                                socket.end();
                                resolve(results);
                            } else {
                                processQueue();
                            }
                        }
                        break;

                    case 'T':
                        columns = [];
                        const numFields = payload.readInt16BE(0);
                        let offset = 2;
                        for (let i = 0; i < numFields; i++) {
                            const nameEnd = payload.indexOf(0, offset);
                            columns.push(payload.slice(offset, nameEnd).toString());
                            offset = nameEnd + 1 + 18;
                        }
                        break;

                    case 'D':
                        const numCols = payload.readInt16BE(0);
                        let pos = 2;
                        const row = {};
                        for (let i = 0; i < numCols; i++) {
                            const colLen = payload.readInt32BE(pos);
                            pos += 4;
                            if (colLen === -1) {
                                row[columns[i]] = null;
                            } else {
                                row[columns[i]] = payload.slice(pos, pos + colLen).toString();
                                pos += colLen;
                            }
                        }
                        rows.push(row);
                        break;

                    case 'C':
                        break;

                    case 'E':
                        let errMsg = '';
                        let errPos = 0;
                        while (errPos < payload.length && payload[errPos] !== 0) {
                            const fieldType = String.fromCharCode(payload[errPos]);
                            const fieldEnd = payload.indexOf(0, errPos + 1);
                            if (fieldType === 'M') {
                                errMsg = payload.slice(errPos + 1, fieldEnd).toString();
                            }
                            errPos = fieldEnd + 1;
                        }
                        console.error('Erro SQL:', errMsg);
                        if (currentQuery) {
                            currentQuery = null;
                            processQueue();
                        }
                        break;
                }
            }
        });

        socket.on('error', (err) => {
            console.error('Erro de conexão:', err.message);
            reject(err);
        });

        socket.on('timeout', () => {
            console.error('Timeout de conexão');
            reject(new Error('Timeout'));
        });

        socket.on('close', () => {
            console.log('Conexão fechada');
        });

        socket.connect(DB_CONFIG.port, DB_CONFIG.host);
    });
}

// Executa
async function main() {
    // Força uso do método direto (socket/driver nativo)
    // O método psql (tryPsql) foi desativado pois gera CSV e está sem lógica de save.
    try {
        await extractViaDirect();
    } catch (err) {
        console.error('Falha na extração:', err.message);
        process.exit(1);
    }

    console.log('');
    console.log('='.repeat(50));
    console.log('Pronto! Verifique a pasta dados_extraidos/');
    console.log('='.repeat(50));
}

main();
