@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CORRIGIR PSYCOPG2

echo ============================================================
echo    INSTALANDO PSYCOPG2 CORRETO
echo ============================================================
echo.

set "PYTHON=python.exe"

echo Removendo versao antiga...
"%PYTHON%" -m pip uninstall psycopg2-binary -y 2>nul

echo Instalando versao correta para Python 3.11...
"%PYTHON%" -m pip install psycopg2_binary-2.9.11-cp311-cp311-win_amd64.whl --no-deps

echo.
echo Testando...
"%PYTHON%" -c "import psycopg2; print('Psycopg2 OK!')"

echo.
echo ============================================================
echo    PRONTO! Agora execute INICIAR_RAPIDO.bat
echo ============================================================
pause
