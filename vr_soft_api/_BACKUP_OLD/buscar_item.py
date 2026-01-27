import requests
import json

API_URL = 'http://localhost:8000'
AUTH = ('admin', 'VrSoft@2026')

print("=" * 60)
print("🔍 BUSCANDO ITEM: 688 - SALADA DE FRUTAS MIX KG")
print("=" * 60)

# 1. Verificar health
print("\n1. Verificando conexão...")
try:
    r = requests.get(f'{API_URL}/health', auth=AUTH, timeout=10)
    print(f"   Status: {r.json()}")
except Exception as e:
    print(f"   ERRO: {e}")
    exit(1)

# 2. Listar tabelas disponíveis
print("\n2. Listando tabelas...")
try:
    r = requests.get(f'{API_URL}/database/tables', auth=AUTH, timeout=10)
    tables = r.json()
    print(f"   Total de tabelas: {len(tables)}")
    
    # Tabelas relevantes
    keywords = ['prod', 'item', 'merc', 'sku']
    candidates = [t for t in tables if any(k in t.lower() for k in keywords)]
    print(f"   Tabelas candidatas: {candidates[:10]}")
except Exception as e:
    print(f"   ERRO: {e}")

# 3. Tentar buscar o item em diferentes tabelas
print("\n3. Buscando item 688...")

queries_to_try = [
    "SELECT * FROM produtos WHERE codigo = 688 LIMIT 1",
    "SELECT * FROM produtos WHERE id = 688 LIMIT 1",
    "SELECT * FROM produto WHERE codigo = 688 LIMIT 1",
    "SELECT * FROM produto WHERE id = 688 LIMIT 1",
    "SELECT * FROM item WHERE codigo = 688 LIMIT 1",
    "SELECT * FROM itens WHERE codigo = 688 LIMIT 1",
    "SELECT * FROM produtos WHERE descricao ILIKE '%SALADA%FRUTAS%' LIMIT 5",
    "SELECT * FROM produto WHERE descricao ILIKE '%SALADA%FRUTAS%' LIMIT 5",
]

for query in queries_to_try:
    try:
        r = requests.post(
            f'{API_URL}/query/execute',
            auth=AUTH,
            json={'query': query},
            timeout=10
        )
        
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list) and len(data) > 0:
                print(f"\n✅ ENCONTRADO com query: {query}")
                print("-" * 60)
                for item in data:
                    print(json.dumps(item, indent=2, ensure_ascii=False, default=str))
                print("-" * 60)
                break
            else:
                print(f"   ❌ Sem resultados: {query[:50]}...")
        else:
            print(f"   ⚠️  Erro {r.status_code}: {query[:50]}...")
    except Exception as e:
        print(f"   ⚠️  {query[:40]}... -> {str(e)[:30]}")

print("\n" + "=" * 60)
print("Busca concluída!")
