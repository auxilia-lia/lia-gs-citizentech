@echo off
REM Abre a Lia no celular buscando o app pelo cabo (o celular nao aceita pelo Wi-Fi).
REM Precisa do Metro rodando (npx expo start --dev-client ou npx expo run:android).
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000
adb shell am force-stop br.com.fiap.lia
adb shell am start -a android.intent.action.VIEW -d "exp+lia://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" br.com.fiap.lia
echo Lia aberta pelo cabo.
timeout /t 3 >nul
exit
