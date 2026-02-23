@echo off
echo ==================================================
echo   Configurar Inicializacao Oculta na VM (Auto.Sky)
echo ==================================================
echo.

set "TARGET_FILE=C:\APP COZINHA\vr_soft_api\INICIAR_BACKGROUND.vbs"
set "SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\VR_EXTRATOR_AUTO.lnk"
set "WORKING_DIR=C:\APP COZINHA\vr_soft_api"
set "ICON_PATH=C:\Windows\System32\shell32.dll,14"

echo Criando atalho para inicio automatico (BACKGROUND)...
echo Alvo: %TARGET_FILE%
echo Atalho: %SHORTCUT_PATH%

:: Powershell para criar o atalho
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT_PATH%');$s.TargetPath='%TARGET_FILE%';$s.WorkingDirectory='%WORKING_DIR%';$s.IconLocation='%ICON_PATH%';$s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo.
    echo ========================================================
    echo   SUCESSO! Configurado para iniciar em BACKGROUND.
    echo   Da proxima vez que entrar na VM, o extrator rodara
    echo   escondido (sem janela preta).
    echo ========================================================
) else (
    echo.
    echo [ERRO] Falha ao criar atalho.
)
echo.
pause
