@echo off
chcp 65001 >nul
echo ============================================================
echo    TESTE DE PERSISTENCIA DO DRIVE M:
echo    (M: = Seu disco C: local do notebook)
echo ============================================================
echo.

if not exist M:\ (
    echo ERRO: Drive M: nao esta disponivel!
    pause
    exit /b
)

echo [1/2] Criando pasta de teste em M:...
mkdir "M:\VR_API_TESTE" 2>nul
echo Arquivo de teste criado em %date% %time% > "M:\VR_API_TESTE\teste_persistencia.txt"

echo.
echo ============================================================
echo    PASTA CRIADA: M:\VR_API_TESTE
echo ============================================================
echo.
echo INSTRUCOES:
echo 1. Feche o Autosky (deslogue).
echo 2. No seu notebook, abra "Meu Computador" e va em C:\VR_API_TESTE
echo 3. Se a pasta existir, o drive M: PERSISTE e podemos usar!
echo 4. Logue novamente no Autosky e rode o proximo script.
echo.
pause
