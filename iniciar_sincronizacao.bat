@echo off
title VR Sync Agent - Cozinha Afeto
color 0A

:START
cls
echo ========================================================
echo   INICIANDO SINCRONIZACAO VR -> FIREBASE
echo   Data: %date% %time%
echo ========================================================
echo.
echo Navegando para a pasta do projeto...
cd /d "c:\APP COZINHA"

echo.
echo Iniciando Agente...
node scripts/sync-vr-to-firebase.js

echo.
echo ⚠️  O Agente parou ou caiu. Reiniciando em 5 segundos...
timeout /t 5
goto START
