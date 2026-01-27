# -*- coding: utf-8 -*-
import psycopg2
from psycopg2.extras import RealDictCursor

DB_CONFIG = {
    "host": "10.110.65.232",
    "port": "8745",
    "database": "vr",
    "user": "postgres",
    "password": "VrPost@Server"
}

print("=" * 60)
print("BUSCA PRODUTO 688 - SALADA DE FRUTAS MIX KG")
print("=" * 60)

try:
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Primeiro, listar tabelas para encontrar a correta
    cur.execute("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%prod%'
        ORDER BY table_name LIMIT 10
    """)
    print("\nTabelas com 'prod' no nome:")
    for row in cur.fetchall():
        print(f"  - {row['table_name']}")
    
    # Tentar buscar o produto
    queries = [
        "SELECT * FROM produto WHERE id = 688 LIMIT 1",
        "SELECT * FROM produto WHERE codigo = 688 LIMIT 1",
        "SELECT * FROM produto WHERE codigo = '688' LIMIT 1",
        "SELECT * FROM produtos WHERE codigo = 688 LIMIT 1",
    ]
    
    for q in queries:
        try:
            cur.execute(q)
            result = cur.fetchone()
            if result:
                print(f"\n{'='*60}")
                print("PRODUTO ENCONTRADO!")
                print("="*60)
                for key, value in result.items():
                    if value is not None and str(value).strip():
                        print(f"{key}: {value}")
                break
        except Exception as e:
            continue
    else:
        print("\nProduto 688 nao encontrado nas tabelas testadas.")
    
    cur.close()
    conn.close()
    print("\nConexao encerrada com sucesso!")
    
except Exception as e:
    print(f"\nERRO: {e}")

input("\nPressione ENTER para sair...")
