# Lia — assistente de IA por voz para autonomia digital

> Global Solution FIAP 2026.2 · CitizenTech · Engenharia de Software (2º ano)

## Ficha da CitizenTech

| Campo | Conteúdo |
| --- | --- |
| **Nome da CitizenTech** | Lia |
| **Cidade e bairro** | _[a definir: cidade do interior e bairro do CRAS]_ |
| **Cidadão beneficiado** | Pessoas com pouca prática com celular ou leitura, principalmente idosos, que hoje dependem de filhos e netos para usar serviços digitais |
| **Problema, em uma frase** | Quem não consegue usar o celular, o gov.br ou o INSS sozinho perde autonomia e fica exposto a golpes, porque os serviços digitais exigem ler e preencher formulários |
| **Como funciona** | A pessoa fala ou mostra uma foto. A Lia **entende** (explica em áudio e avisa se é golpe), **guia** na tela (mostra onde tocar) e **age** (avisa a família no WhatsApp, com confirmação). Com o tempo, devolve a autonomia: primeiro faz junto, depois só confirma, depois só acompanha |
| **O que cada parte faz** | **App (React Native):** voz, câmera, guia na tela e WhatsApp. **Núcleo (Java):** pedidos, nível de risco e confirmação. **Serviço (Python):** busca tolerante a erro (Levenshtein) e antigolpe. **Banco:** usuários, pedidos, progresso e consentimento. **Rede:** o ponto de atendimento no CRAS. **Dados:** análise de alfabetismo e uso digital. **Maya:** cena explicativa |
| **Link do repositório** | _[a definir]_ |
| **Indicador de impacto** | % de tarefas concluídas sem ajuda de outra pessoa |
| **ODS conectados** | **10** (reduz a exclusão digital) · **4** (ensina a usar o celular aos poucos) · **3** (acesso à saúde) · **11** (acesso a serviços públicos da cidade) |

## Equipe

| Nome | RM |
| --- | --- |
| _[a definir]_ | |

**Equipe:** _[nome e número a definir]_

## Estrutura do repositório

| Pasta | Conteúdo | Matéria |
| --- | --- | --- |
| `app/` | App da Lia (React Native + Expo) | Além das matérias |
| `core-java/` | Núcleo da Lia em Java | Domain Driven Design – Java |
| `dynamic-programming/` | Notebook e README do algoritmo | Dynamic Programming |
| `data-science/` | CSV, notebook e README | Data Science & Statistical Computing |
| `database/` | Modelos conceitual e lógico | Database Design |
| `network/` | Arquivo .pkt e PDF | Network Architect Solutions |
| `ar-vr/` | Link do vídeo e PDF | AR-VR Modelling And Simulation |
| `agile/` | Backlog, evidências das sprints e retrospectiva | Agile Methodology With Squad Framework |
| `prompts.md` | Todos os prompts de IA usados no desenvolvimento | Regra da GS |

## Dados

Nenhum dado pessoal real. Todos os documentos, CPFs e contatos da demo são fictícios. Dados públicos sempre com a fonte indicada.
