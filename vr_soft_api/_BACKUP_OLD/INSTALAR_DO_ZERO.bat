@echo off
chcp 65001 >nul
cd /d "%~dp0"
title INSTALACAO LIMPA - VR API

echo ============================================================
echo    INSTALACAO LIMPA DO ZERO
echo    (Apaga tudo e reinstala Python + dependencias)
echo ============================================================
echo.

set "BASE=%~dp0"

REM 1. Matar processos Python
echo [1/6] Finalizando processos Python...
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

REM 2. Apagar pasta antiga
echo [2/6] Removendo instalacao antiga...
if exist "%BASE%python_portable" (
    rmdir /S /Q "%BASE%python_portable"
    echo      Pasta python_portable removida.
) else (
    echo      Nenhuma instalacao anterior encontrada.
)

REM 3. Baixar Python Embed
echo [3/6] Baixando Python 3.11.7 (Embed)...
powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-embed-amd64.zip' -OutFile '%BASE%python_portable.zip'"
if not exist "%BASE%python_portable.zip" (
    echo [ERRO] Falha ao baixar Python!
    pause
    exit /b
)

REM 4. Extrair
echo [4/6] Extraindo Python...
powershell -Command "Expand-Archive -Path '%BASE%python_portable.zip' -DestinationPath '%BASE%python_portable' -Force"
del "%BASE%python_portable.zip"

REM 5. Configurar .pth ANTES de instalar pip
echo [5/6] Configurando ambiente...
set "PTH=%BASE%python_portable\python311._pth"
powershell -Command "(Get-Content '%PTH%') -replace '#import site','import site' | Set-Content '%PTH%'"
echo Lib\site-packages>> "%PTH%"
mkdir "%BASE%python_portable\Lib\site-packages" 2>nul

REM 6. Instalar pip e dependencias
echo [6/6] Instalando PIP e bibliotecas...
powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%BASE%python_portable\get-pip.py'"
"%BASE%python_portable\python.exe" "%BASE%python_portable\get-pip.py" --no-warn-script-location
"%BASE%python_portable\python.exe" -m pip install flask flask-cors psycopg2-binary

echo.
echo ============================================================
echo    VERIFICANDO...
echo ============================================================
"%BASE%python_portable\python.exe" -c "import flask; print('Flask:', flask.__version__)"
"%BASE%python_portable\python.exe" -c "import flask_cors; print('Flask-CORS: OK')"
"%BASE%python_portable\python.exe" -c "import psycopg2; print('Psycopg2: OK')"

echo.
echo ============================================================
echo    INSTALACAO LIMPA CONCLUIDA!
echo    Execute INICIAR_NGROK.bat ou INICIAR_API_SIMPLES.bat
echo ============================================================
pause
