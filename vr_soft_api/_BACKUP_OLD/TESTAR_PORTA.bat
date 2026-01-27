@echo off
chcp 65001 >nul
cd /d "%~dp0"
title TESTE DE PORTAS - VR API

echo ============================================================
echo    TESTE DE LIBERACAO DE PORTAS
echo    Data: %date% %time%
echo ============================================================
echo.

REM Descobre IP local
echo [1/5] Seu IP LOCAL:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do echo    %%a
echo.

REM Descobre IP público
echo [2/5] Seu IP PUBLICO:
powershell -Command "(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content"
echo.
echo.

REM Testa portas comuns
echo [3/5] Testando se portas estao ABERTAS localmente...
echo.
for %%p in (5000 8000 8080 3000 80 443) do (
    powershell -Command "$listener = $null; try { $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, %%p); $listener.Start(); $listener.Stop(); Write-Host '    Porta %%p: DISPONIVEL' } catch { Write-Host '    Porta %%p: EM USO ou BLOQUEADA' }"
)
echo.

REM Inicia servidor de teste na porta 5000
echo [4/5] Iniciando servidor de teste na porta 5000...
echo       (Aguarde 10 segundos e teste de outro computador)
echo.
echo       Para testar, acesse de OUTRO computador:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set "IP=%%a"
    setlocal enabledelayedexpansion
    echo       http:!IP: =!:5000
    endlocal
)
echo.
echo       Se aparecer "PORTA FUNCIONANDO", a porta esta liberada!
echo       Pressione Ctrl+C para parar o teste.
echo.
echo ============================================================

powershell -Command "$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, 5000); $listener.Start(); Write-Host 'Servidor de teste rodando na porta 5000...'; Write-Host 'Aguardando conexao...'; while($true) { $client = $listener.AcceptTcpClient(); $stream = $client.GetStream(); $response = 'HTTP/1.1 200 OK`r`nContent-Type: text/html`r`n`r`n<h1>PORTA 5000 FUNCIONANDO!</h1><p>IP: ' + $client.Client.RemoteEndPoint + '</p>'; $bytes = [System.Text.Encoding]::UTF8.GetBytes($response); $stream.Write($bytes, 0, $bytes.Length); $client.Close(); Write-Host 'Conexao recebida!' }"

pause
