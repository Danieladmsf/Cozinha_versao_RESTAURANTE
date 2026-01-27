@echo off
chcp 65001 >nul
cd /d "%~dp0"
title VR API - INSTALANDO EM M:

echo ============================================================
echo    INSTALANDO API NO DRIVE M: (PERSISTENTE)
echo    Os arquivos ficarao no seu notebook e nao serao apagados!
echo ============================================================
echo.

REM Verifica se M: existe
if not exist M:\ (
    echo ERRO: Drive M: nao disponivel!
    echo Voce precisa estar logado no Autosky para isso funcionar.
    pause
    exit /b
)

REM Cria pasta no M:
echo [1/4] Criando pasta em M:\VR_API...
mkdir "M:\VR_API" 2>nul

REM Copia o que ja temos
echo [2/4] Copiando scripts...
copy /Y "%~f0" "M:\VR_API\" >nul
copy /Y "PARAR.bat" "M:\VR_API\" 2>nul

REM Agora cria o INICIAR.bat definitivo no M:
echo [3/4] Criando script de inicializacao...
(
echo @echo off
echo chcp 65001 ^>nul
echo cd /d "%%~dp0"
echo title VR API - Iniciando...
echo.
echo REM Auto-startup
echo set "STARTUP=%%APPDATA%%\Microsoft\Windows\Start Menu\Programs\Startup"
echo if not exist "%%STARTUP%%\VR_API.lnk" ^(
echo     powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%%STARTUP%%\VR_API.lnk'^); $s.TargetPath = '%%~f0'; $s.WorkingDirectory = '%%~dp0'; $s.Save(^)"
echo ^)
echo.
echo if not exist "python_portable\python.exe" ^(
echo     echo Baixando Python...
echo     powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-embed-amd64.zip' -OutFile 'python_portable.zip'"
echo     powershell -Command "Expand-Archive -Path 'python_portable.zip' -DestinationPath 'python_portable' -Force"
echo     del python_portable.zip
echo     powershell -Command "(Get-Content 'python_portable\python311._pth'^) -replace '#import site','import site' ^| Set-Content 'python_portable\python311._pth'"
echo     powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile 'python_portable\get-pip.py'"
echo     python_portable\python.exe python_portable\get-pip.py --no-warn-script-location
echo ^)
echo.
echo python_portable\python.exe -m pip install flask flask-cors psycopg2-binary -q 2^>nul
echo.
echo if not exist "cloudflared.exe" ^(
echo     powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
echo ^)
echo.
echo ^(
echo from flask import Flask, jsonify, request
echo from flask_cors import CORS
echo import psycopg2
echo from psycopg2.extras import RealDictCursor
echo.
echo app = Flask^(__name__^)
echo CORS^(app^)
echo.
echo DB = {"host": "10.110.65.232", "port": "8745", "database": "vr", "user": "postgres", "password": "VrPost@Server"}
echo.
echo @app.route^('/'^)
echo def home^(^): return jsonify^({"status": "online"}^)
echo.
echo @app.route^('/produto/^<codigo^>'^)
echo def get_produto^(codigo^):
echo     try:
echo         conn = psycopg2.connect^(**DB^)
echo         cur = conn.cursor^(cursor_factory=RealDictCursor^)
echo         cur.execute^(f"SELECT * FROM produto WHERE id = {codigo} LIMIT 1"^)
echo         r = cur.fetchone^(^)
echo         conn.close^(^)
echo         return jsonify^({"found": bool^(r^), "data": dict^(r^) if r else None}^)
echo     except Exception as e: return jsonify^({"error": str^(e^)}^), 500
echo.
echo if __name__ == '__main__':
echo     app.run^(host='0.0.0.0', port=5000^)
echo ^) ^> _api_vr.py
echo.
echo ^(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.Run "python_portable\python.exe _api_vr.py", 0, False
echo WshShell.Run "cmd /c cloudflared.exe tunnel run --token eyJhIjoiYTBhYzQyZjQ5MjkyODAyZGMxMDcwMTVkMWVmZDcxZmMiLCJ0IjoiYjEwOTA5NTktOWEwNC00NWI3LWE5ZDItNzMzNDdjYmYwYzcyIiwicyI6Ik5qZ3lOVEUzWVRVdE1tUXpOQzAwWW1KbUxXRXlNek10TTJJM1pUaGhaamxqWmpVNSJ9 ^> tunnel.log 2^>^&1", 0, False
echo ^) ^> _launcher.vbs
echo.
echo cscript //nologo _launcher.vbs
echo del _launcher.vbs 2^>nul
echo exit
) > "M:\VR_API\INICIAR.bat"

REM Cria PARAR.bat
(
echo @echo off
echo taskkill /F /IM python.exe /T 2^>nul
echo taskkill /F /IM cloudflared.exe /T 2^>nul
echo echo Servicos parados!
echo pause
) > "M:\VR_API\PARAR.bat"

echo [4/4] Pronto!
echo.
echo ============================================================
echo    INSTALACAO CONCLUIDA!
echo    Pasta: M:\VR_API
echo.
echo    PROXIMO PASSO (ainda no Autosky):
echo    1. Va ate M:\VR_API
echo    2. Execute INICIAR.bat
echo    3. O atalho sera criado automaticamente
echo ============================================================
pause
