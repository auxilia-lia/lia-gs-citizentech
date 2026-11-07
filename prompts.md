# Prompts de IA

Registro de todos os prompts usados no desenvolvimento (regra da GS, RNF06). Cada integrante registra os seus.
Cada um sabe explicar cada linha do que entregou.

## Prompts do desenvolvimento

Ferramenta: Claude (Anthropic), numa conversa contínua com o contexto do projeto (enunciado, charter e documentação).
Os prompts estão copiados como foram escritos.

| Data | Integrante | Parte | Prompt | Para quê / o que saiu |
| --- | --- | --- | --- | --- |
| 05/11/2026 | João Victor | App | "vamos continuar de onde paramos" | Retomar o plano: próximo passo era preparar o projeto do app |
| 05/11/2026 | João Victor | App | "pode preparar" | Roteiro de instalação (Node, Android Studio, depuração USB, Expo + development build) |
| 05/11/2026 | João Victor | App | "nao tem alguma forma de vc fazer sem deixar marca?" | A IA passou a trabalhar direto na pasta do repositório, com commits no nome do integrante |
| 05/11/2026 | João Victor | App | "aqui esta" | Projeto Expo (SDK 58, TypeScript, expo-dev-client) criado em `app/` |
| 05/11/2026 | João Victor | Guia | "as coisas que eu preciso fazer ficam pra posteriormente pois quero adiantar tudo possivel que voce que faz, proximo passo" | Módulo nativo do Guia (`app/modules/lia-guia`: acessibilidade, sobreposição, voz) e tela do teste de 1 dia |
| 05/11/2026 | João Victor | App / API | "faz o comit e tira o nivel extra, antes da tela do gov nao da pra botar ja pra conseguirmos conversar com a lia" | Reorganização do repositório; conversa por voz no app e a `api-lia` (FastAPI) com a personalidade da Lia |
| 05/11/2026 | João Victor | Planejamento | "o que ainda falta ser feito" | Lista do que faltava por responsável e por sprint |
| 05/11/2026 | João Victor | App / API | "faça ja todos esses, por favor" (itens: #6 gov.br simulado, #5 Entende, #8 Age, #9 Pseudonimização, #10 Autonomia progressiva, #11 Canal por ligação) | gov.br simulado, antigolpe, foto, família no WhatsApp, pseudonimização, autonomia e ligação, com testes |
| 05/11/2026 | João Victor | Planejamento | "O que mais falta você fazer sem eu ter q fazer algo antes" | Lista do que a IA conseguia adiantar sozinha |
| 05/11/2026 | João Victor | Planejamento | "Que envolve a minha parte apenas" | Lista filtrada pelas partes do João (app, Agile, Data Science, pitch) |
| 05/11/2026 | João Victor | Planejamento | "Tudo isso é oq falta vc fazer q eu nao preciso fazer nada, certo?" | Confirmação do que depende do celular ou da equipe |
| 05/11/2026 | João Victor | App / Agile / Data Science / Pitch | "Certo, faz tudo ja, tudo isso ai, ja faz" | Guia genérico com IA (#7), APK para a banca, identidade (ícone, splash, primeira vez), este registro, notebook de Data Science, pasta de Agile e roteiro do pitch |

Prompts de conversas anteriores (escolha da ideia, charter, backlog e documentação): _a registrar por quem fez._

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
