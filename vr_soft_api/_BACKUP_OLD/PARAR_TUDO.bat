@echo off
echo ============================================================
echo    PARAR SERVICOS (API + CLOUDFLARE)
echo ============================================================
echo.
echo Encerrando Python...
taskkill /F /IM python.exe /T 2>nul
echo Encerrando Cloudflared...
taskkill /F /IM cloudflared.exe /T 2>nul
echo.
echo Servicos parados com sucesso!
pause
