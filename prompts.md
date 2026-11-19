# Prompts de IA

Registro dos prompts usados no desenvolvimento (regra da GS, RNF06). Cada integrante registra os seus e sabe explicar o que entregou.

Ferramentas: Claude (Anthropic), em conversas contínuas com o contexto do projeto (enunciado, charter e documentação), e Claude Code no repositório para as mudanças do app e da API. Em Data Science e Database Design, o Vinicius usou o ChatGPT (OpenAI). Os prompts de cada matéria estão na parte **Prompts das matérias**, no fim deste arquivo.

**Como ler:** os prompts estão em ordem de montagem do projeto, da ideia ao crescimento. Pedidos repetidos durante os testes foram juntados num só, e o texto foi revisado (português e clareza) sem mudar o que foi pedido.

## 1. Idealização (29/10 a 04/11/2026)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 1.1 | "Tenho uma ideia para a GS CitizenTech: a Lia, uma assistente por voz para quem depende dos outros para usar o celular. Avalie de forma crítica, aponte pontos fracos e compare com outras ideias que a equipe levantou." | Avaliação da ideia do João; a equipe seguiu com a Lia |
| 1.2 | "O Yan sugeriu a autonomia progressiva e um canal por ligação. Valide esses incrementos e me ajude a responder: o que diferencia a Lia de um chatbot comum e por que não ser só no WhatsApp?" | Validação dos incrementos do Yan e dos 3 pilares (Entende, Guia, Age) |
| 1.3 | "Como o Guia pode mostrar onde tocar em qualquer app, sem agir no lugar da pessoa? Funciona no iPhone? Como proteger bancos e senhas?" | Decisão: serviço de acessibilidade do Android + sobreposição; apps protegidos e filtro de dados; iPhone como visão futura |

## 2. Planejamento (04 a 05/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 2.1 | "Me ajude a organizar o charter da equipe e o backlog em sprints até 19/11, a partir das entregas de cada matéria." | Charter e backlog de 20 itens (épicos = pilares), revisados pela equipe |
| 2.2 | "Mostre como cada matéria da GS vira uma peça da Lia, com entrega, nota, dependências, prazo e cuidados." | Documentação do projeto (arquitetura e plano de execução) |
| 2.3 | "Prepare as perguntas das entrevistas e a estrutura do vídeo de pitch de 3 minutos, seguindo o método de storytelling do professor." | Roteiro das entrevistas e do pitch |
| 2.4 | "O que ainda falta fazer, por responsável e por sprint? Separe o que você consegue adiantar sem depender de mim." | Lista de pendências usada para planejar cada rodada |

## 3. Base do app e da API (05/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 3.1 | "Prepare o ambiente e o projeto do app (Expo com development build). Trabalhe direto na pasta do repositório." | Roteiro de instalação e projeto Expo em `app/` |
| 3.2 | "Crie a conversa por voz com a Lia no app e uma API que guarda a personalidade dela, antes mesmo das telas do gov.br." | `api-lia` (FastAPI) e a conversa por voz |
| 3.3 | "Faça o módulo nativo do Guia (acessibilidade, sobreposição e voz) e a tela para o teste de 1 dia." | `app/modules/lia-guia` |

## 4. Funcionalidades da Lia (05 a 06/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 4.1 | "Implemente o gov.br simulado, o Entende (foto de papel explicada em áudio, com antigolpe), avisar a família no WhatsApp com confirmação, a pseudonimização de CPF e telefone, a autonomia progressiva e o canal por ligação, com testes." | Itens 5, 6, 8, 9, 10 e 11 do backlog |
| 4.2 | "Faça o Guia genérico com IA, o APK para a banca, a identidade visual (ícone, splash e primeira vez), a pasta de Agile e o roteiro do pitch." | Item 7, identidade azul e âmbar, `agile/`, `pitch/` |

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

## 10. Nuvem e velocidade (07 a 08/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 10.1 | "Deixe a Lia funcionando sem o notebook: a API num serviço grátis na nuvem, com um token entre o app e a API, e o APK de release apontando para ela." | API no Render, `render.yaml`, token, UptimeRobot e APK de release |
| 10.2 | "A Lia demora para responder. Faça ela começar a falar antes, resolver no celular os pedidos comuns e avisar quando for demorar." | Resposta em partes (`/conversa/fluxo`), pedidos comuns sem IA e "Só um instante." |
| 10.3 | "O microfone às vezes ouve a conversa da sala. Antes de mexer, crie um jeito de registrar o uso real para analisar." | Registro de uso real (`ferramentas/uso-real/`) |

## 11. Visual e quem não lê (07 a 08/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 11.1 | "Refaça o visual: chapado, fonte Poppins, sem emojis, abas Início, Família e Eu, e os ajustes da família separados de quem usa." | Novo visual e Ajustes para a família |
| 11.2 | "O público inclui quem não lê. Faça cada botão falar o que faz ao segurar e as telas se apresentarem em voz na primeira vez." | Botões e telas que falam; tocar no balão repete |

## 12. Correções depois da entrevista e da gravação da demo (13 a 14/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 12.1 | "Às vezes a Lia fala o texto em formato de código (JSON). Ache a causa e corrija." | Correção na resposta em partes |
| 12.2 | "Na gravação, o 'me ensina' pegou atalhos e a autonomia avançou com erro. Ensine sempre desde o começo, só avance de nível sem erro, faça todos os botões falarem e crie um nível de demonstração nos Ajustes." | Ensino do começo, autonomia sem erro, nível de demonstração, Portal do Cidadão e privacidade visível |
| 12.3 | "A Lia não pode olhar a tela do banco. Quando a pessoa abrir o banco, ela avisa e sugere alguém de confiança; instalar e abrir o app do banco continuam guiados." | Banco protegido |
| 12.4 | "Quero perguntar 'Lia, isso aqui é golpe?' em qualquer tela. Ela lê a tela só quando eu pedir, avisa e mostra como sair. Na ligação, troque a consulta sem dados por um recado para a família, com confirmação." | Antigolpe em qualquer tela e recado pela ligação |
| 12.5 | "Crie um site de golpe simulado para a demo, com marca inventada, sem imitar órgão ou empresa real e sem enviar dado nenhum." | `api-lia/golpe_simulado.py` (site "Resgata Já" em `/resgate`) |

## 13. Vídeo pitch (08 a 15/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 13.1 | "Faça poucas perguntas para a entrevista, para entender a dependência da família, o golpe e o que a pessoa queria fazer sozinha." | Roteiro da entrevista (feita pelo Vinicius em 13/11) |
| 13.2 | "Monte o roteiro e o guia de gravação do vídeo, com as falas e o que gravar em cada cena." | Roteiro e checklist de gravação |
| 13.3 | "Crie animações com cara de desenho feito à mão, quadro a quadro, nas cores da Lia, sem cara de edição de IA." | Animações do vídeo e da logo |
| 13.4 | "Edite o vídeo com os meus brutos: corte os erros da Lia, alinhe a câmera com a gravação de tela, coloque legendas, música e aberturas explicando cada cena." | Vídeo pitch de 4:38 |

## 14. Agile e organização (17/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 14.1 | "Confira o pedido de Agile e organize a entrega: personas, backlog em MoSCoW, evidências da iteração, retrospectiva e o PDF com o link do vídeo." | `agile/` atualizada e `Agile-Lia-Auxilia.pdf` |
| 14.2 | "Atualize este registro de prompts e organize o repositório." | Este arquivo, README e `pitch/` |

## 15. Integração com o núcleo Java (17/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 15.1 | "O Yan terminou o núcleo em Java. Ligue o núcleo na API seguindo o contrato: risco, confirmação e nível nas duas rotas de conversa, e a Lia tem que continuar funcionando se o Java cair." | `consultar_nucleo` em `api-lia/main.py`, tradução da autonomia por serviço, testes com o núcleo no ar e fora do ar |
| 15.2 | "Me explique como testar com o Java rodando e o que tirar de print para o documento." | Teste em `localhost:8000/docs` com e sem o núcleo (prints no documento de Java) |

## 16. Revisão final das entregas (18 e 19/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 16.1 | "Faça uma revisão geral de todas as entregas e veja se estão de acordo com o PDF da GS e dos professores, e se tem algum ponto que faça a gente perder nota." | Lista de riscos por matéria |
| 16.2 | "Corrige tudo, até o número dos 37%." | Java no JDK 21; ODS 3 sem "lembrete de remédio" (Java e Redes); títulos "conceitual" e "lógico" e significado dos relacionamentos (Database); medidas estatísticas da idade no notebook da TIC (Data Science); squad, retrospectiva e TIC 2025 no Agile; charter em PDF atualizado |

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

---

# Prompts das matérias

Cada integrante mandou os prompts essenciais da sua parte. Como no resto do arquivo, são versões resumidas das conversas, não a transcrição de todas as mensagens.

## Network Architect Solutions (Yan, 06 a 17/11)

A rede foi montada, configurada e testada pelo Yan no Packet Tracer. A IA tirou dúvidas durante a configuração, gerou a planta ilustrativa e organizou o relatório a partir dos prints e testes do Yan.

| # | Prompt | O que saiu |
| --- | --- | --- |
| NET.1 | "Vou montar no Packet Tracer as duas redes do enunciado, Atendimento (192.168.3.0/24) e Equipe (10.0.3.0/24), com 1 roteador, 2 switches, 1 access point, 1 servidor e 4 estações com IP fixo, uma no Wi-Fi. Tire as minhas dúvidas na configuração do roteador e do access point." | `network/AuxiLia_Equipe3_Network.pkt`, montado e testado pelo Yan |
| NET.2 | "Com base nos pings e no modo Simulation que eu rodei, me ajude a redigir as respostas às perguntas do enunciado: cabos, gateway errado, PDUs e o papel do switch e do roteador." | Respostas do relatório, a partir dos testes do Yan |
| NET.3 | Prompt da planta do CRAS, na IA de imagem (texto completo abaixo da tabela) | `network/planta-cras-centro.png`, com os dispositivos posicionados pelo Yan |
| NET.4 | "Organize o relatório com a ficha, a topologia, a tabela de endereçamento, os meus prints e as respostas, e gere o PDF." | `network/AuxiLia_Network.pdf` (20 páginas) |
| NET.5 | "A equipe trocou o ponto de atendimento para o CRAS Centro (Rua Santos Dumont, 336) e juntou tudo num repositório só. Atualize o relatório e gere o PDF de novo." | PDF atualizado; o prédio do `.pkt` foi renomeado pelo Yan |

Prompt da planta (NET.3):

```
Crie uma planta baixa humanizada, vista de cima (ortogonal, sem perspectiva), no estilo de render de arquitetura realista e ilustrado, com iluminação suave e cores claras. Formato horizontal na proporção 2:1.

É o prédio térreo de um CRAS (Centro de Referência de Assistência Social), um serviço público de uma cidade pequena do interior de Minas Gerais. Ambiente simples, acolhedor e acessível.

Distribuição das salas:
- Fileira de cima, da esquerda para a direita: "Sala de Uso Coletivo" (cadeiras em roda, mesa grande, quadro branco), "Atendimento Individual" (mesa pequena com duas cadeiras), "Sala Técnica" (sala pequena, sem janela, com um rack de servidor e um nobreak), "Sala da Equipe" (duas mesas de trabalho com notebooks e armários).
- Um corredor no meio, ligando as salas.
- Fileira de baixo, à esquerda e no centro: "Recepção · Ponto Lia", a maior sala, com balcão de atendimento com um notebook, fileira de cadeiras de espera, plantas e um ponto de acesso Wi-Fi no teto.
- Fileira de baixo, à direita: "Copa" (pia, geladeira, mesa pequena), "Banheiro Feminino" e "Banheiro Masculino", ambos acessíveis.
- Entrada principal na parte de baixo da recepção, com rampa de acessibilidade.
- Área externa estreita em volta: calçada, algumas árvores e uma pequena área de estacionamento com uma vaga para pessoa com deficiência.

Escreva o nome de cada sala em português, em letras grandes e legíveis, exatamente como está entre aspas acima. Não inclua pessoas, logotipos, marcas, marca d'água nem nenhum outro texto além dos nomes das salas.
```

## Domain Driven Design – Java (Yan, 11 a 18/11)

O código do núcleo foi escrito pelo Yan, no IntelliJ. A IA explicava a lógica de cada parte, passava o esqueleto com lacunas e revisava o que o Yan escrevia. A organização do repositório (Conventional Commits, uma branch por parte, merge por Pull Request) foi decisão do Yan.

| # | Prompt | O que saiu |
| --- | --- | --- |
| JAVA.1 | "Vou montar o núcleo em Spring Boot por partes, com commits semânticos e uma branch por parte, e o README vai crescendo junto com o código. Me ajude a configurar o projeto a partir do contrato do João." | Organização `auxilia-lia` e projeto `core-java/`, criados pelo Yan (no `lia-citizentech`, juntado a este repositório em 17/11) |
| JAVA.2 | "Para eu escrever cada classe, me passe a lógica e o esqueleto com lacunas. Depois, revise o que eu fizer e aponte os erros." (repetido a cada parte) | Domínio (`Acao` e as três filhas, `Pedido`, `Canal`, `Usuario`...), serviços (`PoliticaDeConfirmacao`, `GestorDeAutonomia`, `Pseudonimizador`, `FabricaDeAcoes`) e o `Main` com os 4 casos, escritos pelo Yan |
| JAVA.3 | "Agora a camada REST, no mesmo formato: DTOs, beans, controller com `/nucleo/decidir`, `/nucleo/pseudonimizar` e `/nucleo/saude` e os erros 422 e 400." | Pacotes `config` e `web`, escritos e testados com `curl` pelo Yan |
| JAVA.4 | "Redija o CONTRATO.md e o README do core-java e confira a branch antes do Pull Request." | `core-java/CONTRATO.md` e `core-java/README.md`, revisados pelo Yan |
| JAVA.5 | "O João ligou a API ao núcleo. Me ajude a rodar os dois juntos no meu computador para testar a integração, com o núcleo no ar e fora do ar." | Teste integrado feito pelo Yan, com prints |
| JAVA.6 | "Com os meus prints e o teste integrado, organize o documento da matéria (desafio, objetivos, ODS, arquitetura e diagramas) e gere o PDF. Eu reviso antes de subir." | `core-java/AuxiLia_Java.pdf` (7 páginas), revisado e commitado pelo Yan |

## Dynamic Programming (Yan, 15 a 17/11)

O notebook foi escrito pelo Yan no PyCharm, parte por parte, no mesmo formato do Java: a IA explicava a lógica e passava o código com lacunas, o Yan completava, rodava e corrigia o que dava errado, e a IA revisava. Os dados foram digitados pelo Yan, e a branch, os commits e o Pull Request também foram feitos por ele.

| # | Prompt | O que saiu |
| --- | --- | --- |
| DP.1 | "O Levenshtein já está na arquitetura da Lia, no antigolpe e na busca. Quero usar ele em Dynamic Programming: me explica como a tabela funciona e me passa a primeira parte com lacunas, que eu completo." | Os dados (`dominios_oficiais.csv`, públicos, e `jeitos_de_pedir.csv`, simulados), digitados pelo Yan, e a tabela de PD, completada por ele |
| DP.2 | "Completei a versão ingênua, a de duas linhas e as medições de tempo. Tem algum erro? Se tiver, me diz onde está." (repetido a cada parte) | As três versões e as medições, corrigidas pelo Yan a partir da revisão |
| DP.3 | "Rodei a busca e deu 3 de 12. Dá uma olhada no meu código." | Busca e antigolpe corrigidos pelo Yan: 10 de 10 no antigolpe e 12 de 12 na busca |
| DP.4 | "No README da pasta, só o essencial: como executar, em até 5 linhas. Os nomes e os RMs vão na capa do PDF." | `dynamic-programming/README.md` |
| DP.5 | "Com os resultados e os tempos que eu medi no notebook, organize o relatório de até 4 páginas no modelo da matéria e gere o PDF. Eu reviso antes de subir." | `dynamic-programming/AuxiLia_DynamicProgramming.pdf` (4 páginas), revisado e commitado pelo Yan |

## Data Science & Statistical Computing

Vinicius, com o ChatGPT. Fontes: TIC Domicílios, INAF 2024 e Censo Demográfico 2022 (Taiobeiras, Minas Gerais e Brasil).

| # | Prompt | Para quê |
| --- | --- | --- |
| DS.1 | "Como posso utilizar os dados da TIC Domicílios, do INAF e do Censo Demográfico 2022 para investigar o problema da exclusão digital relacionado ao projeto Lia?" | Entender os datasets |
| DS.2 | "Qual é a diferença entre os indicadores de alfabetismo funcional do INAF e os dados de alfabetização apresentados pelo Censo Demográfico?" | Entender os datasets |
| DS.3 | "Como organizar a análise de três datasets diferentes no Google Colab? É melhor realizar as análises separadamente?" | Organizar a análise |
| DS.4 | "Quais análises estatísticas descritivas são mais adequadas para estudar o acesso à internet, o alfabetismo funcional e o envelhecimento populacional?" | Análise exploratória |
| DS.5 | "Como interpretar os resultados e gráficos obtidos com Pandas e Matplotlib e relacioná-los ao problema de inclusão digital investigado?" | Interpretar os resultados |
| DS.6 | "Como selecionar os dados do SIDRA/IBGE para comparar a população idosa e o analfabetismo entre Taiobeiras, Minas Gerais e Brasil?" | Censo 2022 |
| DS.7 | "Quais opções devo selecionar nas tabelas do Censo 2022 para obter os dados de população por idade e alfabetização por faixa etária?" | Censo 2022 |
| DS.8 | "Apenas no Censo 2022 utilizei a cidade de Taiobeiras. Nos outros datasets utilizei dados nacionais. Essa metodologia está correta?" | Validar o método |
| DS.9 | "Como organizar os arquivos CSV no Google Drive para realizar a leitura dos dados nos notebooks do Google Colab?" | Programação |
| DS.10 | "O código apresenta um erro `FileNotFoundError` ao tentar localizar os arquivos CSV. Como identificar a causa e corrigir os caminhos de leitura?" | Correção de erro |
| DS.11 | "Como ajustar a leitura dos arquivos e corrigir o notebook em Python, mantendo as análises e visualizações desenvolvidas?" | Correção de erro |
| DS.12 | "Como organizar os notebooks e os arquivos CSV para a entrega da disciplina de Data Science?" | Organizar a entrega |
| DS.13 | "Como modificar os códigos para que o professor consiga executar os notebooks em outro computador, sem depender da minha conta do Google Drive?" | Reprodutibilidade |
| DS.14 | "Como documentar as fontes dos datasets, as instruções de execução e as informações necessárias para reproduzir as análises?" | Documentação |

A IA apoiou a compreensão das bases, a análise exploratória, o código Python e a correção de erros. As fontes, os resultados e as conclusões foram conferidos pela equipe.

## Database Design

Vinicius, com o ChatGPT, no Oracle SQL Developer Data Modeler.

| # | Prompt | Para quê |
| --- | --- | --- |
| DB.1 | "Analise os requisitos da disciplina de Database Design da Global Solution e explique quais são os entregáveis obrigatórios, os critérios de avaliação e as etapas necessárias para desenvolver a modelagem de dados do projeto Lia." | Entender o escopo |
| DB.2 | "Com base na documentação do projeto Lia, auxilie na estruturação inicial do modelo de banco de dados para o Oracle Data Modeler, considerando as entidades, atributos, chaves primárias, chaves estrangeiras e relacionamentos." | Proposta inicial e SQL para importar |
| DB.3 | "Como importar um arquivo SQL no Oracle SQL Developer Data Modeler e visualizar as tabelas e os relacionamentos do modelo relacional?" | Usar o software |
| DB.4 | "Após criar o modelo relacional no Oracle Data Modeler, como posso gerar e acessar o modelo lógico a partir das tabelas e dos relacionamentos existentes?" | Engenharia reversa entre os modelos |
| DB.5 | "Analise a tela do Oracle Data Modeler e explique quais opções devo selecionar para visualizar e gerar corretamente os modelos necessários para a entrega." | Dúvidas da interface |
| DB.6 | "Auxilie na elaboração e organização de um relatório técnico de Database Design, incluindo apresentação do projeto, descrição das entidades, atributos, identificadores, relacionamentos, cardinalidades e diagramas." | Estruturar o relatório |
| DB.7 | "Revise os relacionamentos e as cardinalidades do modelo da Lia, considerando as regras de negócio do sistema e a necessidade de justificar as cardinalidades mínimas e máximas de cada entidade." | Revisar relacionamentos |
| DB.8 | "Analise as diferenças entre os nomes dos atributos definidos no banco de dados e os utilizados nas classes Java do projeto, considerando a padronização das entidades entre as disciplinas." | Mesmos nomes no banco e no Java |
| DB.9 | "Considere a possibilidade de um pedido não possuir um serviço identificado. Como representar essa situação no modelo de dados utilizando um relacionamento opcional e uma chave estrangeira que aceite valores nulos?" | Pedido ambíguo |
| DB.10 | "Como exportar os diagramas do Oracle Data Modeler preservando a resolução e a legibilidade dos atributos, identificadores e relacionamentos para inserção em um relatório PDF?" | Qualidade dos diagramas |
| DB.11 | "Revise a apresentação do relatório de Database Design, mantendo uma linguagem acadêmica, títulos padronizados, identidade visual da equipe e diagramas completos, sem dividir o modelo em várias imagens." | Padronizar o relatório |
| DB.12 | "Liste os requisitos obrigatórios para a entrega de Database Design e apresente os principais pontos que devem ser conferidos antes do envio do trabalho." | Conferir a entrega |

A modelagem, os ajustes e os diagramas foram feitos no Oracle Data Modeler; a IA ajudou a estruturar, explicar o software e revisar.

## AR-VR Modelling And Simulation

| Quem | Uso da IA | O que saiu |
| --- | --- | --- |
| Murilo | Gerar por IA os objetos que podiam ser baixados prontos, sem ser o foco da modelagem: o robô da Lia, o totem de saúde e as plantas. | Objetos de apoio da cena. Os 3 objetos exigidos foram modelados no Maya |
| João | "Edite o vídeo da cena: roteiro no ritmo da música, captura dos planos por script no Maya, textos animados, montagem, som e exportação em 24 fps." (Claude) | Vídeo de AR/VR e PDF da entrega |

A idosa da cena não foi gerada por IA: é um modelo livre (CC0) do OpenGameArt, recolorido e posado no Maya.

## Revisões e organização do repositório (Yan, 10 a 18/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| REV.1 | "Revise as entregas de AR-VR, Data Science e Database contra os critérios de cada matéria e liste o que precisa mudar." | Ajustes repassados ao Murilo e ao Vinicius, incluindo o doc "Ajustes no Database Design (Lia)" |
| REV.2 | "Revise o repositório do João (arquivos, testes e organização) e liste o que precisa mudar." | Doc "Ajustes no repositório lia-gs-citizentech" |
| REV.3 | "Me ajude a juntar o lia-citizentech neste repositório sem perder o histórico e a resolver os conflitos." | Merge feito pelo Yan (`chore/junta-repositorios`) |
| REV.4 | "Confira o repositório e liste o que falta, por pessoa, até a entrega." | Lista de pendências da equipe |
