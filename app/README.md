# App da Lia

React Native + Expo (Android, development build). Voz, câmera, guia na tela e WhatsApp.

## Rodar
1. Servidor da IA: na pasta `api-lia`, `uvicorn main:app --host 0.0.0.0 --port 8000` (veja o README dela).
2. App: nesta pasta, `npm install` e depois `npm run android`, com o celular no cabo e na mesma rede Wi-Fi do notebook.

O app procura a API no mesmo computador que roda o Metro, na porta 8000.
Para outro endereço, crie `.env` aqui com `EXPO_PUBLIC_LIA_API=http://IP:8000`.

## Telas
- **Conversar:** a Lia ouve (reconhecimento de voz do Android, pt-BR), manda para a API e responde falando. Toque num balão da Lia para ouvir de novo.
- **Teste do Guia:** teste de 1 dia do Guia na tela (veja `TESTE-GUIA.md`).
