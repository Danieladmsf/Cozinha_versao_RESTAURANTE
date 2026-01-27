@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    SETUP PERMANENTE - CLOUDFLARE TUNNEL (TRYCLOUDFLARE)
echo    Link fixo e gratis para a API VR SOFT
echo ============================================================
echo.

REM 1. Baixar Cloudflared
if not exist "cloudflared.exe" (
    echo [1/3] Baixando Cloudflared...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
) else (
    echo [1/3] Cloudflared ja instalado.
)

REM 2. Instalar dependencias Python
echo [2/3] Verificando API...
if not exist "python_portable\python.exe" (
    echo ERRO: Python nao encontrado. Execute setup_e_buscar.bat primeiro.
    pause
    exit /b
)
python_portable\python.exe -m pip install flask flask-cors psycopg2-binary -q 2>nul

REM 3. Recriar API (garantir versão atualizada)
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
echo def home(^): return jsonify({"status": "online", "system": "VR Soft API"}^)
echo.
echo @app.route('/produto/^<codigo^>'^)
echo def get_produto(codigo^):
echo     try:
echo         conn = psycopg2.connect(**DB^)
echo         cur = conn.cursor(cursor_factory=RealDictCursor^)
echo         cur.execute(f"SELECT * FROM produto WHERE id = {codigo} OR codigo = '{codigo}' LIMIT 1"^)
echo         r = cur.fetchone(^)
echo         conn.close(^)
echo         return jsonify({"found": bool(r^), "data": dict(r^) if r else None}^)
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
echo    INICIANDO SERVICOS...
echo ============================================================
echo.

REM Inicia API oculta
start /B python_portable\python.exe _api_vr.py
timeout /t 3 /nobreak >nul

REM Inicia Tunel
echo.
echo    SEU LINK PERMANENTE (Copie o link abaixo):
echo    (Procure por: https://random-name.trycloudflare.com)
echo.
cloudflared.exe tunnel --url http://localhost:5000
pause
