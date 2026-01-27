@echo off
chcp 65001 >nul
cd /d "%~dp0"
title INSTALACAO OFFLINE - VR API

echo ============================================================
echo    INSTALACAO OFFLINE (SEM INTERNET)
echo    Bibliotecas ja estao na pasta libs_offline
echo ============================================================
echo.

set "PYTHON=python_portable\python.exe"
set "LIBS=%~dp0libs_offline"

if not exist "%PYTHON%" (
    echo [ERRO] Python nao encontrado!
    pause
    exit /b
)

if not exist "%LIBS%" (
    echo [ERRO] Pasta libs_offline nao encontrada!
    pause
    exit /b
)

echo Instalando bibliotecas offline...
"%PYTHON%" -m pip install --no-index --find-links="%LIBS%" flask flask-cors psycopg2-binary

echo.
echo ============================================================
echo    VERIFICANDO...
echo ============================================================
"%PYTHON%" -c "import flask; print('Flask:', flask.__version__)"
"%PYTHON%" -c "import flask_cors; print('Flask-CORS: OK')"
"%PYTHON%" -c "import psycopg2; print('Psycopg2: OK')"

echo.
echo ============================================================
echo    INSTALACAO OFFLINE CONCLUIDA!
echo    Execute INICIAR_NGROK.bat
echo ============================================================
pause
