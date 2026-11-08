@echo off
rem Salva o registro da Lia (falas, o que ouviu, Guia, tempos) na pasta testes-robo.
cd /d %~dp0..\..
if not exist testes-robo mkdir testes-robo
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set AGORA=%%i
adb logcat -d -v time LIA_ROBO:I ReactNativeJS:V AndroidRuntime:E *:S > testes-robo\uso-%AGORA%.txt
echo Salvo em testes-robo\uso-%AGORA%.txt
pause
