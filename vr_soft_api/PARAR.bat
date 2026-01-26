@echo off
echo ============================================================
echo    PARANDO TODOS OS SERVICOS
echo ============================================================
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM ngrok.exe /T 2>nul
taskkill /F /IM cloudflared.exe /T 2>nul
echo.
echo Servicos parados!
echo Aguarde 3 segundos...
timeout /t 3
