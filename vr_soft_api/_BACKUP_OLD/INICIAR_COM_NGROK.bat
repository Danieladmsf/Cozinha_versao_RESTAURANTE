@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    API VR SOFT + NGROK
echo    Tunel publico sem precisar liberar porta!
echo ============================================================
echo.

REM Baixa ngrok se nao existir
if not exist "ngrok.exe" (
    echo [1/3] Baixando ngrok...
    powershell -Command "Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile 'ngrok.zip'"
    powershell -Command "Expand-Archive -Path 'ngrok.zip' -DestinationPath '.' -Force"
    del ngrok.zip
) else (
    echo [1/3] ngrok ja existe!
)

echo [2/3] Instalando dependencias Python...
python_portable\python.exe -m pip install flask flask-cors psycopg2-binary -q 2>nul

echo [3/3] Criando API...
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
echo def home(^): return jsonify({"status": "online", "api": "VR Soft API"}^)
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
echo    INICIANDO API EM BACKGROUND...
echo ============================================================
start /B python_portable\python.exe _api_vr.py

timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo    INICIANDO NGROK...
echo    COPIE A URL HTTPS QUE APARECER ABAIXO!
echo    Use essa URL no seu site Vercel.
echo ============================================================
echo.
ngrok.exe http 5000
pause
