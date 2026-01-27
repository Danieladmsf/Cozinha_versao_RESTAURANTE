@echo off
cd /d "%~dp0"

REM Matar processos antigos para garantir reinicio limpo
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1

REM Iniciar API (Background)
start /B "" "%~dp0python.exe" _api.py > api_log.txt 2>&1

REM Aguardar API subir
timeout /t 3 /nobreak >nul

REM Iniciar Ngrok (Background)
start /B "" "%~dp0ngrok.exe" http --url=torri-floaty-lauryn.ngrok-free.dev 5000 > ngrok_log.txt 2>&1

REM Iniciar Icone de Bandeja (Isso mantem o script rodando se nao for hidden, mas via VBS ficara oculto e so o icone aparece)
PowerShell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0TRAY_ICON.ps1"
