"""gov.br SIMULADO, onde o Guia da Lia atua na demo.
Projeto acadêmico: dados fictícios, sem marca oficial, sem senha.
Os textos dos botões são os mesmos dos FLUXOS abaixo, que o app usa como passos do Guia.
"""
import html
import secrets
from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel

router = APIRouter(prefix="/gov")

CIDADA = {"nome": "Maria das Dores", "cpf": "000.000.000-00"}  # fictícia
UBS = {"ubs-centro": "UBS Centro", "ubs-vila-nova": "UBS Vila Nova"}
HORARIOS = {"h1": "Terça, 10/11 às 9h", "h2": "Quarta, 11/11 às 14h", "h3": "Sexta, 13/11 às 10h"}
BENEFICIO = {"tipo": "Aposentadoria por idade", "valor": "R$ 1.518,00", "data": "25/11/2026"}
MULTAS = [{"placa": "ABC1D23", "descricao": "Estacionar em local proibido", "valor": "R$ 195,23", "vencimento": "30/11/2026"}]

AGENDAMENTOS: dict[str, dict] = {}

ENTRAR = "Entrar com conta de demonstração"

FLUXOS = {
    "consulta": {
        "titulo": "Marcar consulta",
        "caminho": "/gov",
        "passos": [ENTRAR, "Saúde", "Agendar consulta", "UBS Centro", HORARIOS["h1"], "Confirmar agendamento"],
        "risco": "alto",
    },
    "beneficio": {
        "titulo": "Ver o dinheiro do INSS",
        "caminho": "/gov",
        "passos": [ENTRAR, "Meu INSS", "Extrato de pagamento"],
        "risco": "baixo",
    },
    "multas": {
        "titulo": "Consultar multas",
        "caminho": "/gov",
        "passos": [ENTRAR, "Veículos", "Consultar multas"],
        "risco": "baixo",
    },
}


def pagina(titulo: str, corpo: str, voltar: str | None = "/gov/inicio") -> HTMLResponse:
    v = f'<a class="voltar" href="{voltar}">← Voltar</a>' if voltar else ""
    return HTMLResponse(f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(titulo)} · gov.br simulado</title>
<style>
  :root {{ --azul:#1351B4; --azul-escuro:#071D41; --fundo:#F8F8F8; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; font-family:system-ui,-apple-system,Roboto,sans-serif; background:var(--fundo); color:#1B1B1B; }}
  .aviso {{ background:#FFCD07; color:#000; text-align:center; font-weight:700; padding:8px; font-size:15px; }}
  header {{ background:#fff; padding:16px 20px; border-bottom:4px solid var(--azul); }}
  header .marca {{ font-size:24px; font-weight:800; color:var(--azul-escuro); }}
  header .marca span {{ color:var(--azul); }}
  main {{ padding:20px; max-width:560px; margin:0 auto; }}
  h1 {{ font-size:26px; margin:8px 0 16px; color:var(--azul-escuro); }}
  p {{ font-size:19px; line-height:1.5; }}
  .botao, button {{ display:block; width:100%; text-align:center; background:var(--azul); color:#fff; font-size:21px;
    font-weight:700; padding:20px; border-radius:999px; text-decoration:none; border:0; margin:14px 0; font-family:inherit; }}
  .botao.claro {{ background:#fff; color:var(--azul); border:2px solid var(--azul); }}
  .cartao {{ background:#fff; border-radius:12px; padding:16px 18px; margin:12px 0; box-shadow:0 1px 4px #0002; font-size:19px; }}
  .cartao b {{ display:block; font-size:22px; margin-top:4px; }}
  .voltar {{ display:inline-block; margin-top:20px; font-size:18px; color:var(--azul); }}
</style></head>
<body>
<div class="aviso">SIMULAÇÃO · projeto acadêmico FIAP · nada aqui é real</div>
<header><div class="marca">gov<span>.br</span> simulado</div></header>
<main><h1>{html.escape(titulo)}</h1>{corpo}{v}</main>
</body></html>""")


def botao(texto: str, href: str, claro: bool = False) -> str:
    c = "botao claro" if claro else "botao"
    return f'<a class="{c}" href="{href}">{html.escape(texto)}</a>'


@router.get("", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse)
def entrada():
    return pagina(
        "Acesse sua conta",
        "<p>Para usar os serviços, entre na sua conta.</p>"
        "<p>Nesta simulação não existe senha: a conta é de demonstração.</p>"
        + botao(ENTRAR, "/gov/inicio"),
        voltar=None,
    )


@router.get("/inicio", response_class=HTMLResponse)
def inicio():
    return pagina(
        f"Olá, {CIDADA['nome'].split()[0]}",
        "<p>O que você quer fazer hoje?</p>"
        + botao("Saúde", "/gov/saude")
        + botao("Meu INSS", "/gov/inss")
        + botao("Veículos", "/gov/veiculos")
        + botao("Sair", "/gov", claro=True),
        voltar=None,
    )


# ---------- Saúde ----------
@router.get("/saude", response_class=HTMLResponse)
def saude():
    return pagina("Saúde", botao("Agendar consulta", "/gov/saude/agendar") + botao("Minhas consultas", "/gov/saude/minhas", claro=True))


@router.get("/saude/agendar", response_class=HTMLResponse)
def escolher_ubs():
    corpo = "<p>Escolha a unidade de saúde.</p>" + "".join(botao(n, f"/gov/saude/agendar/{k}") for k, n in UBS.items())
    return pagina("Agendar consulta", corpo, voltar="/gov/saude")


@router.get("/saude/agendar/{ubs}", response_class=HTMLResponse)
def escolher_horario(ubs: str):
    if ubs not in UBS:
        return RedirectResponse("/gov/saude/agendar")
    corpo = f"<p>Clínico geral na <b>{UBS[ubs]}</b>. Escolha o horário.</p>" + "".join(
        botao(h, f"/gov/saude/agendar/{ubs}/{k}") for k, h in HORARIOS.items()
    )
    return pagina("Escolha o horário", corpo, voltar="/gov/saude/agendar")


@router.get("/saude/agendar/{ubs}/{hid}", response_class=HTMLResponse)
def revisar(ubs: str, hid: str):
    if ubs not in UBS or hid not in HORARIOS:
        return RedirectResponse("/gov/saude/agendar")
    corpo = (
        f'<div class="cartao">Unidade<b>{UBS[ubs]}</b></div>'
        f'<div class="cartao">Horário<b>{HORARIOS[hid]}</b></div>'
        '<div class="cartao">Especialidade<b>Clínico geral</b></div>'
        f'<form method="post" action="/gov/saude/agendar/{ubs}/{hid}"><button type="submit">Confirmar agendamento</button></form>'
    )
    return pagina("Confira antes de confirmar", corpo, voltar=f"/gov/saude/agendar/{ubs}")


def criar_agendamento(ubs_nome: str, horario: str) -> dict:
    protocolo = f"SIM-{secrets.randbelow(900000) + 100000}"
    ag = {"protocolo": protocolo, "ubs": ubs_nome, "horario": horario, "criado": datetime.now().isoformat(timespec="seconds")}
    AGENDAMENTOS[protocolo] = ag
    return ag


@router.post("/saude/agendar/{ubs}/{hid}")
def confirmar(ubs: str, hid: str):
    if ubs not in UBS or hid not in HORARIOS:
        return RedirectResponse("/gov/saude/agendar", status_code=303)
    ag = criar_agendamento(UBS[ubs], HORARIOS[hid])
    return RedirectResponse(f"/gov/saude/confirmado/{ag['protocolo']}", status_code=303)


@router.get("/saude/confirmado/{protocolo}", response_class=HTMLResponse)
def confirmado(protocolo: str):
    ag = AGENDAMENTOS.get(protocolo)
    if not ag:
        return RedirectResponse("/gov/saude")
    corpo = (
        "<p>Pronto! Sua consulta está marcada.</p>"
        f'<div class="cartao">Protocolo<b>{ag["protocolo"]}</b></div>'
        f'<div class="cartao">{ag["ubs"]}<b>{ag["horario"]}</b></div>'
        + botao("Voltar ao início", "/gov/inicio")
    )
    return pagina("Consulta marcada", corpo, voltar=None)


@router.get("/saude/minhas", response_class=HTMLResponse)
def minhas():
    if not AGENDAMENTOS:
        corpo = "<p>Você ainda não tem consultas marcadas.</p>"
    else:
        corpo = "".join(f'<div class="cartao">{a["ubs"]}<b>{a["horario"]}</b>Protocolo {a["protocolo"]}</div>' for a in AGENDAMENTOS.values())
    return pagina("Minhas consultas", corpo, voltar="/gov/saude")


# ---------- INSS ----------
@router.get("/inss", response_class=HTMLResponse)
def inss():
    return pagina("Meu INSS", botao("Extrato de pagamento", "/gov/inss/extrato") + botao("Pedir benefício", "/gov/inss", claro=True))


@router.get("/inss/extrato", response_class=HTMLResponse)
def extrato():
    b = BENEFICIO
    corpo = (
        f'<div class="cartao">{b["tipo"]}<b>{b["valor"]}</b></div>'
        f'<div class="cartao">Próximo pagamento<b>{b["data"]}</b></div>'
        "<p>Valores fictícios da simulação.</p>"
    )
    return pagina("Extrato de pagamento", corpo, voltar="/gov/inss")


# ---------- Veículos ----------
@router.get("/veiculos", response_class=HTMLResponse)
def veiculos():
    return pagina("Veículos", botao("Consultar multas", "/gov/veiculos/multas") + botao("Licenciamento", "/gov/veiculos", claro=True))


@router.get("/veiculos/multas", response_class=HTMLResponse)
def multas():
    corpo = "".join(
        f'<div class="cartao">Placa {m["placa"]} · {m["descricao"]}<b>{m["valor"]}</b>Vence em {m["vencimento"]}</div>' for m in MULTAS
    )
    return pagina("Suas multas", corpo, voltar="/gov/veiculos")


# ---------- API para o app e para a ligação ----------
@router.get("/fluxos")
def fluxos():
    return FLUXOS


class PedidoAgendamento(BaseModel):
    ubs: str = "UBS Centro"
    horario: str = HORARIOS["h1"]


@router.post("/api/agendamentos")
def agendar_api(p: PedidoAgendamento):
    return criar_agendamento(p.ubs, p.horario)


@router.get("/api/beneficio")
def beneficio_api():
    return BENEFICIO


@router.get("/api/multas")
def multas_api():
    return MULTAS
