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

## Telas
Barra de abas embaixo, sempre com ícone e nome:
- **Início:** saudação, botão grande "Fale comigo" e atalhos (marcar consulta, ver o INSS, ler um papel, avisar a família, me ensina no celular).
- **Conversar:** voz (pt-BR) ou texto. A Lia guia no gov.br simulado (#6) e em qualquer app (#7), lê papéis pela câmera (#5), avisa a família no WhatsApp com confirmação (#8) e alerta golpes.
- **Família:** quem a Lia pode avisar, com validação do nome e do WhatsApp.
- **Você:** o que a pessoa já faz sozinha (#10), permissões e "Ajustes avançados" (servidor, demonstrações de ligação e de teste do Guia).

Na primeira vez, 4 telas faladas explicam a Lia e pedem as permissões (microfone e Guia), dizendo o porquê.

## Guia na tela (2.0)
- Mostra **tocar** (anel âmbar) e **gestos animados**: deslizar do topo (painel rápido), rolar, voltar e ir para a tela inicial.
- Lê a janela de cima (inclusive o painel rápido), percebe **toque no lugar errado** e avisa na hora.
- Se a pessoa travar, repete com calma depois de 12 s; na segunda vez, pede outro caminho para a IA.

## Design
Azul royal profundo (`#1B3A9E`) como cor principal, âmbar para destaque, textos grandes (corpo de 20) e área de toque mínima de 56. As cores e os tamanhos ficam em `src/ui/tema.ts`.

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
