"""Guia genérico (#7): recebe o que está na tela de QUALQUER app (só os textos dos
elementos tocáveis, já pseudonimizados no celular) e decide qual é o próximo toque.
Quem toca é sempre a pessoa: a Lia só aponta e fala."""
import re

from antigolpe import normalizar
from gov_simulado import FLUXOS

# Passos que a Lia nunca escolhe sozinha: a decisão final é da pessoa.
FINAIS = re.compile(r"\b(pagar|pagamento|transferir|pix|comprar|excluir|apagar)\b")

PROMPT_GUIA = """Você é o Guia da Lia, que ajuda pessoas idosas ou com pouca leitura a usar o celular.
A pessoa quer: "{objetivo}".
Ela está no app "{app}". Estes são os elementos que dá para tocar na tela agora (número: texto):
{elementos}
Ela já tocou, nesta ordem: {feitos}.

Escolha UM elemento para ela tocar, o que mais aproxima do objetivo.
- Se o objetivo já foi alcançado, responda concluido=true.
- Se o caminho não está na tela, peça para rolar (indice=null).
- Nunca escolha pagar, transferir, Pix, comprar ou apagar: nesses casos explique e deixe a pessoa decidir (indice=null).
- "fala" tem no máximo 2 frases curtas, simples, em português do Brasil, sem jargão.
Responda SOMENTE com JSON: {{"indice": número ou null, "fala": "...", "concluido": true ou false}}"""


def palavras(t: str) -> set[str]:
    return {p for p in normalizar(t).replace("-", " ").split() if len(p) > 2}


def proximo_teste(objetivo: str, elementos: list[str], feitos: list[str]) -> dict:
    """Modo teste: sem IA. Usa os fluxos conhecidos do gov.br; fora deles, sobreposição de palavras."""
    obj = normalizar(objetivo)
    tela = {normalizar(e): e for e in elementos}
    feitos_n = {normalizar(f) for f in feitos}
    chaves = {"consulta": ("consulta", "medico", "posto"), "beneficio": ("inss", "beneficio", "aposentadoria"), "multas": ("multa",)}
    for servico, ks in chaves.items():
        if any(k in obj for k in ks):
            passos = FLUXOS[servico]["passos"]
            pendentes = [p for p in passos if normalizar(p) not in feitos_n]
            if not pendentes:
                return {"alvo": None, "fala": "Pronto! Você conseguiu.", "concluido": True}
            for p in pendentes:
                if normalizar(p) in tela:
                    return {"alvo": tela[normalizar(p)], "fala": f"Toque em {p}.", "concluido": False}
            return {"alvo": None, "fala": "Não estou vendo o próximo passo. Role a tela devagar.", "concluido": False}

    if len(feitos) >= 8:
        return {"alvo": None, "fala": "Já demos vários passos. Conseguiu? Se não, me fala de novo o que você quer.", "concluido": True}
    alvo_p = palavras(objetivo)
    melhor, pontos = None, 0
    for e in elementos:
        if normalizar(e) in feitos_n:
            continue
        p = len(alvo_p & palavras(e))
        if p > pontos:
            melhor, pontos = e, p
    if melhor:
        return {"alvo": melhor, "fala": f"Toque em {melhor}.", "concluido": False}
    return {"alvo": None, "fala": "Modo teste: não sei o caminho nesse app. Com a IA ligada, eu descubro pela tela.", "concluido": False}


def montar_prompt(objetivo: str, app: str, elementos: list[str], feitos: list[str]) -> str:
    lista = "\n".join(f"{i}: {e}" for i, e in enumerate(elementos))
    return PROMPT_GUIA.format(objetivo=objetivo, app=app, elementos=lista, feitos=", ".join(feitos) or "nada ainda")


def interpretar(r: dict, elementos: list[str]) -> dict:
    """Valida a resposta da IA: o alvo tem que existir na tela e não pode ser ação final."""
    fala = str(r.get("fala") or "").strip() or "Vamos com calma. Me fala de novo o que você quer."
    if r.get("concluido"):
        return {"alvo": None, "fala": fala, "concluido": True}
    i = r.get("indice")
    if isinstance(i, int) and 0 <= i < len(elementos):
        alvo = elementos[i]
        if FINAIS.search(normalizar(alvo)):
            return {"alvo": None, "fala": f"O próximo passo é {alvo}. Essa decisão é sua: se tiver certeza, toque você.", "concluido": False}
        return {"alvo": alvo, "fala": fala, "concluido": False}
    return {"alvo": None, "fala": fala, "concluido": False}
