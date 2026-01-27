@echo off
echo Encerrando processos da API VR...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq _api.py*" 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq API VR*" 2>nul
:: Tenta matar por porta tambem se tiver nmap/fuser (no windows usa netstat/taskkill)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5001" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5002" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
echo Processos encerrados.
exit /b 0
