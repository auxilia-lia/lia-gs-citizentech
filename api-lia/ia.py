"""Chamadas à IA (Gemini ou Claude), sempre pedindo resposta em JSON."""
import json
import os
import re
import time

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


async def gerar(sistema: str, mensagens: list[dict], imagem: dict | None = None, max_tokens: int = 600,
                prazo: float = 15) -> dict:
    """mensagens: [{"papel": "pessoa"|"lia", "texto": str}]; imagem: {"base64", "mime"} na última mensagem.
    prazo: tempo TOTAL em segundos (somando os modelos reserva). Passou disso, quem chamou usa as regras."""
    p = provedor()
    if p == "gemini":
        return _extrair_json(await _gemini(sistema, mensagens, imagem, max_tokens, prazo))
    if p == "claude":
        return _extrair_json(await _claude(sistema, mensagens, imagem, prazo))
    raise RuntimeError("provedor de teste não chama IA")


async def _gemini(sistema: str, mensagens: list[dict], imagem: dict | None, max_tokens: int = 600,
                  prazo: float = 15) -> str:
    """Tenta os modelos em fila: o principal e depois os reservas (GEMINI_MODELO_RESERVA, separados por vírgula).
    Passa para o próximo quando o modelo está sobrecarregado (429/500/503) ou demora demais."""
    principal = os.getenv("GEMINI_MODELO", "gemini-flash-lite-latest")
    reservas = os.getenv("GEMINI_MODELO_RESERVA", "gemini-3.1-flash-lite,gemini-3.5-flash")
    fila = [principal] + [m.strip() for m in reservas.split(",") if m.strip() and m.strip() != principal]
    ultimo_erro: Exception | None = None
    fim = time.monotonic() + prazo
    for modelo in fila:
        resta = fim - time.monotonic()
        if resta < 1.5:
            break  # sem tempo para outro modelo: melhor responder pelas regras do que deixar a pessoa esperando
        try:
            return await _gemini_modelo(modelo, sistema, mensagens, imagem, timeout=resta, max_tokens=max_tokens)
        except httpx.TimeoutException as e:
            ultimo_erro = e
        except httpx.HTTPStatusError as e:
            if e.response.status_code not in (429, 500, 503):
                raise
            ultimo_erro = e
    raise ultimo_erro or RuntimeError("nenhum modelo respondeu a tempo")


# Modelos que já recusaram a configuração de "pensamento" (não tentamos de novo).
_SEM_PENSAMENTO: set[str] = set()


def _config_pensamento(modelo: str) -> dict:
    """Pede o mínimo de "pensamento": a Lia precisa responder rápido, não resolver problemas difíceis."""
    if modelo in _SEM_PENSAMENTO:
        return {}
    if modelo.startswith("gemini-2"):
        return {"thinkingConfig": {"thinkingBudget": 0}}
    return {"thinkingConfig": {"thinkingLevel": "minimal"}}


async def _gemini_modelo(modelo: str, sistema: str, mensagens: list[dict], imagem: dict | None, timeout: float,
                         max_tokens: int = 600) -> str:
    conteudos = []
    for i, m in enumerate(mensagens):
        partes = [{"text": m["texto"]}]
        if imagem and i == len(mensagens) - 1:
            partes.insert(0, {"inline_data": {"mime_type": imagem["mime"], "data": imagem["base64"]}})
        conteudos.append({"role": "user" if m["papel"] == "pessoa" else "model", "parts": partes})
    corpo = {
        "systemInstruction": {"parts": [{"text": sistema}]},
        "contents": conteudos,
        "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.4, "responseMimeType": "application/json",
                             **_config_pensamento(modelo)},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent"
    headers = {"x-goog-api-key": os.environ["GEMINI_API_KEY"]}
    async with httpx.AsyncClient(timeout=timeout) as c:
        r = await c.post(url, json=corpo, headers=headers)
        if r.status_code == 400 and "thinkingConfig" in corpo["generationConfig"]:
            # Este modelo não aceita a configuração de pensamento: tira e tenta de novo.
            _SEM_PENSAMENTO.add(modelo)
            corpo["generationConfig"].pop("thinkingConfig")
            r = await c.post(url, json=corpo, headers=headers)
        r.raise_for_status()
    return "".join(p.get("text", "") for p in r.json()["candidates"][0]["content"]["parts"])


async def _claude(sistema: str, mensagens: list[dict], imagem: dict | None, prazo: float = 15) -> str:
    modelo = os.getenv("CLAUDE_MODELO", "claude-haiku-5-5")
    msgs = []
    for i, m in enumerate(mensagens):
        conteudo: list[dict] = [{"type": "text", "text": m["texto"]}]
        if imagem and i == len(mensagens) - 1:
            conteudo.insert(0, {"type": "image", "source": {"type": "base64", "media_type": imagem["mime"], "data": imagem["base64"]}})
        msgs.append({"role": "user" if m["papel"] == "pessoa" else "assistant", "content": conteudo})
    corpo = {"model": modelo, "max_tokens": 600, "system": sistema, "messages": msgs}
    headers = {"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"}
    async with httpx.AsyncClient(timeout=prazo) as c:
        r = await c.post("https://api.anthropic.com/v1/messages", json=corpo, headers=headers)
        r.raise_for_status()
    return "".join(b.get("text", "") for b in r.json()["content"] if b.get("type") == "text")


async def gerar_fluxo(sistema: str, mensagens: list[dict], max_tokens: int = 300, prazo: float = 14):
    """Como gerar(), mas devolve o texto aos pedaços conforme a IA escreve (só Gemini, modelo principal).
    Assim a Lia começa a falar a primeira frase antes de a resposta inteira ficar pronta.
    Se falhar antes do primeiro pedaço, levanta o erro: quem chamou cai para gerar() ou para as regras."""
    if provedor() != "gemini":
        raise RuntimeError("fluxo só no Gemini")
    modelo = os.getenv("GEMINI_MODELO", "gemini-flash-lite-latest")
    conteudos = [{"role": "user" if m["papel"] == "pessoa" else "model", "parts": [{"text": m["texto"]}]} for m in mensagens]
    corpo = {
        "systemInstruction": {"parts": [{"text": sistema}]},
        "contents": conteudos,
        "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.4, "responseMimeType": "application/json",
                             **_config_pensamento(modelo)},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:streamGenerateContent?alt=sse"
    headers = {"x-goog-api-key": os.environ["GEMINI_API_KEY"]}
    async with httpx.AsyncClient(timeout=httpx.Timeout(prazo, connect=5)) as c:
        async with c.stream("POST", url, json=corpo, headers=headers) as r:
            if r.status_code == 400 and "thinkingConfig" in corpo["generationConfig"]:
                _SEM_PENSAMENTO.add(modelo)
                raise RuntimeError("modelo sem configuração de pensamento")
            r.raise_for_status()
            async for linha in r.aiter_lines():
                if not linha.startswith("data:"):
                    continue
                try:
                    pedaco = json.loads(linha[5:])
                    partes = pedaco["candidates"][0]["content"]["parts"]
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue
                texto = "".join(p.get("text", "") for p in partes)
                if texto:
                    yield texto


_FALA = re.compile(r'"fala"\s*:\s*"((?:[^"\\]|\\.)*)')


def fala_parcial(json_incompleto: str) -> str:
    """Tira o valor de "fala" de um JSON que ainda está chegando (pode estar sem fechar)."""
    m = _FALA.search(json_incompleto)
    if not m:
        return ""
    bruto = m.group(1)
    if bruto.endswith("\\") and not bruto.endswith("\\\\"):
        bruto = bruto[:-1]
    try:
        return json.loads(f'"{bruto}"')
    except json.JSONDecodeError:
        return bruto.replace('\\"', '"').replace("\\n", " ")


def frases_prontas(texto: str, ja_enviado: int) -> tuple[str, int]:
    """Do texto que já chegou, devolve as frases completas ainda não enviadas (termina em . ! ? seguido de espaço)."""
    fim = -1
    for m in re.finditer(r"[.!?…](\s|$)", texto[ja_enviado:]):
        if m.group(1) or False:
            fim = ja_enviado + m.end()
    if fim <= ja_enviado:
        return "", ja_enviado
    return texto[ja_enviado:fim].strip(), fim
