# Sprint 1 · 05 a 09/11 · a iteração

**Objetivo da sprint:** provar que a Lia é possível (o Guia funciona na tela de outro app) e fechar a pesquisa que sustenta o problema: cidade, entrevista e dados.

## Planejado × feito
| Item | Planejado | Feito até agora | Observação |
| --- | --- | --- | --- |
| 1 · Cidade | Escolher a cidade e pegar a taxa | Taiobeiras (MG), bairro Centro, com o CRAS Centro como ponto de atendimento | Escolhida por ser cidade do interior com parentes da equipe; o ranking das UFs ficou em `data-science/` |
| 2 · Entrevista | 2 entrevistas (quem tem dificuldade e quem ajuda) | Roteiro pronto na Sprint 1 | Feita na Sprint 2 (13/11), só com a Rosária; a segunda ficou para o piloto |
| 3 · Ficha | Ficha completa no README | Ficha pronta | Cidade, equipe e RMs completados depois |
| 4 · Teste do Guia | Teste de 1 dia até 09/11 | Guia rodando no celular, em apps reais | Robô de testes com 14 de 14 cenários (07/11): o Guia genérico entra na demo |
| Extra · App | Só na Sprint 2 | Base do app, conversa por voz e os itens 5 a 11 com código pronto | Adiantado porque o app é a maior carga |
| Extra · Data Science | Só na Sprint 2 | Notebook executado com dados públicos | Falta a cidade |

## Evidências
- **Commits** (histórico do GitHub, todos em 05/11/2026):
  - `b8c9bf9` Estrutura inicial e ficha da CitizenTech
  - `05df9ab` Tira o nível extra de pasta
  - `79e9dc1` Base do app (Expo + development build) e teste do Guia na tela
  - `2cc76b0` Conversa por voz com a Lia (app + API da IA)
  - `5f0ab46` gov.br simulado, Entende, Age, pseudonimização, autonomia e ligação
- **Issues e milestones:** 20 issues com labels de épico e prioridade, e 3 milestones (Sprint 1, 2 e 3). Tirar print do milestone da Sprint 1 no começo e no fim da sprint.
- **Testes automáticos:** API com 16 testes (`api-lia/teste_api.py`); pseudonimização, família e risco testados.
- **Entrevista:** 13/11 (já na Sprint 2), com a Rosária, 57 anos. O que mudou por causa dela está em `iteracao.md`.
- **Teste do Guia:** 07/11, Galaxy S26 Plus pelo cabo, com o robô de testes (`rodada-robo.bat`): 14 de 14 cenários passando depois de 8 rodadas de correção.

## Revisão da sprint (09/11)
A prova principal foi aceita: o Guia funciona em outros apps, então ele entra na demo (antes, a alternativa era mostrar só o portal simulado). Voltaram para o backlog a entrevista (feita em 13/11) e os bugs de escuta do uso real (microfone ouvindo a conversa da sala), que passaram a ser registrados antes de mexer.

A iteração descrita em detalhe, com as discussões e decisões, é a Sprint 2: veja `iteracao.md`.
