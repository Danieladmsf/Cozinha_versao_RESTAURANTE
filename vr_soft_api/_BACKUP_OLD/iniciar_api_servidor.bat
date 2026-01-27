@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    API VR SOFT - SERVIDOR LOCAL
echo    Acesso remoto ao banco VR
echo ============================================================
echo.

REM Verifica Python
if not exist "python_portable\python.exe" (
    echo ERRO: Python portable nao encontrado!
    echo Execute primeiro o setup no servidor.
    pause
    exit /b
)

REM Instala Flask se necessario
echo Verificando dependencias...
python_portable\python.exe -m pip install flask flask-cors -q 2>nul

REM Cria a API
echo Criando API...
(
echo from flask import Flask, jsonify, request
echo from flask_cors import CORS
echo import psycopg2
echo from psycopg2.extras import RealDictCursor
echo.
echo app = Flask(__name__^)
echo CORS(app^)
echo.
echo DB = {"host": "10.110.65.232", "port": "8745", "database": "vr", "user": "postgres", "password": "VrPost@Server"}
echo.
echo def get_conn(^):
echo     return psycopg2.connect(**DB^)
echo.
echo @app.route('/'^)
echo def home(^):
echo     return jsonify({"status": "online", "api": "VR Soft API"}^)
echo.
echo @app.route('/produto/^<codigo^>'^)
echo def get_produto(codigo^):
echo     try:
echo         conn = get_conn(^)
echo         cur = conn.cursor(cursor_factory=RealDictCursor^)
echo         cur.execute(f"SELECT * FROM produto WHERE id = {codigo} OR codigo = '{codigo}' LIMIT 1"^)
echo         result = cur.fetchone(^)
echo         conn.close(^)
echo         if result:
echo             return jsonify({"found": True, "data": dict(result^)}^)
echo         return jsonify({"found": False}^)
echo     except Exception as e:
echo         return jsonify({"error": str(e^)}^), 500
echo.
echo @app.route('/produtos/buscar'^)
echo def buscar_produtos(^):
echo     termo = request.args.get('q', ''^)
echo     limite = request.args.get('limit', 10^)
echo     try:
echo         conn = get_conn(^)
echo         cur = conn.cursor(cursor_factory=RealDictCursor^)
echo         cur.execute(f"SELECT id, descricaocompleta, descricaoreduzida FROM produto WHERE descricaocompleta ILIKE '%%{termo}%%' LIMIT {limite}"^)
echo         results = cur.fetchall(^)
echo         conn.close(^)
echo         return jsonify({"count": len(results^), "data": [dict(r^) for r in results]}^)
echo     except Exception as e:
echo         return jsonify({"error": str(e^)}^), 500
echo.
echo if __name__ == '__main__':
echo     print('API rodando em http://localhost:5000'^)
echo     print('Endpoints:'^)
echo     print('  GET /produto/688'^)
echo     print('  GET /produtos/buscar?q=salada'^)
echo     app.run(host='0.0.0.0', port=5000^)
) > _api_vr.py

echo.
echo ============================================================
echo    INICIANDO API NA PORTA 5000
echo    Mantenha esta janela aberta!
echo ============================================================
echo.
echo Endpoints disponiveis:
echo   http://localhost:5000/produto/688
echo   http://localhost:5000/produtos/buscar?q=salada
echo.
python_portable\python.exe _api_vr.py
pause
