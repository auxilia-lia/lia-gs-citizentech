# Charter da equipe e backlog — Lia (GS Citizen Tech)

Nov 5, 2026 · @João Victor · atualizado em 07/11/2026

Uma página para a equipe saber o que vamos entregar, quem cuida de quê e até quando. Entrega final: Nov 19, 2026, às 23h55.

## Objetivo

Entregar a **Lia**: um app que acaba com a dependência digital de quem não consegue usar o celular, o gov.br ou o INSS sozinho. Ela entende, guia na tela e age, e vai devolvendo a autonomia aos poucos.

**Critério para ganhar:** a nota 10 nas matérias é só cumprir o que foi pedido. O que faz ganhar é o que fizermos além disso e ser uma ideia melhor que as demais.

**Nome da equipe:** a definir.

## Equipe e donos

Cada matéria tem um dono, responsável por garantir a entrega. Todo mundo ajuda e todo mundo precisa saber explicar o projeto inteiro.

**Matérias**

| Matéria | Entrega | Dono |
| --- | --- | --- |
| Agile | Ficha no README, backlog, iteração, retrospectiva (PDF ou quadro) | João |
| AR-VR (Maya) | Vídeo de 30 a 60 s com 3 objetos modelados + PDF com link | a definir |
| Data Science | CSV público + notebook .ipynb + README + txt com RMs | João e Vinicius |
| Database | PDF com entidades, atributos, relacionamentos e DER conceitual e lógico (Oracle Data Modeler). Mesmos nomes de entidades do núcleo Java | a definir |
| DDD Java | Projeto Java em pacotes, OOP, Javadoc, Main com os 4 casos + documento (ZIP) **e** núcleo integrado à Lia por REST (Spring Boot), chamado pela API Python. Contrato: `core-java/CONTRATO.md` (link: _colar aqui_) | a definir |
| Dynamic Programming | Pasta dynamic-programming/ com .ipynb e README + PDF de até 4 páginas | a definir |
| Redes | Arquivo .pkt do CRAS + PDF com endereçamento, testes e respostas | a definir |

**Partes do app da Lia**

| Parte | O que faz | Dono |
| --- | --- | --- |
| Base do app | Projeto Expo, development build e APK no celular | João |
| Voz | Ouvir a pessoa (reconhecimento de voz), falar as respostas e entender o pedido com IA | João |
| Entende (foto) | Câmera + IA com visão: explica cartas, contas e receitas em áudio, com antigolpe (o Levenshtein vem de quem faz DP) | João |
| Guia na tela | Módulo Android de acessibilidade: lê a tela, a IA decide onde tocar e o app desenha a seta | João |
| Age | Contatos, abrir o WhatsApp pronto e pedir a confirmação ao usuário. O nível de risco e o tipo de confirmação vêm do núcleo Java | João |
| Autonomia progressiva | Registrar o que a pessoa já sabe e passar de "faz junto" para "só confirma" e "só acompanha" | João |
| API da Lia (Python) | FastAPI que conversa com a IA, o Guia e o antigolpe; chama o núcleo Java para decidir risco e confirmação (contrato pronto) | João |
| Banco e privacidade | Banco real, consentimento LGPD. Pseudonimização: no app, antes de sair do celular; no núcleo Java, no canal por ligação | a definir |
| gov.br simulado | Telas do gov.br e API fake, onde o Guia atua na demo | João |
| Canal por ligação | Simulação da Lia atendendo por ligação comum | João |
| Pitch | Vídeo de até 3 min no YouTube e roteiro da demo | João |

**Integrantes:** a definir (até 5, mesma turma).

## Regras e rotina

- **Simples primeiro:** o básico de cada matéria pronto e bem feito antes de qualquer extra.
- **IA como copiloto:** todo prompt usado vai para o `prompts.md`, e cada um sabe explicar o código que entregou.
- **Dados:** nada de dados pessoais reais. Só dados simulados ou públicos, sempre com a fonte.
- **Repositório:** README com a ficha da CitizenTech no topo e uma pasta por parte.
- **Segredos:** chaves de API (Gemini) ficam só no `api-lia/.env` de cada um e são passadas por mensagem privada; nunca no GitHub.
- **Presença:** chamada em todas as aulas de 04/11 a 19/11.
- **Check-in:** a cada 2 ou 3 dias, cada um diz o que fez, o que vai fazer e onde travou.
- **Canal da equipe:** a definir.
- **Envio:** um integrante envia cada matéria, depois da revisão da equipe. Nada fica para a última hora do dia 19.

## Backlog priorizado

Três sprints até a entrega: **Sprint 1** (05 a 09/11) pesquisa e prova do Guia; **Sprint 2** (10 a 15/11) construção do app e das entregas; **Sprint 3** (16 a 19/11) vídeos, revisão e envio. A Sprint 1 serve como a iteração que Agile pede.

| # | Item | Épico | Prioridade | Sprint | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Escolher a cidade do interior e pegar a taxa de analfabetismo do Censo | Pesquisa | Alta | 1 | Não iniciado |
| 2 | Entrevistar uma pessoa real do público | Pesquisa | Alta | 1 | Não iniciado |
| 3 | Preencher a ficha da CitizenTech no README | Agile | Alta | 1 | Não iniciado |
| 4 | Teste do Guia na tela | Guia | Alta | 1 | Em andamento |
| 5 | Foto de papel → explicação em áudio, com antigolpe | Entende | Alta | 2 | Em andamento |
| 6 | Telas do gov.br simulado | Guia | Alta | 2 | Em andamento |
| 7 | Guia genérico funcionando no gov.br simulado e num app real | Guia | Alta | 2 | Em andamento |
| 8 | Avisar familiar no WhatsApp com confirmação | Age | Alta | 2 | Em andamento |
| 9 | Pseudonimização de CPF e telefone (app + núcleo Java) | Segurança | Média | 2 | Em andamento |
| 10 | Autonomia progressiva (faz junto → confirma → acompanha) | Autonomia | Média | 2 | Em andamento |
| 11 | Canal por ligação telefônica (simulado) | Conectividade | Baixa | 3 | Em andamento |
| 12 | Data Science: CSV público e notebook | Matérias | Alta | 2 | Não iniciado |
| 13 | Database: modelo conceitual e lógico | Matérias | Alta | 2 | Não iniciado |
| 14 | DDD Java: domínio de pedidos com níveis de risco, Main e integração com a API (contrato pronto) | Matérias | Alta | 2 | Não iniciado |
| 15 | Dynamic Programming: Levenshtein e relatório | Matérias | Alta | 2 | Não iniciado |
| 16 | Redes: CRAS no Packet Tracer e PDF | Matérias | Alta | 2 | Não iniciado |
| 17 | Maya: cena com 3 objetos e vídeo | Matérias | Média | 3 | Não iniciado |
| 18 | Validar com 3 a 5 pessoas e gravar | Pesquisa | Média | 3 | Não iniciado |
| 19 | Vídeo de pitch de 3 minutos | Pitch | Alta | 3 | Não iniciado |
| 20 | Retrospectiva e PDF de Agile | Agile | Alta | 3 | Não iniciado |
