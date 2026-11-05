# API da Lia

Recebe a conversa do app e devolve a resposta da IA. A chave fica só aqui (`.env`), nunca no app.

```
pip install -r requirements.txt
copy .env.example .env      # e preencha
uvicorn main:app --host 0.0.0.0 --port 8000
```

- `LIA_PROVEDOR=teste` responde sem IA (para testar o app sem chave).
- `GET /saude` mostra se está no ar. `POST /conversa` recebe `{"mensagens": [{"papel": "pessoa", "texto": "..."}]}`.
- Provisório: depois, a chamada à IA passa pelo núcleo em Java, como manda a documentação.
