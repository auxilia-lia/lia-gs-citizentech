# Retrospectiva

Feita no fim do projeto (17/11/2026), no formato manter, melhorar e parar.

## O que funcionou e vamos manter
- **Uma ideia só, com cada matéria virando uma peça dela.** O app, o núcleo em Java, o banco, o Levenshtein, a rede do CRAS, os dados e a cena no Maya contam a mesma história. Ninguém fez trabalho solto.
- **Registrar as decisões com o motivo** (`decisoes.md`). Quando algo mudava, a equipe sabia por quê.
- **Testar cedo e de verdade.** O robô de testes achou dezenas de erros do Guia antes de qualquer pessoa usar, e a gravação da demo achou o resto.
- **Ouvir uma pessoa real.** Uma única entrevista mudou mais o produto do que qualquer discussão interna: a Lia passou a ensinar, e o antigolpe virou prioridade.

## Desafios
- Sete entregas e um app em 15 dias, com partes que dependiam umas das outras (o núcleo em Java dependia do contrato, o app dependia do teste do Guia).
- Celular real é diferente do teste: o microfone ouvia a conversa da sala, a voz travava e alguns fluxos pegavam atalhos.
- A IA no plano grátis tem limite e atraso, o que obrigou a resolver pedidos comuns no próprio celular.
- Gravar a demo sem erro levou várias tentativas, e parte foi refeita (golpe, ligação e o ensino com a lanterna).

## O que dá para melhorar
- **Check-ins da equipe:** combinamos a cada 2 ou 3 dias, mas quase tudo ficou no WhatsApp, sem registro. Na próxima, um registro curto no repositório a cada check-in.
- **Validação com mais pessoas:** fizemos uma entrevista; o plano era de 3 a 5. Ficou para o piloto.
- **Roteiro de teste antes de gravar:** vários erros só apareceram na gravação. Um ensaio completo antes economizaria regravações.

## O que vamos parar de fazer
- Deixar evidências (prints, registros) para o fim.
- Insistir em ferramenta com bug (o quadro do GitHub Projects): trocamos por issues e milestones.

## Números
| Medida | Valor |
| --- | --- |
| Itens do backlog de trabalho concluídos | 15 de 20 (4 com os responsáveis das matérias; 1 adiado para o piloto) |
| Funcionalidades entregues (MoSCoW) | Todas as Must have e 5 de 7 Should have |
| Itens que entraram no caminho | 4 (antigolpe em qualquer tela, banco protegido, recado pela ligação, site de golpe simulado) |
| Decisões que mudaram | 23 (veja `decisoes.md`) |
| Entrevistas | 1 (Rosária, 13/11) |

## Próximos passos
1. Piloto com o CRAS Centro de Taiobeiras, validando com 3 a 5 pessoas.
2. Integração oficial com aplicativos do governo, dos estados e dos bancos.
3. Lembretes de remédio e consulta, e uma versão para iPhone.

## Uma ação para a próxima GS
Entrevistar o público na primeira semana, antes de escrever código.
