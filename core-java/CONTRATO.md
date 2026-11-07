# Núcleo da Lia em Java — contrato com o app

Este documento diz como o núcleo em Java (DDD Java, item 14 do backlog) se encaixa no que já roda hoje: o app Android e a API em Python (`api-lia/`). Quem for programar o Java começa por aqui.

## 1. Onde o Java entra

Hoje o caminho é este:

```
App (celular) ──> API Python (api-lia, FastAPI, porta 8000) ──> IA (Gemini)
```

A IA lê o que a pessoa disse e devolve uma **fala** e, às vezes, uma **ação** (ex.: mandar mensagem para o filho). O núcleo em Java entra **entre a IA e o app**: recebe a ação e decide o **risco** e a **confirmação** que ela exige, antes de o app executar.

```
App ──> API Python ──> IA
              │
              └──> Núcleo Java (porta 8080)  →  risco + confirmação + nível de autonomia
```

O app não muda: continua chamando só a API Python. Quem chama o Java é a API Python.

A entrega tem duas partes, e **as duas devem ser feitas**:

1. **Main sozinho (exigido pela matéria):** o `Main` roda os 4 casos sem servidor nenhum (seção 5).
2. **Integrado à Lia (decisão da equipe):** o mesmo domínio exposto por REST com Spring Boot (seção 4) e chamado pela API Python. Conta direto em "funcionamento e integração" (3 dos 10 pontos).

**O que o Java faz na Lia:** quando a IA devolve uma ação, ele classifica o risco (consulta, comum ou dinheiro), diz que confirmação ela exige, informa o nível de autonomia da pessoa naquele serviço e tira CPF e telefone de textos. Ele **não** muda o app, a voz nem o Guia, e se estiver fora do ar a Lia segue funcionando como antes.

## 2. O domínio (classes)

Nomes iguais aos do banco (Database Design). Pacote sugerido: `br.com.fiap.lia`.

| Classe | O que é |
|---|---|
| `Pedido` | O que a pessoa pediu: texto, canal (`app` ou `ligacao`), data e a `Acao` resultante (ou nenhuma). |
| `Acao` (abstrata) | Algo que a Lia pode fazer. Método abstrato `exigeConfirmacao()` e `getNivelDeRisco()`. |
| `AcaoConsulta` | Só mostra ou informa (risco baixo). Não pede confirmação. |
| `AcaoComum` | Muda algo, mas sem dinheiro (risco médio). Pede um "sim". |
| `AcaoFinanceira` | Envolve dinheiro (risco alto). Pede confirmação dupla e repete o valor. |
| `NivelDeRisco` (enum) | `BAIXO`, `MEDIO`, `ALTO`. |
| `PoliticaDeConfirmacao` | Recebe uma `Acao` e devolve o que fazer: `NENHUMA`, `SIM_OU_NAO`, `DUPLA`. |
| `Pseudonimizador` | Troca CPF, telefone e e-mail por marcas (`[CPF]`, `[TELEFONE]`) antes de qualquer texto ir para a IA. |
| `GestorDeAutonomia` | Guarda o nível por serviço (0, 1 ou 2) e sobe o nível quando a pessoa conclui sozinha. |
| `Usuario`, `Familiar`, `Progresso`, `Consentimento` | Entidades do banco (mesmo glossário). |

O polimorfismo pedido pela matéria está em `exigeConfirmacao()`: cada filha de `Acao` responde do seu jeito, e o resto do código não precisa saber qual é.

## 3. As ações que existem de verdade

A IA só pode devolver estas ações (estão em `api-lia/prompt_lia.py`). O Java precisa reconhecer exatamente estes `tipo`:

| `tipo` | Campos | Canal | Classe Java | Risco |
|---|---|---|---|---|
| `guiar` | `servico`: `consulta`, `beneficio` ou `multas` | app | `AcaoConsulta` | BAIXO |
| `guiar_app` | `app`: `whatsapp`, `configuracoes`, `celular` ou `playstore`; `objetivo`; `abrir` (opcional) | app | `AcaoConsulta` | BAIXO |
| `parar_guia` | `conseguiu`: true ou false | app | `AcaoConsulta` | BAIXO |
| `tirar_foto` | — | app | `AcaoConsulta` | BAIXO |
| `consultar_beneficio` | — | ligação | `AcaoConsulta` | BAIXO |
| `avisar_familiar` | `contato`, `mensagem` | app e ligação | `AcaoComum` | MEDIO |
| `agendar_por_voz` | `ubs`, `horario` | ligação | `AcaoComum` | MEDIO |
| `pagar_boleto` *(novo, só para o caso de dinheiro)* | `valor`, `beneficiario` | app | `AcaoFinanceira` | ALTO |

Observações:
- `pagar_boleto` ainda não existe no app. Ele entra no Java para demonstrar o caso "dinheiro". Mesmo integrado, a Lia **nunca paga sozinha**: a resposta é sempre orientar a pessoa e pedir confirmação dupla.
- Apps de banco, Pix e carteiras são **protegidos** no app: o Guia não lê a tela deles.

## 4. Contrato REST (integração — obrigatório)

### `POST /nucleo/decidir`

A API Python chama logo depois de receber a ação da IA.

Entrada:
```json
{
  "canal": "app",
  "acao": { "tipo": "avisar_familiar", "contato": "filho", "mensagem": "Cheguei bem" },
  "autonomia": { "avisar_familiar": 1, "consulta": 0 }
}
```

Saída:
```json
{
  "risco": "MEDIO",
  "confirmacao": "SIM_OU_NAO",
  "nivel": 1,
  "fala_confirmacao": "Posso mandar para o seu filho: \"Cheguei bem\"?"
}
```

Regras:
- `confirmacao`: `NENHUMA` (consulta), `SIM_OU_NAO` (comum) ou `DUPLA` (financeira).
- `nivel` vem de `autonomia[tipo]` (0 se não existir): 0 = faz junto, 1 = só confirma, 2 = só acompanha. O nível **nunca** dispensa a confirmação de uma ação comum ou financeira.
- `tipo` desconhecido: HTTP 422 com `{"erro": "acao desconhecida"}`. A API Python então ignora a ação, como já faz hoje.

### `POST /nucleo/pseudonimizar`

Entrada: `{"texto": "Meu CPF é 123.456.789-00"}`
Saída: `{"texto": "Meu CPF é [CPF]"}`

### `GET /nucleo/saude`

Saída: `{"ok": true}`. A API Python usa para saber se o Java está no ar; se não estiver, segue sem ele (a Lia não pode parar por causa do núcleo).

### Do lado do Python (feito por quem cuida da API)

Em `api-lia/main.py`, depois de `validar_acao(...)`, chamar `POST http://localhost:8080/nucleo/decidir` com prazo de 2 s e juntar `risco` e `confirmacao` à resposta de `/conversa`. Se o Java não responder, a resposta segue como hoje.

## 5. Os 4 casos do `Main` (obrigatório)

O `Main` roda sozinho, sem rede e sem IA, e imprime o resultado de cada caso:

1. **Consulta** — "quero ver meu dinheiro do INSS" → `AcaoConsulta` (`consultar_beneficio`), risco BAIXO, sem confirmação.
2. **Ação comum** — "avisa meu filho que cheguei" → `AcaoComum` (`avisar_familiar`), risco MEDIO, pede "sim".
3. **Dinheiro** — "paga esse boleto de 150 reais" → `AcaoFinanceira` (`pagar_boleto`), risco ALTO, confirmação dupla repetindo o valor.
4. **Pedido ambíguo** — "manda aquilo pra ela" → nenhuma ação; a Lia pergunta o que e para quem.

Bom extra: no caso 2, mostrar o `GestorDeAutonomia` subindo o nível de 0 para 1 depois de a pessoa concluir sozinha, e o `Pseudonimizador` limpando um CPF digitado no pedido.

## 6. Chaves e segredos

- **O Java não precisa de chave de IA.** Quem fala com o Gemini é a API Python.
- A chave do Gemini fica só no arquivo `api-lia/.env` de cada um (`GEMINI_API_KEY=...`), que **nunca vai para o GitHub** (o repositório vai ficar público). Modelo em `api-lia/.env.example`.
- Para testar a API completa, peça a chave ao João por mensagem privada. Sem chave, a API roda em modo teste (`LIA_PROVEDOR=teste`), que responde com regras fixas e basta para testar a integração com o Java.

## 7. Como rodar a API Python para testar a integração

```
cd api-lia
py -m pip install -r requirements.txt
copy .env.example .env
py -m uvicorn main:app --port 8000
```

Teste rápido: abrir `http://localhost:8000/docs` e chamar `/conversa` com `{"mensagens":[{"papel":"pessoa","texto":"avisa meu filho que cheguei"}]}`.

## 8. Checklist da entrega Java

- [ ] Projeto com classes em pacotes (domínio, aplicação, e web se for integrar)
- [ ] `Acao` abstrata e as 3 filhas, com `exigeConfirmacao()` polimórfico
- [ ] `Main` rodando os 4 casos da seção 5
- [ ] Javadoc em todas as classes públicas
- [ ] Documento com desafio, objetivos e ODS (10, 4, 3 e 11), citando abstração, encapsulamento, herança e polimorfismo
- [ ] Tudo num ZIP
- [ ] Spring Boot com `/nucleo/decidir`, `/nucleo/pseudonimizar` e `/nucleo/saude`, rodando na porta 8080
- [ ] Testado junto com a API Python (`/conversa` devolvendo `risco` e `confirmacao`)
