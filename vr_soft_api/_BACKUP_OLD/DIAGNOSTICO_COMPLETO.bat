@echo off
chcp 65001 >nul
cd /d "%~dp0"
title DIAGNOSTICO COMPLETO - VR API

echo ============================================================
echo    DIAGNOSTICO COMPLETO DE AMBIENTE
echo    Data: %date% %time%
echo ============================================================
echo.

echo [1/6] Verificando Python...
if exist "python_portable\python.exe" (
    echo    Python Portable ENCONTRADO.
    python_portable\python.exe --version
) else (
    echo    ERRO: python_portable\python.exe NAO ENCONTRADO!
    goto :FIM
)
echo.

echo [2/6] Verificando Pip...
if exist "python_portable\Scripts\pip.exe" (
    echo    Pip ENCONTRADO.
) else (
    echo    AVISO: Pip nao encontrado em Scripts\pip.exe
)
echo.

echo [3/6] Testando Conexao Internet (Google)...
ping -n 1 8.8.8.8 >nul
if %errorlevel% equ 0 (
    echo    Internet: OK
) else (
    echo    Internet: FALHA (Pode afetar instalacao de dependencias)
)
echo.

echo [4/6] Testando Conexao Banco (10.110.65.232)...
ping -n 1 10.110.65.232 >nul
if %errorlevel% equ 0 (
    echo    Servidor Banco: ACESSIVEL (Ping OK)
) else (
    echo    Servidor Banco: INACESSIVEL (Ping Falhou)
)
echo.

echo [5/6] Testando Importacao de Modulos (Flask/Psycopg2)...
python_portable\python.exe -c "import flask; print('    Flask: OK')" 2>nul
if %errorlevel% neq 0 echo    Flask: ERRO/NAO INSTALADO

python_portable\python.exe -c "import flask_cors; print('    Flask-CORS: OK')" 2>nul
if %errorlevel% neq 0 echo    Flask-CORS: ERRO/NAO INSTALADO

python_portable\python.exe -c "import psycopg2; print('    Psycopg2: OK')" 2>nul
if %errorlevel% neq 0 echo    Psycopg2: ERRO/NAO INSTALADO
echo.

echo [6/6] Testando Conexao DB via Python...
python_portable\python.exe -c "import psycopg2; print('    Tentando conectar...'); conn = psycopg2.connect(host='10.110.65.232', port='8745', database='vr', user='postgres', password='VrPost@Server'); print('    Conexao DB: SUCESSO!'); conn.close()" 2>nul
if %errorlevel% neq 0 echo    Conexao DB: FALHA (Verifique logs anteriores ou permissoes)
echo.

:FIM
echo ============================================================
echo    DIAGNOSTICO FINALIZADO
echo    Tire um print desta tela se houver erros!
echo ============================================================
pause
