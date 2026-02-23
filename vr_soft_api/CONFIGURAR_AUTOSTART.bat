@echo off
echo ==================================================
echo   Configurar VR Soft API para iniciar automatico
echo ==================================================
echo.

set TASK_NAME=VR_Soft_API
set SCRIPT_PATH=%~dp0INICIAR_API_HIDDEN.vbs

echo Criando atalho na pasta Inicializar do Windows...

:: Cria um arquivo VBS para criar o atalho
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateShortcut.vbs"
echo sLinkFile = oWS.SpecialFolders("Startup") ^& "\VR Soft API.lnk" >> "%TEMP%\CreateShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateShortcut.vbs"
echo oLink.TargetPath = "%SCRIPT_PATH%" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WorkingDirectory = "%~dp0" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WindowStyle = 7 >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Description = "VR Soft API - Inicia oculto" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Save >> "%TEMP%\CreateShortcut.vbs"

cscript //nologo "%TEMP%\CreateShortcut.vbs"
del "%TEMP%\CreateShortcut.vbs"

echo.
echo ✅ Configurado! A API VR Soft vai iniciar automaticamente com o Windows.
echo.
echo Para remover, delete o atalho em:
echo   %%APPDATA%%\Microsoft\Windows\Start Menu\Programs\Startup\VR Soft API.lnk
echo.
pause
