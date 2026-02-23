@echo off
title VR Extrator - Loop Automatico
cd /d "%~dp0"

:loop
cls
echo ==================================================
echo    VR Soft Extrator - Modo Automatico
echo ==================================================
echo.
echo [1/3] Iniciando atualizacao...
echo Hora: %time%
echo.

:: Executa o extrator (mesmo path do manual)
"node\node-v20.11.0-win-x64\node.exe" extrair_dados.js

echo.
echo [2/3] Concluido! Dados salvos em dados_extraidos/
echo.
echo [3/3] Aguardando 60 segundos para proximo ciclo...
echo       (Nao feche esta janela - Apenas minimize)
echo.

:: Aguarda 60s (compativel com timeout ou ping fallback)
timeout /t 60 >nul 2>&1 || ping -n 61 127.0.0.1 >nul

goto loop
