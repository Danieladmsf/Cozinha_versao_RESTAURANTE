@echo off
chcp 65001 >nul
cd /d "%~dp0"
title VR API + NGROK

echo ============================================================
echo    VR API - INICIANDO COM NGROK
echo    Link fixo: https://torri-floaty-lauryn.ngrok-free.dev
echo ============================================================
echo.

set "PYTHON=%~dp0python.exe"
set "NGROK=%~dp0ngrok.exe"

REM Matar processos antigos
taskkill /F /IM python.exe 2>nul
taskkill /F /IM ngrok.exe 2>nul
timeout /t 2 /nobreak >nul

REM Verificar arquivos
if not exist "%PYTHON%" (
    echo [ERRO] python.exe nao encontrado!
    pause
    exit /b
)

if not exist "%NGROK%" (
    echo [ERRO] ngrok.exe nao encontrado!
    pause
    exit /b
)

REM Testar bibliotecas
echo [1/4] Verificando bibliotecas...
"%PYTHON%" -c "import flask, flask_cors, psycopg2; print('OK!')"
if %errorlevel% neq 0 (
    echo [ERRO] Bibliotecas nao instaladas!
    pause
    exit /b
)

REM Configurar ngrok
echo [2/4] Configurando Ngrok...
"%NGROK%" config add-authtoken 38mCCFErfhFZ4dveUNcm8qeyyc5_82D1HQX45gixiVXzAea6E

REM Criar API
echo [3/4] Criando API...
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
echo def home(^): return jsonify({"status": "online", "api": "VR Soft"}^)
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

REM Iniciar API em background
echo [4/4] Iniciando servicos...
start "VR API" /MIN "%PYTHON%" _api_vr.py
timeout /t 3 /nobreak >nul

REM Iniciar Ngrok
start "Ngrok" /MIN "%NGROK%" http --url=torri-floaty-lauryn.ngrok-free.dev 5000

echo.
echo ============================================================
echo    PRONTO! API ONLINE:
echo.
echo    https://torri-floaty-lauryn.ngrok-free.dev
echo.
echo    Teste no navegador agora!
echo ============================================================
echo.
echo Pressione qualquer tecla para PARAR os servicos...
pause >nul

taskkill /F /IM python.exe 2>nul
taskkill /F /IM ngrok.exe 2>nul
echo Servicos parados.
pause
