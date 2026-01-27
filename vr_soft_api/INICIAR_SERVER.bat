@echo off
cd /d "%~dp0"

REM Configurar caminhos
set "PYTHON=%~dp0python.exe"
set "NGROK=%~dp0ngrok.exe"

REM Matar processos anteriores (para garantir limpeza)
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1

REM Configurar Ngrok (silencioso)
"%NGROK%" config add-authtoken 38mCCFErfhFZ4dveUNcm8qeyyc5_82D1HQX45gixiVXzAea6E >nul 2>&1

REM Iniciar API (Background)
start /B "" "%PYTHON%" _api.py > api_log.txt 2>&1

REM Aguardar um pouco
timeout /t 5 /nobreak >nul

REM Iniciar Ngrok (Background)
start /B "" "%NGROK%" http --url=torri-floaty-lauryn.ngrok-free.dev 5000 > ngrok_log.txt 2>&1

REM Script termina, mas processos continuam rodando em background (se chamado via VBS)
