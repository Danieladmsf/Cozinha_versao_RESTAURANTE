@echo off
chcp 65001 >nul
cd /d "%~dp0"
title VR API - INICIAR

echo ============================================================
echo    VR API - INICIANDO...
echo ============================================================

set "PYTHON=%~dp0python_completo\python.exe"

if not exist "%PYTHON%" (
    echo [ERRO] Python nao encontrado!
    pause
    exit /b
)

echo Testando bibliotecas...
"%PYTHON%" -c "import flask, flask_cors, psycopg2; print('OK - Tudo instalado!')"
if %errorlevel% neq 0 (
    echo [ERRO] Bibliotecas nao encontradas!
    pause
    exit /b
)

echo.
echo Criando API...
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
echo     print('API VR SOFT RODANDO!'^)
echo     print('Local: http://localhost:5000'^)
echo     app.run(host='0.0.0.0', port=5000^)
) > _api_vr.py

echo.
echo ============================================================
echo    API INICIANDO NA PORTA 5000
echo    Local: http://localhost:5000
echo    MANTENHA ESTA JANELA ABERTA!
echo ============================================================
echo.
"%PYTHON%" _api_vr.py
pause
