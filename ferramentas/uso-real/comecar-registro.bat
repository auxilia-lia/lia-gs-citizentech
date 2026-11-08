@echo off
rem Prepara o celular para guardar o registro da Lia durante o uso real (sem cabo).
rem Depois de rodar, pode tirar o cabo e usar a Lia normalmente.
adb logcat -G 16M
adb logcat -c
echo.
echo Pronto. Pode tirar o cabo e usar a Lia. Anote o horario quando algo der errado.
echo Para salvar, conecte o cabo de novo e rode salvar-registro.bat
pause
