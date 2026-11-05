# Backlog priorizado

Épicos = os pilares da Lia (Entende, Guia, Age, Autonomia) + Pesquisa, Segurança, Conectividade, Matérias, Pitch e Agile.
Prioridade pelo valor para o cidadão e pelo que destrava outras partes.

Atualizado em 05/11/2026. "Código pronto" = feito e testado no computador; falta rodar no celular.

| # | Item | Épico | Prioridade | Sprint | Status | Evidência |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Escolher a cidade do interior e pegar a taxa de analfabetismo do Censo | Pesquisa | Alta | 1 | Em andamento | Ranking por UF em `data-science/` |
| 2 | Entrevistar uma pessoa real do público | Pesquisa | Alta | 1 | Não iniciado | Roteiro pronto |
| 3 | Preencher a ficha da CitizenTech no README | Agile | Alta | 1 | Em andamento | README (faltam cidade, equipe e RMs) |
| 4 | Teste de 1 dia do Guia na tela | Guia | Alta | 1 | Código pronto | `app/TESTE-GUIA.md`, aba Teste do Guia |
| 5 | Foto de papel → explicação em áudio, com antigolpe | Entende | Alta | 2 | Código pronto | `api-lia/antigolpe.py`, `/entende` |
| 6 | Telas do gov.br simulado | Guia | Alta | 2 | Código pronto | `api-lia/gov_simulado.py` |
| 7 | Guia genérico funcionando no gov.br simulado e num app real | Guia | Alta | 2 | Código pronto | `api-lia/guia.py`, `app/src/lia/guiaIA.ts` |
| 8 | Avisar familiar no WhatsApp com confirmação | Age | Alta | 2 | Código pronto | `app/src/lia/familia.ts`, `risco.ts` |
| 9 | Pseudonimização de CPF e telefone | Segurança | Média | 2 | Código pronto | `app/src/lia/pseudonimizar.ts` |
| 10 | Autonomia progressiva (faz junto → confirma → acompanha) | Autonomia | Média | 2 | Código pronto | `app/src/lia/autonomia.ts`, Guia nativo |
| 11 | Canal por ligação telefônica (simulado) | Conectividade | Baixa | 3 | Código pronto | `app/src/telas/Ligacao.tsx` |
| 12 | Data Science: CSV público e notebook | Matérias | Alta | 2 | Feito (falta a cidade) | `data-science/analise_lia.ipynb` |
| 13 | Database: modelo conceitual e lógico | Matérias | Alta | 2 | Não iniciado | |
| 14 | DDD Java: domínio de pedidos com níveis de risco | Matérias | Alta | 2 | Não iniciado | |
| 15 | Dynamic Programming: Levenshtein e relatório | Matérias | Alta | 2 | Não iniciado | Levenshtein já usado no app e na API |
| 16 | Redes: CRAS no Packet Tracer e PDF | Matérias | Alta | 2 | Não iniciado | |
| 17 | Maya: cena com 3 objetos e vídeo | Matérias | Média | 3 | Não iniciado | |
| 18 | Validar com 3 a 5 pessoas e gravar | Pesquisa | Média | 3 | Não iniciado | |
| 19 | Vídeo de pitch de 3 minutos | Pitch | Alta | 3 | Roteiro pronto | `pitch/roteiro-video.md` |
| 20 | Retrospectiva e PDF de Agile | Agile | Alta | 3 | Em andamento | Esta pasta |

## Itens que entraram no caminho
| Item | Épico | Por quê |
| --- | --- | --- |
| API da Lia (FastAPI) com a chave da IA no servidor | Segurança | RNF05: a chave nunca fica no app. É provisória até o núcleo Java ficar pronto |
| Identidade da Lia (ícone, splash, primeira vez guiada) | Pitch | A banca vê o app instalado; a primeira vez explica a permissão de acessibilidade |
| Endereço do servidor configurável no app | Conectividade | O APK da banca não tem o Metro para achar o servidor |
