# Prompts de IA

Registro dos prompts usados no desenvolvimento (regra da GS, RNF06). Cada integrante registra os seus e sabe explicar o que entregou.

Ferramentas: Claude (Anthropic) e ChatGPT (OpenAI). Nas entregas com diretriz restrita de uso de IA — como **Agile & Squad**, em que o uso é permitido exclusivamente para edição — as ferramentas foram utilizadas apenas para revisão de gramática, clareza, tom e formatação de conteúdos elaborados pela equipe. Primeiro vêm os prompts do João; os dos colegas, por matéria, estão na parte **Prompts das matérias**, no fim deste arquivo.

---

# Prompts do João (ideia, app, API, pitch e Agile)

**Como ler:** os prompts do João estão em ordem de montagem do projeto. Pedidos repetidos durante os testes foram agrupados, e o texto foi revisado para clareza e formatação. Em todos os entregáveis de gestão ágil e roteirização, a concepção e a redação base foram feitas pela equipe, cabendo à IA apenas o apoio editorial.

## 1. Idealização (29/10 a 04/11/2026)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 1.1 | "Revise a clareza e a estrutura do texto em que apresento a ideia da Lia (assistente por voz para quem depende de terceiros no celular) e comparo com as demais propostas discutidas pela equipe." | Revisão textual da proposta da Lia definida pelo João e pela equipe |
| 1.2 | "Ajude a melhorar a clareza e o tom da explicação sobre os incrementos propostos pelo Yan (autonomia progressiva e canal por ligação) e os 3 pilares definidos pelo grupo (Entende, Guia, Age)." | Ajuste de clareza e redação dos 3 pilares definidos pela equipe |
| 1.3 | "Como funciona tecnicamente o serviço de acessibilidade e sobreposição no Android para exibir indicações visuais sem executar ações no lugar do usuário?" | Esclarecimento técnico para apoiar a decisão da equipe (Android, filtro de dados e visão futura) |

## 2. Planejamento (04 a 05/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 2.1 | "Formate e revise a clareza do charter da equipe e do backlog de 20 itens organizados por nós em sprints até 19/11." | Formatação e revisão textual do charter e do backlog elaborados pela equipe |
| 2.2 | "Formate em tabela o mapeamento que fizemos conectando cada matéria da GS às entregas, dependências e prazos da Lia." | Formatação da documentação de arquitetura e cronograma |
| 2.3 | "Revise a gramática, o tom e a clareza das perguntas das entrevistas e do esboço do roteiro de pitch redigidos pelo grupo." | Revisão de texto e clareza das entrevistas e do esboço do pitch |
| 2.4 | "Organize e formate a lista de pendências levantadas pela equipe por responsável e sprint." | Formatação da lista de pendências do grupo |

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
| 4.2 | "Implemente o Guia genérico com IA, a configuração do APK para a banca e os ativos da identidade visual (ícone, splash e tela inicial)." | Item 7, identidade azul e âmbar e configuração de build |

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
| 8.2 | "Automatize o ciclo de execução dos testes: reiniciar a API, recompilar, rodar o robô e exibir os logs de falha para correção." | `rodada-robo.bat`; 14 de 14 cenários passando |
| 8.3 | "Crie um script para capturar os logs do dispositivo pelo cabo e facilitar a depuração quando a Lia travar no celular." | Diagnóstico pelo log e `abrir-lia.bat` (abre a Lia pelo cabo) |

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
| 13.1 | "Revise a clareza e a objetividade das perguntas que elaboramos para a entrevista sobre dependência digital e golpes." | Revisão textual do roteiro da entrevista (aplicada pelo Vinicius em 13/11) |
| 13.2 | "Ajuste o tom, a fluidez e a formatação do roteiro de falas e do checklist de gravação escritos pela equipe para caber no tempo do vídeo." | Revisão de tom, clareza e formatação do roteiro e checklist |
| 13.3 | "Gere elementos visuais de apoio (transições e animações simples nas cores da Lia) para a edição do vídeo." | Elementos visuais de apoio para edição |
| 13.4 | "Apoie na edição técnica dos vídeos brutos gravados pela equipe: sincronização entre câmera e gravação de tela, legendagem e cortes." | Apoio na edição técnica e legendagem do vídeo pitch (4:38) |

## 14. Agile e organização (17/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 14.1 | "Revise a gramática, a clareza, o tom e a formatação do documento de Agile redigido pelo grupo (declaração do problema, contexto, personas, backlog MoSCoW, evidências da iteração e retrospectiva) e formate o PDF final com o link do vídeo." | Revisão textual e formatação de `Agile-Lia-Auxilia.pdf` a partir do conteúdo produzido pelo grupo |
| 14.2 | "Revise a formatação e a clareza deste registro de prompts e da estrutura de pastas do repositório." | Formatação deste arquivo e do README |

## 15. Integração com o núcleo Java (17/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 15.1 | "O Yan terminou o núcleo em Java. Ligue o núcleo na API seguindo o contrato: risco, confirmação e nível nas duas rotas de conversa, e a Lia tem que continuar funcionando se o Java cair." | `consultar_nucleo` em `api-lia/main.py`, tradução da autonomia por serviço, testes com o núcleo no ar e fora do ar |
| 15.2 | "Me explique como testar com o Java rodando e o que tirar de print para o documento." | Teste em `localhost:8000/docs` com e sem o núcleo (prints no documento de Java) |

## 16. Revisão final das entregas (18 e 19/11)

| # | Prompt | O que saiu |
| --- | --- | --- |
| 16.1 | "Confira se os tópicos exigidos no enunciado da GS e nas rubricas dos professores estão presentes e bem formatados nas entregas do grupo." | Checklist de conferência de tópicos e formatação |
| 16.2 | "Padronize a formatação, referências e consistência textual entre os documentos finais corrigidos pela equipe (ajustes de JDK 21 e ODS 3 em Java/Redes, títulos em Database, medidas no notebook de Data Science e formatação final do PDF de Agile)." | Padronização textual e de formatação nos documentos finais revisados pela equipe |

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
