import uvicorn
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, List, Dict, Any
import logging

# Configuração de Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuração da API
app = FastAPI(
    title="VR Soft ERP API",
    description="API REST para integração com banco de dados PostgreSQL do VR Soft ERP",
    version="1.0.0"
)

# CORS - Permitir acesso de qualquer origem
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Segurança
security = HTTPBasic()

# Credenciais Admin
API_USERNAME = "admin"
API_PASSWORD = "VrSoft@2026"

# Configuração do Banco de Dados
DB_CONFIG = {
    "host": "10.110.65.232",
    "port": "8745",
    "database": "vr",
    "user": "postgres",
    "password": "VrPost@Server" # Senha correta fornecida pelo usuário
}

# --- Modelos Pydantic ---

class QueryRequest(BaseModel):
    query: str
    params: Optional[List[Any]] = None

# --- Dependências ---

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    """Verifica autenticação Basic Auth"""
    is_user_ok = credentials.username == API_USERNAME
    is_pass_ok = credentials.password == API_PASSWORD
    
    if not (is_user_ok and is_pass_ok):
        logger.warning(f"Tentativa de acesso falha: {credentials.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

def get_db_connection():
    """Cria conexão com o banco de dados"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except psycopg2.OperationalError as e:
        logger.error(f"Erro de conexão com banco: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Não foi possível conectar ao banco de dados VR Soft. Erro: {str(e)}"
        )

# --- Endpoints ---

@app.get("/", tags=["Geral"])
async def root():
    return {
        "status": "online",
        "api": "VR Soft ERP API",
        "docs": "http://localhost:8000/docs"
    }

@app.get("/health", tags=["Geral"])
async def health_check():
    """Verifica conexão com o banco de dados"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        return {"status": "healthy", "database_connection": "ok", "host": DB_CONFIG["host"]}
    except Exception as e:
        return {"status": "unhealthy", "database_connection": "error", "detail": str(e)}

@app.get("/database/tables", tags=["Banco de Dados"])
async def list_tables(user: str = Depends(verify_credentials)):
    """Lista todas as tabelas"""
    query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(query)
        tables = cur.fetchall()
        cur.close()
        conn.close()
        return [t['table_name'] for t in tables]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/database/tables/{table_name}/schema", tags=["Banco de Dados"])
async def get_table_schema(table_name: str, user: str = Depends(verify_credentials)):
    """Retorna esquema da tabela"""
    query = """
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        ORDER BY ordinal_position;
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(query, (table_name,))
        columns = cur.fetchall()
        cur.close()
        conn.close()
        if not columns:
            raise HTTPException(status_code=404, detail=f"Tabela '{table_name}' não encontrada")
        return columns
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/database/tables/{table_name}/data", tags=["Banco de Dados"])
async def get_table_data(
    table_name: str, 
    limit: int = 100, 
    offset: int = 0, 
    user: str = Depends(verify_credentials)
):
    """Busca dados de uma tabela"""
    if not table_name.replace('_', '').isalnum():
         raise HTTPException(status_code=400, detail="Nome de tabela inválido")

    query = f"SELECT * FROM {table_name} LIMIT %s OFFSET %s"
    
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(query, (limit, offset))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query/execute", tags=["Query Avançada"])
async def execute_query_endpoint(request: QueryRequest, user: str = Depends(verify_credentials)):
    """Executa SQL customizado"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(request.query, request.params)
        
        if cur.description:
            rows = cur.fetchall()
            result = rows
        else:
            conn.commit()
            result = {"status": "success", "rows_affected": cur.rowcount}
            
        cur.close()
        conn.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("============================================================")
    print("🚀 VR SOFT API - Iniciando...")
    print("============================================================")
    print(f"Banco: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
    print(f"Autenticação: {API_USERNAME} / {API_PASSWORD}")
    print("Acesse: http://localhost:8000/docs")
    print("============================================================")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
