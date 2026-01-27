@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    SETUP PYTHON PORTATIL + BUSCA PRODUTO VR
echo ============================================================
echo.

REM Verifica se já tem o Python portable
if exist "python_portable\python.exe" (
    echo Python portable ja existe!
    goto :run_script
)

echo Baixando Python embeddable...
mkdir python_portable 2>nul

REM Baixa Python 3.11 embeddable (versao pequena ~10MB)
powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-embed-amd64.zip' -OutFile 'python_portable.zip'"

echo Extraindo...
powershell -Command "Expand-Archive -Path 'python_portable.zip' -DestinationPath 'python_portable' -Force"
del python_portable.zip

echo Habilitando pip...
powershell -Command "(Get-Content 'python_portable\python311._pth') -replace '#import site','import site' | Set-Content 'python_portable\python311._pth'"

echo Baixando get-pip...
powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile 'python_portable\get-pip.py'"

echo Instalando pip...
python_portable\python.exe python_portable\get-pip.py --no-warn-script-location

echo Instalando psycopg2-binary...
python_portable\python.exe -m pip install psycopg2-binary --no-warn-script-location -q

echo.
echo ============================================================
echo    Python portable configurado!
echo ============================================================

:run_script
echo.
echo Executando busca do produto 688...
python_portable\python.exe buscar_vr.py

pause
