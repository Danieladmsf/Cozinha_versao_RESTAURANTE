@echo off
cd /d "%~dp0"
title INSTALAR AUTO BOOT

echo ============================================================
echo   CONFIGURANDO INICIALIZACAO AUTOMATICA
echo ============================================================
echo.

set "SCRIPT_VBS=%~dp0INICIAR_OCULTO.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_NAME=%STARTUP_FOLDER%\VR_API_AUTO.lnk"

echo Criando atalho em: %STARTUP_FOLDER%

echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%SHORTCUT_NAME%" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%SCRIPT_VBS%" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%~dp0" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

cscript /nologo CreateShortcut.vbs
del CreateShortcut.vbs

echo.
echo ============================================================
echo   SUCESSO!
echo   A API iniciara automaticamente quando o Windows ligar.
echo   (Sem janelas, tudo oculto)
echo ============================================================
pause
