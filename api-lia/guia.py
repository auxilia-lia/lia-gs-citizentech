"""Guia genérico (#7), versão 2. Recebe o contexto da tela de QUALQUER app (já pseudonimizado no celular)
e decide o próximo passo: tocar num botão ou fazer um gesto (deslizar do topo, rolar, voltar, ir ao início).
Quem toca é sempre a pessoa: a Lia só mostra e fala."""
import re

from antigolpe import normalizar
from gov_simulado import FLUXOS

TIPOS = {"tocar", "tocar_ponto", "painel", "rolar_baixo", "rolar_cima", "voltar", "inicio", "esperar"}
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
- Configurações: a lupa no alto pesquisa qualquer opção (ex.: "fonte", "brilho", "papel de parede"). Se a opção
  não está à vista, PREFIRA a pesquisa a adivinhar menus. No Samsung, plano de fundo = "Papel de parede e estilo"
  (na lista principal), e NÃO fica em "Visor".
- Em qualquer app com pesquisa/lupa: se o que ela quer não está à vista, pesquise em vez de abrir menus ao acaso.
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

Agora ela está em: {onde} (app "{app}"), na tela "{titulo}".
Telas por onde ela passou, em ordem: {caminho}.
Caminho provável daqui para frente (pode estar errado; confira com a tela): {plano}.
Se esta tela NÃO tem relação com o objetivo (entrou no lugar errado), mande "voltar" para a última tela certa do
caminho, assumindo o erro com leveza. Não fique tentando botões ao acaso numa tela errada.
Botões que dá para tocar (número: texto):
{elementos}
Outros textos na tela: {textos}
Dá para rolar a tela: {rolavel}.
Botões cortados, que só aparecem rolando (NÃO estão na lista acima): {escondidos}
Se o caminho certo está entre os cortados, mande "rolar_baixo" (se está mais abaixo) ou "rolar_cima" (mais acima).
O que aconteceu: {motivo}{seguiu}
Passos que ela já fez, em ordem: {feitos}.

Antes de tudo, veja se o objetivo JÁ foi cumprido nesta tela; se foi, concluido=true.
Se ela quer VER uma informação (versão, bateria, horário, saldo de algo) e a informação já aparece na tela (no título,
nos textos ou ao lado de um botão), concluido=true e diga a informação na fala. Não mande tocar nela.
"[campo]" = campo de escrever; "[campo aberto]" = o cursor já está nele: mande "esperar" dizendo O QUE escrever.
{repetindo}Escolha UM próximo passo:
- "tocar": tocar num dos botões da lista (diga o número em "indice").
- "painel": deslizar do alto da tela para baixo (abre o painel rápido com Wi-Fi, Bluetooth, lanterna, modo avião).
  Se o painel já está aberto e o que ela precisa não aparece, mande "painel" de novo para abrir ele inteiro.
- "rolar_baixo" ou "rolar_cima": quando o caminho certo provavelmente está fora da parte visível.
- "voltar": quando ela entrou no lugar errado DENTRO de um app (nunca na tela inicial).
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
Telas de escolher foto, arquivo ou contato que abriram pelo passo anterior fazem parte do caminho: peça para ela
escolher (tipo "esperar"), nunca diga que errou.
Quem errou: se ela FEZ o que você pediu e a tela não é a esperada, o erro foi SEU. Assuma com leveza
("Me enganei, esse não era o caminho. Vamos voltar.") e NUNCA diga que ela tocou errado.
Só diga que ela tocou em outro lugar quando "O que aconteceu" disser isso, e mesmo assim sem culpa ("sem problema").
Responda SOMENTE com JSON: {{"tipo": "...", "indice": número ou null, "fala": "...", "concluido": true ou false}}"""

REPETINDO = """ATENÇÃO: ela está andando em círculos (passou por esta tela várias vezes). Os últimos passos NÃO funcionaram.
Escolha um caminho DIFERENTE (outro botão, a pesquisa/lupa, ou abrir o app pela tela inicial). Nunca repita o
último gesto. Na tela inicial, NUNCA mande "voltar".
"""

IMAGEM = """
Você também recebeu a IMAGEM da tela (dados pessoais cobertos com tarja preta), porque o Guia travou.
Use a imagem para entender a tela. Se o botão certo está na lista, use "tocar" com o número.
Se ele NÃO está na lista mas aparece na imagem (ícone sem nome, por exemplo), use "tipo": "tocar_ponto" com
"ponto": [x, y] = centro do botão em milésimos da imagem (0 a 1000; x a partir da esquerda, y a partir do topo)
e "nome": como a pessoa chamaria esse botão (ex.: "o lápis", "a engrenagem").
Nunca aponte para uma tarja preta."""

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
    if re.search(r"\b(desligar|desliga|desligo|desligue|desativar|desativa|desativo|desative|apagar a|apaga a|apago a|tirar o|tirar a)\b", o):
        return "desligado"
    if re.search(r"\b(ligar|liga|ligo|ligue|ativar|ativa|ativo|ative|acender|acende|acendo|acenda)\b", o):
        return "ligado"
    return None


def ja_esta(objetivo: str, elemento: str, por_contexto: bool = False) -> dict | None:
    """Ela quer ligar/desligar este botão e ele já está assim: objetivo cumprido."""
    q, e = quer_estado(objetivo), estado(elemento)
    nome = curto(elemento)
    junto = lambda t: re.sub(r"[^a-z0-9]", "", normalizar(t))  # noqa: E731  ("Wi-Fi" e "wifi" viram "wifi")
    if not (q and e == q):
        return None
    if len(junto(nome)) > 1 and (palavras(nome) & palavras(objetivo) or junto(nome) in junto(objetivo)):
        return resposta("esperar", f"O {nome} já está {q}. Não precisa fazer nada!", concluido=True)
    # Interruptor com nome genérico ("Ativado", "Desativado") no detalhe de um item: o item vem no contexto
    # ("Ativado [ligado] — Bluetooth, ..."). Vale se o primeiro nome do contexto é o que ela quer.
    ctx = contexto(elemento).split(",")[0].strip()
    if por_contexto and ctx and len(junto(ctx)) > 1 and (palavras(ctx) & palavras(objetivo) or junto(ctx) in junto(objetivo)):
        return resposta("esperar", f"O {ctx} já está {q}. Não precisa fazer nada!", concluido=True)
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
    """O lugar de pesquisar (lupa ou campo), nunca a "pesquisa por voz"."""
    achados = [i for i, e in enumerate(elementos)
               if not anuncio(e) and BUSCA.search(normalizar(curto(e))) and not re.search(r"\bvoz\b", normalizar(curto(e)))]
    if not achados:
        return None
    campos = [i for i in achados if "[campo" in elementos[i]]
    return (campos or achados)[0]


def campo_aberto(elementos: list[str]) -> int | None:
    for i, e in enumerate(elementos):
        if "[campo aberto]" in e:
            return i
    return None


# Objetivos de procurar algo dentro do app: o caminho mais certo é a pesquisa do próprio app.
PROCURA = re.compile(r"\b(procur\w*|pesquis\w*|busc\w*|achar|encontrar|endereco|rota|como chego|assistir|video|musica|receita)\b")
AJUSTE = re.compile(r"\b(aumentar|diminuir|reduzir|mais|menos|maior|menor|subir|baixar|proximo|anterior)\b")
ESCOLHER = re.compile(r"\b(selecion\w*|escolh\w*|nenhum item|galeria|fotos|imagens|albuns|arquivos)\b")
# Objetivos de só VER uma informação: quando ela aparece na tela, acabou.
VER = re.compile(r"\b(ver|vejo|saber|sei|olhar|olho|conferir|confiro|qual|quanto|quantos|quantas|onde)\b")


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
    """Só quando ela quer LIGAR ou DESLIGAR algo do painel ("ligar o GPS"); "procurar no GPS" é coisa do Maps."""
    if quer_estado(objetivo) is None:
        return None
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
    if motivo == "errou" and not seguiu and tela != "inicio":
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
                  seguiu: str | None = None, escondidos: list[str] | None = None, titulo: str = "",
                  caminho: list[str] | None = None, plano: list[str] | None = None, com_imagem: bool = False,
                  repetindo: bool = False) -> str:
    lista = "\n".join(f"{i}: {e}" for i, e in enumerate(elementos)) or "(nenhum)"
    return PROMPT_GUIA.format(
        objetivo=objetivo, onde=ONDE.get(tela, ONDE["app"]), app=app, elementos=lista,
        textos=" | ".join(textos or []) or "(nenhum)", rolavel="sim" if rolavel else "não",
        motivo=MOTIVOS.get(motivo, MOTIVOS["mudou"]).format(errou=errou or ""), feitos=", ".join(feitos) or "nada ainda",
        seguiu=f'. Ela fez exatamente o que você pediu: "{seguiu}".' if seguiu else "",
        escondidos=", ".join(escondidos or []) or "(nenhum)",
        titulo=titulo or "sem título", caminho=" > ".join(caminho or []) or "só esta",
        plano=" > ".join(plano or []) or "não sei",
        repetindo=REPETINDO if repetindo else "",
    ) + (IMAGEM if com_imagem else "")


def interpretar(r: dict, elementos: list[str], objetivo: str = "", textos: list[str] | None = None,
                rolavel: bool = False, com_imagem: bool = False, tela: str = "app", repetindo: bool = False,
                feitos: list[str] | None = None, seguiu: str | None = None, mesma_tela: bool = False,
                titulo: str = "") -> dict:
    p = _interpretar(r, elementos, objetivo, textos, rolavel, com_imagem)
    # Tela de escolher foto/arquivo que abriu pelo passo anterior: faz parte do caminho (não é "me enganei").
    if p["tipo"] == "voltar" and seguiu and ESCOLHER.search(normalizar(titulo + " " + " ".join((textos or [])[:5]))):
        return resposta("esperar", "Agora escolha a foto que você quer, tocando nela.")
    # Mandou tocar de novo, NA MESMA TELA, no botão que ela acabou de tocar.
    if p["tipo"] == "tocar" and seguiu and mesma_tela and normalizar(curto(seguiu)) == normalizar(curto(p["alvo"] or "")):
        nome = curto(p["alvo"] or "")
        # Botão de ajuste (aumentar, diminuir, +, -): tocar de novo é normal; um toque já fez o que ela pediu.
        if AJUSTE.search(normalizar(nome)) or nome.strip() in ("+", "-"):
            return resposta("esperar", f"Pronto! Já mudou. Se quiser mais, é só tocar de novo em {nome}.", concluido=True)
        # Item que é só informação ("Versão Android", "Status da bateria"): se ela queria VER, já está na tela.
        if VER.search(normalizar(objetivo)):
            info = p["alvo"].replace(" — ", ": ", 1)
            info = re.sub(r"\s*\[[^\]]*\]", "", info)
            return resposta("esperar", f"Pronto! O que você queria ver está aqui na tela. {info}.", concluido=True)
        return resposta("esperar", "Esse botão não abriu nada novo. Me fala com outras palavras o que você quer fazer.")
    # Na tela inicial não há para onde voltar (no Samsung, deslizar da beirada abre as notícias do Google
    # e a pessoa entrava num ciclo "voltar → notícias → voltar").
    if p["tipo"] == "voltar" and tela == "inicio":
        return resposta("esperar", "Estamos na tela inicial. Me fala o nome do app que você quer usar, que eu abro para você.")
    # Andando em círculos: não repete o mesmo gesto.
    if repetindo and p["tipo"] in GESTOS and (feitos or [])[-1:] == [p["tipo"]]:
        return resposta("esperar", "Estamos andando em círculos. Me fala de novo, com outras palavras, o que você quer.")
    return p


def _interpretar(r: dict, elementos: list[str], objetivo: str = "", textos: list[str] | None = None,
                 rolavel: bool = False, com_imagem: bool = False) -> dict:
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
            if "[campo aberto]" in alvo:  # o campo já está aberto: hora de escrever
                o_que = explicacao(fala)
                return resposta("esperar", f"{o_que} Agora escreva no campo o que você procura. Se preferir, toque no microfone do teclado e fale.".strip())
            porque = confere(objetivo, elementos, textos or [], i)
            if porque:
                return recusado(objetivo, elementos, porque, rolavel)
            return tocar(elementos, i, explicacao(fala))
        # A IA citou um botão fora da lista: não repete o que ela disse.
        return resposta("rolar_baixo", FALAS_GESTO["rolar_baixo"]) if rolavel else \
            resposta("esperar", "Não estou vendo o próximo botão nesta tela. Espere um momento, que eu já te mostro.")
    if tipo == "tocar_ponto" and com_imagem:
        ponto, nome = r.get("ponto"), str(r.get("nome") or "esse botão").strip()[:40]
        if (isinstance(ponto, list) and len(ponto) == 2 and all(isinstance(v, (int, float)) and 0 <= v <= 1000 for v in ponto)
                and not FINAIS.search(normalizar(nome))):
            x, y = int(ponto[0]), int(ponto[1])
            fala_p = f"{explicacao(fala)} Toque em {nome}, onde está o círculo.".strip()
            return resposta("tocar_ponto", fala_p, f"{x},{y}|{nome}")
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


# ================= roteiro da Play Store =================
# Na loja, a IA e o plano erravam porque viam vários "Instalar" iguais (anúncios, outros apps) e confundiam
# o nome do app com o do desenvolvedor. Aqui é um roteiro fixo, sem IA, que CONFERE O APP em cada tela:
#   página do app pedido → Instalar (ou "já está instalado") · baixando → espera · terminou → pronto
#   resultados da busca → o Instalar/resultado DO APP PEDIDO · qualquer outra tela → reabre a busca dele.
LOJA = "com.android.vending"
ACOES_LOJA = {"instalar", "abrir", "atualizar", "desinstalar", "cancelar", "jogar"}
NAO_NOME = {"do", "da", "de", "o", "a", "e", "app", "apps", "aplicativo"}


def fichas(t: str) -> set[str]:
    """Palavras de um nome, incluindo siglas curtas ("BB", "C6")."""
    return {p for p in re.findall(r"[a-z0-9]+", normalizar(t)) if len(p) >= 2 and p not in NAO_NOME}


def cobre(nome: set[str], texto: set[str]) -> bool:
    """Todas as palavras do nome pedido aparecem (aceita começo de palavra: "whats" ~ "whatsapp")."""
    return bool(nome) and all(any(x == y or (len(x) >= 4 and y.startswith(x)) for y in texto) for x in nome)


def acao_loja(e: str) -> str | None:
    n = normalizar(curto(e))
    return n if n in ACOES_LOJA else None


def roteiro_loja(objetivo: str, elementos: list[str], textos: list[str], feitos: list[str], titulo: str = "") -> dict | None:
    obj = normalizar(objetivo)
    if not any(p in obj for p in PEDE_INSTALAR):
        return None
    pedido = nome_do_app(objetivo)
    nome = fichas(pedido or "")
    if not nome:
        return None  # "instalar um app" sem dizer qual: a IA conversa
    bonito = " ".join(w.capitalize() if len(w) > 2 else w.upper() for w in (pedido or "").split())
    validos = [(i, e) for i, e in enumerate(elementos) if not anuncio(e)]
    acoes = {acao_loja(e): i for i, e in reversed(validos) if acao_loja(e)}
    feitos_n = {normalizar(curto(f)) for f in feitos}
    reabriu = sum(1 for f in feitos if f == "abrir_busca")

    # Depois de tocar em Instalar: "Cancelar" = ainda baixando; "Abrir" = terminou (vale mesmo sem achar o título).
    if "instalar" in feitos_n and "instalar" not in acoes:
        if "cancelar" in acoes:  # durante o download o "Abrir" aparece apagado ao lado do "Cancelar"
            return resposta("esperar", "Está baixando. Espere terminar, que eu te aviso.")
        if "abrir" in acoes or "jogar" in acoes:
            return resposta("esperar", f"Pronto! O {bonito} foi instalado. Para usar, é só tocar em Abrir.", concluido=True)
    # Baixando: barra de progresso / "Cancelar". Só espera.
    juntos = " ".join(normalizar(t) for t in textos)
    if "cancelar" in acoes and ("%" in " ".join(textos) or re.search(r"(baixando|instalando|pendente|verificando)", juntos)):
        return resposta("esperar", "Está baixando. Espere terminar, que eu te aviso.")

    # Página de UM app: no alto ficam o título e o desenvolvedor; só um botão principal.
    cabeca = fichas(titulo)
    for t in textos[:8]:
        cabeca |= fichas(t)
    for i, e in validos[:15]:
        if not acao_loja(e):
            cabeca |= fichas(curto(e))
    principais = sum(1 for _, e in validos if acao_loja(e) in ("instalar", "abrir", "atualizar", "jogar"))
    if principais and sum(1 for _, e in validos if acao_loja(e) == "instalar") <= 1 and titulo:
        if cobre(nome, fichas(titulo) | cabeca) and principais <= 2:
            if "abrir" in acoes or "jogar" in acoes:
                if "instalar" in feitos_n:
                    return resposta("esperar", f"Pronto! O {bonito} foi instalado. Para usar, é só tocar em Abrir.", concluido=True)
                if "instalar" not in acoes:
                    return resposta("esperar", f"O {bonito} já está instalado no seu celular! Para usar, é só tocar em Abrir.", concluido=True)
            if "instalar" in acoes:
                return tocar(elementos, acoes["instalar"], f"Essa é a página do {bonito}.")
            if "atualizar" in acoes:
                return tocar(elementos, acoes["atualizar"], f"O {bonito} já está instalado, mas precisa de atualização.")

    # Resultados da busca: o Instalar (ou o resultado) DO APP PEDIDO, conferindo o que está ao redor.
    for i, e in validos:
        if acao_loja(e) == "instalar" and cobre(nome, fichas(e)):
            return tocar(elementos, i, f"Esse é o {bonito}.")
    for i, e in validos:
        if not acao_loja(e) and not BUSCA.search(normalizar(curto(e))) and cobre(nome, fichas(e)) and len(curto(e)) > 2:
            return tocar(elementos, i, f"Esse é o {bonito}. Vamos abrir a página dele.")

    # Página de outro app, tela inicial da loja ou qualquer outra: reabre a busca do app pedido (no máximo 2 vezes).
    if reabriu < 2:
        return resposta("abrir_busca", f"Vou abrir a busca do {bonito} para você.", pedido)
    return None


def regra_certeira(objetivo: str, elementos: list[str], feitos: list[str], tela: str,
                   textos: list[str] | None = None, app: str = "", titulo: str = "") -> dict | None:
    """Casos óbvios resolvidos na hora, sem esperar a IA (o Guia fica bem mais rápido)."""
    obj = normalizar(objetivo)
    feitos_n = {normalizar(curto(f)) for f in feitos}
    nomes = {}
    for i, e in enumerate(elementos):
        if not anuncio(e):
            nomes.setdefault(normalizar(curto(e)), i)
    # Play Store: roteiro fixo que confere o app em cada tela (sem IA).
    if (app or "") == LOJA:
        r = roteiro_loja(objetivo, elementos, textos or [], feitos, titulo)
        if r:
            return r
    # Painel rápido: o item já está na tela
    item = item_do_painel(objetivo)
    if item:
        # Primeiro o botão do PRÓPRIO item ("Bluetooth [desligado]"): ele manda. Só sem ele vale o interruptor do
        # detalhe ("Ativado [ligado] — Bluetooth"); no detalhe do Samsung há outros interruptores com "Ativado"
        # (opções do Bluetooth) e a Lia achava que o Bluetooth estava ligado.
        proprio = achar_i(elementos, item)
        if proprio is None:
            candidatos = [e for e in elementos if estado(e) in ("ligado", "desligado") and
                          normalizar(contexto(e).split(",")[0].strip()).replace("-", " ") in PAINEL.get(item, (item,)) + (item,)]
            if len(candidatos) == 1:  # um só interruptor do item: dá para confiar
                pronto = ja_esta(objetivo, candidatos[0], por_contexto=True)
                if pronto:
                    return pronto
        i = achar_i(elementos, item)
        if i is not None and ja_esta(objetivo, elementos[i]):
            return ja_esta(objetivo, elementos[i])
        if i is not None and estado(elementos[i]) is None and normalizar(curto(elementos[i])) in feitos_n:
            return resposta("esperar", f"Pronto! Você mexeu no {item}.", concluido=True)
        if i is not None:
            return tocar(elementos, i)
        if tela in ("inicio", "app"):
            return resposta("painel", FALAS_GESTO["painel"])
    # Campo de pesquisa aberto (cursor nele): é hora de escrever, não de tocar de novo.
    k = campo_aberto(elementos)
    ja_pesquisou = any(BUSCA.search(normalizar(curto(f))) for f in feitos)
    if k is not None and (ja_pesquisou or BUSCA.search(normalizar(curto(elementos[k])))):
        termo = " ".join(sorted(entidades(objetivo))) or "o que você procura"
        return resposta("esperar", f"Agora escreva {termo} no campo e toque na lupa ou no Enter. "
                                   "Se preferir, toque no microfone do teclado e fale.")
    # Procurar algo dentro de um app (endereço, vídeo, música…): a pesquisa do app primeiro.
    j = busca(elementos)
    if tela == "app" and j is not None and not ja_pesquisou and PROCURA.search(normalizar(objetivo)) and "settings" not in (app or ""):
        ent = entidades(objetivo)
        visivel = set().union(*[palavras(x) for x in (textos or []) + elementos]) if (textos or elementos) else set()
        if not (ent & visivel):
            return tocar(elementos, j, "Vamos usar a pesquisa.")
    # Configurações: se nada na tela tem a ver com o objetivo, pesquisar é mais certeiro que adivinhar menus.
    if "settings" in (app or "").lower():
        ent = entidades(objetivo)
        visivel = set().union(*[palavras(x) for x in (textos or []) + elementos]) if (textos or elementos) else set()
        j = busca(elementos)
        ja_pesquisou = any(BUSCA.search(normalizar(curto(f))) for f in feitos)
        if ent and j is not None and not ja_pesquisou and not (ent & visivel):
            return tocar(elementos, j, "Nas Configurações, o jeito mais fácil é pesquisar.")
    return None


# ================= plano antes de começar =================
# No início, a IA monta o caminho provável. O celular segue esse plano sozinho enquanto ele bate com a tela
# e só chama a IA quando sai dele (bem menos espera). O plano nunca inclui pagar, Pix, comprar ou apagar.

PROMPT_PLANO = """Você conhece bem celulares Android (principalmente Samsung) em português do Brasil.
Uma pessoa quer: "{objetivo}". Ela começa em: {inicio}.
Liste o caminho mais provável, passo a passo, com o NOME EXATO dos botões como aparecem na tela.
Tipos: "tocar" (com "nome" do botão), "painel" (puxar do alto pelo lado direito), "rolar_baixo", "voltar", "inicio".
Prefira a pesquisa/lupa quando o caminho por menus for incerto. Máximo 8 passos. Se não souber, devolva lista vazia.
Responda SOMENTE com JSON: {{"passos": [{{"tipo": "tocar", "nome": "..."}}]}}"""

INICIOS = {"whatsapp": "o WhatsApp aberto", "configuracoes": "as Configurações abertas", "playstore": "a Play Store aberta",
           "celular": "a tela inicial do celular"}


def montar_plano(objetivo: str, app: str) -> str:
    inicio = f"o app {app[6:]} aberto" if app.startswith("abrir:") else INICIOS.get(app, "a tela inicial do celular")
    return PROMPT_PLANO.format(objetivo=objetivo, inicio=inicio)


def interpretar_plano(r: dict) -> list[dict]:
    passos = []
    for p in (r.get("passos") or [])[:8]:
        if not isinstance(p, dict):
            continue
        tipo = str(p.get("tipo") or "").strip()
        nome = str(p.get("nome") or "").strip()[:60]
        if tipo == "tocar" and nome and not FINAIS.search(normalizar(nome)):
            passos.append({"tipo": "tocar", "nome": nome})
        elif tipo in GESTOS:
            passos.append({"tipo": tipo, "nome": ""})
    return passos


def plano_teste(objetivo: str, app: str) -> list[dict]:
    """Sem IA: só o óbvio (painel rápido)."""
    item = item_do_painel(objetivo)
    if item:
        nome = {"wi fi": "Wi-Fi"}.get(item, item.capitalize())
        return [{"tipo": "painel", "nome": ""}, {"tipo": "tocar", "nome": nome}]
    return []


# ================= "o que é isso?" =================

PROMPT_EXPLICAR = """Você é a Lia e ensina pessoas idosas ou com pouca leitura a ENTENDER o celular.
A pessoa perguntou: "{pergunta}". Ela está no app "{app}", na tela "{titulo}".
Botões da tela: {elementos}
Textos da tela: {textos}
O que ela está tentando fazer agora: {objetivo}.
Explique em 2 a 4 frases curtas: que tela é esta e para que servem os 2 ou 3 botões mais importantes (pelo nome).
Se tiver relação com o que ela quer fazer, diga qual botão leva até lá. Não use jargão, sem apelidos nem diminutivos.
Não invente botões que não estão na lista. Responda SOMENTE com JSON: {{"fala": "..."}}"""


def montar_explicacao(pergunta: str, app: str, titulo: str, elementos: list[str], textos: list[str], objetivo: str) -> str:
    return PROMPT_EXPLICAR.format(pergunta=pergunta, app=app, titulo=titulo or "sem título",
                                  elementos=" | ".join(elementos[:30]) or "(nenhum)",
                                  textos=" | ".join(textos[:15]) or "(nenhum)", objetivo=objetivo or "não disse")


def explicacao_teste(app: str, titulo: str, elementos: list[str]) -> str:
    nomes = [curto(e) for e in elementos if not anuncio(e)][:3]
    onde = f"Esta é a tela {titulo}, do {app}." if titulo else f"Você está no {app}."
    if not nomes:
        return onde + " Não estou vendo botões com nome aqui."
    lista = ", ".join(nomes[:-1]) + (" e " if len(nomes) > 1 else "") + nomes[-1]
    return f"{onde} Os botões principais são: {lista}. Cada um abre uma parte do app."


# ================= palavras do celular =================
# Na primeira vez que uma palavra aparece numa instrução, a Lia explica em uma frase. Depois, usa sem explicar.

GLOSSARIO = [
    ("tocar", r"\btoque\b", "Tocar é encostar a ponta do dedo na tela e tirar logo."),
    ("arrastar", r"\b(arraste|deslize|puxe)\b", "Arrastar é encostar o dedo na tela e mover, sem tirar o dedo."),
    ("painel", r"\bpainel\b", "O painel rápido é a parte que desce do alto da tela, com Wi-Fi, Bluetooth e lanterna."),
    ("icone", r"\bicone", "Ícone é o desenho pequeno que representa um app ou uma função."),
    ("notificacao", r"\bnotifica", "Notificações são os avisos dos apps, que aparecem no alto da tela."),
    ("campo", r"\bcampo\b", "Campo é o espaço da tela onde a gente escreve."),
    ("teclado", r"\bteclado\b", "O teclado aparece embaixo quando você toca num campo para escrever."),
    ("pesquisa", r"\b(lupa|pesquis)", "A lupa serve para pesquisar: você escreve o que procura e o celular acha."),
    ("aba", r"\baba\b", "Aba é cada opção da faixa no alto ou embaixo da tela; ela troca o que aparece."),
    ("menu", r"\b(menu|tres pontinhos)\b", "Menu é a lista de opções que abre nos três pontinhos."),
    ("voltar", r"\bvoltar\b", "Voltar leva para a tela anterior, como virar a página para trás."),
    ("tela_inicial", r"\btela inicial\b", "A tela inicial é onde ficam os ícones dos seus apps."),
]


def ensinar_palavra(fala: str, conhecidas: list[str]) -> tuple[str, str | None]:
    """Acrescenta a explicação de UMA palavra nova (a primeira que aparecer e ela ainda não sabe)."""
    n = normalizar(fala)
    for chave, padrao, frase in GLOSSARIO:
        if chave not in conhecidas and re.search(padrao, n):
            return f"{fala} {frase}".strip(), chave
    return fala, None
