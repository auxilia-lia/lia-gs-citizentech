# API da Lia

Conversa, Entende (foto), antigolpe e o gov.br simulado. A chave da IA fica só aqui (`.env`), nunca no app.

```
pip install -r requirements.txt
copy .env.example .env      # e preencha
uvicorn main:app --host 0.0.0.0 --port 8000
```

`LIA_PROVEDOR=teste` responde por regras, sem IA, para testar o app e ensaiar a demo sem chave.

| Rota | O que faz |
| --- | --- |
| `GET /saude` | Mostra se está no ar e qual IA usa |
| `POST /conversa` | `{mensagens, canal: "app" ou "ligacao", contexto}` → `{fala, acao, golpe}` |
| `POST /entende` | Foto em base64 → explicação em linguagem simples + se parece golpe |
| `POST /antigolpe` | Texto → domínio parecido com um oficial (Levenshtein) + sinais de golpe |
| `POST /guia/proximo` | Tela do Guia (botões numerados, textos, título, caminho, imagem opcional) → próximo passo `{tipo, indice, alvo, fala, concluido, alerta, palavra}` |
| `POST /guia/plano` | Objetivo → caminho provável (o celular segue sozinho enquanto bate com a tela) |
| `POST /guia/explicar` | "O que é isso?": explica a tela em palavras simples |
| `GET /gov` | gov.br **simulado** (abra no navegador do celular: `http://IP:8000/gov`) |
| `GET /gov/fluxos` | Passos de cada serviço para o Guia (consulta, beneficio, multas) |

Ações que a IA pode pedir: `guiar`, `avisar_familiar` e `tirar_foto` (app); `agendar_por_voz`, `consultar_beneficio` e `avisar_familiar` (ligação). Qualquer outra é descartada pelo servidor.

Testes: `pip install -r requirements-dev.txt` e depois `python -m pytest teste_api.py -q`.

Provisório: depois, a chamada à IA passa pelo núcleo em Java, como manda a documentação.
