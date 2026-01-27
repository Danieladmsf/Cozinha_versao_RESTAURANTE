@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo    DIAGNOSTICO DE PYTHON
echo ============================================================
echo.

set "PYTHON=python_portable\python.exe"
set "PTH=python_portable\python311._pth"

if not exist "%PYTHON%" (
    echo [X] Python nao encontrado!
    pause
    exit /b
)

echo [1/3] Verificando arquivo ._pth...
type "%PTH%"
echo.

echo [2/3] Tentando importar Flask...
"%PYTHON%" -c "import sys; print('Sys Path:', sys.path); import flask; print('Flask OK:', flask.__version__)" 2>error_log.txt

if %errorlevel% neq 0 (
    echo [X] FALHA AO IMPORTAR FLASK!
    echo.
    echo --- ERRO DETALHADO ---
    type error_log.txt
    echo ----------------------
    echo.
    echo TENTANDO CORRIGIR AGORA...
    
    REM Tenta corrigir .pth brute-force
    echo import site>> "%PTH%"
    
    echo [2/3] Re-instalando Flask (modo verboso)...
    "%PYTHON%" -m pip install flask flask-cors psycopg2-binary
    
    echo.
    echo [3/3] Testando novamente...
    "%PYTHON%" -c "import flask; print('RE-TESTE: Flask OK')" || echo [X] AINDA FALHOU.
) else (
    echo [2/3] FLASK ESTA FUNCIONANDO!
)

echo.
echo ============================================================
echo    FIM DO DIAGNOSTICO
echo ============================================================
pause
