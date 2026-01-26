@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    BUSCA PRODUTO VR - PYTHON PORTABLE
echo ============================================================
echo.
echo Diretorio atual: %cd%
echo.

if not exist "python_portable\python.exe" (
    echo ERRO: Execute primeiro o setup_e_buscar.bat
    pause
    exit /b
)

if not exist "buscar_vr.py" (
    echo ERRO: Arquivo buscar_vr.py nao encontrado!
    echo Certifique-se que esta na mesma pasta.
    pause
    exit /b
)

echo Executando busca...
python_portable\python.exe buscar_vr.py
pause
