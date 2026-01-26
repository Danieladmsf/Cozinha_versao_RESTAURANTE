@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    SETUP TOTAL - VR API + CLOUDFLARE 
echo    (Versao Final - Corrigida)
echo ============================================================
echo.

REM 1. Configurar Python
if not exist "python_portable\python.exe" (
    echo [1/4] Baixando Python Portable...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-embed-amd64.zip' -OutFile 'python_portable.zip'"
    echo Extraindo Python...
    powershell -Command "Expand-Archive -Path 'python_portable.zip' -DestinationPath 'python_portable' -Force"
    del python_portable.zip
    
    echo Configurando Pip...
    powershell -Command "(Get-Content 'python_portable\python311._pth') -replace '#import site','import site' | Set-Content 'python_portable\python311._pth'"
    powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile 'python_portable\get-pip.py'"
    python_portable\python.exe python_portable\get-pip.py --no-warn-script-location
)

REM 2. InstalarLibs
echo [2/4] Verificando dependencias...
python_portable\python.exe -m pip install flask flask-cors psycopg2-binary -q 2>nul

REM 3. Baixar Cloudflare
if not exist "cloudflared.exe" (
    echo [3/4] Baixando Cloudflared...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)

REM 4. Criar e Rodar API (VERSAO CORRIGIDA)
echo [4/4] Iniciando Servicos...
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
echo def home(^): return jsonify({"status": "online", "system": "VR Soft API Final"}^)
echo.
echo @app.route('/produto/^<codigo^>'^)
echo def get_produto(codigo^):
echo     try:
echo         conn = psycopg2.connect(**DB^)
echo         cur = conn.cursor(cursor_factory=RealDictCursor^)
echo         cur.execute(f"SELECT * FROM produto WHERE id = {codigo} LIMIT 1"^)
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

start /B python_portable\python.exe _api_vr.py
timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo    SUCESSO! COPIE O LINK ABAIXO:
echo    (Exemplo: https://purple-sky-123.trycloudflare.com)
echo ============================================================
echo.
cloudflared.exe tunnel --url http://localhost:5000
pause
