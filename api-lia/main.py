"""API da Lia: recebe a conversa do app e devolve a resposta da IA.
A chave da IA fica aqui no servidor, nunca dentro do app (RNF05).
Rodar: uvicorn main:app --host 0.0.0.0 --port 8000
"""
import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from prompt_lia import PROMPT_LIA

load_dotenv()

app = FastAPI(title="API da Lia")


class Mensagem(BaseModel):
    papel: str = Field(pattern="^(pessoa|lia)$")
    texto: str = Field(min_length=1, max_length=4000)


class Conversa(BaseModel):
    mensagens: list[Mensagem] = Field(min_length=1, max_length=40)


class Resposta(BaseModel):
    resposta: str
    provedor: str


def provedor() -> str:
    return os.getenv("LIA_PROVEDOR", "teste").lower()


@app.get("/saude")
def saude():
    return {"ok": True, "provedor": provedor()}


@app.post("/conversa", response_model=Resposta)
async def conversa(c: Conversa):
    p = provedor()
    try:
        if p == "gemini":
            texto = await perguntar_gemini(c.mensagens)
        elif p == "claude":
            texto = await perguntar_claude(c.mensagens)
        else:
            texto = resposta_teste(c.mensagens)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Falha ao falar com a IA: {e}") from e
    return Resposta(resposta=texto.strip(), provedor=p)


def resposta_teste(mensagens: list[Mensagem]) -> str:
    ultima = mensagens[-1].texto
    return f"Modo teste: eu ouvi \"{ultima}\". Quando a chave da IA estiver configurada, eu respondo de verdade."


async def perguntar_gemini(mensagens: list[Mensagem]) -> str:
    chave = os.environ["GEMINI_API_KEY"]
    modelo = os.getenv("GEMINI_MODELO", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent"
    corpo = {
        "systemInstruction": {"parts": [{"text": PROMPT_LIA}]},
        "contents": [
            {"role": "user" if m.papel == "pessoa" else "model", "parts": [{"text": m.texto}]}
            for m in mensagens
        ],
        "generationConfig": {"maxOutputTokens": 300, "temperature": 0.6},
    }
    async with httpx.AsyncClient(timeout=30) as cliente:
        r = await cliente.post(url, json=corpo, headers={"x-goog-api-key": chave})
        r.raise_for_status()
        dados = r.json()
    partes = dados["candidates"][0]["content"]["parts"]
    return "".join(p.get("text", "") for p in partes)


async def perguntar_claude(mensagens: list[Mensagem]) -> str:
    chave = os.environ["ANTHROPIC_API_KEY"]
    modelo = os.getenv("CLAUDE_MODELO", "claude-haiku-5-5")
    corpo = {
        "model": modelo,
        "max_tokens": 300,
        "system": PROMPT_LIA,
        "messages": [
            {"role": "user" if m.papel == "pessoa" else "assistant", "content": m.texto}
            for m in mensagens
        ],
    }
    headers = {"x-api-key": chave, "anthropic-version": "2023-06-01"}
    async with httpx.AsyncClient(timeout=30) as cliente:
        r = await cliente.post("https://api.anthropic.com/v1/messages", json=corpo, headers=headers)
        r.raise_for_status()
        dados = r.json()
    return "".join(b.get("text", "") for b in dados["content"] if b.get("type") == "text")
