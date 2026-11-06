"""Modo teste (LIA_PROVEDOR=teste): respostas por regras, sem IA.
Serve para testar o app e ensaiar a demo sem chave de API."""
import re

from antigolpe import fala_golpe
from antigolpe import normalizar as norm

PARENTESCOS = r"(filha|filho|neta|neto|irma|irmao|sobrinha|sobrinho|esposa|marido|nora|genro|mae|pai|[a-z]+)"


def responder(mensagens: list[dict], canal: str, contexto: dict, analise: dict) -> dict:
    t = norm(mensagens[-1]["texto"])
    nivel = (contexto.get("autonomia") or {})

    if any(p in t for p in ("senha", "codigo que chegou", "cartao de credito")):
        return {"fala": "Não precisa me falar senha nem código, tá? Ninguém de confiança pede isso. Do que você precisa?", "acao": None}

    if analise.get("golpe"):
        return {"fala": fala_golpe(analise), "acao": None}

    m = re.search(r"(?:avisa|avise|manda|mande|fala|diz|conta)\w*\s+(?:uma\s+)?(?:mensagem\s+)?(?:(?:pr[ao]|para|pra)\s+)?(?:o |a )?(?:minha |meu )?" + PARENTESCOS + r"\b(?:\s+que)?\s*(.*)", t)
    if m:
        contato, msg = m.group(1), m.group(2).strip()
        if not msg:
            return {"fala": f"Claro. O que você quer dizer para {contato}?", "acao": None}
        return {"fala": f"Tá bom, vou preparar a mensagem para {contato}.",
                "acao": {"tipo": "avisar_familiar", "contato": contato, "mensagem": msg[0].upper() + msg[1:]}}

    if canal == "ligacao":
        if any(p in t for p in ("consulta", "medico", "posto")):
            if "terca" in t or "pode" in t or "sim" in t:
                return {"fala": "Combinado, estou marcando agora.",
                        "acao": {"tipo": "agendar_por_voz", "ubs": "UBS Centro", "horario": "Terça, 10/11 às 9h"}}
            return {"fala": "Posso marcar para você. Tem horário na UBS Centro na terça, dia 10, às 9 horas. Pode ser?", "acao": None}
        if t in ("sim", "pode", "pode sim", "pode ser") or t.startswith("pode"):
            return {"fala": "Combinado, estou marcando agora.",
                    "acao": {"tipo": "agendar_por_voz", "ubs": "UBS Centro", "horario": "Terça, 10/11 às 9h"}}
        if any(p in t for p in ("inss", "aposentadoria", "beneficio", "dinheiro")):
            return {"fala": "Vou ver para você.", "acao": {"tipo": "consultar_beneficio"}}
        return {"fala": "Estou te ouvindo. Posso marcar consulta, ver o dinheiro do INSS ou avisar alguém da família.", "acao": None}

    if any(p in t for p in ("instalar", "baixar", "instala ", "baixa ")):
        return {"fala": "Vamos juntos na loja de apps. Vou abrir e te mostrar cada passo.",
                "acao": {"tipo": "guiar_app", "app": "playstore", "objetivo": mensagens[-1]["texto"]}}
    if "whatsapp" in t and any(p in t for p in ("como", "ensina", "foto", "audio", "video", "figurinha")):
        return {"fala": "Vamos juntos no WhatsApp. Vou abrir e te mostrar onde tocar.",
                "acao": {"tipo": "guiar_app", "app": "whatsapp", "objetivo": mensagens[-1]["texto"]}}
    if any(p in t for p in ("wifi", "wi fi", "bluetooth", "lanterna", "modo aviao", "dados moveis")):
        return {"fala": "Vamos juntos. Vou para a tela inicial e te mostro cada passo.",
                "acao": {"tipo": "guiar_app", "app": "celular", "objetivo": mensagens[-1]["texto"]}}
    if any(p in t for p in ("letra maior", "aumentar a letra", "fonte maior", "brilho")):
        return {"fala": "Vamos juntos nas configurações. Vou abrir e te mostrar onde tocar.",
                "acao": {"tipo": "guiar_app", "app": "configuracoes", "objetivo": mensagens[-1]["texto"]}}

    for servico, palavras, fala0 in (
        ("consulta", ("consulta", "medico", "posto", "agendar"), "Vamos marcar sua consulta juntos. Vou abrir o site e te mostrar onde tocar."),
        ("beneficio", ("inss", "aposentadoria", "beneficio", "dinheiro que recebo"), "Vamos ver o dinheiro que você recebe. Vou abrir o site e te mostrar o caminho."),
        ("multas", ("multa",), "Vamos ver se tem multa. Vou abrir o site e te mostrar onde tocar."),
    ):
        if any(p in t for p in palavras):
            n = int(nivel.get(servico, 0))
            fala = {0: fala0, 1: "Você já fez isso antes. Vai fazendo, que eu só confirmo.",
                    2: "Você já sabe fazer isso sozinha! Vou abrir o site, e estou aqui se travar."}[min(n, 2)]
            return {"fala": fala, "acao": {"tipo": "guiar", "servico": servico}}

    if any(p in t for p in ("papel", "carta", "boleto", "conta de", "exame", "ler", "le pra mim", "explica")):
        return {"fala": "Claro! Aponte a câmera para o papel e tire a foto.", "acao": {"tipo": "tirar_foto"}}

    return {"fala": "Modo teste: posso marcar consulta, ver o INSS, ver multas, explicar um papel ou avisar alguém da família. O que você quer?",
            "acao": None}


def entender_foto() -> dict:
    return {"fala": "Modo teste: recebi a foto. Com a chave da IA configurada, eu leio o papel e te explico com calma.",
            "golpe": False, "motivo": ""}
