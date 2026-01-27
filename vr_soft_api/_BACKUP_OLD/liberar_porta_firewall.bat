@echo off
chcp 65001 >nul
echo ============================================================
echo    LIBERAR PORTA 5000 NO FIREWALL
echo    (Requer executar como Administrador)
echo ============================================================
echo.

REM Verifica se está rodando como admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo AVISO: Este script precisa ser executado como Administrador!
    echo Clique com botao direito e escolha "Executar como administrador"
    echo.
    pause
    exit /b
)

echo Adicionando regra de entrada para porta 5000...
netsh advfirewall firewall add rule name="API VR Soft - Entrada" dir=in action=allow protocol=TCP localport=5000

echo Adicionando regra de saida para porta 5000...
netsh advfirewall firewall add rule name="API VR Soft - Saida" dir=out action=allow protocol=TCP localport=5000

echo.
echo ============================================================
echo    PORTA 5000 LIBERADA NO FIREWALL!
echo ============================================================
echo.
echo Agora execute: iniciar_api_servidor.bat
echo.
pause
