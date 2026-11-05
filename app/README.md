# App da Lia

React Native + Expo (Android, development build).

## Rodar
1. Servidor: na pasta `api-lia`, `uvicorn main:app --host 0.0.0.0 --port 8000` (veja o README dela).
2. App: nesta pasta, `npm install` e depois `npm run android`, com o celular no cabo e na mesma rede Wi-Fi do notebook.

O app procura a API no mesmo computador que roda o Metro, na porta 8000.
Para outro endereço, crie `.env` aqui com `EXPO_PUBLIC_LIA_API=http://IP:8000`.

## Abas
- **Conversar:** voz (pt-BR) ou texto. A Lia pode:
  - **Guiar** no gov.br simulado (consulta, INSS, multas): abre o site e o Guia aponta onde tocar (#6, #7).
  - **Ler um papel** pela câmera e avisar se parece golpe (#5).
  - **Avisar um familiar** no WhatsApp, com confirmação por voz ou botão (#8).
  - Mostrar alerta de golpe quando a mensagem tiver link ou pedido suspeito (#5).
- **Ligação:** simulação do canal por ligação comum, só voz e mãos livres (#11).
- **Minha Lia:** família (nome, parentesco, WhatsApp) e o progresso de autonomia por serviço (#10).
- **Teste do Guia:** teste de 1 dia do Guia, com os três níveis de autonomia (veja `TESTE-GUIA.md`).

## Privacidade (#9)
- `src/lia/pseudonimizar.ts`: CPF, telefone, e-mail, cartão e CEP viram etiquetas (`[CPF_1]`) antes de sair do celular. A resposta volta com os dados reais.
- O telefone da família e o progresso ficam só no celular. A IA recebe só o parentesco.
- Fotos não são pseudonimizadas: na demo, só papéis fictícios.

## Autonomia progressiva (#10)
Cada serviço concluído com o Guia sobe um degrau:
- **0, faz junto:** anel e voz em todo passo.
- **1, só confirma:** só a dica; o anel aparece se a pessoa travar por 8 s.
- **2, só acompanha:** a Lia fica quieta; o anel aparece se a pessoa travar por 20 s.

A IA também recebe o nível e ajusta o quanto explica.
