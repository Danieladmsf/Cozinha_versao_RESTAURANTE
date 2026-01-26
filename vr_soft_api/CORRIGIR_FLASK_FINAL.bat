@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    CORRECAO FINAL DE IMPORTACAO (FLASK)
echo ============================================================

set "PYTHON=python_portable\python.exe"

REM 1. Criar pasta Lib\site-packages (padrao)
if not exist "python_portable\Lib\site-packages" (
    echo Criando estrutura de pastas...
    mkdir "python_portable\Lib\site-packages"
)

REM 2. Forcar install no alvo certo
echo Instalando Flask direto na pasta Lib...
"%PYTHON%" -m pip install flask flask-cors psycopg2-binary --target="python_portable\Lib\site-packages" --upgrade --no-user

REM 3. Ajustar .pth para ler essa pasta
echo Ajustando imports...
echo Lib\site-packages>> "python_portable\python311._pth"
echo import site>> "python_portable\python311._pth"

REM 4. Teste final
echo.
echo TESTANDO IMPORTACAO...
"%PYTHON%" -c "import flask; print('SUCESSO: Flask importado!')"

if %errorlevel% neq 0 (
    echo [X] AINDA FALHOU. Tente rodar DIAGNOSTICO_LOG.bat para ver detalhes.
) else (
    echo [V] TUDO OK! AGORA RODE O INICIAR_NGROK.bat
)
pause
