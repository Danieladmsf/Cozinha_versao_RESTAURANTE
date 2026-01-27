@echo off
chcp 65001 >nul
cd /d "%~dp0"
title VR API + NGROK

echo ============================================================
echo    VR API - INICIANDO (VERSAO RAPIDA)
echo ============================================================
echo.

set "PYTHON=%~dp0python.exe"
set "NGROK=%~dp0ngrok.exe"

REM Matar processos antigos
taskkill /F /IM python.exe 2>nul
taskkill /F /IM ngrok.exe 2>nul

REM Criar API diretamente
echo Criando API...
(
echo from flask import Flask, jsonify, request
echo from flask_cors import CORS
echo import psycopg2
echo from psycopg2.extras import RealDictCursor
echo app = Flask(__name__^)
echo CORS(app^)
echo DB = {"host": "10.110.65.232", "port": "8745", "database": "vr", "user": "postgres", "password": "VrPost@Server"}
echo @app.route('/'^)
echo def home(^): return jsonify({"status": "online"}^)
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
echo if __name__ == '__main__': app.run(host='0.0.0.0', port=5000^)
) > _api.py

echo Configurando Ngrok...
"%NGROK%" config add-authtoken 38mCCFErfhFZ4dveUNcm8qeyyc5_82D1HQX45gixiVXzAea6E 2>nul

echo Iniciando API...
start "" /MIN "%PYTHON%" _api.py

echo Aguardando 5 segundos...
timeout /t 5 /nobreak >nul

echo Iniciando Ngrok...
start "" "%NGROK%" http --url=torri-floaty-lauryn.ngrok-free.dev 5000

echo.
echo ============================================================
echo    PRONTO! Acesse:
echo    https://torri-floaty-lauryn.ngrok-free.dev
echo ============================================================
pause
