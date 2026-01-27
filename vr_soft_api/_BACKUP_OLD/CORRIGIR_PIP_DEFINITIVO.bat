@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CORRECAO DEFINITIVA - VR API

echo ============================================================
echo    CORRECAO DEFINITIVA DO AMBIENTE PYTHON
echo    (Corrige problema do Python Embed)
echo ============================================================
echo.

set "BASE=%~dp0"
set "PYTHON=%BASE%python_portable\python.exe"
set "PTH=%BASE%python_portable\python311._pth"
set "GET_PIP=%BASE%python_portable\get-pip.py"

REM 1. Verificar se Python existe
if not exist "%PYTHON%" (
    echo [ERRO] Python nao encontrado em python_portable!
    pause
    exit /b
)
echo [OK] Python encontrado.

REM 2. CORRIGIR O ARQUIVO .pth (ESSA E A CHAVE!)
echo [1/4] Desbloqueando suporte a pip no Python Embed...
powershell -Command "(Get-Content '%PTH%') -replace '#import site','import site' | Set-Content '%PTH%'"
echo      Arquivo python311._pth corrigido.

REM 3. Adicionar Lib/site-packages ao path se nao existir
echo [2/4] Configurando paths adicionais...
findstr /C:"Lib\site-packages" "%PTH%" >nul 2>&1
if %errorlevel% neq 0 (
    echo Lib\site-packages>> "%PTH%"
    echo      Adicionado Lib\site-packages ao path.
) else (
    echo      Lib\site-packages ja configurado.
)

REM 4. Baixar e instalar pip
echo [3/4] Baixando e instalando PIP...
if exist "%GET_PIP%" del "%GET_PIP%"
powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%GET_PIP%'"
"%PYTHON%" "%GET_PIP%" --no-warn-script-location

REM 5. Instalar dependencias
echo [4/4] Instalando Flask, Flask-CORS e Psycopg2...
"%PYTHON%" -m pip install flask flask-cors psycopg2-binary --no-cache-dir

echo.
echo ============================================================
echo    VERIFICANDO INSTALACAO...
echo ============================================================
"%PYTHON%" -c "import flask; print('Flask: OK - versao', flask.__version__)"
"%PYTHON%" -c "import flask_cors; print('Flask-CORS: OK')"
"%PYTHON%" -c "import psycopg2; print('Psycopg2: OK')"

echo.
echo ============================================================
echo    CORRECAO DEFINITIVA CONCLUIDA!
echo    Agora execute INICIAR_NGROK.bat ou INICIAR_API_SIMPLES.bat
echo ============================================================
pause
