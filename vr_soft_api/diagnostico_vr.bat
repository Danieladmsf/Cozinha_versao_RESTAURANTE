@echo off
chcp 65001 >nul
echo ============================================================
echo    DIAGNOSTICO VR SOFT - SEM DEPENDENCIAS
echo    (Apenas comandos nativos do Windows)
echo ============================================================
echo.

echo [1/5] IP desta maquina:
ipconfig | findstr "IPv4"
echo.

echo [2/5] Testando ping para 10.110.65.232...
ping -n 2 10.110.65.232
echo.

echo [3/5] Testando porta 8745 do PostgreSQL...
powershell -Command "$tcp = New-Object System.Net.Sockets.TcpClient; try { $tcp.Connect('10.110.65.232', 8745); Write-Host 'PORTA 8745: ACESSIVEL'; $tcp.Close() } catch { Write-Host 'PORTA 8745: BLOQUEADA' }"
echo.

echo [4/5] Testando porta 5432 (PostgreSQL padrao)...
powershell -Command "$tcp = New-Object System.Net.Sockets.TcpClient; try { $tcp.Connect('10.110.65.232', 5432); Write-Host 'PORTA 5432: ACESSIVEL'; $tcp.Close() } catch { Write-Host 'PORTA 5432: BLOQUEADA' }"
echo.

echo [5/5] Listando conexoes de rede ativas com VR...
netstat -an | findstr "10.110.65"
echo.

echo ============================================================
echo    FIM DO DIAGNOSTICO
echo ============================================================
pause
