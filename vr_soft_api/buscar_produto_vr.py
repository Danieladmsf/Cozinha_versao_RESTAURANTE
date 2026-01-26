# -*- coding: utf-8 -*-
"""
Script seguro para buscar produto no banco VR Soft
SOMENTE LEITURA - Nao modifica nada no banco
"""
import sys

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Instalando psycopg2...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
    import psycopg2
    from psycopg2.extras import RealDictCursor

# Configuracao do banco
DB_CONFIG = {
    "host": "10.110.65.232",
    "port": "8745",
    "database": "vr",
    "user": "postgres",
    "password": "VrPost@Server"
}

def buscar_produto(codigo):
    print(f"\n{'='*60}")
    print(f"Buscando produto codigo: {codigo}")
    print('='*60)
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Tentar diferentes queries (tabelas podem ter nomes diferentes)
        queries = [
            f"SELECT * FROM produto WHERE id = {codigo} LIMIT 1",
            f"SELECT * FROM produto WHERE codigo = {codigo} LIMIT 1",
            f"SELECT * FROM produtos WHERE id = {codigo} LIMIT 1",
            f"SELECT * FROM item WHERE id = {codigo} LIMIT 1",
        ]
        
        for q in queries:
            try:
                cur.execute(q)
                result = cur.fetchone()
                if result:
                    print(f"\n✅ ENCONTRADO!")
                    print("-" * 40)
                    for key, value in result.items():
                        if value:
                            print(f"  {key}: {value}")
                    cur.close()
                    conn.close()
                    return result
            except Exception:
                continue
        
        print("❌ Produto nao encontrado")
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro de conexao: {e}")

if __name__ == "__main__":
    codigo = 688  # SALADA DE FRUTAS MIX KG
    if len(sys.argv) > 1:
        codigo = sys.argv[1]
    buscar_produto(codigo)
    input("\nPressione ENTER para sair...")
