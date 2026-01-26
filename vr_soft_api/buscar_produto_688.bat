@echo off
chcp 65001 >nul
echo ============================================================
echo    BUSCA DE PRODUTO VR SOFT - SEM PYTHON
echo    Produto: 688 - SALADA DE FRUTAS MIX KG
echo ============================================================
echo.

REM Usando PowerShell com .NET para conectar via ODBC
powershell -ExecutionPolicy Bypass -Command ^
"$connectionString = 'Driver={PostgreSQL UNICODE};Server=10.110.65.232;Port=8745;Database=vr;Uid=postgres;Pwd=VrPost@Server;'; " ^
"try { " ^
"    $conn = New-Object System.Data.Odbc.OdbcConnection($connectionString); " ^
"    $conn.Open(); " ^
"    Write-Host '✅ Conectado ao banco VR!' -ForegroundColor Green; " ^
"    $cmd = $conn.CreateCommand(); " ^
"    $cmd.CommandText = 'SELECT id, descricao, preco FROM produto WHERE id = 688 OR codigo = 688 LIMIT 1'; " ^
"    $reader = $cmd.ExecuteReader(); " ^
"    if ($reader.HasRows) { " ^
"        while ($reader.Read()) { " ^
"            Write-Host 'ID:' $reader['id']; " ^
"            Write-Host 'Descricao:' $reader['descricao']; " ^
"            Write-Host 'Preco:' $reader['preco']; " ^
"        } " ^
"    } else { " ^
"        Write-Host '❌ Produto nao encontrado'; " ^
"    } " ^
"    $conn.Close(); " ^
"} catch { " ^
"    Write-Host '❌ Erro:' $_.Exception.Message -ForegroundColor Red; " ^
"    Write-Host 'Driver ODBC PostgreSQL pode nao estar instalado.'; " ^
"    Write-Host 'Tente: https://www.postgresql.org/ftp/odbc/versions/msi/'; " ^
"}"

echo.
echo ============================================================
pause
