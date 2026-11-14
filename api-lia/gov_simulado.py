"""Portal do Cidadão SIMULADO, onde o Guia da Lia atua na demo.
Projeto acadêmico: identidade própria (nada de marca, brasão ou logotipo oficial), dados fictícios, sem senha.
Os textos dos botões são os mesmos dos FLUXOS abaixo, que o app usa como passos do Guia.

Cuidado ao mexer no visual: o Guia acha cada passo pelo TEXTO do botão. Em cada página,
- o texto do botão do próximo passo aparece uma vez só, e só no botão (sem menu repetido nem frase que o cite);
- nenhum texto solto cita o próximo passo (o Guia entenderia que a pessoa já chegou lá).
"""
import html
import secrets
from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel

router = APIRouter(prefix="/gov")

PORTAL = "Portal do Cidadão"
FAIXA = "Simulação — ambiente de demonstração"

CIDADA = {"nome": "Maria das Dores", "cpf": "000.000.000-00"}  # fictícia
UBS = {"ubs-centro": "UBS Centro", "ubs-vila-nova": "UBS Vila Nova"}
ENDERECOS = {"ubs-centro": "Rua das Flores, 100 · Centro", "ubs-vila-nova": "Av. das Palmeiras, 250 · Vila Nova"}
HORARIOS = {"h1": "Terça, 10/11 às 9h", "h2": "Quarta, 11/11 às 14h", "h3": "Sexta, 13/11 às 10h"}
BENEFICIO = {
    "tipo": "Aposentadoria por idade", "valor": "R$ 1.518,00", "data": "25/11/2026",
    # detalhes do extrato (fictícios)
    "numero": "000.000.000-0", "competencia": "Novembro de 2026", "bruto": "R$ 1.518,00", "descontos": "R$ 0,00",
    "dia_semana": "quarta-feira", "banco": "Banco Exemplo · agência 0000",
    "historico": [
        {"mes": "Setembro de 2026", "valor": "R$ 1.518,00", "data": "24/09/2026", "situacao": "Pago"},
        {"mes": "Outubro de 2026", "valor": "R$ 1.518,00", "data": "26/10/2026", "situacao": "Pago"},
        {"mes": "Novembro de 2026", "valor": "R$ 1.518,00", "data": "25/11/2026", "situacao": "Previsto"},
    ],
}
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

e = html.escape

# ---------- ícones (desenhos próprios, traço simples) ----------
_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{}</svg>'
ICONES = {
    "saude": _SVG.format('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M8 11h2l1-2 2 4 1-2h2"/>'),
    "inss": _SVG.format('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.5"/><path d="M7 3h10"/>'),
    "veiculos": _SVG.format('<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v2H3z"/><circle cx="7.5" cy="13" r="1"/><circle cx="16.5" cy="13" r="1"/>'),
    "agenda": _SVG.format('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h3v3H8z"/>'),
    "lista": _SVG.format('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
    "doc": _SVG.format('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
    "mais": _SVG.format('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
    "local": _SVG.format('<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
    "relogio": _SVG.format('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    "pessoa": _SVG.format('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    "ok": _SVG.format('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>'),
    "cadeado": _SVG.format('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    "seta": _SVG.format('<path d="M9 6l6 6-6 6"/>'),
}

# Logo próprio: um "C" de cidadão em volta de um ponto (pessoa no centro), sem nenhuma marca oficial.
LOGO = ('<svg class="logo" viewBox="0 0 40 40" aria-hidden="true">'
        '<rect width="40" height="40" rx="11" fill="#0F5C55"/>'
        '<path d="M27.5 13.5a10 10 0 1 0 0 13" fill="none" stroke="#F2B544" stroke-width="4" stroke-linecap="round"/>'
        '<circle cx="20" cy="20" r="3.6" fill="#fff"/></svg>')

CSS = """
:root { --verde:#0F5C55; --verde-escuro:#0A3F3A; --verde-claro:#E3F1EE; --ambar:#F2B544; --ambar-claro:#FFF4DC;
        --tinta:#17252A; --texto:#2E3D42; --suave:#5B6B70; --borda:#D9E2E0; --fundo:#F4F7F6; --branco:#fff; }
* { box-sizing:border-box; }
html { -webkit-text-size-adjust:100%; }
body { margin:0; font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; background:var(--fundo); color:var(--texto);
       font-size:19px; line-height:1.5; }
a { color:inherit; }
.faixa { position:sticky; top:0; z-index:10; background:#1F2A2E; color:var(--ambar); text-align:center; font-weight:700;
         font-size:15px; letter-spacing:.2px; padding:7px 12px; }
.topo { background:var(--verde); color:#fff; }
.topo .linha { max-width:640px; margin:0 auto; display:flex; align-items:center; gap:12px; padding:14px 18px; }
.logo { width:40px; height:40px; flex:none; }
.marca { line-height:1.15; }
.marca b { display:block; font-size:21px; letter-spacing:.2px; }
.marca small { font-size:13px; opacity:.85; }
.quem { margin-left:auto; display:flex; align-items:center; gap:8px; font-size:15px; background:rgba(255,255,255,.12);
        padding:6px 12px; border-radius:999px; }
.quem svg { width:18px; height:18px; }
main { max-width:640px; margin:0 auto; padding:14px 18px 36px; }
.trilha { font-size:15px; color:var(--suave); margin:6px 0 4px; }
.trilha a { color:var(--verde); font-weight:600; text-decoration:none; }
.trilha .sep { margin:0 6px; color:#9AA8AB; }
h1 { font-size:27px; line-height:1.25; color:var(--tinta); margin:6px 0 6px; }
.lead { color:var(--suave); margin:0 0 16px; }
h2 { font-size:19px; color:var(--tinta); margin:22px 0 10px; }
/* passos numerados */
.passos { list-style:none; display:flex; gap:6px; padding:0; margin:10px 0 18px; }
.passos li { flex:1; text-align:center; font-size:13px; color:var(--suave); }
.passos .bola { display:flex; align-items:center; justify-content:center; width:30px; height:30px; margin:0 auto 4px;
                border-radius:50%; border:2px solid var(--borda); background:#fff; font-weight:700; color:var(--suave); }
.passos .feito .bola { background:var(--verde); border-color:var(--verde); color:#fff; }
.passos .agora .bola { border-color:var(--verde); color:var(--verde); box-shadow:0 0 0 4px var(--verde-claro); }
.passos .agora { color:var(--tinta); font-weight:700; }
/* cartões de serviço */
.servicos { display:grid; gap:12px; }
.servico { display:flex; align-items:center; gap:14px; min-height:84px; padding:14px 16px; background:#fff; border:1px solid var(--borda);
           border-radius:16px; text-decoration:none; color:var(--tinta); box-shadow:0 1px 2px rgba(15,40,40,.06); }
.servico:active { background:var(--verde-claro); }
.servico .icone { flex:none; width:52px; height:52px; border-radius:14px; background:var(--verde-claro); color:var(--verde);
                  display:flex; align-items:center; justify-content:center; }
.servico .icone svg { width:30px; height:30px; }
.servico .nome { display:block; font-size:21px; font-weight:700; }
.servico .desc { display:block; font-size:15px; color:var(--suave); }
.servico .ir { margin-left:auto; flex:none; width:24px; height:24px; color:#9AA8AB; }
.servico.claro .icone { background:#F0F3F2; color:var(--suave); }
/* botões */
.botao, button { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; min-height:64px; text-align:center;
         background:var(--verde); color:#fff; font-size:21px; font-weight:700; padding:16px 20px; border-radius:14px;
         text-decoration:none; border:0; margin:14px 0; font-family:inherit; cursor:pointer; }
.botao.claro { background:#fff; color:var(--verde); border:2px solid var(--verde); }
.opcoes { display:grid; gap:10px; }
.opcoes .botao { margin:0; justify-content:flex-start; background:#fff; color:var(--tinta); border:2px solid var(--borda); font-weight:600; }
.opcoes .botao svg { width:26px; height:26px; color:var(--verde); flex:none; }
/* caixas de informação */
.caixa { background:#fff; border:1px solid var(--borda); border-radius:16px; padding:6px 16px; margin:12px 0; }
.item { display:flex; justify-content:space-between; gap:12px; padding:11px 0; border-bottom:1px solid #EDF1F0; }
.item:last-child { border-bottom:0; }
.item span { color:var(--suave); font-size:16px; }
.item b { color:var(--tinta); text-align:right; }
.destaque { background:var(--verde); color:#fff; border-radius:16px; padding:18px; margin:12px 0; }
.destaque small { display:block; opacity:.85; font-size:15px; }
.destaque .valor { display:block; font-size:38px; font-weight:800; line-height:1.15; margin:2px 0 8px; }
.destaque .quando { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,.14); padding:6px 12px;
                    border-radius:999px; font-size:16px; }
.destaque .quando svg { width:18px; height:18px; }
.selo { display:inline-block; font-size:14px; font-weight:700; padding:3px 10px; border-radius:999px; background:var(--verde-claro); color:var(--verde); }
.selo.previsto { background:var(--ambar-claro); color:#8A5A00; }
.tabela { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--borda); border-radius:16px; overflow:hidden; font-size:16px; }
.tabela th, .tabela td { text-align:left; padding:10px 12px; border-bottom:1px solid #EDF1F0; }
.tabela th { background:#F0F5F4; color:var(--suave); font-weight:600; font-size:14px; }
.tabela tr:last-child td { border-bottom:0; }
.aviso { display:flex; gap:10px; align-items:flex-start; background:var(--ambar-claro); border-radius:14px; padding:12px 14px; font-size:16px; color:#5A4200; }
.aviso svg { width:22px; height:22px; flex:none; margin-top:2px; }
.comprovante { background:#fff; border:2px dashed var(--verde); border-radius:16px; padding:18px; text-align:center; margin:12px 0; }
.comprovante .ok { width:56px; height:56px; color:var(--verde); }
.comprovante .protocolo { font-size:30px; font-weight:800; letter-spacing:1.5px; color:var(--tinta); }
.voltar { display:inline-block; margin-top:18px; font-size:17px; color:var(--verde); font-weight:600; }
.entrar { background:#fff; border:1px solid var(--borda); border-radius:18px; padding:18px; }
.entrar .perfil { display:flex; align-items:center; gap:12px; margin-bottom:4px; }
.entrar .perfil .icone { width:52px; height:52px; border-radius:50%; background:var(--verde-claro); color:var(--verde); display:flex; align-items:center; justify-content:center; }
.entrar .perfil svg { width:28px; height:28px; }
.rodape { max-width:640px; margin:0 auto; padding:0 18px 28px; font-size:14px; color:var(--suave); text-align:center; }
"""


def pagina(titulo: str, corpo: str, voltar: str | None = "/gov/inicio", trilha: list[tuple[str, str | None]] | None = None,
           logado: bool = True, passos: tuple[list[str], int] | None = None, lead: str = "") -> HTMLResponse:
    """Página do portal: faixa de simulação, cabeçalho, caminho de navegação, passos numerados e conteúdo."""
    quem = f'<span class="quem">{ICONES["pessoa"]}{e(CIDADA["nome"].split()[0])}</span>' if logado else ""
    nav = ""
    if trilha:
        partes = [f'<a href="{h}">{e(t)}</a>' if h else f"<span>{e(t)}</span>" for t, h in trilha]
        nav = '<nav class="trilha" aria-label="Você está em">' + '<span class="sep">›</span>'.join(partes) + "</nav>"
    numerados = ""
    if passos:
        nomes, atual = passos
        itens = []
        for i, n in enumerate(nomes):
            cls = "feito" if i < atual else "agora" if i == atual else ""
            itens.append(f'<li class="{cls}"><span class="bola">{"✓" if i < atual else i + 1}</span>{e(n)}</li>')
        numerados = '<ol class="passos" aria-label="Etapas">' + "".join(itens) + "</ol>"
    v = f'<a class="voltar" href="{voltar}">← Voltar</a>' if voltar else ""
    sub = f'<p class="lead">{e(lead)}</p>' if lead else ""
    return HTMLResponse(f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>{e(titulo)} · {PORTAL} (simulação)</title>
<style>{CSS}</style></head>
<body>
<div class="faixa" role="note">{FAIXA}</div>
<header class="topo"><div class="linha">{LOGO}<div class="marca"><b>{PORTAL}</b><small>Serviços públicos em um só lugar</small></div>{quem}</div></header>
<main>{nav}{numerados}<h1>{e(titulo)}</h1>{sub}{corpo}{v}</main>
<footer class="rodape">Projeto acadêmico. Nomes, números e valores são fictícios. Nenhum dado é enviado a órgão público.</footer>
</body></html>""")


def botao(texto: str, href: str, claro: bool = False) -> str:
    c = "botao claro" if claro else "botao"
    return f'<a class="{c}" href="{href}">{e(texto)}</a>'


def servico(nome: str, desc: str, href: str, icone: str, claro: bool = False) -> str:
    """Cartão de serviço: o nome é o texto do botão que o Guia procura (aparece uma vez só)."""
    c = "servico claro" if claro else "servico"
    return (f'<a class="{c}" href="{href}"><span class="icone">{ICONES[icone]}</span>'
            f'<span><span class="nome">{e(nome)}</span><span class="desc">{e(desc)}</span></span>'
            f'<span class="ir">{ICONES["seta"]}</span></a>')


def linhas(pares: list[tuple[str, str]]) -> str:
    return '<div class="caixa">' + "".join(f'<div class="item"><span>{e(a)}</span><b>{e(b)}</b></div>' for a, b in pares) + "</div>"


INICIO = ("Início", "/gov/inicio")
PASSOS_CONSULTA = ["Unidade", "Horário", "Revisão", "Comprovante"]
PASSOS_INSS = ["Entrar", "Meu INSS", "Extrato"]


@router.get("", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse)
def entrada():
    corpo = (
        '<div class="entrar">'
        f'<div class="perfil"><span class="icone">{ICONES["pessoa"]}</span>'
        f'<div><b>{e(CIDADA["nome"])}</b><br><span style="color:var(--suave);font-size:16px">Conta de teste · CPF fictício</span></div></div>'
        + botao(ENTRAR, "/gov/inicio")
        + f'<div class="aviso">{ICONES["cadeado"]}<span>Nesta simulação a conta é de teste: é só entrar. '
          "Nenhum dado de verdade é usado.</span></div>"
        "</div>"
    )
    return pagina("Acesse sua conta", corpo, voltar=None, logado=False, lead="Para usar os serviços, entre na sua conta.")


@router.get("/inicio", response_class=HTMLResponse)
def inicio():
    corpo = (
        "<h2>Serviços</h2>"
        '<div class="servicos">'
        + servico("Saúde", "Consultas no posto, vacinas e exames", "/gov/saude", "saude")
        + servico("Meu INSS", "Aposentadoria, pagamentos e benefícios", "/gov/inss", "inss")
        + servico("Veículos", "Multas, licenciamento e documentos do carro", "/gov/veiculos", "veiculos")
        + "</div>"
        + botao("Sair", "/gov", claro=True)
    )
    return pagina(f"Olá, {CIDADA['nome'].split()[0]}", corpo, voltar=None, lead="O que você quer fazer hoje?")


# ---------- Saúde ----------
@router.get("/saude", response_class=HTMLResponse)
def saude():
    corpo = (
        '<div class="servicos">'
        + servico("Agendar consulta", "Clínico geral no posto perto de você", "/gov/saude/agendar", "agenda")
        + servico("Minhas consultas", "Veja o que já está marcado", "/gov/saude/minhas", "lista", claro=True)
        + "</div>"
    )
    return pagina("Saúde", corpo, trilha=[INICIO, ("Saúde", None)], lead="Escolha o serviço.")


@router.get("/saude/agendar", response_class=HTMLResponse)
def escolher_ubs():
    corpo = '<div class="opcoes">' + "".join(
        f'<a class="botao" href="/gov/saude/agendar/{k}">{ICONES["local"]}<span>{e(n)}</span></a>' for k, n in UBS.items()
    ) + "</div>"
    return pagina("Escolha a unidade", corpo, voltar="/gov/saude",
                  trilha=[INICIO, ("Saúde", "/gov/saude"), ("Consulta", None)], passos=(PASSOS_CONSULTA, 0),
                  lead="Onde você quer ser atendida?")


@router.get("/saude/agendar/{ubs}", response_class=HTMLResponse)
def escolher_horario(ubs: str):
    if ubs not in UBS:
        return RedirectResponse("/gov/saude/agendar")
    corpo = (
        linhas([("Especialidade", "Clínico geral"), ("Unidade", UBS[ubs])])
        + "<h2>Horários livres</h2>"
        + '<div class="opcoes">' + "".join(
            f'<a class="botao" href="/gov/saude/agendar/{ubs}/{k}">{ICONES["relogio"]}<span>{e(h)}</span></a>' for k, h in HORARIOS.items()
        ) + "</div>"
    )
    return pagina("Escolha o horário", corpo, voltar="/gov/saude/agendar",
                  trilha=[INICIO, ("Saúde", "/gov/saude"), ("Consulta", None)], passos=(PASSOS_CONSULTA, 1))


@router.get("/saude/agendar/{ubs}/{hid}", response_class=HTMLResponse)
def revisar(ubs: str, hid: str):
    if ubs not in UBS or hid not in HORARIOS:
        return RedirectResponse("/gov/saude/agendar")
    corpo = (
        linhas([("Paciente", CIDADA["nome"]), ("Especialidade", "Clínico geral"), ("Unidade", UBS[ubs]),
                ("Endereço", ENDERECOS[ubs]), ("Dia e hora", HORARIOS[hid])])
        + f'<form method="post" action="/gov/saude/agendar/{ubs}/{hid}"><button type="submit">Confirmar agendamento</button></form>'
        + botao("Trocar o horário", f"/gov/saude/agendar/{ubs}", claro=True)
    )
    return pagina("Confira antes de confirmar", corpo, voltar=None,
                  trilha=[INICIO, ("Saúde", "/gov/saude"), ("Consulta", None)], passos=(PASSOS_CONSULTA, 2),
                  lead="Veja se está tudo certo.")


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
    endereco = next((ENDERECOS[k] for k, n in UBS.items() if n == ag["ubs"]), "")
    corpo = (
        f'<div class="comprovante"><span class="ok">{ICONES["ok"]}</span>'
        '<p style="margin:4px 0 2px">Pronto! Sua consulta está marcada.</p>'
        f'<small style="color:var(--suave)">Protocolo</small><div class="protocolo">{e(ag["protocolo"])}</div></div>'
        + linhas([("Unidade", ag["ubs"]), ("Endereço", endereco), ("Dia e hora", ag["horario"]),
                  ("Marcado em", datetime.fromisoformat(ag["criado"]).strftime("%d/%m/%Y às %H:%M"))])
        + f'<div class="aviso">{ICONES["doc"]}<span>Leve um documento com foto e o cartão do SUS. Chegue 15 minutos antes.</span></div>'
        + botao("Voltar ao início", "/gov/inicio")
    )
    return pagina("Consulta marcada", corpo, voltar=None, trilha=[INICIO, ("Saúde", "/gov/saude"), ("Comprovante", None)],
                  passos=(PASSOS_CONSULTA, 3))


@router.get("/saude/minhas", response_class=HTMLResponse)
def minhas():
    if not AGENDAMENTOS:
        corpo = "<p>Você ainda não tem consultas marcadas.</p>"
    else:
        corpo = "".join(linhas([("Unidade", a["ubs"]), ("Dia e hora", a["horario"]), ("Protocolo", a["protocolo"])])
                        for a in AGENDAMENTOS.values())
    return pagina("Minhas consultas", corpo, voltar="/gov/saude", trilha=[INICIO, ("Saúde", "/gov/saude"), ("Minhas consultas", None)])


# ---------- INSS ----------
@router.get("/inss", response_class=HTMLResponse)
def inss():
    b = BENEFICIO
    corpo = (
        linhas([("Benefício", b["tipo"]), ("Número", f'{b["numero"]} (fictício)'), ("Situação", "Ativo")])
        + "<h2>O que você quer ver?</h2>"
        + '<div class="servicos">'
        + servico("Extrato de pagamento", "Quanto você recebe e quando cai", "/gov/inss/extrato", "doc")
        + servico("Pedir benefício", "Começar um pedido novo", "/gov/inss", "mais", claro=True)
        + "</div>"
    )
    return pagina("Meu INSS", corpo, trilha=[INICIO, ("Meu INSS", None)], passos=(PASSOS_INSS, 1))


@router.get("/inss/extrato", response_class=HTMLResponse)
def extrato():
    b = BENEFICIO
    corpo = (
        f'<div class="destaque"><small>Valor a receber · {e(b["competencia"])}</small>'
        f'<span class="valor">{e(b["valor"])}</span>'
        f'<span class="quando">{ICONES["agenda"]}Próximo pagamento: {e(b["data"])}, {e(b["dia_semana"])}</span></div>'
        + linhas([("Benefício", b["tipo"]), ("Valor bruto", b["bruto"]), ("Descontos", b["descontos"]),
                  ("Valor líquido", b["valor"]), ("Onde recebe", b["banco"])])
        + "<h2>Últimos meses</h2>"
        + '<table class="tabela"><thead><tr><th>Mês</th><th>Valor</th><th>Data</th></tr></thead><tbody>'
        + "".join(
            f'<tr><td>{e(h["mes"])}<br><span class="selo{" previsto" if h["situacao"] == "Previsto" else ""}">{e(h["situacao"])}</span></td>'
            f'<td>{e(h["valor"])}</td><td>{e(h["data"])}</td></tr>' for h in b["historico"])
        + "</tbody></table>"
        + f'<div class="aviso" style="margin-top:14px">{ICONES["cadeado"]}<span>Valores fictícios da simulação. '
          "Na dúvida sobre o seu benefício, fale com alguém de confiança.</span></div>"
    )
    return pagina("Extrato de pagamento", corpo, voltar="/gov/inss", trilha=[INICIO, ("Meu INSS", "/gov/inss"), ("Extrato", None)],
                  passos=(PASSOS_INSS, 2))


# ---------- Veículos ----------
@router.get("/veiculos", response_class=HTMLResponse)
def veiculos():
    corpo = (
        '<div class="servicos">'
        + servico("Consultar multas", "Infrações registradas na placa", "/gov/veiculos/multas", "lista")
        + servico("Licenciamento", "Documento anual do veículo", "/gov/veiculos", "doc", claro=True)
        + "</div>"
    )
    return pagina("Veículos", corpo, trilha=[INICIO, ("Veículos", None)], lead="Placa cadastrada: ABC1D23 (fictícia).")


@router.get("/veiculos/multas", response_class=HTMLResponse)
def multas():
    corpo = "".join(
        linhas([("Placa", m["placa"]), ("Infração", m["descricao"]), ("Valor", m["valor"]), ("Vence em", m["vencimento"])])
        for m in MULTAS
    ) + f'<div class="aviso">{ICONES["cadeado"]}<span>Valores fictícios da simulação. Na dúvida sobre uma multa, confira com alguém de confiança.</span></div>'
    return pagina("Suas multas", corpo, voltar="/gov/veiculos", trilha=[INICIO, ("Veículos", "/gov/veiculos"), ("Multas", None)])


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
