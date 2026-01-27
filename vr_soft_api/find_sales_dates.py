import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date, timedelta

DB = {"host": "10.110.65.232", "port": "8745", "database": "vr", "user": "postgres", "password": "VrPost@Server"}

products = [6873, 8006, 7877]

try:
    conn = psycopg2.connect(**DB)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    print(f"Buscando vendas para: {products}")
    
    # Verificar tabela atual (Jan 2026)
    table = "venda012026"
    print(f"\nConsultando tabela {table}...")
    
    placeholders = ','.join(['%s'] * len(products))
    cur.execute(f"""
        SELECT id_produto, data, SUM(quantidade) as total
        FROM {table}
        WHERE id_produto IN ({placeholders})
        GROUP BY id_produto, data
        ORDER BY data DESC
        LIMIT 20
    """, tuple(products))
    
    results = cur.fetchall()
    if results:
        for r in results:
            print(f"  Produto {r['id_produto']}: data {r['data']} - Qtd: {r['total']}")
    else:
        print("  Nenhum registro encontrado nesta tabela.")

    # Verificar tabela anterior (Dez 2025) - caso precise voltar muito
    # table = "venda122025" 
    # ... (omitido se nao precisar, vamos ver o resultado da atual primeiro)
    
    # Verificar se existem vendas gerais para esses produtos em qualquer data recente
    print("\nVerificando se existem vendas recentes (últimos 30 dias na tabela atual):")
    cur.execute(f"""
        SELECT id_produto, MAX(data) as ultima_venda
        FROM {table}
        WHERE id_produto IN ({placeholders})
        GROUP BY id_produto
    """, tuple(products))
    
    for r in cur.fetchall():
        print(f"  Produto {r['id_produto']}: Última venda em {r['ultima_venda']}")

    conn.close()

except Exception as e:
    print(f"Erro: {e}")
