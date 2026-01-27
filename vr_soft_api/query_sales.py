import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date

DB = {"host": "10.110.65.232", "port": "8745", "database": "vr", "user": "postgres", "password": "VrPost@Server"}

try:
    conn = psycopg2.connect(**DB)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Recuperar últimas vendas gerais da venda012026 
    print("=== ÚLTIMAS 5 VENDAS em venda012026 ===")
    cur.execute("""
        SELECT id, id_produto, data, quantidade, precovenda 
        FROM venda012026 
        ORDER BY id DESC
        LIMIT 5
    """)
    for row in cur.fetchall():
        print(f"  ID: {row['id']} | Produto: {row['id_produto']} | Data: {row['data']} | Qtd: {row['quantidade']}")
    
    # Ver qual a tabela certa - checar estrutura de venda
    print("\n=== Colunas de venda012026 ===")
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'venda012026'
        LIMIT 15
    """)
    cols = [r['column_name'] for r in cur.fetchall()]
    print(f"  {', '.join(cols)}")
    
    # Verificar se existe coluna de hora
    print("\n=== Últimas vendas de 26/01 com detalhes ===")
    cur.execute("""
        SELECT * FROM venda012026 
        WHERE data = '2026-01-26'
        ORDER BY id DESC
        LIMIT 3
    """)
    for row in cur.fetchall():
        print(f"  {dict(row)}")
    
    conn.close()
except Exception as e:
    print(f"Erro: {e}")
