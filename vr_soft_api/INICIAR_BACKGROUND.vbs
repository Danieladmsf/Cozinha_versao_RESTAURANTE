Set WshShell = CreateObject("WScript.Shell") 
WshShell.Run chr(34) & "C:\APP COZINHA\vr_soft_api\EXTRAIR_DADOS_LOOP.bat" & chr(34), 0
Set WshShell = Nothing
