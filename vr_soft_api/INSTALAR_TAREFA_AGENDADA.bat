@echo off
cd /d "%~dp0"
title INSTALAR TAREFA AGENDADA (ADMIN)

echo ============================================================
echo   CONFIGURANDO TAREFA AGENDADA PARA INICIALIZACAO
echo   (Requer Privilegios de Administrador)
echo ============================================================
echo.

REM Remover tarefa antiga se existir
schtasks /delete /tn "VR_API_AutoStart" /f >nul 2>&1

REM Criar nova tarefa agendada
schtasks /create /tn "VR_API_AutoStart" /tr "wscript.exe \"%~dp0INICIAR_TRAY.vbs\"" /sc onlogon /rl highest /f

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   SUCESSO!
    echo   A API iniciara automaticamente ao fazer login.
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo   ERRO! Execute este arquivo como ADMINISTRADOR.
    echo   Clique direito no arquivo e escolha "Executar como administrador"
    echo ============================================================
)
pause
