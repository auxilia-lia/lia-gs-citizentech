# Backlog do produto (MoSCoW)

Funcionalidades da Lia priorizadas por MoSCoW. A prioridade vem do que a Rosária e os dados mostraram: primeiro o que tira a dependência e protege de golpe, depois o que amplia o alcance.

Status em 17/11/2026. **Feito** = funcionando no APK e mostrado no vídeo. **Simulado** = funciona com dados fictícios. **Próximo passo** = fica para depois da GS.

## Must have (sem isso a Lia não cumpre a promessa)
| # | Funcionalidade | Por quê | Status |
| --- | --- | --- | --- |
| M1 | Conversa por voz: ouvir, entender e responder em frases curtas | O público não consegue ler nem digitar com segurança | Feito |
| M2 | Botões e telas que falam o que fazem | Para quem não lê (persona 1) | Feito |
| M3 | Guia na tela de qualquer app: mostra onde tocar e a pessoa toca | Autonomia: a pessoa aprende fazendo | Feito |
| M4 | Ensinar desde o começo, passo a passo | "Me ensina" não pode pular etapas | Feito |
| M5 | Autonomia progressiva: faz junto → só confirma → você faz sozinho (só avança sem erro) | Diferencial central: a Lia ajuda cada vez menos | Feito |
| M6 | Antigolpe: foto de papel e "Lia, isso aqui é golpe?" em qualquer tela | A Rosária manda mensagens suspeitas para a nora conferir | Feito |
| M7 | Privacidade: CPF e telefone viram etiquetas no celular; a Lia não olha o app do banco | Segurança e LGPD | Feito |
| M8 | Explicar cartas e contas por foto, em áudio | Pilar Entende | Feito |
| M9 | Confirmar antes de agir (ligar, mandar mensagem) | Nada acontece sem a pessoa concordar | Feito |

## Should have (importante, mas a Lia funciona sem)
| # | Funcionalidade | Por quê | Status |
| --- | --- | --- | --- |
| S1 | Portal do Cidadão simulado (benefício, consulta, multas) | Mostrar o Guia em serviços do governo sem usar o gov.br real | Simulado |
| S2 | Lia por ligação, para quem não tem internet (recado para a família com confirmação) | 37,8% dos idosos nunca usaram a internet | Simulado |
| S3 | Progresso na aba Eu e conquista compartilhada com a família, se a pessoa quiser | Motivação sem pressão; a família acompanha | Feito |
| S4 | Avisar um familiar no WhatsApp | Pilar Age | Feito |
| S5 | Resposta rápida: fala em partes e pedidos comuns resolvidos no celular | Esperar desanima o público | Feito |
| S6 | Núcleo em Java decidindo risco e confirmação (contrato em `core-java/CONTRATO.md`) | Regras de segurança fora do app | Feito (núcleo: Yan; ligação com a API: João) |
| S7 | Banco de dados de usuários, progresso e consentimento | Guardar o que a pessoa já aprendeu | Feito (Yan e Vinicius) |

## Could have (se sobrar tempo)
| # | Funcionalidade | Status |
| --- | --- | --- |
| C1 | Lembrete de remédio e de consulta | Próximo passo |
| C2 | Agendar consulta de verdade no SUS | Próximo passo (simulado no portal) |
| C3 | iPhone: navegador próprio da Lia ou guia só por voz | Próximo passo |
| C4 | Integração oficial com aplicativos do governo, dos estados e dos bancos | Próximo passo (plano de escala) |
| C5 | Piloto no CRAS Centro de Taiobeiras | Próximo passo |

## Won't have (nesta versão, por decisão)
| # | O que não vamos fazer | Por quê |
| --- | --- | --- |
| W1 | A Lia tocar ou agir sozinha no lugar da pessoa | Iria contra a autonomia |
| W2 | Ler telas de banco, Pix e senhas | Segurança; só com integração oficial |
| W3 | Fazer pagamentos | Risco de golpe e de erro |
| W4 | Ser só um chatbot no WhatsApp | Viraria igual ao Meta AI e não guiaria outros apps |
| W5 | Pontos, sequência de dias ou pressão para usar | Recompensa sem pressão |

## Squad: quem cuidou de cada parte
| Integrante | Responsabilidades |
| --- | --- |
| João Victor | Agile, app da Lia e API, vídeo pitch, vídeo e slide de AR/VR |
| Murilo | Cena de AR/VR no Maya |
| Vinicius | Data Science, banco de dados (com o Yan) e entrevista com a Rosária |
| Yan | Núcleo em Java (DDD), Dynamic Programming, Redes (CRAS no Packet Tracer) e banco de dados (com o Vinicius) |

## Backlog de trabalho da equipe (sprints)
Os 20 itens do charter, usados como issues e milestones no GitHub.

| # | Item | Sprint | Status em 17/11 |
| --- | --- | --- | --- |
| 1 | Cidade (Taiobeiras, CRAS Centro) e dados do Censo | 1 | Concluído |
| 2 | Entrevista com uma pessoa do público | 1 → 2 | Concluído (13/11, Rosária) |
| 3 | Ficha da CitizenTech no README | 1 | Concluído |
| 4 | Teste do Guia na tela | 1 | Concluído (robô 14/14 e uso no celular) |
| 5 | Foto de papel → explicação em áudio, com antigolpe | 2 | Concluído |
| 6 | Telas do governo simulado | 2 | Concluído (Portal do Cidadão) |
| 7 | Guia genérico no portal simulado e em app real | 2 | Concluído |
| 8 | Avisar familiar no WhatsApp com confirmação | 2 | Concluído |
| 9 | Pseudonimização de CPF e telefone | 2 | Concluído (app: João; núcleo Java: Yan) |
| 10 | Autonomia progressiva | 2 | Concluído |
| 11 | Canal por ligação (simulado) | 3 | Concluído |
| 12 | Data Science: CSV público e notebook | 2 | Concluído (Vinicius) |
| 13 | Database: modelo conceitual e lógico | 2 | Concluído (Yan e Vinicius) |
| 14 | DDD Java: núcleo integrado | 2 | Concluído (núcleo: Yan; ligação com a API: João) |
| 15 | Dynamic Programming: Levenshtein e relatório | 2 | Concluído (Yan) |
| 16 | Redes: CRAS no Packet Tracer | 2 | Concluído (Yan) |
| 17 | Maya: cena e vídeo | 3 | Concluído (cena: Murilo; vídeo e slide: João) |
| 18 | Validar com 3 a 5 pessoas | 3 | Adiado para o piloto |
| 19 | Vídeo pitch (até 5 min) | 3 | Concluído (https://youtu.be/Lb78aDGaQFA) |
| 20 | Retrospectiva e PDF de Agile | 3 | Concluído |

**Entraram no caminho:** Lia por ligação com recado para a família, antigolpe em qualquer tela, banco protegido e site de golpe simulado (Sprint 2, depois da entrevista e da gravação da demo).
