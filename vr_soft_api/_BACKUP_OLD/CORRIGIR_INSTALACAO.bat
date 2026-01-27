@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CORRECAO DE AMBIENTE - VR API

echo ============================================================
echo    CORRIGINDO INSTALACAO PYTHON / PIP
echo    Data: %date% %time%
echo ============================================================
echo.

set "PYTHON=python_portable\python.exe"
set "GET_PIP=python_portable\get-pip.py"

REM 1. Verifica Python
if not exist "%PYTHON%" (
    echo [ERROR] Python nao encontrado!
    echo Execute o INSTALAR_NO_M.bat primeiro.
    pause
    exit /b
)

REM 2. Baixar get-pip.py novamente
echo [1/3] Baixando instalador do PIP...
powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%GET_PIP%'"
if not exist "%GET_PIP%" (
    echo [ERROR] Falha ao baixar get-pip.py. Verifique internet.
    pause
    exit /b
)

REM 3. Instalar PIP
echo [2/3] Instalando PIP...
"%PYTHON%" "%GET_PIP%" --no-warn-script-location --force-reinstall

REM 4. Instalar Dependencias
echo [3/3] Instalando bibliotecas (Flask, Psycopg2)...
"%PYTHON%" -m pip install --upgrade pip
"%PYTHON%" -m pip install flask flask-cors psycopg2-binary --force-reinstall

echo.
echo ============================================================
echo    CORRECAO CONCLUIDA!
echo    Tente executar o INICIAR.bat ou INICIAR_NGROK.bat agora.
echo ============================================================
pause
