"""Robô de testes da Lia: conversa com a Lia, segue o Guia sozinho e guarda tudo para análise.

Como funciona: o Guia escreve no registro do Android (logcat, etiqueta LIA_ROBO) cada coisa que mostra
(onde está o anel, qual gesto, o que falou). O robô lê isso pelo cabo (adb) e faz o que a Lia pede:
toca no botão apontado, faz o gesto, escreve quando ela pede para escrever. A cada passo tira um print.
No fim, guarda os prints, o registro do celular e um resumo em testes-robo/<data>/<cenário>/.

Uso (celular no cabo, API ligada e `npm run android` rodando):
  py ferramentas\\robo-lia\\robo_lia.py                 -> roda os cenários padrão
  py ferramentas\\robo-lia\\robo_lia.py "quero ligar o bluetooth"
  py ferramentas\\robo-lia\\robo_lia.py "colocar a Avenida Paulista no GPS" --escrever "Avenida Paulista"
"""
import argparse
import datetime as dt
import json
import pathlib
import re
import subprocess
import sys
import time
import urllib.parse

PACOTE = "br.com.fiap.lia"
RAIZ = pathlib.Path(__file__).resolve().parents[2]

# Cenários que não mexem em nada importante do celular (o robô toca de verdade onde a Lia mandar).
CENARIOS = [
    {"nome": "bluetooth", "texto": "quero ligar o bluetooth"},
    {"nome": "bluetooth-ja-ligado", "texto": "quero ligar o bluetooth"},  # roda logo depois: tem que dizer que já está
    {"nome": "lanterna", "texto": "como eu acendo a lanterna"},
    {"nome": "spotify-ja-instalado", "texto": "quero instalar o Spotify", "escrever": "Spotify"},
    {"nome": "gps", "texto": "quero procurar a Avenida Paulista no GPS", "escrever": "Avenida Paulista"},
    {"nome": "whatsapp-arquivadas", "texto": "como eu vejo as conversas arquivadas no WhatsApp"},
    {"nome": "versao-android", "texto": "como eu vejo a versão do Android do meu celular", "escrever": "versão do Android"},
    {"nome": "bateria", "texto": "onde eu vejo quanto de bateria tem e o que está gastando", "escrever": "bateria"},
    {"nome": "configuracoes-letra", "texto": "onde eu mudo o tamanho da letra", "escrever": "tamanho da fonte", "parar_antes": ["aplicar", "salvar"]},
    {"nome": "papel-de-parede", "texto": "quero trocar o papel de parede", "escrever": "papel de parede", "parar_antes": ["definir", "aplicar", "salvar"]},
    {"nome": "galeria", "texto": "quero ver as fotos que eu tirei ontem"},
    {"nome": "youtube", "texto": "quero assistir um vídeo de receita de bolo no YouTube", "escrever": "receita de bolo"},
]

MAX_PASSOS = 18
LIMITE_S = 240
PARADO_S = 45  # sem nenhuma novidade do Guia por esse tempo = travou


def adb(*args, texto=True, timeout=30):
    r = subprocess.run(["adb", *args], capture_output=True, timeout=timeout)
    return r.stdout.decode("utf-8", "replace") if texto else r.stdout


def tela_tamanho():
    m = re.search(r"(\d+)x(\d+)", adb("shell", "wm", "size"))
    return (int(m.group(1)), int(m.group(2))) if m else (1080, 2340)


def eventos_novos(vistos: set):
    saida = adb("logcat", "-d", "-v", "raw", "-s", "LIA_ROBO:I")
    novos = []
    for linha in saida.splitlines():
        linha = linha.strip()
        if not linha.startswith("{") or linha in vistos:
            continue
        vistos.add(linha)
        try:
            novos.append(json.loads(linha))
        except json.JSONDecodeError:
            pass
    return novos


def print_tela(pasta: pathlib.Path, n: int, nome: str):
    png = adb("exec-out", "screencap", "-p", texto=False, timeout=20)
    (pasta / f"{n:02d}-{nome}.png").write_bytes(png)


def escrever(texto: str):
    # adb input text não aceita acento nem espaço direto: tira os acentos e usa %s
    import unicodedata
    sem_acento = "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")
    adb("shell", "input", "text", sem_acento.replace(" ", "%s"))
    time.sleep(0.6)
    adb("shell", "input", "keyevent", "66")  # Enter


def gesto(tipo: str, w: int, h: int):
    caminhos = {
        "painel": (0.82, 0.005, 0.82, 0.45),
        "rolar_baixo": (0.5, 0.72, 0.5, 0.35),
        "rolar_cima": (0.5, 0.35, 0.5, 0.72),
        "voltar": None,
        "inicio": None,
    }
    if tipo == "voltar":
        adb("shell", "input", "keyevent", "4")
    elif tipo == "inicio":
        adb("shell", "input", "keyevent", "3")
    elif tipo in caminhos:
        x0, y0, x1, y1 = caminhos[tipo]
        adb("shell", "input", "swipe", str(int(x0 * w)), str(int(y0 * h)), str(int(x1 * w)), str(int(y1 * h)), "450")


def rodar(cenario: dict, pasta_base: pathlib.Path) -> dict:
    pasta = pasta_base / cenario["nome"]
    pasta.mkdir(parents=True, exist_ok=True)
    w, h = tela_tamanho()
    print(f"\n=== {cenario['nome']}: \"{cenario['texto']}\"")
    adb("logcat", "-c")
    adb("shell", "am", "start", "-n", f"{PACOTE}/.MainActivity")
    time.sleep(3)
    url = "lia://pedir?texto=" + urllib.parse.quote(cenario["texto"]) + "&robo=1"
    adb("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", url, PACOTE)

    vistos: set = set()
    historico = []
    passos = 0
    inicio = time.time()
    ultima_novidade = time.time()
    escreveu = False
    toques: list = []
    gestos: list = []
    resultado = "limite de tempo"
    try:
        resultado = seguir(cenario, pasta, w, h, vistos, historico, inicio, toques, gestos)
    except KeyboardInterrupt:
        resultado = "INTERROMPIDO (Ctrl+C)"
        print("\n  interrompido: salvando o que já tem…")
    passos = len([e for e in historico if e.get("evento") in ("tocar", "instrucao")])
    return salvar(cenario, pasta, historico, resultado, passos, inicio)


def seguir(cenario, pasta, w, h, vistos, historico, inicio, toques, gestos):
    passos = 0
    ultima_novidade = time.time()
    escreveu = False
    resultado = "limite de tempo"
    while time.time() - inicio < LIMITE_S:
        time.sleep(1.5)
        novos = eventos_novos(vistos)
        if novos:
            ultima_novidade = time.time()
        for ev in novos:
            historico.append(ev)
            tipo = ev.get("evento")
            if tipo == "fala":
                print(f"  Lia: {ev.get('texto')}" + ("" if ev.get("tts") else "   [SEM VOZ: o TTS não estava pronto]"))
            elif tipo == "tela":
                print(f"  tela {ev.get('id')}: {ev.get('titulo') or ev.get('app')} ({ev.get('motivo')}, {ev.get('botoes')} botões{', com imagem' if ev.get('imagem') else ''})")
        acao = None
        for ev in reversed(novos):
            if ev.get("evento") in ("tocar", "instrucao", "fim", "parou", "protegido", "pausado"):
                acao = ev
                break
        if not acao:
            if time.time() - ultima_novidade > PARADO_S:
                resultado = "TRAVOU (Guia sem novidade)"
                print_tela(pasta, passos + 1, "travou")
                break
            continue
        ev = acao["evento"]
        if ev in ("fim", "parou", "protegido", "pausado"):
            resultado = {"fim": "concluiu", "parou": "parou", "protegido": "app protegido", "pausado": "pausou"}[ev]
            print_tela(pasta, passos + 1, ev)
            break
        passos += 1
        if passos > MAX_PASSOS:
            resultado = "passos demais"
            break
        time.sleep(2.0)  # deixa a Lia falar, como uma pessoa faria
        if ev == "tocar":
            nome = str(acao.get("nome") or "")
            if any(p in nome.lower() for p in cenario.get("parar_antes", [])):
                resultado = f"parado antes de '{nome}' (de propósito)"
                break
            # A Lia mandando tocar 3x no mesmo lugar sem a tela avançar = bug (ex.: liga/desliga sem fim).
            toques.append((acao["x"], acao["y"]))
            if len(toques) >= 3 and all(abs(x - toques[-1][0]) < 15 and abs(y - toques[-1][1]) < 15 for x, y in toques[-3:]):
                resultado = f"LOOP: mandou tocar 3 vezes no mesmo lugar ({nome})"
                print_tela(pasta, passos, "loop")
                break
            print_tela(pasta, passos, "tocar")
            print(f"  robô: toca em {nome} ({acao.get('x')}, {acao.get('y')})")
            adb("shell", "input", "tap", str(acao["x"]), str(acao["y"]))
        elif acao.get("tipo") == "esperar":
            fala = str(acao.get("fala") or "").lower()
            if cenario.get("escrever") and not escreveu and re.search(r"escrev|digit", fala):
                print_tela(pasta, passos, "escrever")
                print(f"  robô: escreve \"{cenario['escrever']}\"")
                escrever(cenario["escrever"])
                escreveu = True
        elif acao.get("tipo") in ("painel", "rolar_baixo", "rolar_cima", "voltar", "inicio"):
            gestos.append(acao["tipo"])
            if len(gestos) >= 4 and len(set(gestos[-4:])) == 1:
                resultado = f"LOOP: mandou o mesmo gesto 4 vezes ({acao['tipo']})"
                print_tela(pasta, passos, "loop")
                break
            print_tela(pasta, passos, acao["tipo"])
            print(f"  robô: gesto {acao['tipo']}")
            gesto(acao["tipo"], w, h)
    return resultado


def salvar(cenario, pasta, historico, resultado, passos, inicio):
    # Encerra o Guia (senão ele continua no próximo cenário), fecha o painel e guarda tudo.
    adb("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "lia://parar", PACOTE)
    time.sleep(1.5)
    adb("shell", "input", "keyevent", "3")  # tela inicial (fecha o painel rápido, se ficou aberto)
    time.sleep(1)
    log = adb("logcat", "-d", "-v", "time", timeout=60)
    (pasta / "logcat-completo.txt").write_text(log, encoding="utf-8")
    relevantes = [l for l in log.splitlines() if re.search(r"LIA_ROBO|LiaGuia|ReactNativeJS|AndroidRuntime|FATAL|TextToSpeech|SpeechRecognizer", l)]
    (pasta / "logcat-lia.txt").write_text("\n".join(relevantes), encoding="utf-8")
    resumo = {"cenario": cenario, "resultado": resultado, "passos": passos, "segundos": round(time.time() - inicio), "eventos": historico}
    (pasta / "resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  => {resultado} em {passos} passos")
    return resumo


def main():
    ap = argparse.ArgumentParser(description="Robô de testes da Lia")
    ap.add_argument("texto", nargs="?", help="o pedido para a Lia (sem isso, roda os cenários padrão)")
    ap.add_argument("--escrever", help="o que o robô escreve quando a Lia pedir para escrever")
    a = ap.parse_args()
    if "device" not in adb("devices").split("List of devices attached")[-1]:
        sys.exit("Nenhum celular conectado. Rode 'adb devices' e confira o cabo.")
    try:
        import urllib.request
        with urllib.request.urlopen("http://localhost:8000/saude", timeout=5) as r:
            s = json.loads(r.read())
        print(f"API: {s.get('provedor')} · versão {s.get('versao', 'ANTIGA - reinicie a API')}")
    except Exception:
        print("Aviso: a API não respondeu em localhost:8000. Ela está ligada?")
    cenarios = [{"nome": "pedido", "texto": a.texto, "escrever": a.escrever}] if a.texto else CENARIOS
    pasta = RAIZ / "testes-robo" / dt.datetime.now().strftime("%Y-%m-%d_%H-%M")
    resumos = []
    for c in cenarios:
        resumos.append(rodar(c, pasta))
        if resumos[-1]["resultado"].startswith("INTERROMPIDO"):
            break  # Ctrl+C: salvou este cenário e para tudo
    print("\nResumo:")
    for r in resumos:
        print(f"  {r['cenario']['nome']}: {r['resultado']} ({r['passos']} passos, {r['segundos']} s)")
    print(f"\nTudo salvo em {pasta}")


if __name__ == "__main__":
    main()
