@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    CORRIGINDO API VR SOFT
echo    (Remove busca por coluna inexistente)
echo ============================================================
echo.

echo [1/2] Encerrando processos antigos...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM cloudflared.exe /T 2>nul

echo [2/2] Recriando API corrigida...
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
echo @app.route('/'^)
echo def home(^): return jsonify({"status": "online", "system": "VR Soft API Correta"}^)
echo.
echo @app.route('/produto/^<codigo^>'^)
echo def get_produto(codigo^):
echo     try:
echo         conn = psycopg2.connect(**DB^)
echo         cur = conn.cursor(cursor_factory=RealDictCursor^)
echo         # CORRECAO: Removemos a busca por 'codigo' que nao existe
echo         cur.execute(f"SELECT * FROM produto WHERE id = {codigo} LIMIT 1"^)
echo         r = cur.fetchone(^)
echo         conn.close(^)
echo         if r: return jsonify({"found": True, "data": dict(r^)}^)
echo         return jsonify({"found": False}^)
echo     except Exception as e: return jsonify({"error": str(e^)}^), 500
echo.
echo @app.route('/produtos/buscar'^)
echo def buscar(^):
echo     q = request.args.get('q', ''^)
echo     limit = int(request.args.get('limit', 20^)^)
echo     try:
echo         conn = psycopg2.connect(**DB^)
echo         cur = conn.cursor(cursor_factory=RealDictCursor^)
echo         cur.execute(f"SELECT id, descricaocompleta, descricaoreduzida FROM produto WHERE descricaocompleta ILIKE '%%{q}%%' LIMIT {limit}"^)
echo         r = cur.fetchall(^)
echo         conn.close(^)
echo         return jsonify({"count": len(r^), "data": [dict(x^) for x in r]}^)
echo     except Exception as e: return jsonify({"error": str(e^)}^), 500
echo.
echo if __name__ == '__main__':
echo     app.run(host='0.0.0.0', port=5000^)
) > _api_vr.py

echo.
echo ============================================================
echo    REINICIANDO SERVICOS...
echo    O link sera o MESMO (TryCloudflare mantem sessao curta)
echo    Mas vamos gerar um novo para garantir.
echo ============================================================
echo.

start /B python_portable\python.exe _api_vr.py
timeout /t 3 /nobreak >nul

cloudflared.exe tunnel --url http://localhost:5000
pause
