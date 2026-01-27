@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo =========================================== > LOG.txt
echo DIAGNOSTICO DETALHADO - %date% %time% >> LOG.txt
echo =========================================== >> LOG.txt

echo. >> LOG.txt
echo [1] LISTAGEM DE ARQUIVOS: >> LOG.txt
dir /b >> LOG.txt
dir /b python_portable >> LOG.txt 2>nul
dir /b python_portable\Scripts >> LOG.txt 2>nul

echo. >> LOG.txt
echo [2] TESTE DO PYTHON: >> LOG.txt
if exist "python_portable\python.exe" (
    echo Python executavel ENCONTRADO. >> LOG.txt
    python_portable\python.exe --version >> LOG.txt 2>&1
    
    echo. >> LOG.txt
    echo [3] CONTEUDO DO .PTH: >> LOG.txt
    type python_portable\python311._pth >> LOG.txt 2>&1
    
    echo. >> LOG.txt
    echo [4] TESTE DE IMPORTACAO FLASK: >> LOG.txt
    python_portable\python.exe -c "import sys; print(sys.path); import flask; print('FLASK OK:', flask.__version__)" >> LOG.txt 2>&1
) else (
    echo ERRO: Pasta python_portable ou executavel NAO ENCONTRADO. >> LOG.txt
)

echo.
echo ============================================================
echo    LOG GERADO COM SUCESSO!
echo    Abra o arquivo LOG.txt que apareceu na pasta.
echo ============================================================
pause
