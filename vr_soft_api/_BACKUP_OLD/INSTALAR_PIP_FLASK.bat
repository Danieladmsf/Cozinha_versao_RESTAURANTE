@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    INSTALACAO TOTAL (PIP + FLASK)
echo ============================================================

set "PYTHON=python_portable\python.exe"

REM 1. Configurar .pth (CRUCIAL)
echo [1/5] Configurando path...
echo python311.zip> "python_portable\python311._pth"
echo .>> "python_portable\python311._pth"
echo import site>> "python_portable\python311._pth"

REM 2. Baixar e Instalar PIP
echo [2/5] Baixando/Instalando PIP...
if not exist "python_portable\get-pip.py" (
    powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile 'python_portable\get-pip.py'"
)
"%PYTHON%" "python_portable\get-pip.py" --no-warn-script-location --force-reinstall

REM 3. Instalar Flask
echo [3/5] Instalando Flask...
"%PYTHON%" -m pip install flask flask-cors psycopg2-binary --no-warn-script-location --force-reinstall

REM 4. Verificar se funcionou
echo.
echo [4/5] TESTE DE FOGO:
"%PYTHON%" -c "import flask; print('>>> SUCESSO: FLASK INSTALADO <<<')"

if %errorlevel% neq 0 (
    echo [X] ERRO FATAL. 
    echo O pip nao conseguiu instalar o Flask.
    pause
    exit /b
)

echo.
echo [5/5] Iniciando INICIAR_NGROK.bat...
timeout /t 3
call INICIAR_NGROK.bat
