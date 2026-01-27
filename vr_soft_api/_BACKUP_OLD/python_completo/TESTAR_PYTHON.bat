@echo off
chcp 65001 >nul
cd /d "%~dp0"
title TESTE PYTHON

echo ============================================================
echo    TESTE DO PYTHON E BIBLIOTECAS
echo ============================================================
echo.

set "PYTHON=%~dp0python.exe"

echo [1] Versao Python:
"%PYTHON%" --version
echo.

echo [2] Testando Flask:
"%PYTHON%" -c "import flask; print('Flask OK:', flask.__version__)"
if %errorlevel% neq 0 echo ERRO: Flask nao encontrado!
echo.

echo [3] Testando Flask-CORS:
"%PYTHON%" -c "import flask_cors; print('Flask-CORS OK')"
if %errorlevel% neq 0 echo ERRO: Flask-CORS nao encontrado!
echo.

echo [4] Testando Psycopg2:
"%PYTHON%" -c "import psycopg2; print('Psycopg2 OK')"
if %errorlevel% neq 0 echo ERRO: Psycopg2 nao encontrado!
echo.

echo [5] Listando pacotes instalados:
"%PYTHON%" -m pip list 2>nul
echo.

echo [6] Conteudo do python311._pth:
type python311._pth
echo.

echo ============================================================
pause
