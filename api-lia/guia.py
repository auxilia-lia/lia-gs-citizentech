"""Guia genérico (#7), versão 2. Recebe o contexto da tela de QUALQUER app (já pseudonimizado no celular)
e decide o próximo passo: tocar num botão ou fazer um gesto (deslizar do topo, rolar, voltar, ir ao início).
Quem toca é sempre a pessoa: a Lia só mostra e fala."""
import re

from antigolpe import normalizar
from gov_simulado import FLUXOS

TIPOS = {"tocar", "painel", "rolar_baixo", "rolar_cima", "voltar", "inicio", "esperar"}
GESTOS = {"painel", "rolar_baixo", "rolar_cima", "voltar", "inicio"}

# Passos que a Lia nunca escolhe sozinha: a decisão final é da pessoa.
# ("Extrato de pagamento" só mostra; "Pagar", "Pix", "Confirmar pagamento" decidem.)
FINAIS = re.compile(r"\b(pagar|transferir|pix|comprar|excluir|apagar)\b|^(confirmar |efetuar |realizar )?pagamento\b")

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
- Play Store (loja de apps): NUNCA mande tocar em "Instalar" na tela inicial da loja (são outros apps, anúncios).
  Primeiro vá em "Pesquisa"/"Pesquisar apps e jogos"; a pessoa pode tocar no microfone e falar o nome do app.
  Só toque em "Instalar" na página do app que ela pediu (o nome dele aparece no alto).
  Na página do app: "Instalar" = ainda não tem; "Abrir" ou "Desinstalar" = JÁ ESTÁ instalado (objetivo de instalar
  já cumprido: diga que já está instalado e concluido=true); "Atualizar" = instalado, mas desatualizado.
- WhatsApp: o clipe (Anexar) manda foto e documento; a câmera tira foto na hora; segurar o microfone grava áudio.
- Configurações: a lupa no alto pesquisa qualquer opção (ex.: "fonte", "brilho").
- Se a pessoa precisa escrever, peça para tocar no campo e usar o microfone do teclado para falar.
A pessoa quer: "{objetivo}".

Como ler a lista de botões: "nome [estado] — o que está ao redor" (o contexto diz de qual item o botão é).
"[anúncio]" = propaganda: NUNCA escolha um botão de anúncio.
"[ligado]"/"[desligado]" = estado atual do interruptor; "[selecionado]" = opção já escolhida; "[indisponível]" = não dá
para tocar agora. Se ela quer ligar algo que já está [ligado] (ou desligar algo [desligado]), o objetivo já está
cumprido: concluido=true e diga que já estava assim.

Celular Samsung: puxar do alto pelo meio ou pela esquerda abre as NOTIFICAÇÕES; puxar do alto pelo lado DIREITO abre o
painel rápido (Wi-Fi, Bluetooth, lanterna). Se ela está no painel e os botões rápidos não aparecem, ela abriu as notificações:
explique com calma e peça para fechar e puxar de novo pelo lado direito.

Agora ela está em: {onde} (app "{app}").
Botões que dá para tocar (número: texto):
{elementos}
Outros textos na tela: {textos}
Dá para rolar a tela: {rolavel}.
Botões cortados, que só aparecem rolando (NÃO estão na lista acima): {escondidos}
Se o caminho certo está entre os cortados, mande "rolar_baixo" (se está mais abaixo) ou "rolar_cima" (mais acima).
O que aconteceu: {motivo}{seguiu}
Passos que ela já fez, em ordem: {feitos}.

Antes de tudo, veja se o objetivo JÁ foi cumprido nesta tela; se foi, concluido=true.
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
Botões que confirmam algo (Instalar, Enviar, Confirmar, Assinar, Aceitar) só quando a tela é DAQUILO que ela pediu
(o nome aparece no contexto do botão ou no alto da tela). Se não for, vá primeiro pela pesquisa/lupa.
REGRA DE OURO: escolha SOMENTE um número da lista acima. Só existe o que está na lista: nunca fale de botões que não estão
nela, nem do passo seguinte (ele aparece só depois deste toque).
"fala": para "tocar" e gestos, no máximo 1 frase curta dizendo o PORQUÊ, sem mandar tocar (a instrução "Toque em ..." eu
mesmo acrescento) ou "" se não precisar. Para "esperar", até 2 frases curtas dizendo o que fazer. Português do Brasil,
simples, calmo, sem jargão, tratando por "você".
Quem errou: se ela FEZ o que você pediu e a tela não é a esperada, o erro foi SEU. Assuma com leveza
("Me enganei, esse não era o caminho. Vamos voltar.") e NUNCA diga que ela tocou errado.
Só diga que ela tocou em outro lugar quando "O que aconteceu" disser isso, e mesmo assim sem culpa ("sem problema").
Responda SOMENTE com JSON: {{"tipo": "...", "indice": número ou null, "fala": "...", "concluido": true ou false}}"""

ONDE = {"inicio": "a tela inicial do celular", "painel": "o painel rápido (aberto do alto da tela)", "app": "dentro de um app"}
MOTIVOS = {"mudou": "a tela mudou depois do último passo", "errou": "ela tocou no lugar errado: \"{errou}\"",
           "parado": "ela está parada há um tempo sem conseguir; tente outro caminho ou explique de outro jeito",
           "inicio": "o guia acabou de começar"}


def palavras(t: str) -> set[str]:
    return {p for p in re.findall(r"[a-z0-9]+", normalizar(t)) if len(p) > 2}


def resposta(tipo: str, fala: str, alvo: str | None = None, concluido: bool = False, indice: int = -1) -> dict:
    return {"tipo": tipo, "alvo": alvo, "indice": indice, "fala": fala, "concluido": concluido}


ANUNCIO = "[anúncio]"


def curto(elemento: str) -> str:
    """'Instalar — Pier: Seguro Auto [anúncio]' -> 'Instalar' (o nome que a pessoa vê no botão)."""
    return re.sub(r"\s*\[[^\]]*\]", "", elemento.split(" — ")[0]).strip()


def estado(elemento: str) -> str | None:
    """'Bluetooth [ligado] — ...' -> 'ligado'."""
    m = re.search(r"\[(ligado|desligado|selecionado|indisponível)\]", elemento.split(" — ")[0])
    return m.group(1) if m else None


def quer_estado(objetivo: str) -> str | None:
    """'desligar o wifi' -> 'desligado'; 'ligar a lanterna' -> 'ligado'."""
    o = normalizar(objetivo)
    if re.search(r"\b(desligar|desliga|desligue|desativar|desativa|desative|apagar a|apaga a|tirar o|tirar a)\b", o):
        return "desligado"
    if re.search(r"\b(ligar|liga|ligue|ativar|ativa|ative|acender|acende|acenda)\b", o):
        return "ligado"
    return None


def ja_esta(objetivo: str, elemento: str) -> dict | None:
    """Ela quer ligar/desligar este botão e ele já está assim: objetivo cumprido."""
    q, e = quer_estado(objetivo), estado(elemento)
    nome = curto(elemento)
    junto = lambda t: re.sub(r"[^a-z0-9]", "", normalizar(t))  # noqa: E731  ("Wi-Fi" e "wifi" viram "wifi")
    if q and e == q and len(junto(nome)) > 1 and (palavras(nome) & palavras(objetivo) or junto(nome) in junto(objetivo)):
        return resposta("esperar", f"O {nome} já está {q}. Não precisa fazer nada!", concluido=True)
    return None


def contexto(elemento: str) -> str:
    return elemento.split(" — ", 1)[1].replace(ANUNCIO, "").strip() if " — " in elemento else ""


def anuncio(elemento: str) -> bool:
    return ANUNCIO in elemento


def tocar(elementos: list[str], i: int, explicacao: str = "") -> dict:
    """A instrução é sempre montada aqui, a partir do botão escolhido: a fala nunca cita outro botão."""
    nome = curto(elementos[i])
    fala = f"{explicacao.strip()} Toque em {nome}.".strip()
    return resposta("tocar", fala, elementos[i], indice=i)


# Frases que mandam fazer algo: elas não podem vir livres da IA (citariam botões que não estão na tela).
MANDA = re.compile(r"\b(toque|toca|toquem|clique|clica|aperte|aperta|selecione|escolha|abra|abre|deslize|arraste|puxe|"
                   r"role|va|vai|entre|procure|segure|feche|digite|escreva|use|fale)\b")
TOQUE = re.compile(r"\b(toque|toca|clique|clica|aperte|aperta|selecione|escolha|entre em|va em|va ate)\b")


def frases(texto: str) -> list[str]:
    return [f.strip() for f in re.split(r"(?<=[.!?])\s+", texto.strip()) if f.strip()]


def explicacao(fala: str) -> str:
    """Só a parte da fala da IA que explica (sem mandar fazer nada), no máximo 1 frase."""
    for f in frases(fala):
        if not MANDA.search(normalizar(f)) and len(f) <= 140:
            return f
    return ""


def fala_espera(fala: str, elementos: list[str]) -> str:
    """Fala livre do "esperar": tira frases que mandam tocar em algo que não está na tela."""
    nomes = [normalizar(curto(e)) for e in elementos if len(curto(e)) > 2]
    boas = []
    for f in frases(fala):
        n = normalizar(f)
        if TOQUE.search(n) and not any(x in n for x in nomes) and not re.search(r"\b(campo|teclado|microfone)\b", n):
            continue
        boas.append(f)
    return " ".join(boas[:2])


# Botões que confirmam algo: só valem na tela DAQUILO que a pessoa pediu.
COMPROMETE = re.compile(r"^(instalar|atualizar|enviar|confirmar|assinar|aceitar|finalizar|concluir|cadastrar|inscrever|"
                        r"solicitar|baixar|obter|get|install)\b")
BUSCA = re.compile(r"\b(pesquis\w*|busca\w*|buscar|procurar|lupa|search)\b")
GENERICAS = {"quero", "preciso", "como", "fazer", "ajuda", "ajudar", "celular", "agora", "voce", "pode", "favor", "por",
             "instalar", "baixar", "instala", "baixa", "enviar", "mandar", "manda", "envia", "confirmar", "abrir",
             "aplicativo", "app", "apps", "meu", "minha", "uma", "para", "pra", "com", "sobre", "loja", "play", "store",
             "ligar", "desligar", "colocar", "tirar", "mudar", "trocar", "ver", "usar", "marcar", "agendar", "consultar",
             "nova", "novo", "minhas", "meus", "dele", "dela"}


def entidades(objetivo: str) -> set[str]:
    """O "do quê" do objetivo: 'instalar o Facebook' -> {'facebook'}."""
    return {p for p in palavras(objetivo) if p not in GENERICAS}


def busca(elementos: list[str]) -> int | None:
    for i, e in enumerate(elementos):
        if not anuncio(e) and BUSCA.search(normalizar(curto(e))):
            return i
    return None


def confere(objetivo: str, elementos: list[str], textos: list[str], i: int) -> str | None:
    """Motivo para recusar o botão i (ou None se ele vale)."""
    e = elementos[i]
    if anuncio(e):
        return "anuncio"
    if not COMPROMETE.search(normalizar(curto(e))):
        return None
    ent = entidades(objetivo)
    if not ent:
        return None
    if ent & palavras(e):
        return None  # o próprio botão ou o que está ao redor dele é do que ela pediu
    # Senão: vale se a tela cita o que ela pediu e só existe um botão desse tipo (é a página certa).
    verbo = normalizar(curto(e)).split()[0]
    iguais = sum(1 for x in elementos if not anuncio(x) and normalizar(curto(x)).split()[:1] == [verbo])
    cita = any(ent & palavras(t) for t in textos + [curto(x) for x in elementos if not anuncio(x)])
    return None if cita and iguais <= 1 else "outro"


def recusado(objetivo: str, elementos: list[str], motivo: str, rolavel: bool) -> dict:
    ent = " ".join(sorted(entidades(objetivo))).title() or "o que você quer"
    j = busca(elementos)
    if j is not None:
        return tocar(elementos, j, f"Primeiro vamos procurar {ent}.")
    if motivo == "anuncio" and rolavel:
        return resposta("rolar_baixo", f"Isso é propaganda, vamos passar. {FALAS_GESTO['rolar_baixo']}")
    return resposta("esperar", f"Esse botão não é de {ent}. Vamos procurar primeiro. Me fala de novo o que você quer, se precisar.")


def item_do_painel(objetivo: str) -> str | None:
    obj = normalizar(objetivo).replace("-", " ")
    for nome, chaves in PAINEL.items():
        if any(k in obj for k in chaves):
            return nome
    return None


def achar_i(elementos: list[str], nome: str) -> int | None:
    alvo = palavras(nome) or {normalizar(nome)}
    for i, e in enumerate(elementos):
        c = curto(e)
        if anuncio(e):
            continue
        if alvo <= palavras(c) or normalizar(nome) == normalizar(c).replace("-", " "):
            return i
    return None


def achar(elementos: list[str], nome: str) -> str | None:
    i = achar_i(elementos, nome)
    return None if i is None else elementos[i]


def proximo_teste(objetivo: str, elementos: list[str], feitos: list[str], tela: str = "app",
                  rolavel: bool = False, motivo: str = "mudou", errou: str | None = None, seguiu: str | None = None) -> dict:
    """Modo regras (sem IA): fluxos do gov.br, itens do painel rápido e sobreposição de palavras."""
    obj = normalizar(objetivo)
    feitos_n = {normalizar(curto(f)) for f in feitos}
    if motivo == "errou" and not seguiu:
        return resposta("voltar", f"Você entrou em outro lugar, sem problema. {FALAS_GESTO['voltar']}")

    chaves = {"consulta": ("consulta", "medico", "posto"), "beneficio": ("inss", "beneficio", "aposentadoria"), "multas": ("multa",)}
    for servico, ks in chaves.items():
        if any(k in obj for k in ks):
            pendentes = [p for p in FLUXOS[servico]["passos"] if normalizar(p) not in feitos_n]
            if not pendentes:
                return resposta("esperar", "Pronto! Você conseguiu.", concluido=True)
            for p in pendentes:
                i = achar_i(elementos, p)
                if i is not None:
                    return tocar(elementos, i)
            if rolavel:
                return resposta("rolar_baixo", FALAS_GESTO["rolar_baixo"])
            return resposta("esperar", "Não estou vendo o próximo passo. Espere a página carregar.")

    item = item_do_painel(objetivo)
    if item:
        i = achar_i(elementos, item)
        if i is not None and ja_esta(objetivo, elementos[i]):
            return ja_esta(objetivo, elementos[i])
        if i is not None and estado(elementos[i]) is None and normalizar(curto(elementos[i])) in feitos_n:
            return resposta("esperar", f"Pronto! Você tocou em {item}.", concluido=True)
        if i is not None:
            return tocar(elementos, i, "É aqui que liga e desliga.")
        if tela == "painel":
            return resposta("painel", "Isso abriu as notificações, sem problema. Puxe de novo do alto, mas pelo lado direito da tela.")
        return resposta("painel", FALAS_GESTO["painel"])

    if len(feitos) >= 10:
        return resposta("esperar", "Já demos vários passos. Conseguiu? Se não, me fala de novo o que você quer.", concluido=True)
    alvo_p = palavras(objetivo)
    melhor, pontos = None, 0
    for i, e in enumerate(elementos):
        if normalizar(curto(e)) in feitos_n or anuncio(e):
            continue
        p = len(alvo_p & palavras(curto(e)))
        if p > pontos:
            melhor, pontos = i, p
    if melhor is not None:
        return tocar(elementos, melhor)
    if rolavel and motivo != "parado":
        return resposta("rolar_baixo", FALAS_GESTO["rolar_baixo"])
    return resposta("esperar", "Ainda não sei o caminho por aqui. Me fala de novo o que você quer, com outras palavras.")


def montar_prompt(objetivo: str, app: str, elementos: list[str], feitos: list[str], tela: str = "app",
                  textos: list[str] | None = None, rolavel: bool = False, motivo: str = "mudou", errou: str | None = None,
                  seguiu: str | None = None, escondidos: list[str] | None = None) -> str:
    lista = "\n".join(f"{i}: {e}" for i, e in enumerate(elementos)) or "(nenhum)"
    return PROMPT_GUIA.format(
        objetivo=objetivo, onde=ONDE.get(tela, ONDE["app"]), app=app, elementos=lista,
        textos=" | ".join(textos or []) or "(nenhum)", rolavel="sim" if rolavel else "não",
        motivo=MOTIVOS.get(motivo, MOTIVOS["mudou"]).format(errou=errou or ""), feitos=", ".join(feitos) or "nada ainda",
        seguiu=f'. Ela fez exatamente o que você pediu: "{seguiu}".' if seguiu else "",
        escondidos=", ".join(escondidos or []) or "(nenhum)",
    )


def interpretar(r: dict, elementos: list[str], objetivo: str = "", textos: list[str] | None = None,
                rolavel: bool = False) -> dict:
    """Valida a resposta da IA: tipo conhecido, botão existente na lista, nada de anúncio, nunca uma ação final,
    e a fala de "tocar"/gestos montada aqui (a IA só explica o porquê)."""
    fala = str(r.get("fala") or "").strip()
    tipo = str(r.get("tipo") or "").strip()
    if r.get("concluido"):
        return resposta("esperar", fala_espera(fala, elementos) or "Pronto! Você conseguiu.", concluido=True)
    i = r.get("indice")
    if isinstance(i, str) and i.strip().isdigit():
        i = int(i)
    if tipo == "tocar" or (not tipo and isinstance(i, int)):
        if isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(elementos):
            alvo = elementos[i]
            if FINAIS.search(normalizar(curto(alvo))):
                return resposta("esperar", f"O próximo passo é {curto(alvo)}. Essa decisão é sua: se tiver certeza, toque você.")
            pronto = ja_esta(objetivo, alvo)
            if pronto:
                return pronto
            porque = confere(objetivo, elementos, textos or [], i)
            if porque:
                return recusado(objetivo, elementos, porque, rolavel)
            return tocar(elementos, i, explicacao(fala))
        # A IA citou um botão fora da lista: não repete o que ela disse.
        return resposta("rolar_baixo", FALAS_GESTO["rolar_baixo"]) if rolavel else \
            resposta("esperar", "Não estou vendo o próximo botão nesta tela. Espere um momento, que eu já te mostro.")
    if tipo in GESTOS:
        return resposta(tipo, f"{explicacao(fala)} {FALAS_GESTO[tipo]}".strip())
    return resposta("esperar", fala_espera(fala, elementos) or "Espere um momento, que eu já te mostro.")


INSTALADO = ("abrir", "desinstalar")
PEDE_INSTALAR = ("instalar", "baixar", "instala", "baixa")
VAZIAS = {"o", "a", "um", "uma", "app", "aplicativo", "aplicativos", "do", "da", "de", "no", "na", "pra", "para", "me", "ajuda",
          "quero", "preciso", "instalar", "baixar", "instala", "baixa", "como", "eu", "celular", "meu", "loja", "play", "store"}


def nome_do_app(objetivo: str) -> str | None:
    """'quero instalar o Facebook' -> 'facebook' (None se a pessoa não disse qual app)."""
    resto = [p for p in normalizar(objetivo).split() if p not in VAZIAS and len(p) > 1]
    return " ".join(resto) or None


def pagina_do_app(nome: str, elementos: list[str], textos: list[str]) -> bool:
    """Estamos na página DESTE app? (o nome aparece num título/texto e só existe um "Instalar"/"Abrir")."""
    n = normalizar(nome)
    cita = any(n in normalizar(t) for t in textos + [curto(e) for e in elementos if not anuncio(e)])
    botoes = sum(1 for e in elementos if not anuncio(e) and normalizar(curto(e)) in ("instalar", "abrir", "atualizar"))
    return cita and botoes <= 1


def regra_certeira(objetivo: str, elementos: list[str], feitos: list[str], tela: str,
                   textos: list[str] | None = None) -> dict | None:
    """Casos óbvios resolvidos na hora, sem esperar a IA (o Guia fica bem mais rápido)."""
    obj = normalizar(objetivo)
    feitos_n = {normalizar(curto(f)) for f in feitos}
    nomes = {}
    for i, e in enumerate(elementos):
        if not anuncio(e):
            nomes.setdefault(normalizar(curto(e)), i)
    # Play Store: só decide sozinho na página DO APP PEDIDO (antes apontava o "Instalar" do primeiro app da lista)
    app = nome_do_app(objetivo) if any(p in obj for p in PEDE_INSTALAR) else None
    if app and pagina_do_app(app, elementos, textos or []):
        if all(any(n == i or n.startswith(i + " ") for n in nomes) for i in INSTALADO):
            return resposta("esperar", "Esse app já está instalado no seu celular! Para usar, é só tocar em Abrir.", concluido=True)
        if "instalar" in nomes and "instalar" not in feitos_n:
            return tocar(elementos, nomes["instalar"], "Esse é o app certo.")
    # Painel rápido: o item já está na tela
    item = item_do_painel(objetivo)
    if item:
        i = achar_i(elementos, item)
        if i is not None and ja_esta(objetivo, elementos[i]):
            return ja_esta(objetivo, elementos[i])
        if i is not None and estado(elementos[i]) is None and normalizar(curto(elementos[i])) in feitos_n:
            return resposta("esperar", f"Pronto! Você mexeu no {item}.", concluido=True)
        if i is not None:
            return tocar(elementos, i)
        if tela in ("inicio", "app"):
            return resposta("painel", FALAS_GESTO["painel"])
    return None
