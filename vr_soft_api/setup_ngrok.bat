@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    SETUP NGROK - TUNEL PARA ACESSO REMOTO
echo ============================================================
echo.

if exist "ngrok.exe" (
    echo ngrok ja existe!
    goto :run_ngrok
)

echo Baixando ngrok...
powershell -Command "Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile 'ngrok.zip'"
echo Extraindo...
powershell -Command "Expand-Archive -Path 'ngrok.zip' -DestinationPath '.' -Force"
del ngrok.zip

:run_ngrok
echo.
echo ============================================================
echo    IMPORTANTE: 
echo    1. Primeiro execute: iniciar_api_servidor.bat
echo    2. Depois execute este script
echo ============================================================
echo.
echo Iniciando tunel ngrok na porta 5000...
echo A URL publica sera exibida abaixo.
echo Use essa URL para acessar de qualquer lugar!
echo.
ngrok.exe http 5000
pause
