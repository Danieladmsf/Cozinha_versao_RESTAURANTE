@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    LIMPEZA DA PASTA VR_API
echo ============================================================

echo Excluindo scripts antigos e de diagnostico...
del "CORRIGIR_FLASK_FINAL.bat" 2>nul
del "DIAGNOSTICO_PYTHON.bat" 2>nul
del "DIAGNOSTICO_LOG.bat" 2>nul
del "CORRIGIR_INSTALACAO.bat" 2>nul
del "DIAGNOSTICO_COMPLETO.bat" 2>nul
del "INICIAR_SIMPLES.bat" 2>nul
del "INICIAR_LIMPO.bat" 2>nul
del "INICIAR.bat" 2>nul
del "INSTALAR_NO_M.bat" 2>nul
del "INSTALAR_PIP_FLASK.bat" 2>nul
del "LOCALIZAR_ARQUIVOS.bat" 2>nul
del "TESTAR_DRIVE_M.bat" 2>nul
del "LOG.txt" 2>nul
del "error_log.txt" 2>nul
del "tunnel.log" 2>nul

echo.
echo ============================================================
echo    LIMPEZA CONCLUIDA!
echo    Arquivos mantidos:
echo    - INICIAR_NGROK.bat (Seu script principal)
echo    - PARAR.bat (Para reiniciar)
echo    - python_portable (Pasta do Python)
echo    - ngrok.exe
echo ============================================================
pause
del "%~f0"
