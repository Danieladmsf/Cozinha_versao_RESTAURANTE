@echo off
chcp 65001 >nul
echo ============================================================
echo    DIAGNOSTICO DE ARQUIVOS E PERSISTENCIA
echo ============================================================
echo.

echo [1/3] Listando unidades de disco disponiveis...
wmic logicaldisk get caption, description, providername, volumename

echo.
echo [2/3] Procurando por INICIAR.bat em todo o disco C:...
echo    (Isso pode demorar um pouco)
cd \
dir /s /b INICIAR.bat 2>nul
if %errorlevel% neq 0 (
    echo    X Nenhum arquivo INICIAR.bat encontrado no drive C:
)

echo.
echo [3/3] Verificando pastas comuns de usuario...
echo    Desktop:
dir "%USERPROFILE%\Desktop\INICIAR.bat" /b 2>nul || echo    (Vazio)
echo    Documents:
dir "%USERPROFILE%\Documents\INICIAR.bat" /b 2>nul || echo    (Vazio)
echo    Downloads:
dir "%USERPROFILE%\Downloads\INICIAR.bat" /b 2>nul || echo    (Vazio)

echo.
echo ============================================================
echo    CONCLUSAO:
echo    Se nada apareceu acima, a sessao foi resetada e os arquivos
echo    nao-persistentes foram apagados.
echo.
echo    RECOMENDACAO:
echo    Para reinstalar tudo, copie o arquivo "INICIAR.bat" novamente.
echo ============================================================
pause
