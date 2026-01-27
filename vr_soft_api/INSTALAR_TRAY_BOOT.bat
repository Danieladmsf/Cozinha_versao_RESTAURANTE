@echo off
cd /d "%~dp0"
title INSTALAR AUTO BOOT (COM ICONE)

echo ============================================================
echo   CONFIGURANDO INICIALIZACAO AUTOMATICA (TRAY ICON)
echo ============================================================
echo.

set "SCRIPT_VBS=%~dp0INICIAR_TRAY.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_NAME=%STARTUP_FOLDER%\VR_API_AUTO.lnk"

echo Criando atalho em: %STARTUP_FOLDER%
echo Apontando para: %SCRIPT_VBS%

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
echo   A API iniciara com icone na bandeja ao reiniciar.
echo ============================================================
pause
