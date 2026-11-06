"""API da Lia: conversa, Entende (foto), antigolpe e o gov.br simulado.
A chave da IA fica aqui no servidor, nunca dentro do app (RNF05).
Rodar: uvicorn main:app --host 0.0.0.0 --port 8000
"""
import logging

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel, Field

load_dotenv()

import antigolpe  # noqa: E402
import cerebro_teste  # noqa: E402
import gov_simulado  # noqa: E402
import guia  # noqa: E402
from ia import gerar, provedor  # noqa: E402
from prompt_lia import PROMPT_ENTENDE, montar_sistema  # noqa: E402

log = logging.getLogger("lia")
app = FastAPI(title="API da Lia")
app.include_router(gov_simulado.router)

ACOES_POR_CANAL = {
    "app": {"guiar", "guiar_app", "avisar_familiar", "tirar_foto"},
    "ligacao": {"agendar_por_voz", "consultar_beneficio", "avisar_familiar"},
}
SERVICOS = set(gov_simulado.FLUXOS)
APPS = {"whatsapp", "configuracoes", "celular"}


class Mensagem(BaseModel):
    papel: str = Field(pattern="^(pessoa|lia)$")
    texto: str = Field(min_length=1, max_length=4000)


class Contexto(BaseModel):
    autonomia: dict[str, int] = {}
    familia: list[str] = []  # só parentescos/apelidos; telefones ficam no celular


class Conversa(BaseModel):
    mensagens: list[Mensagem] = Field(min_length=1, max_length=40)
    canal: str = Field(default="app", pattern="^(app|ligacao)$")
    contexto: Contexto = Contexto()


class Foto(BaseModel):
    imagem_base64: str = Field(min_length=100, max_length=8_000_000)
    mime: str = Field(default="image/jpeg", pattern="^image/(jpeg|png|webp)$")


class Texto(BaseModel):
    texto: str = Field(min_length=1, max_length=4000)


@app.get("/saude")
def saude():
    return {"ok": True, "provedor": provedor()}


def validar_acao(acao, canal: str) -> dict | None:
    if not isinstance(acao, dict) or acao.get("tipo") not in ACOES_POR_CANAL[canal]:
        return None
    if acao["tipo"] == "guiar" and acao.get("servico") not in SERVICOS:
        return None
    if acao["tipo"] == "guiar_app" and (acao.get("app") not in APPS or not acao.get("objetivo")):
        return None
    if acao["tipo"] == "avisar_familiar" and not (acao.get("contato") and acao.get("mensagem")):
        return None
    return acao


def executar_na_ligacao(acao: dict) -> str:
    """Na ligação não há tela: a própria central da Lia faz a ação (já confirmada na conversa)."""
    if acao["tipo"] == "agendar_por_voz":
        ag = gov_simulado.criar_agendamento(acao.get("ubs", "UBS Centro"), acao.get("horario", gov_simulado.HORARIOS["h1"]))
        acao["resultado"] = ag
        protocolo = " ".join(ag["protocolo"].split("-")[1])
        return f"Pronto, sua consulta está marcada na {ag['ubs']}, {ag['horario']}. O protocolo é {protocolo}."
    if acao["tipo"] == "consultar_beneficio":
        b = gov_simulado.BENEFICIO
        acao["resultado"] = b
        return f"O seu dinheiro do INSS é de {b['valor']}, e o próximo pagamento cai no dia {b['data'][:5]}."
    return ""


@app.post("/conversa")
async def conversa(c: Conversa):
    msgs = [m.model_dump() for m in c.mensagens]
    analise = antigolpe.analisar(msgs[-1]["texto"])
    contexto = c.contexto.model_dump()
    p = provedor()
    if p in ("gemini", "claude"):
        try:
            r = await gerar(montar_sistema(c.canal, contexto, analise), msgs)
        except (httpx.HTTPError, KeyError, IndexError, RuntimeError):
            # Último recurso: sem IA, a Lia responde pelas regras do modo teste (o antigolpe continua valendo).
            log.exception("IA indisponível; respondendo pelas regras")
            r = cerebro_teste.responder(msgs, c.canal, contexto, analise)
            p = "regras (IA indisponível)"
    else:
        r = cerebro_teste.responder(msgs, c.canal, contexto, analise)

    fala = str(r.get("fala") or "").strip() or "Desculpa, não entendi. Pode repetir?"
    acao = validar_acao(r.get("acao"), c.canal)
    if acao and c.canal == "ligacao":
        extra = executar_na_ligacao(acao)
        if extra:
            fala = f"{fala} {extra}".strip()
    return {"fala": fala, "acao": acao, "golpe": analise if analise["golpe"] else None, "provedor": p}


@app.post("/entende")
async def entende(f: Foto):
    p = provedor()
    if p not in ("gemini", "claude"):
        return {**cerebro_teste.entender_foto(), "provedor": p}
    try:
        r = await gerar(PROMPT_ENTENDE, [{"papel": "pessoa", "texto": "Me explica esse papel."}],
                        imagem={"base64": f.imagem_base64, "mime": f.mime})
    except (httpx.HTTPError, KeyError, IndexError, RuntimeError):
        log.exception("IA indisponível para a foto")
        return {"fala": "Agora não consegui ler o papel, a internet está ruim. Tenta de novo daqui a pouco.",
                "golpe": False, "motivo": "", "provedor": "regras (IA indisponível)"}
    return {"fala": str(r.get("fala") or "Não consegui ler o papel. Tenta tirar a foto de novo, com mais luz."),
            "golpe": bool(r.get("golpe")), "motivo": str(r.get("motivo") or ""), "provedor": p}


@app.post("/antigolpe")
def verificar_golpe(t: Texto):
    a = antigolpe.analisar(t.texto)
    return {**a, "fala": antigolpe.fala_golpe(a)}


class TelaGuia(BaseModel):
    objetivo: str = Field(min_length=2, max_length=300)
    app: str = Field(default="", max_length=120)
    tela: str = Field(default="app", pattern="^(app|inicio|painel)$")
    elementos: list[str] = Field(default=[], max_length=80)
    textos: list[str] = Field(default=[], max_length=40)
    rolavel: bool = False
    motivo: str = Field(default="mudou", pattern="^(mudou|errou|parado|inicio)$")
    errou: str | None = Field(default=None, max_length=120)
    feitos: list[str] = Field(default=[], max_length=30)


@app.post("/guia/proximo")
async def guia_proximo(t: TelaGuia):
    elementos = [e.strip()[:80] for e in t.elementos if e.strip()]
    textos = [e.strip()[:80] for e in t.textos if e.strip()]
    args = dict(tela=t.tela, rolavel=t.rolavel, motivo=t.motivo, errou=t.errou)
    if provedor() not in ("gemini", "claude"):
        return {**guia.proximo_teste(t.objetivo, elementos, t.feitos, **args), "provedor": provedor()}
    try:
        r = await gerar(guia.montar_prompt(t.objetivo, t.app, elementos, t.feitos, textos=textos, **args),
                        [{"papel": "pessoa", "texto": "Qual é o próximo passo?"}])
    except (httpx.HTTPError, KeyError, IndexError, RuntimeError):
        log.exception("IA indisponível para o Guia; usando as regras")
        return {**guia.proximo_teste(t.objetivo, elementos, t.feitos, **args), "provedor": "regras (IA indisponível)"}
    return {**guia.interpretar(r, elementos), "provedor": provedor()}
