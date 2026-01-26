@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    SETUP COMPLETO - LIBERAR PORTA + INICIAR API
echo    IP Publico: 163.176.244.90
echo    Porta: 5000
echo ============================================================
echo.

REM Verifica admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ============================================================
    echo    ATENCAO: EXECUTE COMO ADMINISTRADOR!
    echo    Botao direito - Executar como administrador
    echo ============================================================
    pause
    exit /b
)

echo [1/4] Liberando porta 5000 no firewall...
netsh advfirewall firewall add rule name="VR API Entrada" dir=in action=allow protocol=TCP localport=5000 >nul 2>&1
netsh advfirewall firewall add rule name="VR API Saida" dir=out action=allow protocol=TCP localport=5000 >nul 2>&1
echo       Porta liberada!

echo [2/4] Instalando dependencias...
python_portable\python.exe -m pip install flask flask-cors psycopg2-binary -q 2>nul
echo       Dependencias OK!

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
echo def home(^): return jsonify({"status": "online", "api": "VR Soft", "ip": "163.176.244.90"}^)
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
echo     print('^n==========================================='^)
echo     print('API VR SOFT ONLINE!'^)
echo     print('==========================================='^)
echo     print('Acesse: http://163.176.244.90:5000'^)
echo     print('===========================================^n'^)
echo     app.run(host='0.0.0.0', port=5000^)
) > _api_vr.py
echo       API criada!

echo [4/4] Iniciando API...
echo.
echo ============================================================
echo    API RODANDO!
echo    Acesse de qualquer lugar:
echo    http://163.176.244.90:5000
echo    http://163.176.244.90:5000/produto/688
echo ============================================================
echo.
echo    MANTENHA ESTA JANELA ABERTA!
echo.
python_portable\python.exe _api_vr.py
pause
