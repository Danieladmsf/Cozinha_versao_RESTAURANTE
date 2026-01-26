@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    BUSCA PRODUTO 688 - SALADA DE FRUTAS MIX KG
echo ============================================================
echo.

REM Cria o script Python inline
echo import psycopg2 > _temp_busca.py
echo from psycopg2.extras import RealDictCursor >> _temp_busca.py
echo. >> _temp_busca.py
echo DB = {"host": "10.110.65.232", "port": "8745", "database": "vr", "user": "postgres", "password": "VrPost@Server"} >> _temp_busca.py
echo. >> _temp_busca.py
echo print("Conectando ao banco VR...") >> _temp_busca.py
echo try: >> _temp_busca.py
echo     conn = psycopg2.connect(**DB) >> _temp_busca.py
echo     cur = conn.cursor(cursor_factory=RealDictCursor) >> _temp_busca.py
echo     print("Conectado!") >> _temp_busca.py
echo     cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%%prod%%' LIMIT 10") >> _temp_busca.py
echo     print("Tabelas com prod:", [r['table_name'] for r in cur.fetchall()]) >> _temp_busca.py
echo     for q in ["SELECT * FROM produto WHERE id=688 LIMIT 1", "SELECT * FROM produto WHERE codigo=688 LIMIT 1", "SELECT * FROM produto WHERE codigo='688' LIMIT 1"]: >> _temp_busca.py
echo         try: >> _temp_busca.py
echo             cur.execute(q) >> _temp_busca.py
echo             r = cur.fetchone() >> _temp_busca.py
echo             if r: >> _temp_busca.py
echo                 print("ENCONTRADO:") >> _temp_busca.py
echo                 for k,v in r.items(): >> _temp_busca.py
echo                     if v: print(f"  {k}: {v}") >> _temp_busca.py
echo                 break >> _temp_busca.py
echo         except: pass >> _temp_busca.py
echo     conn.close() >> _temp_busca.py
echo except Exception as e: print(f"ERRO: {e}") >> _temp_busca.py

echo Executando...
python_portable\python.exe _temp_busca.py
del _temp_busca.py 2>nul
echo.
pause
