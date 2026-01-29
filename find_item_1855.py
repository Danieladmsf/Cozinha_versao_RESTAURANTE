
import psycopg2
from psycopg2.extras import RealDictCursor

# Configuração do Banco de Dados
DB_CONFIG = {
    "host": "10.110.65.232",
    "port": "8745",
    "database": "vr",
    "user": "postgres",
    "password": "VrPost@Server" # Senha correta fornecida pelo usuário
}

def find_item():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        print("✅ Conexão com banco estabelecida!")
        
        # 1. Encontrar tabela de produtos
        print("\n🔍 Procurando tabelas de produtos...")
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name ILIKE '%prod%' OR table_name ILIKE '%item%' OR table_name ILIKE '%merc%')
        """)
        tables = [t['table_name'] for t in cur.fetchall()]
        print(f"Tabelas encontradas: {tables}")
        
        if not tables:
            print("❌ Nenhuma tabela de produto encontrada.")
            return

        # 2. Procurar o item 1855 nessas tabelas
        item_found = False
        for table in tables:
            print(f"\n🕵️‍♀️ Vasculhando tabela: {table}")
            
            # Descobrir colunas da tabela
            cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
            columns = [c['column_name'].lower() for c in cur.fetchall()]
            
            # Tentar adivinhar coluna de ID/Código
            id_col = next((c for c in columns if c in ['id', 'codigo', 'cod_produto', 'cd_produto', 'produto']), None)
            desc_col = next((c for c in columns if 'desc' in c or 'nome' in c), None)
            
            queries = []
            params = []
            
            if id_col:
                # Tentar buscar por ID 1855
                # Verificar se é numérico
                try:
                    cur.execute(f"SELECT {id_col} FROM {table} WHERE {id_col} = 1855 LIMIT 1") # Assumindo int
                    if cur.fetchone():
                        print(f"   ✅ ID 1855 encontrado na coluna {id_col}!")
                        queries.append(f"SELECT * FROM {table} WHERE {id_col} = 1855")
                except:
                    # Talvez seja string ou erro de tipo, ignorar
                    pass

            if desc_col:
                 # Tentar buscar por Descrição "AGUA COCO"
                 queries.append(f"SELECT * FROM {table} WHERE {desc_col} ILIKE '%AGUA COCO%' LIMIT 5")

            # Executar buscas
            for q in queries:
                try:
                    cur.execute(q)
                    results = cur.fetchall()
                    if results:
                        print(f"   🎉 ENCONTRADO! {len(results)} registros.")
                        for row in results:
                            print(f"   --- Registro ---")
                            # Filtrar apenas campos relevantes para não poluir
                            relevant = {k:v for k,v in row.items() if v is not None}
                            print(relevant)
                            item_found = True
                except Exception as e:
                    print(f"   Erro na query: {e}")

        if not item_found:
             print("\n❌ Item 1855 ou 'AGUA COCO' não encontrado nas tabelas suspeitas.")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n❌ Erro de conexão ou execução: {e}")

if __name__ == "__main__":
    find_item()
