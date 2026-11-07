@echo off
REM Rodada completa do robo de testes da Lia, sem digitar nada:
REM   1) fecha API e Metro antigos  2) liga a API  3) prebuild + build e instala o app
REM   4) liga o Metro e abre a Lia no celular  5) roda o robo
REM Celular no cabo (adb devices = device). Resultado em testes-robo\ (rodada.log e status.txt).
chcp 65001 >nul
cd /d "%~dp0"
if not exist testes-robo mkdir testes-robo
set STATUS=testes-robo\status.txt
echo inicio %date% %time% > %STATUS%

echo [1/5] Fechando API e Metro antigos...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000 " ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8081 " ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Lia API*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Lia Metro*" >nul 2>&1
REM robo de uma rodada anterior que ainda esteja rodando
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*robo_lia.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo [2/5] Ligando a API...
start "Lia API" /min cmd /k "cd /d %~dp0api-lia && py -m uvicorn main:app --host 0.0.0.0 --port 8000"
echo api ok >> %STATUS%

echo [3/5] Gerando e instalando o app (demora alguns minutos)...
REM reinicia o adb (as vezes ele trava entre uma rodada e outra) e confere o celular
adb kill-server >nul 2>&1
adb start-server >nul 2>&1
adb wait-for-device
cd app
call npx expo prebuild --platform android --clean > ..\testes-robo\build.log 2>&1
call npx expo run:android --no-bundler >> ..\testes-robo\build.log 2>&1
if errorlevel 1 (
  echo ERRO no build: veja testes-robo\build.log >> ..\%STATUS%
  echo ERRO no build: veja testes-robo\build.log
  goto fim
)
echo build ok >> ..\%STATUS%

echo [4/5] Ligando o Metro e abrindo a Lia no celular...
start "Lia Metro" /min cmd /k "cd /d %~dp0app && npx expo start --dev-client --port 8081"
cd ..
adb reverse tcp:8081 tcp:8081 >nul
adb reverse tcp:8000 tcp:8000 >nul
timeout /t 20 /nobreak >nul
adb shell am start -a android.intent.action.VIEW -d "exp+lia://expo-development-client/?url=http%%3A%%2F%%2Flocalhost%%3A8081" br.com.fiap.lia >nul
timeout /t 45 /nobreak >nul
echo app ok >> %STATUS%

echo [5/5] Rodando o robo...
set APENAS=
if exist testes-robo\apenas.txt set /p APENAS=<testes-robo\apenas.txt
if defined APENAS (py -X utf8 -u ferramentas\robo-lia\robo_lia.py --apenas %APENAS% > testes-robo\rodada.log 2>&1) else (py -X utf8 -u ferramentas\robo-lia\robo_lia.py > testes-robo\rodada.log 2>&1)
type testes-robo\rodada.log

:fim
echo fim %date% %time% >> %STATUS%
echo.
echo Pronto.
REM fecha sozinha (para a proxima rodada poder ser iniciada sem janela na frente)
exit
