"""Antigolpe: avalia se uma mensagem ou link parece golpe.
Duas partes: (1) domínio parecido com um oficial, pela distância de Levenshtein
(programação dinâmica), e (2) sinais típicos de golpe no texto.
"""
import re
import unicodedata

OFICIAIS = [
    "gov.br", "inss.gov.br", "caixa.gov.br", "receita.fazenda.gov.br", "correios.com.br",
    "bb.com.br", "itau.com.br", "bradesco.com.br", "santander.com.br", "nubank.com.br",
    "caixa.com.br", "whatsapp.com", "mercadolivre.com.br", "detran.sp.gov.br",
]

SINAIS = {
    "pressa": ["urgente", "ultimas horas", "hoje ainda", "imediatamente", "prazo final", "agora mesmo"],
    "ameaca": ["bloquead", "suspens", "cancelad", "cortad", "sera encerrad", "pendencia"],
    "premio": ["premio", "ganhou", "sorteado", "resgate", "brinde", "dinheiro esquecido"],
    "pagamento": ["pix", "boleto", "taxa", "pagar agora", "transferencia"],
    "dados": ["senha", "codigo", "token", "cvv", "atualize seus dados", "confirme seus dados", "clique no link"],
}

URL = re.compile(r"(?:https?://)?(?:www\.)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:/\S*)?", re.I)
TROCAS = str.maketrans({"0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a"})


def levenshtein(a: str, b: str) -> int:
    """Menor número de inserções, remoções e trocas para transformar a em b. O(len(a)·len(b))."""
    anterior = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        atual = [i]
        for j, cb in enumerate(b, 1):
            atual.append(min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (ca != cb)))
        anterior = atual
    return anterior[-1]


def normalizar(texto: str) -> str:
    t = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def eh_oficial(dominio: str) -> bool:
    return any(dominio == o or dominio.endswith("." + o) for o in OFICIAIS)


def avaliar_dominio(dominio: str) -> str | None:
    """Devolve o motivo se o domínio imita um oficial; None se parece ok ou desconhecido."""
    d = dominio.lower().removeprefix("www.")
    if eh_oficial(d):
        return None
    trocado = d.translate(TROCAS)
    for o in OFICIAIS:
        if trocado == o or trocado.endswith("." + o):
            return f"o endereço {d} troca letras por números para imitar {o}"
        dist = levenshtein(d.replace("-", "."), o)
        if dist <= 3:
            return f"o endereço {d} é quase igual a {o}, mas não é o site oficial"
    base = d.split(".")[0]
    if any(p in base for p in ("gov", "inss", "caixa", "receita", "beneficio")):
        return f"o endereço {d} usa um nome de órgão público, mas não termina em .gov.br"
    return None


def analisar(texto: str) -> dict:
    t = normalizar(texto)
    motivos: list[str] = []
    dominios = sorted({m.group(1).lower() for m in URL.finditer(texto)})
    for d in dominios:
        m = avaliar_dominio(d)
        if m:
            motivos.append(m)
    sinais = [nome for nome, palavras in SINAIS.items() if any(p in t for p in palavras)]
    pontos = 3 * len(motivos) + len(sinais) + (1 if dominios and not all(eh_oficial(d) for d in dominios) else 0)
    nivel = "alto" if pontos >= 3 else "medio" if pontos >= 2 else "baixo"
    explicacao = {
        "pressa": "pede pressa",
        "ameaca": "ameaça bloquear ou cortar algo",
        "premio": "promete prêmio ou dinheiro",
        "pagamento": "pede pagamento ou Pix",
        "dados": "pede senha, código ou dados",
    }
    motivos += [f"a mensagem {explicacao[s]}" for s in sinais]
    return {"golpe": nivel != "baixo", "nivel": nivel, "motivos": motivos, "dominios": dominios}


def fala_golpe(a: dict) -> str:
    if a["nivel"] == "alto":
        return ("Cuidado, isso parece golpe: " + "; ".join(a["motivos"][:2]) +
                ". Não clique, não pague e não passe nenhum código.")
    if a["nivel"] == "medio":
        return "Fique atenta: " + "; ".join(a["motivos"][:2]) + ". Antes de fazer qualquer coisa, confirme com alguém de confiança."
    return "Não vi sinais de golpe nessa mensagem. Mesmo assim, nunca passe senha nem código."
