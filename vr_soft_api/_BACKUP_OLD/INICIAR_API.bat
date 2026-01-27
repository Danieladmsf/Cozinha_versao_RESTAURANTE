@echo off
echo ===================================================
echo INSTALANDO DEPENDENCIAS (Aguarde...)
echo ===================================================
pip install -r requirements.txt

echo.
echo ===================================================
echo INICIANDO API VR SOFT
echo ===================================================
if not exist api_vrsoft.py (
    echo ERRO: Arquivo api_vrsoft.py nao encontrado!
    pause
    exit
)
echo API rodando em http://localhost:8000
echo Mantenha esta janela aberta!
echo.
python api_vrsoft.py
pause
