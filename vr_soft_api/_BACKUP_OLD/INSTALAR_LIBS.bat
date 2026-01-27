@echo off
chcp 65001 >nul
cd /d "%~dp0"
title INSTALAR BIBLIOTECAS

echo ============================================================
echo    INSTALANDO SOMENTE AS BIBLIOTECAS
echo ============================================================
echo.

set "PYTHON=python_portable\python.exe"

echo Instalando Flask...
"%PYTHON%" -m pip install flask --no-cache-dir

echo Instalando Flask-CORS...
"%PYTHON%" -m pip install flask-cors --no-cache-dir

echo Instalando Psycopg2...
"%PYTHON%" -m pip install psycopg2-binary --no-cache-dir

echo.
echo ============================================================
echo    VERIFICANDO...
echo ============================================================
"%PYTHON%" -c "import flask; print('Flask:', flask.__version__)"
"%PYTHON%" -c "import flask_cors; print('Flask-CORS: OK')"
"%PYTHON%" -c "import psycopg2; print('Psycopg2: OK')"

echo.
echo ============================================================
echo    PRONTO! Agora execute INICIAR_NGROK.bat
echo ============================================================
pause
