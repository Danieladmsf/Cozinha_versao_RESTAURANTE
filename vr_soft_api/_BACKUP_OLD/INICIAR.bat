@echo off
chcp 65001 >nul
cd /d "%~dp0"
title VR API - Iniciando (TUNEL FIXO)...

echo ============================================================
echo    INICIANDO SISTEMA VR (MODO FIXO / AUTENTICADO)
echo ============================================================
echo.

REM 0. Auto-inicializacao (STARTUP)
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_NAME=VR_API_AUTOSTART.lnk"
set "SCRIPT_PATH=%~f0"

if not exist "%STARTUP_FOLDER%\%SHORTCUT_NAME%" (
    echo [0/3] Configurando inicializacao automatica...
    powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_FOLDER%\%SHORTCUT_NAME%'); $s.TargetPath = '%SCRIPT_PATH%'; $s.WorkingDirectory = '%~dp0'; $s.Save()"
    echo       Atalho criado com sucesso!
) else (
    echo [0/3] Inicializacao automatica ja configurada.
)

REM 1. Configurar Python
if not exist "python_portable\python.exe" (
    echo [1/3] Baixando Python...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-embed-amd64.zip' -OutFile 'python_portable.zip'"
    powershell -Command "Expand-Archive -Path 'python_portable.zip' -DestinationPath 'python_portable' -Force"
    del python_portable.zip
    powershell -Command "(Get-Content 'python_portable\python311._pth') -replace '#import site','import site' | Set-Content 'python_portable\python311._pth'"
    powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile 'python_portable\get-pip.py'"
    python_portable\python.exe python_portable\get-pip.py --no-warn-script-location
)

echo [2/3] Verificando dependencias...
python_portable\python.exe -m pip install flask flask-cors psycopg2-binary -q 2>nul

if not exist "cloudflared.exe" (
    echo Baixando Cloudflare...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)

REM 2. Criar API
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
echo def home(^): return jsonify({"status": "online", "mode": "FIXED_TUNNEL"}^)
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

echo [3/3] Iniciando servicos...

REM 3. Script VBS para rodar invisivel (COM TOKEN)
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "python_portable\python.exe _api_vr.py", 0, False
echo WshShell.Run "cmd /c cloudflared.exe tunnel run --token eyJhIjoiYTBhYzQyZjQ5MjkyODAyZGMxMDcwMTVkMWVmZDcxZmMiLCJ0IjoiYjEwOTA5NTktOWEwNC00NWI3LWE5ZDItNzMzNDdjYmYwYzcyIiwicyI6Ik5qZ3lOVEUzWVRVdE1tUXpOQzAwWW1KbUxXRXlNek10TTJJM1pUaGhaamxqWmpVNSJ9 > tunnel.log 2>&1", 0, False
) > _launcher.vbs

REM Executa
cscript //nologo _launcher.vbs

echo.
echo ============================================================
echo    SISTEMA ONLINE (LINK FIXO)
echo    Atalho de inicializacao CRIADO!
echo    Janela sera fechada em 5 segundos...
echo ============================================================
timeout /t 5
del _launcher.vbs 2>nul
exit
