@echo off
cd /d "%~dp0"
title VR Soft API Local

echo.
echo Iniciando API (Porta 5001)...
echo Path: C:\Program Files\nodejs\node.exe
echo.

:: Executa diretamente usando aspas por causa do espaco no 'Program Files'
"C:\Program Files\nodejs\node.exe" api_local.js

:: Se falhar
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao iniciar.
    pause
)
