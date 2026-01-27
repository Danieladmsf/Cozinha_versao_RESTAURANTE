@echo off
chcp 65001 >nul
echo ============================================================
echo    VERIFICANDO IP E ACESSO EXTERNO
echo ============================================================
echo.

echo [1] IP Local da maquina:
ipconfig | findstr "IPv4"
echo.

echo [2] IP Publico (visivel na internet):
powershell -Command "(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content"
echo.

echo [3] Testando se porta 5000 esta aberta externamente...
echo    (Isso pode demorar alguns segundos)
powershell -Command "$ip = (Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content; Write-Host 'Seu IP publico:' $ip"
echo.

echo ============================================================
echo    RESULTADO:
echo    Se o IP publico aparecer, podemos tentar liberar a porta.
echo    Anote o IP publico e me envie.
echo ============================================================
pause
