# Lia — assistente de IA por voz para autonomia digital

> Global Solution FIAP 2026.2 · CitizenTech · Engenharia de Software (2º ano)

## Ficha da CitizenTech

| Campo | Conteúdo |
| --- | --- |
| **Nome da CitizenTech** | Lia |
| **Cidade e bairro** | Taiobeiras (MG), bairro Centro. Ponto de atendimento: CRAS Centro (Rua Santos Dumont, 336) |
| **Cidadão beneficiado** | Pessoas com pouca prática com celular ou leitura, principalmente idosos, que hoje dependem de filhos e netos para usar serviços digitais |
| **Problema, em uma frase** | Quem não consegue usar o celular, o gov.br ou o INSS sozinho perde autonomia e fica exposto a golpes, porque os serviços digitais exigem ler e preencher formulários |
| **Como funciona** | A pessoa fala ou mostra uma foto. A Lia **entende** (explica em áudio e avisa se é golpe), **guia** na tela (mostra onde tocar) e **age** (avisa a família no WhatsApp, com confirmação). Com o tempo, devolve a autonomia: primeiro faz junto, depois só confirma, depois só acompanha |
| **O que cada parte faz** | **App (React Native):** voz, câmera, guia na tela e WhatsApp. **Núcleo (Java):** pedidos, nível de risco e confirmação. **Serviço (Python):** busca tolerante a erro (Levenshtein) e antigolpe. **Banco:** usuários, pedidos, progresso e consentimento. **Rede:** o ponto de atendimento no CRAS Centro. **Dados:** análise de alfabetismo e uso digital. **Maya:** cena explicativa |
| **Link do repositório** | https://github.com/auxilia-lia/lia-gs-citizentech |
| **Indicador de impacto** | % de tarefas concluídas sem ajuda de outra pessoa |
| **ODS conectados** | **10** (reduz a exclusão digital) · **4** (ensina a usar o celular aos poucos) · **3** (acesso à saúde) · **11** (acesso a serviços públicos da cidade) |

## Equipe

**Grupo Auxilia**

| Nome | RM |
| --- | --- |
| João Victor Melo Santos | 566640 |
| Murilo Jeronimo Ferreira Nunes | 560641 |
| Vinicius Kozonoe Guaglini | 567264 |
| Yan Lucas Gonçalves da Silva | 567046 |

## Vídeos
- **Pitch (Agile):** https://youtu.be/rrERlaYx498
- **AR/VR:** https://youtu.be/BPEwRDY87NE

## Como instalar a Lia

O passo a passo completo está em [`INSTALAR.md`](INSTALAR.md): ligar a API (com a sua chave do Gemini ou sem chave, no modo teste), instalar o app no Android e conectar os dois. O núcleo em Java é opcional ([`core-java/README.md`](core-java/README.md)).

## Estrutura do repositório

| Pasta | Conteúdo | Matéria |
| --- | --- | --- |
| `app/` | App da Lia (React Native + Expo) | Além das matérias |
| `core-java/` | Núcleo da Lia em Java (Spring Boot), contrato com a API e documento em PDF | Domain Driven Design – Java |
| `dynamic-programming/` | Notebook do Levenshtein, dados, README e relatório em PDF | Dynamic Programming |
| `data-science/` | Três notebooks (TIC Domicílios 2025, Censo 2022 e INAF 2024), bases com as fontes, gráficos e README | Data Science & Statistical Computing |
| `database/` | PDF com os modelos conceitual e lógico e o .sql | Database Design |
| `network/` | Arquivo .pkt, PDF e planta do CRAS Centro | Network Architect Solutions |
| `ar-vr/` | Link do vídeo e PDF | AR-VR Modelling And Simulation |
| `agile/` | Backlog, evidências das sprints, retrospectiva e PDF da entrega | Agile Methodology With Squad Framework |
| `api-lia/` | Servidor da Lia: conversa, IA, antigolpe, Guia e gov.br simulado (FastAPI) | Além das matérias |
| `ferramentas/` | Robô de testes do Guia e registro do uso real no celular | Além das matérias |
| `pitch/` | Link e estrutura do vídeo pitch | Pitch |
| `prompts.md` | Todos os prompts de IA usados no desenvolvimento | Regra da GS |

## Dados

Nenhum dado pessoal real. Todos os documentos, CPFs e contatos da demo são fictícios. Dados públicos sempre com a fonte indicada.
