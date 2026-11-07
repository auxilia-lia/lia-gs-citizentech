# Prompts de IA

Registro dos prompts usados no desenvolvimento (regra da GS, RNF06). Cada integrante registra os seus e sabe explicar o que entregou.

Ferramenta: Claude (Anthropic), em conversas contínuas com o contexto do projeto (enunciado, charter e documentação).

**Como ler:** os prompts estão em ordem de montagem do projeto, da ideia ao crescimento. Pedidos repetidos durante os testes foram juntados num só, e o texto foi revisado (português e clareza) sem mudar o que foi pedido.

## 1. Idealização (29/10 a 04/11/2026)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 1.1 | "O tema da Global Solution é CitizenTech. Me ajude a levantar ideias de problemas reais de cidadania que a tecnologia resolve, e avalie cada uma pelo critério: o que faz ganhar é ir além do pedido e ser uma ideia melhor que as dos outros grupos." | Ideias comparadas (sobra de comida, direitos esquecidos, cisterna, enchente, calor, vaga no SUS, evasão escolar, quadra ociosa, dependência digital) |
| 1.2 | "Aprofunde a ideia de um assistente por voz que acaba com a dependência digital: o que ele faz, para quem, o que o diferencia de um chatbot comum e por que não ser só no WhatsApp." | A Lia e os 3 pilares (Entende, Guia, Age), autonomia progressiva e canal por ligação |
| 1.3 | "Como o Guia pode mostrar onde tocar em qualquer app, sem agir no lugar da pessoa? Funciona no iPhone? Como proteger bancos e senhas?" | Decisão: serviço de acessibilidade do Android + sobreposição; apps protegidos e filtro de dados; iPhone como visão futura |

## 2. Planejamento (04 a 05/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 2.1 | "Monte o charter da equipe e um backlog priorizado em sprints até 19/11, com uma matéria por dono." | Charter e backlog de 20 itens (épicos = pilares) |
| 2.2 | "Mostre como cada matéria da GS vira uma peça da Lia, com entrega, nota, dependências, prazo e cuidados." | Documentação do projeto (arquitetura e plano de execução) |
| 2.3 | "Prepare as perguntas das entrevistas e a estrutura do vídeo de pitch de 3 minutos, seguindo o método de storytelling do professor." | Roteiro das entrevistas e do pitch |
| 2.4 | "O que ainda falta fazer, por responsável e por sprint? Separe o que você consegue adiantar sem depender de mim." | Lista de pendências usada para planejar cada rodada |

## 3. Base do app e da API (05/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 3.1 | "Prepare o ambiente e o projeto do app (Expo com development build). Trabalhe direto na pasta do repositório e faça os commits no meu nome." | Roteiro de instalação e projeto Expo em `app/` |
| 3.2 | "Crie a conversa por voz com a Lia no app e uma API que guarda a personalidade dela, antes mesmo das telas do gov.br." | `api-lia` (FastAPI) e a conversa por voz |
| 3.3 | "Faça o módulo nativo do Guia (acessibilidade, sobreposição e voz) e a tela para o teste de 1 dia." | `app/modules/lia-guia` |

## 4. Funcionalidades da Lia (05 a 06/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 4.1 | "Implemente o gov.br simulado, o Entende (foto de papel explicada em áudio, com antigolpe), avisar a família no WhatsApp com confirmação, a pseudonimização de CPF e telefone, a autonomia progressiva e o canal por ligação, com testes." | Itens 5, 6, 8, 9, 10 e 11 do backlog |
| 4.2 | "Faça o Guia genérico com IA, o APK para a banca, a identidade visual (ícone, splash e primeira vez), o notebook de Data Science, a pasta de Agile e o roteiro do pitch." | Item 7, identidade azul e âmbar, `data-science/`, `agile/`, `pitch/` |

## 5. Guia na tela: precisão e segurança (06 a 07/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 5.1 | "O Guia precisa apontar o botão exato: use o número do botão, o contexto (de que item ele é), o estado (ligado ou desligado) e marque anúncios. Ele deve funcionar em qualquer app, com apps de banco protegidos e dados sensíveis apagados antes de ir para a IA." | Botões numerados, estados, apps protegidos e filtro de dados |
| 5.2 | "O Guia não pode travar nem ficar confuso quando a pessoa mexe no celular ou digita: dê um prazo para a IA, espere a tela assentar, não aponte atrás das barras nem do teclado e pause quando a pessoa sair do app." | Vigia contra travadas, área útil, modo teclado, pausa |
| 5.3 | "Vale a pena a Lia olhar a imagem da tela quando ela ou a pessoa travar? Se sim, implemente só para esse caso." | Imagem da tela (com tarjas) apenas quando trava |
| 5.4 | "Pense em abordagens novas para o Guia ficar mais rápido e certeiro e implemente todas: caminhos aprendidos, plano no começo, pesquisa primeiro nas Configurações, voltar ao último ponto certo." | Caminhos aprendidos, plano, busca primeiro, título da tela e caminho |
| 5.5 | "Na Play Store a Lia pede passos desnecessários e instala o app errado. Pense numa forma diferente de guiar ali." | Roteiro próprio da loja (busca direta pelo nome do app) |
| 5.6 | "A Lia entra em loop: liga e desliga o Bluetooth, volta para a tela inicial no GPS, repete 'fotos de ontem'. Corrija para ela reconhecer quando a pessoa já acertou." | Detecção de mudança de estado, rótulo oposto e proteção contra repetição |

## 6. Voz e conversa durante o Guia (07/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 6.1 | "Deixe o microfone aberto durante o Guia, para a pessoa perguntar sem tocar em nada ('e agora?', 'espera', 'já baixou?'), sem a Lia ouvir a si mesma." | Escuta contínua e comandos de voz do Guia |
| 6.2 | "A Lia deve responder 'já baixou?' olhando a tela, e o resumo do caminho no fim não deve incluir toques errados nem 'voltar'." | Resposta pela tela e resumo limpo |
| 6.3 | "A Lia fica sem som ou troca para a voz antiga. Faça a voz ser sempre a mesma e se reconectar sozinha." | Voz única com reconexão (o app fala pela voz do Guia) |

## 7. Ensino, recompensas e visual (07/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 7.1 | "Faça a Lia ensinar, e não só apontar: 'o que é isso?', palavras do celular e hora de praticar. Mostre o que a pessoa já aprendeu e recompense sem pressão." | Explicar a tela, glossário, prática, jornada, caminhos, certificado e família comemorando |
| 7.2 | "Deixe as animações do Guia bonitas e polidas, com cara de produto final." | Anel deslizante, holofote, dedo de toque, balão com avatar e confirmação de acerto |

## 8. Testes automatizados (07/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 8.1 | "Crie um robô de testes que você mesmo rode no celular pelo cabo, com o máximo de cenários, sem mudar a fonte nem o papel de parede e desligando a lanterna no fim." | `ferramentas/robo-lia` com 14 cenários |
| 8.2 | "Faça o ciclo completo sozinho: reinicie a API, recompile, rode o robô, analise os erros, corrija e rode de novo até passar." | `rodada-robo.bat`; 14 de 14 cenários passando |
| 8.3 | "Quando a Lia travar no celular, investigue você mesmo pelo computador e corrija." | Diagnóstico pelo log e `abrir-lia.bat` (abre a Lia pelo cabo) |

## 9. Integração com a equipe (07/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 9.1 | "Como a entrega de Java se conecta ao que estou desenvolvendo? Escreva um contrato para o colega construir o núcleo integrado à Lia, sem piorar o tempo de resposta, e atualize o charter para bater com ele." | `core-java/CONTRATO.md` (e PDF) e charter atualizado |
| 9.2 | "Reescreva este registro de prompts em ordem de montagem, por tópicos, juntando os repetidos e com o português corrigido." | Este arquivo |

## Prompts que a Lia usa (dentro do produto)

Estes prompts rodam no servidor quando a Lia conversa. Ficam no código para qualquer um conferir.

| Arquivo | Prompt | Para quê |
| --- | --- | --- |
| `api-lia/prompt_lia.py` | `PROMPT_LIA` + `FORMATO` + ações por canal | Personalidade e regras da Lia (frases curtas, uma pergunta por vez, sem jargão, nunca pedir senha, antigolpe) e o formato JSON das ações |
| `api-lia/prompt_lia.py` | `CANAL_LIGACAO` | Ajustes para a ligação telefônica (sem tela) |
| `api-lia/prompt_lia.py` | `PROMPT_ENTENDE` | Explicar a foto de um papel e avaliar se é golpe |
| `api-lia/guia.py` | `PROMPT_GUIA` | Guia genérico: escolher o próximo passo pelo número do botão, a partir dos textos e estados da tela, sem nunca escolher pagar, apagar ou anúncio |
| `api-lia/guia.py` | `IMAGEM` | Complemento do Guia quando ele travou e mandou a imagem da tela (com tarjas) |
| `api-lia/guia.py` | `PROMPT_PLANO` | Caminho provável no começo do Guia |
| `api-lia/guia.py` | `PROMPT_EXPLICAR` | "O que é isso?": explicar a tela em palavras simples |
