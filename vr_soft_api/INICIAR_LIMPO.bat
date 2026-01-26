@echo off
chcp 65001 >nul
cd /d "%~dp0"
title VR API - Iniciando...

echo ============================================================
echo    VR API - INICIALIZANDO
echo ============================================================
echo.

REM 1. Python
if not exist "python_portable\python.exe" (
    echo [1/4] Baixando Python...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-embed-amd64.zip' -OutFile 'python.zip'"
    powershell -Command "Expand-Archive -Path 'python.zip' -DestinationPath 'python_portable' -Force"
    del python.zip
    powershell -Command "$c = Get-Content 'python_portable\python311._pth'; $c -replace '#import site','import site' | Set-Content 'python_portable\python311._pth'"
    powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile 'python_portable\get-pip.py'"
    python_portable\python.exe python_portable\get-pip.py --no-warn-script-location
) else (
    echo [1/4] Python OK
)

echo [2/4] Dependencias...
python_portable\python.exe -m pip install flask flask-cors psycopg2-binary -q 2>nul

REM 2. Cloudflare
if not exist "cloudflared.exe" (
    echo [3/4] Baixando Cloudflare...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
) else (
    echo [3/4] Cloudflare OK
)

REM 3. Criar API
echo [4/4] Criando API...
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
echo def home(^): return jsonify({"status": "online"}^)
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
echo if __name__ == '__main__':
echo     app.run(host='0.0.0.0', port=5000^)
) > _api_vr.py

REM 4. Launcher oculto
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "python_portable\python.exe _api_vr.py", 0, False
echo WshShell.Run "cmd /c cloudflared.exe tunnel run --token eyJhIjoiYTBhYzQyZjQ5MjkyODAyZGMxMDcwMTVkMWVmZDcxZmMiLCJ0IjoiYjEwOTA5NTktOWEwNC00NWI3LWE5ZDItNzMzNDdjYmYwYzcyIiwicyI6Ik5qZ3lOVEUzWVRVdE1tUXpOQzAwWW1KbUxXRXlNek10TTJJM1pUaGhaamxqWmpVNSJ9", 0, False
) > _launcher.vbs

cscript //nologo _launcher.vbs
del _launcher.vbs 2>nul

echo.
echo ============================================================
echo    API INICIADA EM MODO OCULTO!
echo    Fechando em 5 segundos...
echo ============================================================
timeout /t 5
exit
