from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date, datetime, timedelta
import decimal

app = Flask(__name__)
# Enable CORS for all domains on all routes, allowing JSON headers
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "online", "version": "3.1", "endpoints": [
        "/produto/<codigo>",
        "/vendas/produto/<codigo>",
        "/vendas/produtos/periodo (POST)",
        "/vendas/ruptura/<data>"
    ]})

DB = {"host": "10.110.65.232", "port": "8745", "database": "vr", "user": "postgres", "password": "VrPost@Server"}

def get_db_connection():
    return psycopg2.connect(**DB)

def serialize_value(val):
    """Convert non-JSON-serializable types"""
    if isinstance(val, decimal.Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, timedelta):
        return str(val)
    return val

def serialize_row(row):
    """Convert a row dict to JSON-serializable format"""
    if row is None:
        return None
    return {k: serialize_value(v) for k, v in row.items()}

def get_venda_table_name(target_date=None):
    """Retorna o nome da tabela de vendas para a data especificada"""
    if target_date is None:
        target_date = date.today()
    return f"venda{target_date.month:02d}{target_date.year}"

# ============================================
# ENDPOINTS
# ============================================

# Default home route moved to top


@app.route('/produto/<codigo>')
def get_produto(codigo):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(f"SELECT * FROM produto WHERE id = {codigo} LIMIT 1")
        r = cur.fetchone()
        conn.close()
        return jsonify({"found": bool(r), "data": serialize_row(r)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# ENDPOINTS DE VENDAS - USANDO TABELA vendaMMYYYY
# ============================================

@app.route('/vendas/produto/<codigo>')
def get_vendas_produto(codigo):
    """
    Retorna resumo de vendas para um produto usando tabela vendaMMYYYY:
    - quantidade_hoje: total vendido hoje
    - ultima_venda: data da última venda (tabela não tem hora exata)
    - numero_vendas: quantidade de transações
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        hoje = date.today()
        tabela = get_venda_table_name(hoje)
        
        # Buscar vendas do produto hoje
        cur.execute(f"""
            SELECT 
                SUM(quantidade) as quantidade_total,
                COUNT(*) as numero_vendas,
                MAX(data) as ultima_venda
            FROM {tabela}
            WHERE id_produto = %s
            AND data = %s
        """, (codigo, hoje.isoformat()))
        
        result = cur.fetchone()
        
        # Buscar nome do produto
        cur.execute("SELECT id, descricaocompleta FROM produto WHERE id = %s LIMIT 1", (codigo,))
        produto = cur.fetchone()
        
        conn.close()
        
        return jsonify({
            "codigo": int(codigo),
            "nome": produto['descricaocompleta'] if produto else None,
            "data": hoje.isoformat(),
            "quantidade_total": serialize_value(result['quantidade_total']) if result['quantidade_total'] else 0,
            "numero_vendas": result['numero_vendas'] if result['numero_vendas'] else 0,
            "ultima_venda": serialize_value(result['ultima_venda']) if result['ultima_venda'] else None,
            "tabela": tabela,
            "status": "ok"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/vendas/produto/<codigo>/historico')
def get_vendas_historico(codigo):
    """
    Retorna histórico de vendas dos últimos 7 dias
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        hoje = date.today()
        data_inicio = hoje - timedelta(days=7)
        
        # Pode precisar consultar 2 tabelas se cruzar meses
        tabelas = set()
        d = data_inicio
        while d <= hoje:
            tabelas.add(get_venda_table_name(d))
            d += timedelta(days=1)
        
        all_results = []
        for tabela in tabelas:
            try:
                cur.execute(f"""
                    SELECT 
                        id_produto,
                        quantidade,
                        precovenda as valor,
                        (quantidade * precovenda) as valortotal,
                        data
                    FROM {tabela}
                    WHERE id_produto = %s
                    AND data >= %s
                    ORDER BY data DESC, id DESC
                    LIMIT 100
                """, (codigo, data_inicio.isoformat()))
                all_results.extend(cur.fetchall())
            except:
                pass  # Tabela pode não existir
        
        # Buscar nome do produto
        cur.execute("SELECT id, descricaocompleta FROM produto WHERE id = %s LIMIT 1", (codigo,))
        produto = cur.fetchone()
        
        conn.close()
        
        return jsonify({
            "codigo": int(codigo),
            "nome": produto['descricaocompleta'] if produto else None,
            "periodo": {"inicio": data_inicio.isoformat(), "fim": hoje.isoformat()},
            "vendas": [serialize_row(r) for r in all_results],
            "total_registros": len(all_results),
            "status": "ok"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/vendas/produtos', methods=['POST'])
def get_vendas_produtos_batch():
    """
    Consulta em lote para múltiplos produtos
    Body: {"codigos": [123, 456, 789]}
    """
    try:
        data = request.get_json()
        codigos = data.get('codigos', [])
        
        if not codigos:
            return jsonify({"error": "Lista de códigos vazia"}), 400
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        hoje = date.today()
        tabela = get_venda_table_name(hoje)
        
        # Buscar vendas de todos os produtos
        placeholders = ','.join(['%s'] * len(codigos))
        cur.execute(f"""
            SELECT 
                id_produto,
                SUM(quantidade) as quantidade_total,
                COUNT(*) as numero_vendas,
                MAX(data) as ultima_venda
            FROM {tabela}
            WHERE id_produto IN ({placeholders})
            AND data = %s
            GROUP BY id_produto
        """, (*codigos, hoje.isoformat()))
        
        results = cur.fetchall()
        
        # Buscar nomes dos produtos
        cur.execute(f"SELECT id, descricaocompleta FROM produto WHERE id IN ({placeholders})", tuple(codigos))
        produtos = {r['id']: r['descricaocompleta'] for r in cur.fetchall()}
        
        conn.close()
        
        # Montar resposta
        vendas_dict = {r['id_produto']: serialize_row(r) for r in results}
        
        resposta = []
        for codigo in codigos:
            venda = vendas_dict.get(codigo, {})
            resposta.append({
                "codigo": codigo,
                "nome": produtos.get(codigo),
                "quantidade_total": venda.get('quantidade_total', 0),
                "numero_vendas": venda.get('numero_vendas', 0),
                "ultima_venda": venda.get('ultima_venda')
            })
        
        return jsonify({
            "data": hoje.isoformat(),
            "produtos": resposta,
            "tabela": tabela,
            "status": "ok"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/vendas/ruptura/<data_consulta>')
def get_vendas_ruptura(data_consulta):
    """
    Retorna todas as vendas de uma data específica
    Formato da data: YYYY-MM-DD
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Parsear data para determinar tabela
        data_obj = datetime.strptime(data_consulta, "%Y-%m-%d").date()
        tabela = get_venda_table_name(data_obj)
        
        cur.execute(f"""
            SELECT 
                id_produto,
                SUM(quantidade) as quantidade_total,
                COUNT(*) as numero_vendas,
                MAX(data) as ultima_venda,
                MIN(data) as primeira_venda
            FROM {tabela}
            WHERE data = %s
            GROUP BY id_produto
            ORDER BY quantidade_total DESC
        """, (data_consulta,))
        
        results = cur.fetchall()
        
        # Buscar nomes dos produtos
        if results:
            ids = [r['id_produto'] for r in results]
            placeholders = ','.join(['%s'] * len(ids))
            cur.execute(f"SELECT id, descricaocompleta FROM produto WHERE id IN ({placeholders})", tuple(ids))
            produtos = {r['id']: r['descricaocompleta'] for r in cur.fetchall()}
        else:
            produtos = {}
        
        conn.close()
        
        resposta = []
        for r in results:
            resposta.append({
                "codigo": r['id_produto'],
                "nome": produtos.get(r['id_produto']),
                "quantidade_total": serialize_value(r['quantidade_total']),
                "numero_vendas": r['numero_vendas'],
                "primeira_venda": serialize_value(r['primeira_venda']),
                "ultima_venda": serialize_value(r['ultima_venda'])
            })
        
        return jsonify({
            "data": data_consulta,
            "total_produtos": len(resposta),
            "produtos": resposta,
            "tabela": tabela,
            "status": "ok"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/vendas/produtos/periodo', methods=['POST'])
def get_vendas_produtos_periodo():
    """
    Consulta vendas de múltiplos produtos em um período de datas
    Body: {
        "codigos": [123, 456, 789],
        "data_inicio": "2026-01-26",
        "data_fim": "2026-01-28"
    }
    """
    try:
        data = request.get_json()
        codigos = data.get('codigos', [])
        data_inicio_str = data.get('data_inicio')
        data_fim_str = data.get('data_fim')
        
        if not codigos:
            return jsonify({"error": "Lista de códigos vazia"}), 400
        
        # Usar hoje como padrão se não especificado
        hoje = date.today()
        data_inicio = datetime.strptime(data_inicio_str, "%Y-%m-%d").date() if data_inicio_str else hoje
        data_fim = datetime.strptime(data_fim_str, "%Y-%m-%d").date() if data_fim_str else hoje
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Determinar quais tabelas consultar (pode cruzar meses)
        tabelas = set()
        d = data_inicio
        while d <= data_fim:
            tabelas.add(get_venda_table_name(d))
            d += timedelta(days=1)
        
        # Agregar resultados de todas as tabelas
        vendas_agregadas = {}  # codigo -> {quantidade_total, numero_vendas, primeira_venda, ultima_venda}
        
        placeholders = ','.join(['%s'] * len(codigos))
        
        for tabela in tabelas:
            try:
                cur.execute(f"""
                    SELECT 
                        id_produto,
                        SUM(quantidade) as quantidade_total,
                        COUNT(*) as numero_vendas,
                        MIN(data) as primeira_venda,
                        MAX(data) as ultima_venda
                    FROM {tabela}
                    WHERE id_produto IN ({placeholders})
                    AND data >= %s AND data <= %s
                    GROUP BY id_produto
                """, (*codigos, data_inicio.isoformat(), data_fim.isoformat()))
                
                for row in cur.fetchall():
                    cod = row['id_produto']
                    if cod not in vendas_agregadas:
                        vendas_agregadas[cod] = {
                            'quantidade_total': 0,
                            'numero_vendas': 0,
                            'primeira_venda': None,
                            'ultima_venda': None
                        }
                    vendas_agregadas[cod]['quantidade_total'] += float(row['quantidade_total'] or 0)
                    vendas_agregadas[cod]['numero_vendas'] += row['numero_vendas'] or 0
                    if row['primeira_venda']:
                        pv = vendas_agregadas[cod]['primeira_venda']
                        if pv is None or row['primeira_venda'] < pv:
                            vendas_agregadas[cod]['primeira_venda'] = row['primeira_venda']
                    if row['ultima_venda']:
                        uv = vendas_agregadas[cod]['ultima_venda']
                        if uv is None or row['ultima_venda'] > uv:
                            vendas_agregadas[cod]['ultima_venda'] = row['ultima_venda']
            except Exception as e:
                pass  # Tabela pode não existir
        
        # Buscar nomes dos produtos
        cur.execute(f"SELECT id, descricaocompleta FROM produto WHERE id IN ({placeholders})", tuple(codigos))
        produtos = {r['id']: r['descricaocompleta'] for r in cur.fetchall()}
        
        conn.close()
        
        # Montar resposta
        resposta = []
        for codigo in codigos:
            venda = vendas_agregadas.get(codigo, {})
            resposta.append({
                "codigo": codigo,
                "nome": produtos.get(codigo),
                "quantidade_total": venda.get('quantidade_total', 0),
                "numero_vendas": venda.get('numero_vendas', 0),
                "primeira_venda": serialize_value(venda.get('primeira_venda')) if venda.get('primeira_venda') else None,
                "ultima_venda": serialize_value(venda.get('ultima_venda')) if venda.get('ultima_venda') else None
            })
        
        return jsonify({
            "data_inicio": data_inicio.isoformat(),
            "data_fim": data_fim.isoformat(),
            "produtos": resposta,
            "tabelas_consultadas": list(tabelas),
            "status": "ok"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005)
