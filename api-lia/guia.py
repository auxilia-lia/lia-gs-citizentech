"""Guia genérico (#7), versão 2. Recebe o contexto da tela de QUALQUER app (já pseudonimizado no celular)
e decide o próximo passo: tocar num botão ou fazer um gesto (deslizar do topo, rolar, voltar, ir ao início).
Quem toca é sempre a pessoa: a Lia só mostra e fala."""
import re

from antigolpe import normalizar
from gov_simulado import FLUXOS

TIPOS = {"tocar", "painel", "rolar_baixo", "rolar_cima", "voltar", "inicio", "esperar"}
GESTOS = {"painel", "rolar_baixo", "rolar_cima", "voltar", "inicio"}

# Passos que a Lia nunca escolhe sozinha: a decisão final é da pessoa.
FINAIS = re.compile(r"\b(pagar|pagamento|transferir|pix|comprar|excluir|apagar)\b")

# O que fica no painel rápido (deslizar de cima para baixo).
PAINEL = {
    "wi fi": ("wi fi", "wifi", "wi-fi", "internet sem fio"),
    "bluetooth": ("bluetooth",),
    "lanterna": ("lanterna",),
    "modo avião": ("aviao", "modo aviao"),
    "dados móveis": ("dados moveis", "internet do chip", "dados"),
    "localização": ("localizacao", "gps"),
    "não perturbe": ("nao perturbe",),
    "rotação": ("rotacao", "girar a tela"),
}

FALAS_GESTO = {
    "painel": "Coloque o dedo no alto da tela, do lado direito, e deslize para baixo.",
    "rolar_baixo": "Arraste o dedo de baixo para cima, devagar, para ver mais coisas.",
    "rolar_cima": "Arraste o dedo de cima para baixo, devagar, para voltar ao começo.",
    "voltar": "Vamos voltar uma tela. Deslize o dedo da beirada esquerda para o meio, ou toque na seta de voltar.",
    "inicio": "Vamos para a tela inicial. Deslize o dedo de baixo, da beirada, para cima.",
}

PROMPT_GUIA = """Você é o Guia da Lia, que ensina pessoas idosas ou com pouca leitura a usar o celular (Android, Samsung).
Tom: calmo, respeitoso e direto, como alguém de confiança. Trate por "você". NUNCA use apelidos ("meu bem", "querida",
"vovó") nem diminutivos ("rapidinho", "botãozinho", "cliquezinho").

Dicas do Android que você conhece:
- Play Store (loja de apps): na busca "Pesquisar apps e jogos" a pessoa pode tocar no microfone e falar o nome do app.
  Na página do app: "Instalar" = ainda não tem; "Abrir" ou "Desinstalar" = JÁ ESTÁ instalado (objetivo de instalar
  já cumprido: diga que já está instalado e concluido=true); "Atualizar" = instalado, mas desatualizado.
- WhatsApp: o clipe (Anexar) manda foto e documento; a câmera tira foto na hora; segurar o microfone grava áudio.
- Configurações: a lupa no alto pesquisa qualquer opção (ex.: "fonte", "brilho").
- Se a pessoa precisa escrever, peça para tocar no campo e usar o microfone do teclado para falar.
A pessoa quer: "{objetivo}".

Celular Samsung: puxar do alto pelo meio ou pela esquerda abre as NOTIFICAÇÕES; puxar do alto pelo lado DIREITO abre o
painel rápido (Wi-Fi, Bluetooth, lanterna). Se ela está no painel e os botões rápidos não aparecem, ela abriu as notificações:
explique com calma e peça para fechar e puxar de novo pelo lado direito.

Agora ela está em: {onde} (app "{app}").
Botões que dá para tocar (número: texto):
{elementos}
Outros textos na tela: {textos}
Dá para rolar a tela: {rolavel}.
O que aconteceu: {motivo}{seguiu}
Passos que ela já fez, em ordem: {feitos}.

Escolha UM próximo passo:
- "tocar": tocar num dos botões da lista (diga o número em "indice").
- "painel": deslizar do alto da tela para baixo (abre o painel rápido com Wi-Fi, Bluetooth, lanterna, modo avião).
  Se o painel já está aberto e o que ela precisa não aparece, mande "painel" de novo para abrir ele inteiro.
- "rolar_baixo" ou "rolar_cima": quando o caminho certo provavelmente está fora da parte visível.
- "voltar": quando ela entrou no lugar errado.
- "inicio": quando precisa sair do app e ir para a tela inicial.
- "esperar": quando ela precisa fazer algo que não é toque nem gesto (ex.: digitar); explique na fala.
Se o objetivo já foi alcançado (ex.: o Wi-Fi aparece desligado e ela queria desligar), responda concluido=true.
Nunca escolha pagar, transferir, Pix, comprar ou apagar: explique e deixe a decisão com ela (tipo "esperar").
"fala": no máximo 2 frases curtas, simples, carinhosas, em português do Brasil, sem jargão, tratando por "você".
Quem errou: se ela FEZ o que você pediu e a tela não é a esperada, o erro foi SEU. Assuma com leveza
("Me enganei, esse não era o caminho. Vamos voltar.") e NUNCA diga que ela tocou errado.
Só diga que ela tocou em outro lugar quando "O que aconteceu" disser isso, e mesmo assim sem culpa ("sem problema").
Responda SOMENTE com JSON: {{"tipo": "...", "indice": número ou null, "fala": "...", "concluido": true ou false}}"""

ONDE = {"inicio": "a tela inicial do celular", "painel": "o painel rápido (aberto do alto da tela)", "app": "dentro de um app"}
MOTIVOS = {"mudou": "a tela mudou depois do último passo", "errou": "ela tocou no lugar errado: \"{errou}\"",
           "parado": "ela está parada há um tempo sem conseguir; tente outro caminho ou explique de outro jeito",
           "inicio": "o guia acabou de começar"}


def palavras(t: str) -> set[str]:
    return {p for p in normalizar(t).replace("-", " ").split() if len(p) > 2}


def resposta(tipo: str, fala: str, alvo: str | None = None, concluido: bool = False) -> dict:
    return {"tipo": tipo, "alvo": alvo, "fala": fala, "concluido": concluido}


def item_do_painel(objetivo: str) -> str | None:
    obj = normalizar(objetivo).replace("-", " ")
    for nome, chaves in PAINEL.items():
        if any(k in obj for k in chaves):
            return nome
    return None


def achar(elementos: list[str], nome: str) -> str | None:
    alvo = palavras(nome) or {normalizar(nome)}
    for e in elementos:
        if alvo <= palavras(e) or normalizar(nome) == normalizar(e).replace("-", " "):
            return e
    return None


def proximo_teste(objetivo: str, elementos: list[str], feitos: list[str], tela: str = "app",
                  rolavel: bool = False, motivo: str = "mudou", errou: str | None = None, seguiu: str | None = None) -> dict:
    """Modo regras (sem IA): fluxos do gov.br, itens do painel rápido e sobreposição de palavras."""
    obj = normalizar(objetivo)
    feitos_n = {normalizar(f) for f in feitos}
    if motivo == "errou" and not seguiu:
        return resposta("voltar", f"Você entrou em outro lugar, sem problema. {FALAS_GESTO['voltar']}")

    chaves = {"consulta": ("consulta", "medico", "posto"), "beneficio": ("inss", "beneficio", "aposentadoria"), "multas": ("multa",)}
    for servico, ks in chaves.items():
        if any(k in obj for k in ks):
            pendentes = [p for p in FLUXOS[servico]["passos"] if normalizar(p) not in feitos_n]
            if not pendentes:
                return resposta("esperar", "Pronto! Você conseguiu.", concluido=True)
            for p in pendentes:
                e = achar(elementos, p)
                if e:
                    return resposta("tocar", f"Toque em {p}.", e)
            if rolavel:
                return resposta("rolar_baixo", FALAS_GESTO["rolar_baixo"])
            return resposta("esperar", "Não estou vendo o próximo passo. Espere a página carregar.")

    item = item_do_painel(objetivo)
    if item:
        e = achar(elementos, item)
        if e and normalizar(e) in feitos_n:
            return resposta("esperar", f"Pronto! Você tocou em {item}.", concluido=True)
        if e:
            return resposta("tocar", f"Toque em {e} para ligar ou desligar.", e)
        if tela == "painel":
            return resposta("painel", "Isso abriu as notificações, sem problema. Puxe de novo do alto, mas pelo lado direito da tela.")
        return resposta("painel", FALAS_GESTO["painel"])

    if len(feitos) >= 10:
        return resposta("esperar", "Já demos vários passos. Conseguiu? Se não, me fala de novo o que você quer.", concluido=True)
    alvo_p = palavras(objetivo)
    melhor, pontos = None, 0
    for e in elementos:
        if normalizar(e) in feitos_n:
            continue
        p = len(alvo_p & palavras(e))
        if p > pontos:
            melhor, pontos = e, p
    if melhor:
        return resposta("tocar", f"Toque em {melhor}.", melhor)
    if rolavel and motivo != "parado":
        return resposta("rolar_baixo", FALAS_GESTO["rolar_baixo"])
    return resposta("esperar", "Ainda não sei o caminho por aqui. Me fala de novo o que você quer, com outras palavras.")


def montar_prompt(objetivo: str, app: str, elementos: list[str], feitos: list[str], tela: str = "app",
                  textos: list[str] | None = None, rolavel: bool = False, motivo: str = "mudou", errou: str | None = None,
                  seguiu: str | None = None) -> str:
    lista = "\n".join(f"{i}: {e}" for i, e in enumerate(elementos)) or "(nenhum)"
    return PROMPT_GUIA.format(
        objetivo=objetivo, onde=ONDE.get(tela, ONDE["app"]), app=app, elementos=lista,
        textos=" | ".join(textos or []) or "(nenhum)", rolavel="sim" if rolavel else "não",
        motivo=MOTIVOS.get(motivo, MOTIVOS["mudou"]).format(errou=errou or ""), feitos=", ".join(feitos) or "nada ainda",
        seguiu=f'. Ela fez exatamente o que você pediu: "{seguiu}".' if seguiu else "",
    )


def interpretar(r: dict, elementos: list[str]) -> dict:
    """Valida a resposta da IA: tipo conhecido, alvo existente na tela e nunca uma ação final."""
    fala = str(r.get("fala") or "").strip()
    tipo = str(r.get("tipo") or "").strip()
    if r.get("concluido"):
        return resposta("esperar", fala or "Pronto! Você conseguiu.", concluido=True)
    if tipo == "tocar" or (not tipo and isinstance(r.get("indice"), int)):
        i = r.get("indice")
        if isinstance(i, int) and 0 <= i < len(elementos):
            alvo = elementos[i]
            if FINAIS.search(normalizar(alvo)):
                return resposta("esperar", f"O próximo passo é {alvo}. Essa decisão é sua: se tiver certeza, toque você.")
            return resposta("tocar", fala or f"Toque em {alvo}.", alvo)
        return resposta("esperar", fala or "Vamos com calma. Me fala de novo o que você quer.")
    if tipo in GESTOS:
        return resposta(tipo, fala or FALAS_GESTO[tipo])
    return resposta("esperar", fala or "Vamos com calma. Me fala de novo o que você quer.")


INSTALADO = ("abrir", "desinstalar")
PEDE_INSTALAR = ("instalar", "baixar", "instala", "baixa")


def regra_certeira(objetivo: str, elementos: list[str], feitos: list[str], tela: str) -> dict | None:
    """Casos óbvios resolvidos na hora, sem esperar a IA (o Guia fica bem mais rápido)."""
    obj = normalizar(objetivo)
    feitos_n = {normalizar(f) for f in feitos}
    nomes = {normalizar(e): e for e in elementos}
    # Play Store: o app já está instalado
    if any(p in obj for p in PEDE_INSTALAR) and all(any(n == i or n.startswith(i + " ") for n in nomes) for i in INSTALADO):
        return resposta("esperar", "Esse app já está instalado no seu celular! Para usar, é só tocar em Abrir.", concluido=True)
    if any(p in obj for p in PEDE_INSTALAR) and "instalar" in nomes and "instalar" not in feitos_n:
        return resposta("tocar", "Toque em Instalar e espere baixar.", nomes["instalar"])
    # Painel rápido: o item já está na tela
    item = item_do_painel(objetivo)
    if item:
        e = achar(elementos, item)
        if e and normalizar(e) in feitos_n:
            return resposta("esperar", f"Pronto! Você mexeu no {item}.", concluido=True)
        if e:
            return resposta("tocar", f"Toque em {e}.", e)
        if tela in ("inicio", "app"):
            return resposta("painel", FALAS_GESTO["painel"])
    return None
