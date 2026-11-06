# App da Lia

React Native + Expo (Android, development build).

## Rodar
1. Servidor: na pasta `api-lia`, `uvicorn main:app --host 0.0.0.0 --port 8000` (veja o README dela).
2. App: nesta pasta, `npm install` e depois `npm run android`, com o celular no cabo e na mesma rede Wi-Fi do notebook.

O app procura a API no mesmo computador que roda o Metro, na porta 8000.
Para outro endereço, crie `.env` aqui com `EXPO_PUBLIC_LIA_API=http://IP:8000`.

## APK para a banca
1. `npm run apk` (é o `expo run:android --variant release`). O APK fica em `android/app/build/outputs/apk/release/app-release.apk`.
2. Instale no celular da banca. Por arquivo, no Android 13 ou mais novo: Configurações → Apps → Lia → ⋮ → **Permitir configurações restritas**, e só então ative a acessibilidade.
3. Ligue a API no notebook e deixe celular e notebook na mesma rede Wi-Fi.
4. No app, em **Minha Lia → Servidor da Lia**, digite o IP do notebook e toque em **Salvar endereço e testar**.

O APK aceita HTTP na rede local (`usesCleartextTraffic`), porque a API roda no notebook sem HTTPS.

## Abas
- **Conversar:** voz (pt-BR) ou texto. A Lia pode:
  - **Guiar** no gov.br simulado (consulta, INSS, multas): abre o site e o Guia aponta onde tocar (#6).
  - **Guiar em qualquer app** (#7): o Guia manda os textos da tela, pseudonimizados, para a IA, que escolhe o próximo toque. Exemplos: "como mando foto no WhatsApp?" ou "quero aumentar a letra".
  - **Ler um papel** pela câmera e avisar se parece golpe (#5).
  - **Avisar um familiar** no WhatsApp, com confirmação por voz ou botão (#8).
  - Mostrar alerta de golpe quando a mensagem tiver link ou pedido suspeito (#5).
- **Ligação:** simulação do canal por ligação comum, só voz e mãos livres (#11).
- **Minha Lia:** família (nome, parentesco, WhatsApp) e o progresso de autonomia por serviço (#10).
- **Teste do Guia:** teste de 1 dia do Guia, com os três níveis de autonomia (veja `TESTE-GUIA.md`).

Na primeira vez, o app mostra 4 telas faladas (o que a Lia faz e a permissão de acessibilidade).

## Privacidade (#9)
- `src/lia/pseudonimizar.ts`: CPF, telefone, e-mail, cartão e CEP viram etiquetas (`[CPF_1]`) antes de sair do celular. A resposta volta com os dados reais.
- O telefone da família e o progresso ficam só no celular. A IA recebe só o parentesco.
- No Guia com IA, os textos da tela também passam pela pseudonimização antes de sair do celular.
- Fotos não são pseudonimizadas: na demo, só papéis fictícios.

## Autonomia progressiva (#10)
Cada serviço concluído com o Guia sobe um degrau:
- **0, faz junto:** anel e voz em todo passo.
- **1, só confirma:** só a dica; o anel aparece se a pessoa travar por 8 s.
- **2, só acompanha:** a Lia fica quieta; o anel aparece se a pessoa travar por 20 s.

A IA também recebe o nível e ajusta o quanto explica.
