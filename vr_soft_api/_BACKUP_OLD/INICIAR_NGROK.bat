@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo    VR API - NGROK (LINK FIXO) - v4 (FINAL)
echo    https://torri-floaty-lauryn.ngrok-free.dev
echo ============================================================
echo.

set "BASE=%~dp0"
set "PYTHON=%BASE%python_portable\python.exe"
set "PIP=%BASE%python_portable\Scripts\pip.exe"
set "PTH_FILE=%BASE%python_portable\python311._pth"

REM 1. Matar processos antigos
echo [1/7] Limpando processos...
taskkill /F /IM ngrok.exe 2>nul
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

REM 2. Verificar Python
if not exist "%PYTHON%" (
    echo ERRO: Python nao encontrado em %PYTHON%
    pause
    exit /b
)

REM 3. CORRIGIR AMBIENTE PYTHON (Isso corrige o erro do Flask!)
echo [2/7] Configurando ambiente Python...
powershell -Command "$c = Get-Content '%PTH_FILE%'; $c -replace '#import site','import site' | Set-Content '%PTH_FILE%'"

REM 4. Instalar dependencias
echo [3/7] Instalando libs...
"%PYTHON%" -m pip install --upgrade pip -q 2>nul
"%PYTHON%" -m pip install flask flask-cors psycopg2-binary --force-reinstall -q 2>nul

REM 5. Baixar Ngrok se nao existir
if not exist "%BASE%ngrok.exe" (
    echo [4/7] Baixando Ngrok...
    powershell -Command "Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile '%BASE%ngrok.zip'"
    powershell -Command "Expand-Archive -Path '%BASE%ngrok.zip' -DestinationPath '%BASE%' -Force"
    del "%BASE%ngrok.zip"
) else (
    echo [4/7] Ngrok OK
)

REM 6. Configurar Ngrok
echo [5/7] Configurando Ngrok...
"%BASE%ngrok.exe" config add-authtoken 38mCCFErfhFZ4dveUNcm8qeyyc5_82D1HQX45gixiVXzAea6E

REM 7. Criar API
echo [6/7] Criando codigo da API...
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
) > "%BASE%_api_vr.py"

echo [7/7] Iniciando servicos...

REM 8. Iniciar Python PRIMEIRO
echo Iniciando API (Flask)...
start "VR API" /MIN "%PYTHON%" "%BASE%_api_vr.py"

REM Aguardar Python iniciar
echo Aguardando 5 segundos...
timeout /t 5 /nobreak >nul

REM 9. Depois iniciar Ngrok
echo Iniciando Tunel...
start "Ngrok Tunnel" /MIN "%BASE%ngrok.exe" http --url=torri-floaty-lauryn.ngrok-free.dev 5000

echo.
echo ============================================================
echo    PRONTO! API ONLINE COM LINK FIXO:
echo    https://torri-floaty-lauryn.ngrok-free.dev
echo.
echo    Teste agora no navegador!
echo ============================================================
pause
