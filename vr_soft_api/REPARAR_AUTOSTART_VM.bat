@echo off
echo ==================================================
echo   REPARAR INICIALIZACAO AUTOMATICA (VM)
echo ==================================================
echo.

set SCRIPT_VBS=%~dp0INICIAR_BACKGROUND.vbs

:: 1. Criar Atalho na pasta Startup
echo [1/2] Criando atalho na pasta Inicializar...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\VR_Soft_Extrator.lnk"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateShortcut.vbs"
echo sLinkFile = "%SHORTCUT_PATH%" >> "%TEMP%\CreateShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateShortcut.vbs"
echo oLink.TargetPath = "%SCRIPT_VBS%" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WorkingDirectory = "%~dp0" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WindowStyle = 7 >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Description = "Extrator VR Soft Background" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Save >> "%TEMP%\CreateShortcut.vbs"

cscript //nologo "%TEMP%\CreateShortcut.vbs"
del "%TEMP%\CreateShortcut.vbs"

if exist "%SHORTCUT_PATH%" (
    echo    Ok: Atalho criado com sucesso.
) else (
    echo    Erro: Falha ao criar atalho.
)

:: 2. Adicionar ao Registro do Windows (Fallback)
echo.
echo [2/2] Adicionando ao Registro (garantia extra)...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "VRSoftExtrator" /t REG_SZ /d "\"%SCRIPT_VBS%\"" /f

echo.
echo ==================================================
echo   PRONTO!
echo ==================================================
echo Agora o extrator DEVE iniciar junto com a VM.
echo.
pause
