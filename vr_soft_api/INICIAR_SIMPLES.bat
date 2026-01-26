@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo    VR API - INICIANDO SERVICOS
echo ============================================================

REM Verifica se Python existe
if not exist "python_portable\python.exe" (
    echo ERRO: Python nao encontrado!
    pause
    exit /b
)

REM Instala dependencias
echo Verificando dependencias...
python_portable\python.exe -m pip install flask flask-cors psycopg2-binary -q 2>nul

REM Cria API
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

REM Cria launcher
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "python_portable\python.exe _api_vr.py", 0, False
echo WshShell.Run "cloudflared.exe tunnel run --token eyJhIjoiYTBhYzQyZjQ5MjkyODAyZGMxMDcwMTVkMWVmZDcxZmMiLCJ0IjoiYjEwOTA5NTktOWEwNC00NWI3LWE5ZDItNzMzNDdjYmYwYzcyIiwicyI6Ik5qZ3lOVEUzWVRVdE1tUXpOQzAwWW1KbUxXRXlNek10TTJJM1pUaGhaamxqWmpVNSJ9", 0, False
) > _run.vbs

echo Iniciando em modo oculto...
cscript //nologo _run.vbs
del _run.vbs 2>nul

echo.
echo ============================================================
echo    PRONTO! API rodando em background.
echo    Fechando em 3 segundos...
echo ============================================================
timeout /t 3
exit
