"""API da Lia: conversa, Entende (foto), antigolpe e o gov.br simulado.
A chave da IA fica aqui no servidor, nunca dentro do app (RNF05).
Rodar: uvicorn main:app --host 0.0.0.0 --port 8000
"""
import logging
import time

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
    "app": {"guiar", "guiar_app", "avisar_familiar", "tirar_foto", "parar_guia"},
    "ligacao": {"agendar_por_voz", "consultar_beneficio", "avisar_familiar"},
}
SERVICOS = set(gov_simulado.FLUXOS)
APPS = {"whatsapp", "configuracoes", "celular", "playstore"}


class Mensagem(BaseModel):
    papel: str = Field(pattern="^(pessoa|lia)$")
    texto: str = Field(min_length=1, max_length=4000)


class Contexto(BaseModel):
    autonomia: dict[str, int] = {}
    familia: list[str] = []  # só parentescos/apelidos; telefones ficam no celular
    guia: str | None = Field(default=None, max_length=600)  # o que o Guia está mostrando agora, se estiver


class Conversa(BaseModel):
    mensagens: list[Mensagem] = Field(min_length=1, max_length=40)
    canal: str = Field(default="app", pattern="^(app|ligacao)$")
    contexto: Contexto = Contexto()


class Foto(BaseModel):
    imagem_base64: str = Field(min_length=100, max_length=8_000_000)
    mime: str = Field(default="image/jpeg", pattern="^image/(jpeg|png|webp)$")


class Texto(BaseModel):
    texto: str = Field(min_length=1, max_length=4000)


# Data da última mudança no servidor: o robô de testes mostra, para saber se a API foi reiniciada.
VERSAO = "2026-11-07.5"


@app.get("/saude")
def saude():
    return {"ok": True, "provedor": provedor(), "versao": VERSAO}


def validar_acao(acao, canal: str) -> dict | None:
    if not isinstance(acao, dict) or acao.get("tipo") not in ACOES_POR_CANAL[canal]:
        return None
    if acao["tipo"] == "guiar" and acao.get("servico") not in SERVICOS:
        return None
    if acao["tipo"] == "guiar_app":
        if not acao.get("objetivo"):
            return None
        # Qualquer outro app (Maps, Facebook, YouTube...): o app procura esse app instalado e abre direto nele.
        # Antes o Guia começava na tela inicial e a IA adivinhava o app (ex.: tocava no Google em vez do Maps).
        if acao.get("app") not in APPS:
            acao = {**acao, "abrir": str(acao.get("abrir") or acao.get("app") or "").strip()[:40], "app": "celular"}
        if acao.get("abrir"):
            acao["abrir"] = str(acao["abrir"]).strip()[:40]
        else:
            acao.pop("abrir", None)
        # Play Store para instalar um app com nome: a loja já abre na busca dele (longe dos anúncios da página inicial).
        acao = {k: v for k, v in acao.items() if k not in ("atalho", "nome_app")}
        if acao.get("app") == "playstore":
            nome = guia.nome_do_app(acao["objetivo"]) if any(p in guia.normalizar(acao["objetivo"]) for p in guia.PEDE_INSTALAR) else None
            if nome:
                acao["nome_app"] = nome
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
            r = await gerar(montar_sistema(c.canal, contexto, analise), msgs, max_tokens=300, prazo=10)
        except (httpx.HTTPError, KeyError, IndexError, RuntimeError):
            # Último recurso: sem IA, a Lia responde pelas regras do modo teste (o antigolpe continua valendo).
            log.exception("IA indisponível; respondendo pelas regras")
            r = cerebro_teste.responder(msgs, c.canal, contexto, analise)
            if contexto.get("guia") and not r.get("acao"):
                # Durante o Guia, a resposta genérica das regras confunde: avisa e deixa o Guia seguir.
                r = {"fala": "A internet está lenta agora. Continuo com você: o Guia segue na tela.", "acao": None}
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
                        imagem={"base64": f.imagem_base64, "mime": f.mime}, prazo=35)
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
    seguiu: str | None = Field(default=None, max_length=120)  # a instrução que a pessoa acabou de cumprir
    feitos: list[str] = Field(default=[], max_length=30)
    escondidos: list[str] = Field(default=[], max_length=20)  # botões cortados: só aparecem rolando
    titulo: str = Field(default="", max_length=120)  # nome da tela atual
    caminho: list[str] = Field(default=[], max_length=12)  # telas por onde ela passou
    plano: list[str] = Field(default=[], max_length=10)  # o resto do caminho provável (dica para a IA)
    imagem: str | None = Field(default=None, max_length=3_000_000)  # JPEG base64 com tarjas, só quando travou
    palavras: list[str] = Field(default=[], max_length=40)  # palavras do celular que ela já aprendeu
    repetindo: bool = False  # ela já passou por esta tela várias vezes (andando em círculos)
    mesma_tela: bool = False  # a tela é a mesma da resposta anterior (o toque não levou a outro lugar)


# Resposta da IA guardada por tela: a mesma tela (mesmo objetivo e mesmos passos) responde na hora.
_CACHE_GUIA: dict[tuple, tuple[float, dict]] = {}
CACHE_GUIA_S = 180


def _chave_guia(t: "TelaGuia", elementos: list[str]) -> tuple:
    return (t.objetivo, t.app, t.tela, tuple(elementos), tuple(t.feitos), t.motivo, t.seguiu)


class PedidoExplicar(BaseModel):
    pergunta: str = Field(default="o que é isso?", max_length=200)
    app: str = Field(default="", max_length=120)
    titulo: str = Field(default="", max_length=120)
    elementos: list[str] = Field(default=[], max_length=60)
    textos: list[str] = Field(default=[], max_length=40)
    objetivo: str = Field(default="", max_length=300)


@app.post("/guia/explicar")
async def guia_explicar(e: PedidoExplicar):
    """"O que é isso?": explica a tela em palavras simples (ensina a entender, não só onde tocar)."""
    if provedor() in ("gemini", "claude"):
        try:
            r = await gerar(guia.montar_explicacao(e.pergunta, e.app, e.titulo, e.elementos, e.textos, e.objetivo),
                            [{"papel": "pessoa", "texto": e.pergunta}], max_tokens=250, prazo=9)
            if str(r.get("fala") or "").strip():
                return {"fala": str(r["fala"]).strip(), "provedor": provedor()}
        except (httpx.HTTPError, KeyError, IndexError, RuntimeError):
            log.exception("IA indisponível para explicar a tela")
    return {"fala": guia.explicacao_teste(e.app, e.titulo, e.elementos), "provedor": "regras"}


class PedidoPlano(BaseModel):
    objetivo: str = Field(min_length=2, max_length=300)
    app: str = Field(default="celular", max_length=40)


@app.post("/guia/plano")
async def guia_plano(pp: PedidoPlano):
    """Caminho provável, pedido uma vez no começo do Guia (o celular segue sozinho enquanto bate com a tela)."""
    if provedor() not in ("gemini", "claude"):
        return {"passos": guia.plano_teste(pp.objetivo, pp.app), "provedor": provedor()}
    try:
        r = await gerar(guia.montar_plano(pp.objetivo, pp.app), [{"papel": "pessoa", "texto": "Qual é o caminho?"}],
                        max_tokens=300, prazo=6)
    except (httpx.HTTPError, KeyError, IndexError, RuntimeError):
        return {"passos": guia.plano_teste(pp.objetivo, pp.app), "provedor": "regras (IA indisponível)"}
    return {"passos": guia.interpretar_plano(r), "provedor": provedor()}


@app.post("/guia/proximo")
async def guia_proximo(t: TelaGuia):
    passo = await _guia_proximo(t)
    palavra = None
    if not passo.get("concluido"):
        fala, palavra = guia.ensinar_palavra(passo["fala"], t.palavras)
        passo = {**passo, "fala": fala}
    return {**passo, "alerta": alerta_da_tela(t), "palavra": palavra}


def alerta_da_tela(t: TelaGuia) -> str | None:
    """Antigolpe dentro do Guia: lê os textos da tela (mensagem, site, SMS) e avisa se tiver cara de golpe.
    Só o nível alto, para não assustar à toa em telas comuns (ex.: "Senha e segurança")."""
    texto = "\n".join(t.textos + [guia.curto(e) for e in t.elementos])
    a = antigolpe.analisar(texto)
    if a["nivel"] != "alto":
        return None
    return ("Cuidado: esta tela tem sinais de golpe (" + "; ".join(a["motivos"][:2]) +
            "). Não clique em links, não pague e não passe nenhum código.")


async def _guia_proximo(t: TelaGuia) -> dict:
    elementos = [e.strip()[:80] for e in t.elementos if e.strip()]
    textos = [e.strip()[:80] for e in t.textos if e.strip()]
    args = dict(tela=t.tela, rolavel=t.rolavel, motivo=t.motivo, errou=t.errou, seguiu=t.seguiu)
    extra = dict(escondidos=[e.strip()[:80] for e in t.escondidos if e.strip()], titulo=t.titulo,
                 caminho=[c.strip()[:80] for c in t.caminho if c.strip()], plano=[x.strip()[:60] for x in t.plano if x.strip()],
                 repetindo=t.repetindo)
    if t.motivo != "errou" or t.app == guia.LOJA:  # na loja o roteiro vale sempre (ele confere o app)
        certeira = guia.regra_certeira(t.objetivo, elementos, t.feitos, t.tela, textos, app=t.app, titulo=t.titulo)
        if certeira:
            return {**certeira, "provedor": "regras (atalho)"}
    if provedor() not in ("gemini", "claude"):
        return {**guia.proximo_teste(t.objetivo, elementos, t.feitos, **args), "provedor": provedor()}
    # "parado" e "errou" pedem um caminho novo: não usam a resposta guardada.
    chave = _chave_guia(t, elementos) if t.motivo in ("mudou", "inicio") and not t.imagem and not t.repetindo else None
    agora = time.monotonic()
    if chave and chave in _CACHE_GUIA and agora - _CACHE_GUIA[chave][0] < CACHE_GUIA_S:
        return {**_CACHE_GUIA[chave][1], "provedor": f"{provedor()} (guardado)"}
    lista = elementos[:45]
    try:
        img = {"base64": t.imagem, "mime": "image/jpeg"} if t.imagem else None
        r = await gerar(guia.montar_prompt(t.objetivo, t.app, lista, t.feitos, textos=textos[:20], **args, **extra,
                                           com_imagem=bool(img)),
                        [{"papel": "pessoa", "texto": "Qual é o próximo passo?"}], imagem=img, max_tokens=220,
                        prazo=14 if img else 7)
    except (httpx.HTTPError, KeyError, IndexError, RuntimeError):
        log.exception("IA indisponível para o Guia; usando as regras")
        return {**guia.proximo_teste(t.objetivo, elementos, t.feitos, **args), "provedor": "regras (IA indisponível)"}
    passo = guia.interpretar(r, lista, t.objetivo, textos, t.rolavel, com_imagem=bool(t.imagem), tela=t.tela,
                             repetindo=t.repetindo, feitos=t.feitos, seguiu=t.seguiu, mesma_tela=t.mesma_tela,
                             titulo=t.titulo)
    if chave:
        if len(_CACHE_GUIA) > 300:
            _CACHE_GUIA.clear()
        _CACHE_GUIA[chave] = (agora, passo)
    return {**passo, "provedor": provedor()}
