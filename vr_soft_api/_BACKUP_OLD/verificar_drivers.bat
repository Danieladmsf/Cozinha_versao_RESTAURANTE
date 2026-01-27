@echo off
chcp 65001 >nul
echo ============================================================
echo    TESTE DE CONEXAO E DRIVERS POSTGRESQL
echo ============================================================
echo.

echo [1] Testando conexao TCP com 10.110.65.232:8745...
powershell -Command "$tcp = New-Object System.Net.Sockets.TcpClient; try { $tcp.Connect('10.110.65.232', 8745); Write-Host 'PORTA 8745: ACESSIVEL'; $tcp.Close() } catch { Write-Host 'PORTA 8745: BLOQUEADA' }"
echo.

echo [2] Verificando drivers ODBC PostgreSQL...
powershell -Command "Get-OdbcDriver | Where-Object {$_.Name -like '*Postgre*'}"
echo.

echo [3] Listando todos drivers ODBC disponiveis...
powershell -Command "Get-OdbcDriver | Select-Object Name"
echo.

echo ============================================================
pause
