# Data Science & Statistical Computing · Lia

Quem a Lia deve atender primeiro, e onde: analfabetismo (IBGE, Censo 2022) e exclusão digital (Cetic.br, TIC Domicílios 2024).

## Integrantes
| Nome | RM |
| --- | --- |
| João Victor Melo Santos | 566640 |
| _[Vinicius, sobrenome]_ | _[RM]_ |
| _[demais integrantes]_ | _[RM]_ |

## Arquivos
- `analise_lia.ipynb`: notebook **já executado**, com preparação, análise descritiva, gráficos e conclusões.
- `dados/`: os CSVs usados. As fontes e a conferência dos números estão em `dados/FONTES.md`.
- `integrantes.txt`: nomes, RMs e o link dos CSVs.

## Como rodar
```
pip install pandas matplotlib jupyter
jupyter notebook analise_lia.ipynb
```
Rode da pasta `data-science/`, porque o notebook lê `dados/` pelo caminho relativo.

## Principais resultados
- 65 anos ou mais: 20,3% de analfabetismo, 13,5 vezes o de 15 a 19 anos.
- Só cerca de 1 em cada 4 pessoas com 60 anos ou mais usa serviço público pela Internet (estimativa C2A × G1).
- Os 9 estados do Nordeste lideram o analfabetismo; Alagoas (17,7%) e Piauí (17,2%) estão no topo.
- Prioridade da Lia: 60 anos ou mais, baixa escolaridade, cidades do interior.
