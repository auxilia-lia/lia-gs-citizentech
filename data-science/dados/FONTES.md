# Fontes dos dados

Todos os dados são públicos e agregados. Nenhum dado pessoal.

| Arquivo | Fonte | Link |
| --- | --- | --- |
| `censo2022_alfabetizacao_uf.csv` | IBGE, Censo Demográfico 2022: Alfabetização, Gráfico 9 (taxa de alfabetização das pessoas de 15 anos ou mais, por UF) | https://biblioteca.ibge.gov.br/visualizacao/periodicos/3108/cd_2022_alfabetizacao.pdf |
| `censo2022_analfabetismo_idade.csv` | IBGE, Censo Demográfico 2022: Alfabetização, Gráfico 2 (taxa de analfabetismo por grupo de idade, Brasil, 2010 e 2022) | https://biblioteca.ibge.gov.br/visualizacao/periodicos/3108/cd_2022_alfabetizacao.pdf |
| `tic2024_individuos.csv` | Cetic.br/NIC.br, TIC Domicílios 2024, indicadores C2A, G1 e G2A (indivíduos) | https://cetic.br/pt/tics/domicilios/2024/individuos/ |

## Conferência
- Taxas por UF: 25 UFs conferidas também na reportagem da Exame com os mesmos números do IBGE; Rio Grande do Norte conferido em 86,14% (Agora RN). Sergipe (86,2%) vem só da publicação do IBGE.
  https://exame.com/brasil/censo-2022-taxa-de-analfabetismo-no-nordeste-e-o-dobro-da-media-do-brasil-veja-ranking/
- Por idade: 15 a 19 anos (1,5%) e 65 anos ou mais (20,3% em 2022; 29,4% em 2010) estão confirmados no texto do IBGE e no Correio Braziliense. As outras faixas foram lidas do gráfico (coluna `confirmado_em_texto = nao`): conferir no PDF antes da entrega.
  https://www.correiobraziliense.com.br/brasil/2024/05/6859829-alfabetizados-no-pais-sao-93-mostra-censo.html
- TIC: as bases são diferentes. C2A é sobre toda a população de 10 anos ou mais; G1 e G2A são só sobre quem já usa Internet (16 anos ou mais).
