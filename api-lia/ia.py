"""Chamadas à IA (Gemini ou Claude), sempre pedindo resposta em JSON."""
import json
import os
import re

import httpx


def provedor() -> str:
    return os.getenv("LIA_PROVEDOR", "teste").lower()


def _extrair_json(texto: str) -> dict:
    texto = texto.strip()
    m = re.search(r"\{.*\}", texto, re.S)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    return {"fala": texto, "acao": None}  # a IA respondeu texto puro


async def gerar(sistema: str, mensagens: list[dict], imagem: dict | None = None) -> dict:
    """mensagens: [{"papel": "pessoa"|"lia", "texto": str}]; imagem: {"base64", "mime"} na última mensagem."""
    p = provedor()
    if p == "gemini":
        return _extrair_json(await _gemini(sistema, mensagens, imagem))
    if p == "claude":
        return _extrair_json(await _claude(sistema, mensagens, imagem))
    raise RuntimeError("provedor de teste não chama IA")


async def _gemini(sistema: str, mensagens: list[dict], imagem: dict | None) -> str:
    modelo = os.getenv("GEMINI_MODELO", "gemini-2.5-flash")
    conteudos = []
    for i, m in enumerate(mensagens):
        partes = [{"text": m["texto"]}]
        if imagem and i == len(mensagens) - 1:
            partes.insert(0, {"inline_data": {"mime_type": imagem["mime"], "data": imagem["base64"]}})
        conteudos.append({"role": "user" if m["papel"] == "pessoa" else "model", "parts": partes})
    corpo = {
        "systemInstruction": {"parts": [{"text": sistema}]},
        "contents": conteudos,
        "generationConfig": {"maxOutputTokens": 600, "temperature": 0.5, "responseMimeType": "application/json"},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent"
    async with httpx.AsyncClient(timeout=40) as c:
        r = await c.post(url, json=corpo, headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]})
        r.raise_for_status()
    return "".join(p.get("text", "") for p in r.json()["candidates"][0]["content"]["parts"])


async def _claude(sistema: str, mensagens: list[dict], imagem: dict | None) -> str:
    modelo = os.getenv("CLAUDE_MODELO", "claude-haiku-5-5")
    msgs = []
    for i, m in enumerate(mensagens):
        conteudo: list[dict] = [{"type": "text", "text": m["texto"]}]
        if imagem and i == len(mensagens) - 1:
            conteudo.insert(0, {"type": "image", "source": {"type": "base64", "media_type": imagem["mime"], "data": imagem["base64"]}})
        msgs.append({"role": "user" if m["papel"] == "pessoa" else "assistant", "content": conteudo})
    corpo = {"model": modelo, "max_tokens": 600, "system": sistema, "messages": msgs}
    headers = {"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"}
    async with httpx.AsyncClient(timeout=40) as c:
        r = await c.post("https://api.anthropic.com/v1/messages", json=corpo, headers=headers)
        r.raise_for_status()
    return "".join(b.get("text", "") for b in r.json()["content"] if b.get("type") == "text")
