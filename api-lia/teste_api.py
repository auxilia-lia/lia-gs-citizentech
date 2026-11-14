"""Testes da API da Lia no modo teste. Rodar: python -m pytest teste_api.py -q"""
import os

os.environ["LIA_PROVEDOR"] = "teste"

from fastapi.testclient import TestClient  # noqa: E402

import antigolpe  # noqa: E402
from main import app  # noqa: E402

c = TestClient(app)


def falar(texto, canal="app", contexto=None):
    r = c.post("/conversa", json={"mensagens": [{"papel": "pessoa", "texto": texto}], "canal": canal, "contexto": contexto or {}})
    assert r.status_code == 200, r.text
    return r.json()


def test_levenshtein():
    assert antigolpe.levenshtein("gov.br", "gov.br") == 0
    assert antigolpe.levenshtein("g0v.br", "gov.br") == 1
    assert antigolpe.levenshtein("", "abc") == 3


def test_golpe_dominio_parecido():
    a = antigolpe.analisar("URGENTE: seu benefício será cortado. Atualize em g0v-br.com")
    assert a["golpe"] and a["nivel"] == "alto"
    assert not antigolpe.analisar("Acesse www.gov.br para ver seus dados")["golpe"]
    assert not antigolpe.analisar("Oi mãe, chego às 7")["golpe"]


def test_conversa_guiar_consulta_e_autonomia():
    r = falar("quero marcar uma consulta no posto")
    assert r["acao"] == {"tipo": "guiar", "servico": "consulta"}
    r2 = falar("quero marcar uma consulta", contexto={"autonomia": {"consulta": 2}})
    assert "sozinha" in r2["fala"]


def test_avisar_familiar():
    r = falar("avisa minha filha que marquei a consulta")
    assert r["acao"]["tipo"] == "avisar_familiar"
    assert r["acao"]["contato"] == "filha"
    assert r["acao"]["mensagem"].lower().startswith("marquei a consulta")


def test_golpe_na_conversa():
    r = falar("recebi isso: seu INSS foi bloqueado, pague a taxa no pix em inss-gov.com")
    assert r["golpe"] and "golpe" in r["fala"].lower()


def test_ligacao_agenda_por_voz():
    r = falar("quero marcar consulta", canal="ligacao")
    assert r["acao"] is None and "Pode ser" in r["fala"]
    r = falar("pode sim, na terça", canal="ligacao")
    assert r["acao"]["tipo"] == "agendar_por_voz" and "protocolo" in r["fala"]
    assert r["acao"]["resultado"]["protocolo"].startswith("SIM-")


def test_ligacao_nao_guia_na_tela():
    r = falar("quero ver meu inss", canal="ligacao")
    assert r["acao"]["tipo"] == "consultar_beneficio" and "R$" in r["fala"]


def test_acao_invalida_e_descartada():
    from main import validar_acao
    assert validar_acao({"tipo": "pagar_pix"}, "app") is None
    assert validar_acao({"tipo": "guiar", "servico": "banco"}, "app") is None
    assert validar_acao({"tipo": "agendar_por_voz"}, "app") is None


def test_gov_fluxo_consulta_completo():
    fluxos = c.get("/gov/fluxos").json()
    passos = fluxos["consulta"]["passos"]
    # cada passo do Guia precisa existir como botão na página
    paginas = ["/gov", "/gov/inicio", "/gov/saude", "/gov/saude/agendar", "/gov/saude/agendar/ubs-centro", "/gov/saude/agendar/ubs-centro/h1"]
    for passo, url in zip(passos, paginas):
        html = c.get(url).text
        assert passo in html, (passo, url)
        assert "Simulação — ambiente de demonstração" in html
    r = c.post("/gov/saude/agendar/ubs-centro/h1", follow_redirects=True)
    assert "Consulta marcada" in r.text and "SIM-" in r.text


def test_gov_outros_fluxos():
    f = c.get("/gov/fluxos").json()
    for servico, paginas in {"beneficio": ["/gov", "/gov/inicio", "/gov/inss"], "multas": ["/gov", "/gov/inicio", "/gov/veiculos"]}.items():
        for passo, url in zip(f[servico]["passos"], paginas):
            assert passo in c.get(url).text, (passo, url)


def test_entende_modo_teste():
    r = c.post("/entende", json={"imagem_base64": "A" * 200})
    assert r.status_code == 200 and "foto" in r.json()["fala"]


def test_avisar_familiar_variacoes():
    for frase, contato in [("manda mensagem pra Ana que já cheguei", "ana"), ("fala pro meu neto que estou bem", "neto")]:
        r = falar(frase)
        assert r["acao"] and r["acao"]["contato"] == contato, (frase, r)


def test_guia_generico_gov_modo_teste():
    tela = ["Saúde", "Meu INSS", "Veículos", "Sair"]
    r = c.post("/guia/proximo", json={"objetivo": "marcar consulta", "elementos": tela, "feitos": ["Entrar com conta de demonstração"]}).json()
    assert r["alvo"] == "Saúde" and not r["concluido"]
    todos = c.get("/gov/fluxos").json()["consulta"]["passos"]
    r = c.post("/guia/proximo", json={"objetivo": "marcar consulta", "elementos": ["Voltar ao início"], "feitos": todos}).json()
    assert r["concluido"]


def test_guia_generico_outro_app():
    r = c.post("/guia/proximo", json={"objetivo": "aumentar o tamanho da fonte", "elementos": ["Conexões", "Tela", "Tamanho e estilo da fonte"]}).json()
    assert r["alvo"] == "Tamanho e estilo da fonte"


def test_guia_interpretar_valida_resposta_da_ia():
    import guia
    els = ["Conversas", "Anexar", "Pagar com Pix"]
    assert guia.interpretar({"indice": 1, "fala": "Toque no clipe."}, els)["alvo"] == "Anexar"
    assert guia.interpretar({"indice": 9, "fala": "x"}, els)["alvo"] is None
    assert guia.interpretar({"indice": 2, "fala": "x"}, els)["alvo"] is None
    assert guia.interpretar({"concluido": True, "fala": "Pronto"}, els)["concluido"]


def test_conversa_pede_guiar_app():
    r = falar("como mando foto no whatsapp?")
    assert r["acao"]["tipo"] == "guiar_app" and r["acao"]["app"] == "whatsapp"


def test_ia_fora_do_ar_cai_nas_regras(monkeypatch):
    import main

    async def falha(*a, **k):
        raise main.httpx.ConnectError("sem rede")

    monkeypatch.setattr(main, "provedor", lambda: "gemini")
    monkeypatch.setattr(main, "gerar", falha)
    r = falar("recebi isso: seu INSS foi bloqueado, pague a taxa no pix em inss-gov.com")
    assert r["golpe"] and "golpe" in r["fala"].lower() and r["provedor"].startswith("regras")
    g = c.post("/guia/proximo", json={"objetivo": "marcar consulta", "elementos": ["Saúde"], "feitos": ["Entrar com conta de demonstração"]}).json()
    assert g["alvo"] == "Saúde"
    f = c.post("/entende", json={"imagem_base64": "A" * 200}).json()
    assert "tenta de novo" in f["fala"].lower()


def test_guia2_painel_rapido():
    # Na tela inicial não tem Wi-Fi: a Lia manda deslizar do topo.
    r = c.post("/guia/proximo", json={"objetivo": "desligar o wifi", "tela": "inicio", "elementos": ["Instagram", "Lia"]}).json()
    assert r["tipo"] == "painel" and r["alvo"] is None
    # Com o painel aberto, aponta o Wi-Fi.
    r = c.post("/guia/proximo", json={"objetivo": "desligar o wifi", "tela": "painel", "elementos": ["Wi-Fi", "Bluetooth", "Lanterna"]}).json()
    assert r["tipo"] == "tocar" and r["alvo"] == "Wi-Fi"
    r = c.post("/guia/proximo", json={"objetivo": "ligar o bluetooth", "tela": "painel", "elementos": ["Wi-Fi", "Bluetooth"], "feitos": ["Bluetooth"]}).json()
    assert r["concluido"]


def test_guia2_errou_manda_voltar_e_rolar():
    r = c.post("/guia/proximo", json={"objetivo": "aumentar a letra", "elementos": ["Som"], "motivo": "errou", "errou": "Som"}).json()
    assert r["tipo"] == "voltar" and "sem problema" in r["fala"]
    r = c.post("/guia/proximo", json={"objetivo": "trocar o toque", "elementos": ["Conexões"], "rolavel": True}).json()
    assert r["tipo"] == "rolar_baixo"


def test_guia2_interpretar_gestos():
    import guia
    assert guia.interpretar({"tipo": "painel", "fala": "Deslize do topo."}, [])["tipo"] == "painel"
    assert guia.interpretar({"tipo": "voltar"}, [])["fala"]
    assert guia.interpretar({"tipo": "pular_de_paraquedas"}, [])["tipo"] == "esperar"
    assert guia.interpretar({"tipo": "tocar", "indice": 0, "fala": "x"}, ["Pagar agora"])["alvo"] is None


def test_conversa_wifi_vai_para_o_celular():
    r = falar("como eu desligo o wifi?")
    assert r["acao"] == {"tipo": "guiar_app", "app": "celular", "objetivo": "como eu desligo o wifi?"}


def test_conversa_durante_o_guia_troca_objetivo():
    r = falar("na verdade quero ligar a lanterna", contexto={"guia": "desligar o wifi"})
    assert r["acao"]["tipo"] == "guiar_app" and r["acao"]["app"] == "celular"
    from prompt_lia import montar_sistema
    assert "AGORA o Guia está na tela" in montar_sistema("app", {"guia": "ligar o bluetooth"}, None)


def test_guia3_lado_direito_e_sem_culpa():
    r = c.post("/guia/proximo", json={"objetivo": "ligar o bluetooth", "tela": "inicio", "elementos": ["WhatsApp"]}).json()
    assert r["tipo"] == "painel" and "direito" in r["fala"]
    # Abriu as notificações (painel sem os botões rápidos): explica o lado direito, sem culpa.
    r = c.post("/guia/proximo", json={"objetivo": "ligar o bluetooth", "tela": "painel", "elementos": ["Limpar", "Configurações de notificação"]}).json()
    assert r["tipo"] == "painel" and "notificações" in r["fala"] and "direito" in r["fala"]
    import guia
    p = guia.montar_prompt("ligar o bluetooth", "x", ["A"], [], seguiu="Bluetooth")
    assert 'fez exatamente o que você pediu: "Bluetooth"' in p and "o erro foi SEU" in p


def test_guia4_atalhos_sem_ia_e_play_store():
    import guia
    loja = "com.android.vending"
    r = guia.regra_certeira("instalar o facebook", ["Abrir", "Desinstalar"], [], "app", ["Meta Platforms"], app=loja, titulo="Facebook")
    assert r["concluido"] and "já está instalado" in r["fala"]
    r = guia.regra_certeira("baixar o facebook", ["Instalar"], [], "app", ["Meta Platforms"], app=loja, titulo="Facebook")
    assert r["tipo"] == "tocar" and r["alvo"] == "Instalar"
    # Tela inicial da loja com "Instalar" de OUTRO app (anúncio): não aponta; reabre a busca do Facebook
    r = guia.regra_certeira("quero instalar o facebook", ["Instalar", "Pesquisa"], [], "app", ["Pier: Seguro Auto e Cel"], app=loja, titulo="Pier")
    assert r["tipo"] == "abrir_busca"
    assert guia.nome_do_app("me ajuda a instalar o Facebook") == "facebook"
    assert guia.regra_certeira("ligar o bluetooth", ["Wi-Fi", "Bluetooth"], [], "painel")["alvo"] == "Bluetooth"
    assert guia.regra_certeira("mandar foto no whatsapp", ["Conversas"], [], "app") is None
    r = falar("quero instalar o facebook")
    assert r["acao"]["app"] == "playstore"
    from main import validar_acao
    assert validar_acao({"tipo": "parar_guia"}, "app") == {"tipo": "parar_guia"}


def test_config_pensamento():
    import ia
    assert ia._config_pensamento("gemini-2.5-flash") == {"thinkingConfig": {"thinkingBudget": 0}}
    assert "thinkingLevel" in ia._config_pensamento("gemini-flash-lite-latest")["thinkingConfig"]


def test_guia4_indice_e_fala_montada_pelo_servidor():
    import guia
    els = ["Pesquisar apps e jogos", "Instalar — Pier: Seguro Auto [anúncio]", "Instalar — Facebook, Meta Platforms", "Abrir — Spotify"]
    # a fala é montada a partir do botão escolhido: nunca cita outro botão, e o índice vai junto
    r = guia.interpretar({"tipo": "tocar", "indice": 2, "fala": "É o app certo. Depois toque em Abrir."}, els, "instalar o facebook")
    assert r["indice"] == 2 and r["fala"] == "É o app certo. Toque em Instalar."
    # anúncio nunca é escolhido: vai para a pesquisa
    r = guia.interpretar({"tipo": "tocar", "indice": 1, "fala": ""}, els, "instalar o facebook")
    assert r["indice"] == 0 and "Pesquisar" in r["fala"]


def test_guia4_botao_que_confirma_so_na_tela_certa():
    import guia
    loja = ["Pesquisar apps e jogos", "Instalar — Pier: Seguro Auto", "Instalar — Kwai"]
    r = guia.interpretar({"tipo": "tocar", "indice": 1}, loja, "quero instalar o facebook")
    assert r["indice"] == 0  # leva para a pesquisa primeiro
    pagina = ["Instalar", "Voltar"]
    r = guia.interpretar({"tipo": "tocar", "indice": 0}, pagina, "quero instalar o facebook", ["Facebook", "Meta Platforms"])
    assert r["tipo"] == "tocar" and r["indice"] == 0


def test_guia4_botao_fora_da_lista_nao_vira_fala():
    import guia
    r = guia.interpretar({"tipo": "tocar", "indice": 7, "fala": "Toque em Enviar mensagem."}, ["Conversas"], "mandar mensagem")
    assert "Enviar" not in r["fala"] and r["indice"] == -1
    r = guia.interpretar({"tipo": "esperar", "fala": "Espere carregar. Depois toque em Confirmar."}, ["Conversas"], "x")
    assert "Confirmar" not in r["fala"] and "Espere carregar." in r["fala"]
    r = guia.interpretar({"tipo": "painel", "fala": "Abra o painel e toque em Wi-Fi."}, [], "desligar o wifi")
    assert "Wi-Fi" not in r["fala"] and r["fala"] == guia.FALAS_GESTO["painel"]


def test_guia4_extrato_de_pagamento_nao_e_acao_final():
    import guia
    els = ["Extrato de pagamento", "Pagar agora"]
    assert guia.interpretar({"tipo": "tocar", "indice": 0}, els, "ver meu extrato do inss")["tipo"] == "tocar"
    assert guia.interpretar({"tipo": "tocar", "indice": 1}, els, "ver meu extrato do inss")["tipo"] == "esperar"


def test_guia4_regras_mandam_indice():
    r = c.post("/guia/proximo", json={"objetivo": "desligar o wifi", "tela": "painel", "elementos": ["Bluetooth", "Wi-Fi — Casa"]}).json()
    assert r["tipo"] == "tocar" and r["indice"] == 1 and "Toque em Wi-Fi." in r["fala"]


def test_guiar_app_de_qualquer_app_comeca_da_tela_inicial():
    from main import validar_acao
    assert validar_acao({"tipo": "guiar_app", "app": "facebook", "objetivo": "entrar no Facebook"}, "app")["app"] == "celular"
    assert validar_acao({"tipo": "guiar_app", "app": "facebook"}, "app") is None


def test_guia5_sabe_se_ja_esta_ligado():
    import guia
    # já está no estado pedido: conclui sem mandar tocar
    r = c.post("/guia/proximo", json={"objetivo": "quero ligar o bluetooth", "tela": "painel", "elementos": ["Wi-Fi [ligado]", "Bluetooth [ligado]"]}).json()
    assert r["concluido"] and "já está ligado" in r["fala"]
    r = c.post("/guia/proximo", json={"objetivo": "desligar o wifi", "tela": "painel", "elementos": ["Wi-Fi [desligado]"]}).json()
    assert r["concluido"]
    # ainda não está: manda tocar no botão certo
    r = c.post("/guia/proximo", json={"objetivo": "desligar o wifi", "tela": "painel", "elementos": ["Bluetooth [ligado]", "Wi-Fi [ligado]"]}).json()
    assert r["tipo"] == "tocar" and r["indice"] == 1 and "Toque em Wi-Fi." in r["fala"]
    # vale para a resposta da IA em qualquer app (ex.: interruptor das Configurações)
    els = ["Modo escuro [ligado] — Tela"]
    assert guia.interpretar({"tipo": "tocar", "indice": 0}, els, "ativar o modo escuro")["concluido"]
    assert guia.curto("Bluetooth [ligado] — Conexões [anúncio]") == "Bluetooth"


def test_guia6_prompt_mostra_botoes_cortados():
    import guia
    p = guia.montar_prompt("trocar o papel de parede", "com.android.settings", ["Conexões", "Sons"], [],
                           escondidos=["Visor (mais abaixo)"])
    assert "Visor (mais abaixo)" in p and "rolar_baixo" in p


def test_guia6_configuracoes_pesquisa_primeiro_e_prompt_sabe_onde_esta():
    import guia
    els = ["Pesquisar", "Conexões", "Sons e vibração", "Notificações"]
    r = c.post("/guia/proximo", json={"objetivo": "trocar o plano de fundo", "app": "com.android.settings", "elementos": els}).json()
    assert r["tipo"] == "tocar" and r["indice"] == 0
    # já pesquisou: não insiste
    r2 = guia.regra_certeira("trocar o plano de fundo", els, ["Pesquisar"], "app", [], app="com.android.settings")
    assert r2 is None
    p = guia.montar_prompt("trocar o plano de fundo", "com.android.settings", els, [], titulo="Visor",
                           caminho=["Configurações", "Visor"])
    assert 'na tela "Visor"' in p and "Configurações > Visor" in p


def test_guia7_plano():
    import guia
    r = c.post("/guia/plano", json={"objetivo": "ligar o bluetooth", "app": "celular"}).json()
    assert [p["tipo"] for p in r["passos"]] == ["painel", "tocar"] and r["passos"][1]["nome"] == "Bluetooth"
    assert guia.interpretar_plano({"passos": [{"tipo": "tocar", "nome": "Pagar"}, {"tipo": "tocar", "nome": "Pesquisar"},
                                              {"tipo": "voar"}]}) == [{"tipo": "tocar", "nome": "Pesquisar"}]


def test_guia8_tocar_ponto_so_com_imagem():
    import guia
    r = {"tipo": "tocar_ponto", "ponto": [880, 120], "nome": "o lápis", "fala": "É ali que edita."}
    p = guia.interpretar(r, ["Voltar"], "editar o contato", com_imagem=True)
    assert p["tipo"] == "tocar_ponto" and p["alvo"] == "880,120|o lápis" and "círculo" in p["fala"]
    assert guia.interpretar(r, ["Voltar"], "editar", com_imagem=False)["tipo"] == "esperar"
    assert guia.interpretar({**r, "ponto": [2000, 1]}, [], "x", com_imagem=True)["tipo"] == "esperar"
    assert "IMAGEM" in guia.montar_prompt("x", "app", [], [], com_imagem=True)


def test_play_store_abre_na_busca_do_app():
    from main import validar_acao
    a = validar_acao({"tipo": "guiar_app", "app": "playstore", "objetivo": "quero instalar o app do Banco do Brasil"}, "app")
    assert a["nome_app"] == "banco brasil"
    b = validar_acao({"tipo": "guiar_app", "app": "whatsapp", "objetivo": "mandar foto", "atalho": True, "nome_app": "x"}, "app")
    assert "atalho" not in b and "nome_app" not in b


def test_guia9_antigolpe_na_tela():
    tela = {"objetivo": "ver mensagem", "app": "com.whatsapp", "elementos": ["Responder"],
            "textos": ["URGENTE: sua conta será bloqueada hoje", "Pague a taxa no Pix e envie o código: bit.ly/caixa-premio"]}
    r = c.post("/guia/proximo", json=tela).json()
    assert r["alerta"] and "golpe" in r["alerta"]
    r = c.post("/guia/proximo", json={"objetivo": "ligar o wifi", "tela": "painel", "elementos": ["Wi-Fi [desligado]"]}).json()
    assert r["alerta"] is None


def test_ensino_explicar_e_palavras():
    import guia
    r = c.post("/guia/explicar", json={"app": "WhatsApp", "titulo": "Conversas", "elementos": ["Câmera", "Status", "Chamadas"]}).json()
    assert "Conversas" in r["fala"] and "Câmera" in r["fala"]
    f, p = guia.ensinar_palavra("Toque em Pesquisar.", [])
    assert p == "tocar" and "encostar" in f
    f, p = guia.ensinar_palavra("Toque em Pesquisar.", ["tocar"])
    assert p == "pesquisa"
    r = c.post("/guia/proximo", json={"objetivo": "desligar o wifi", "tela": "painel", "elementos": ["Wi-Fi [ligado]"], "palavras": []}).json()
    assert r["palavra"] == "tocar"


def test_roteiro_loja_confere_o_app():
    import guia
    obj = "quero instalar o app do Banco do Brasil"
    # página do BB (título não tem "Banco do Brasil", o desenvolvedor tem): aponta o Instalar, nunca o nome do desenvolvedor
    pagina = ["Voltar", "Banco do Brasil SA", "Instalar", "Compartilhar"]
    r = guia.roteiro_loja(obj, pagina, ["4,7", "Classificação Livre"], [], titulo="BB: Banco, Conta, Pix, Cartão")
    assert r["tipo"] == "tocar" and r["indice"] == 2
    # tela inicial da loja com Instalar de outros apps: não aponta nenhum, reabre a busca
    home = ["Pesquisar apps e jogos", "Instalar — Kwai", "Instalar — Shopee [anúncio]", "Instalar — Temu"]
    r = guia.roteiro_loja(obj, home, [], [], titulo="Para você")
    assert r["tipo"] == "abrir_busca" and r["alvo"] == "banco brasil"
    assert guia.roteiro_loja(obj, home, [], ["abrir_busca", "abrir_busca"], titulo="Para você") is None
    # resultados: o Instalar do app certo (pelo que está ao redor)
    res = ["Instalar — Inter&Co [anúncio]", "BB: Banco, Conta, Pix, Cartão Banco do Brasil SA", "Instalar — BB: Banco, Conta, Pix, Cartão, Banco do Brasil SA"]
    r = guia.roteiro_loja(obj, res, [], [], titulo="")
    assert r["tipo"] == "tocar" and r["indice"] == 2
    # página de outro app: reabre a busca
    r = guia.roteiro_loja(obj, ["Nubank", "Instalar"], [], [], titulo="Nubank: conta e cartão")
    assert r["tipo"] == "abrir_busca"
    # baixando e depois instalado
    assert guia.roteiro_loja(obj, ["Cancelar", "Abrir"], ["45% de 80 MB"], ["Instalar"], titulo="BB: Banco, Conta, Pix, Cartão")["tipo"] == "esperar"
    r = guia.roteiro_loja(obj, ["Banco do Brasil SA", "Desinstalar", "Abrir"], [], ["Instalar"], titulo="BB: Banco, Conta, Pix, Cartão")
    assert r["concluido"] and "foi instalado" in r["fala"]
    r = guia.roteiro_loja(obj, ["Banco do Brasil SA", "Desinstalar", "Abrir"], [], [], titulo="BB: Banco, Conta, Pix, Cartão")
    assert r["concluido"] and "já está instalado" in r["fala"]


def test_abre_o_app_certo_e_nao_anda_em_circulos():
    import guia
    from main import validar_acao
    a = validar_acao({"tipo": "guiar_app", "app": "maps", "objetivo": "colocar o endereço no GPS"}, "app")
    assert a["app"] == "celular" and a["abrir"] == "maps"
    a = validar_acao({"tipo": "guiar_app", "app": "celular", "abrir": "Maps", "objetivo": "rota para a casa do filho"}, "app")
    assert a["abrir"] == "Maps"
    assert falar("quero colocar o endereço da casa do meu filho no gps")["acao"]["abrir"] == "Maps"
    # "voltar" na tela inicial abria as notícias do Google (ciclo): vira uma pergunta
    r = guia.interpretar({"tipo": "voltar", "fala": "Me enganei."}, ["Google", "Maps"], "gps", tela="inicio")
    assert r["tipo"] == "esperar"
    # andando em círculos: não repete o mesmo gesto
    r = guia.interpretar({"tipo": "rolar_baixo"}, [], "x", repetindo=True, feitos=["rolar_baixo"])
    assert r["tipo"] == "esperar"
    assert "andando em círculos" in guia.montar_prompt("x", "app", [], [], repetindo=True)
    assert "Maps aberto" in guia.montar_plano("rota", "abrir:Maps")


def test_loja_sabe_quando_terminou_sem_titulo():
    import guia
    obj = "instalar o spotify"
    r = guia.roteiro_loja(obj, ["Cancelar", "Abrir"], [], ["Instalar"], titulo="")
    assert r["tipo"] == "esperar" and not r["concluido"]
    r = guia.roteiro_loja(obj, ["Desinstalar", "Abrir"], [], ["Instalar"], titulo="")
    assert r["concluido"] and "foi instalado" in r["fala"]


def test_interruptor_generico_no_detalhe():
    import guia
    els = ["Ativado [ligado] — Bluetooth, Ative o Bluetooth para consultar uma lista"]
    r = guia.regra_certeira("quero ligar o bluetooth", els, [], "painel")
    assert r["concluido"] and "Bluetooth já está ligado" in r["fala"]
    r = guia.interpretar({"tipo": "tocar", "indice": 0}, ["Desativado [desligado] — Bluetooth, Ative"], "quero ligar o bluetooth")
    assert r["tipo"] == "tocar"


def test_painel_detalhe_bluetooth_conclui():
    r = c.post("/guia/proximo", json={"objetivo": "quero ligar o bluetooth", "tela": "painel", "app": "com.android.systemui",
                                      "elementos": ["Ativado [ligado] — Bluetooth, Ative o Bluetooth", "Concluído"]}).json()
    assert r["concluido"]


def test_robo_rodada2():
    import guia
    # pesquisa: nunca a "por voz"; campo antes da lupa
    assert guia.busca(["Pesquisa por voz", "Pesquisar"]) == 1
    assert guia.busca(["Pesquisar", "Pesquise aqui [campo]"]) == 1
    # campo de pesquisa aberto: escrever, não tocar de novo
    r = guia.regra_certeira("quero assistir um vídeo de receita de bolo", ["Voltar", "Pesquisar no YouTube [campo aberto]"], ["Pesquisar"], "app", [], app="com.google.android.youtube")
    assert r["tipo"] == "esperar" and "escreva" in r["fala"].lower()
    r = guia.interpretar({"tipo": "tocar", "indice": 0}, ["Pesquisar [campo aberto]"], "achar fotos de ontem")
    assert r["tipo"] == "esperar"
    # procurar algo num app: a pesquisa primeiro (Maps: nada de "Compartilhar localização")
    els = ["Compartilhar localização atual — Camadas", "Pesquise aqui [campo]", "Pesquisa por voz"]
    r = guia.regra_certeira("quero procurar a Avenida Paulista no GPS", els, [], "app", [], app="com.google.android.apps.maps")
    assert r["tipo"] == "tocar" and r["indice"] == 1
    # tocou num item que é só informação: se queria ver, conclui
    r = guia.interpretar({"tipo": "tocar", "indice": 0}, ["Versão Android — Versão do One UI, 9.0"], "como eu vejo a versão do Android",
                         seguiu="Versão Android — Versão do One UI, 9.0", mesma_tela=True)
    assert r["concluido"]
    r = guia.interpretar({"tipo": "tocar", "indice": 0}, ["Status da bateria — Carregando"], "ligar o modo economia", seguiu="Status da bateria",
                         mesma_tela=True)
    assert r["tipo"] == "esperar" and not r["concluido"]
    # tela nova com item de mesmo nome (resultado da busca → página): NÃO é repetição
    r = guia.interpretar({"tipo": "tocar", "indice": 0}, ["Tamanho e estilo da fonte — Claro, Escuro"], "onde eu mudo o tamanho da letra",
                         seguiu="Tamanho e estilo da fonte", mesma_tela=False)
    assert r["tipo"] == "tocar"
    # botão de ajuste: um toque já basta
    r = guia.interpretar({"tipo": "tocar", "indice": 0}, ["Aumentar tam. da fonte — Reduzir"], "aumentar a letra",
                         seguiu="Aumentar tam. da fonte", mesma_tela=True)
    assert r["concluido"]
    # tela de escolher foto aberta pelo passo anterior: escolher, não "me enganei"
    r = guia.interpretar({"tipo": "voltar", "fala": "Me enganei."}, ["Recentes"], "trocar o papel de parede", seguiu="Galeria",
                         titulo="Nenhum item foi selecionado")
    assert r["tipo"] == "esperar" and "escolha a foto" in r["fala"]


def test_bluetooth_desligado_com_outro_interruptor_ativado():
    # Detalhe do Bluetooth no Samsung: o botão do Bluetooth está desligado e uma OPÇÃO está "Ativado".
    els = ["Bluetooth [desligado]", "Ativado [ligado] — Bluetooth, Mostrar dispositivos sem nome"]
    r = c.post("/guia/proximo", json={"objetivo": "quero ligar o bluetooth", "tela": "painel", "app": "com.android.systemui", "elementos": els}).json()
    assert not r["concluido"] and r["tipo"] == "tocar" and r["indice"] == 0
    # dois interruptores no detalhe: não dá para saber qual é o Bluetooth → não conclui por conta própria
    els = ["Desativado [desligado] — Bluetooth, Ative o Bluetooth", "Ativado [ligado] — Bluetooth, Mostrar dispositivos"]
    r = c.post("/guia/proximo", json={"objetivo": "quero ligar o bluetooth", "tela": "painel", "app": "com.android.systemui", "elementos": els}).json()
    assert not r["concluido"]


def test_robo_rodada4():
    import guia
    loja = "com.android.vending"
    # resultado: o nome do botão tem que ser o app (não "Navegar para cima — spotify"); "Instalado" conclui
    els = ["Navegar para cima — spotify", "Spotify: música e podcasts Instalado — Abrir"]
    r = guia.roteiro_loja("quero instalar o Spotify", els, [], [], titulo="Play Store")
    assert r["concluido"] and "já está instalado" in r["fala"]
    # página carregando: espera em vez de reabrir a busca
    r = guia.roteiro_loja("quero instalar o Spotify", ["Voltar", "Mais opções"], [], [], titulo="")
    assert r["tipo"] == "esperar" and not r["concluido"]
    # termo de busca na ordem da frase
    assert guia.termo_de_busca("quero procurar a Avenida Paulista no GPS") == "Avenida Paulista"
    # depois de pesquisar, achou o que procurava = concluiu
    r = guia.regra_certeira("quero procurar a Avenida Paulista no GPS", ["Iniciar — Rotas", "Av. Paulista"], ["Busque aqui"], "app",
                            ["Avenida Paulista, São Paulo"], app="com.google.android.apps.maps", titulo="Maps")
    assert r["concluido"]


def test_rodada5():
    import guia
    # Maps: depois de tocar na pesquisa, o teclado abriu numa lista de recentes: escrever, não voltar
    r = guia.regra_certeira("quero procurar a Avenida Paulista no GPS", ["Voltar", "Casa", "Trabalho"], ["Busque aqui"], "app", [],
                            app="com.google.android.apps.maps", titulo="Recentes", teclado=True, seguiu="Busque posto/caixa 24h")
    assert r["tipo"] == "esperar" and "Avenida Paulista" in r["fala"]
    r = guia.interpretar({"tipo": "voltar"}, ["Casa"], "procurar a Paulista", seguiu="Busque aqui")
    assert r["tipo"] == "esperar"
    # conversa sem IA: fotos vão para a Galeria
    assert falar("quero ver as fotos que eu tirei ontem")["acao"]["abrir"] == "Galeria"


def test_rodada6_galeria():
    import guia
    assert guia.tocar(["Botão — Ontem"], 0)["fala"] == "Toque em Ontem."
    # ver fotos de ontem: depois de um passo, "Ontem" na tela = pronto
    r = guia.regra_certeira("quero ver as fotos que eu tirei ontem", ["Agrupar por data", "Botão — Ontem"], ["Pesquisar"], "app",
                            ["Ontem", "22 itens"], app="com.sec.android.gallery3d", titulo="Resultados da pesquisa", seguiu="Pesquisar")
    assert r["concluido"]
    # tela da Galeria só conta como "escolher foto" quando o pedido é de escolher (papel de parede, mandar foto)
    r = guia.interpretar({"tipo": "voltar"}, ["Recentes"], "ver as fotos de ontem", seguiu="Ontem", titulo="Galeria")
    assert r["tipo"] == "voltar"


def test_rodada7_galeria_ver_ontem():
    import guia
    r = guia.regra_certeira("quero ver as fotos que eu tirei ontem", ["Agrupar por data", "Botão — Ontem"], ["Pesquisar", "Agrupar por data"], "app",
                            ["22 itens"], app="com.sec.android.gallery3d", titulo="Resultados da pesquisa", seguiu="Agrupar por data")
    assert r["concluido"]
    # sugestões da busca (teclado aberto) não contam
    r = guia.regra_certeira("quero ver as fotos que eu tirei ontem", ["ontem — Excluir"], ["Pesquisar"], "app", [],
                            app="com.sec.android.gallery3d", titulo="Resultados da pesquisa", seguiu="Pesquisar", teclado=True)
    assert not (r and r.get("concluido"))


def test_rodada8_gps_abreviado():
    import guia
    r = guia.regra_certeira("quero procurar a Avenida Paulista no GPS", ["Rotas para Av. Paulista — Rotas"], ["Busque aqui"], "app",
                            ["Av. Paulista", "São Paulo - SP"], app="com.google.android.apps.maps", titulo="Maps")
    assert r["concluido"]


def test_conversa_em_partes_termina_com_final():
    import json as _json
    r = c.post("/conversa/fluxo", json={"mensagens": [{"papel": "pessoa", "texto": "quero ligar o bluetooth"}]})
    assert r.status_code == 200
    linhas = [_json.loads(l) for l in r.text.splitlines() if l.strip()]
    assert "final" in linhas[-1] and linhas[-1]["final"]["fala"]


def test_frases_prontas_so_frase_completa():
    from ia import fala_parcial, frases_prontas
    assert frases_prontas(fala_parcial('{"fala": "Claro! Vou te mostrar. Prim'), 0)[0] == "Claro! Vou te mostrar."
    assert frases_prontas(fala_parcial('{"fala": "Custa R$ 1.5'), 0)[0] == ""


# ---------- Fala nunca sai como JSON cru nem cortada (bug: balão mostrou '{"fala": "Para mexer na localização...') ----------

def _fluxo_com(monkeypatch, pedacos, reserva=None):
    """Roda /conversa/fluxo com o Gemini fingido mandando estes pedaços; reserva = o que gerar() devolve se chamado."""
    import json as _json
    import main

    async def fluxo_fingido(*a, **k):
        for p in pedacos:
            yield p

    chamadas = []

    async def gerar_fingido(*a, **k):
        chamadas.append(1)
        if reserva is None:
            raise main.httpx.ConnectError("sem rede")
        return reserva

    monkeypatch.setattr(main, "provedor", lambda: "gemini")
    monkeypatch.setattr(main, "gerar_fluxo", fluxo_fingido)
    monkeypatch.setattr(main, "gerar", gerar_fingido)
    r = c.post("/conversa/fluxo", json={"mensagens": [{"papel": "pessoa", "texto": "como desligo a localização?"}]})
    assert r.status_code == 200
    linhas = [_json.loads(l) for l in r.text.splitlines() if l.strip()]
    parciais = [l["parcial"] for l in linhas if "parcial" in l]
    for p in parciais:
        assert "{" not in p and '"fala"' not in p and "```" not in p
    final = linhas[-1]["final"]
    assert "{" not in final["fala"] and '"fala"' not in final["fala"] and "```" not in final["fala"]
    return parciais, final, chamadas


def test_extrair_json_puro_e_com_cerca():
    from ia import _extrair_json
    fala = "Para desligar a localização, puxe o alto da tela pelo lado direito."
    assert _extrair_json('{"fala": "%s", "acao": null}' % fala)["fala"] == fala
    assert _extrair_json('```json\n{"fala": "%s", "acao": null}\n```' % fala)["fala"] == fala
    assert _extrair_json('```json\n{"fala": "%s"' % fala)["fala"] == fala  # cerca e JSON sem fechar
    # JSON dentro da fala
    assert _extrair_json('{"fala": "{\\"fala\\": \\"%s\\"}", "acao": null}' % fala)["fala"] == fala
    assert _extrair_json("Oi, tudo bem?")["fala"] == "Oi, tudo bem?"  # texto puro continua valendo


def test_extrair_json_cortado_nunca_repassa_cru():
    import pytest
    from ia import RespostaQuebrada, _extrair_json
    # o caso do bug: cortou sem nenhuma frase inteira
    with pytest.raises(RespostaQuebrada):
        _extrair_json('{"fala": "Para mexer na localização, você puxa o alto da tela pelo')
    # cortou depois de uma frase inteira: fica só ela
    r = _extrair_json('{"fala": "Claro! Vou te mostrar. Puxe o alto da tela pelo')
    assert r["fala"] == "Claro! Vou te mostrar."


def test_fluxo_json_puro(monkeypatch):
    fala = "Para desligar a localização, puxe o alto da tela pelo lado direito."
    parciais, final, chamadas = _fluxo_com(monkeypatch, ['{"fala": "%s", "acao": null}' % fala])
    assert final["fala"] == fala and not chamadas


def test_fluxo_json_com_cerca_de_codigo(monkeypatch):
    fala = "Claro! Para desligar a localização, puxe o alto da tela pelo lado direito."
    parciais, final, chamadas = _fluxo_com(monkeypatch, ["```json\n", '{"fala": "Claro! Para desligar a ', 'localização, puxe o alto da tela pelo lado direito."', ', "acao": null}\n```'])
    assert parciais[0] == "Claro!" and final["fala"] == fala and not chamadas


def test_fluxo_json_quebrado_entre_pedacos(monkeypatch):
    fala = "Claro! Vou te mostrar. Puxe o alto da tela pelo lado direito."
    pedacos = ['{"fa', 'la": "Cla', 'ro! Vou te mos', 'trar. Puxe o alto da tela pe', 'lo lado direito."', ', "ac', 'ao": nu', 'll}']
    parciais, final, chamadas = _fluxo_com(monkeypatch, pedacos)
    # a última frase não vai como parcial (pode ser "R$ 1.5" ainda chegando): ela vem no final, inteira
    assert parciais == ["Claro!", "Vou te mostrar."] and final["fala"] == fala and not chamadas


def test_fluxo_cortado_sem_frase_inteira_cai_para_resposta_normal(monkeypatch):
    # o bug: o Gemini parou no meio e o JSON cru virou a fala
    inteira = {"fala": "Para desligar a localização, puxe o alto da tela pelo lado direito.", "acao": None}
    parciais, final, chamadas = _fluxo_com(monkeypatch, ['{"fala": "Para mexer na localização, você puxa o alto da tela pelo'], reserva=inteira)
    assert not parciais and chamadas and final["fala"] == inteira["fala"]


def test_fluxo_cortado_depois_de_frases_fica_com_o_que_foi_dito(monkeypatch):
    parciais, final, chamadas = _fluxo_com(monkeypatch, ['{"fala": "Claro! Vou te mostrar. Puxe o alto da tela pe'])
    assert parciais == ["Claro! Vou te mostrar."] and final["fala"] == "Claro! Vou te mostrar." and not chamadas


def test_fluxo_cortado_e_ia_fora_cai_nas_regras(monkeypatch):
    parciais, final, chamadas = _fluxo_com(monkeypatch, ['```json\n{"fala": "Para mexer na'])
    assert chamadas and final["provedor"].startswith("regras") and final["fala"]


def test_fala_parcial_com_json_dentro():
    from ia import fala_parcial
    assert fala_parcial('{"fala": "{\\"fala\\": \\"Oi! Tudo') == "Oi! Tudo"


def test_portal_simulado_identidade_propria_e_extrato_do_inss():
    import gov_simulado
    urls = ["/gov", "/gov/inicio", "/gov/saude", "/gov/saude/agendar", "/gov/saude/agendar/ubs-centro",
            "/gov/saude/agendar/ubs-centro/h1", "/gov/saude/minhas", "/gov/inss", "/gov/inss/extrato", "/gov/veiculos", "/gov/veiculos/multas"]
    for u in urls:
        h = c.get(u).text
        assert "Simulação — ambiente de demonstração" in h and "Portal do Cidadão" in h, u
        assert "gov.br" not in h, u  # identidade própria
    ex = c.get("/gov/inss/extrato").text
    b = gov_simulado.BENEFICIO
    assert b["valor"] in ex and "Próximo pagamento" in ex and b["data"] in ex
    # o fluxo do INSS continua com os mesmos 3 toques
    assert gov_simulado.FLUXOS["beneficio"]["passos"] == [gov_simulado.ENTRAR, "Meu INSS", "Extrato de pagamento"]
    r = c.post("/gov/saude/agendar/ubs-centro/h1", follow_redirects=True)
    assert "Protocolo" in r.text and "SIM-" in r.text


def test_ensinar_comeca_do_comeco_sem_atalho():
    import guia
    from main import validar_acao
    assert guia.quer_aprender("me ensina a instalar o Bradesco")
    assert guia.quer_aprender("como eu instalo o WhatsApp?")
    assert not guia.quer_aprender("quero instalar o facebook")
    assert guia.nome_do_app("me ensina a instalar o Bradesco") == "bradesco"
    # ensinar: sem busca já feita e começando da tela inicial
    a = validar_acao({"tipo": "guiar_app", "app": "playstore", "objetivo": "me ensina a instalar o Bradesco"}, "app")
    assert a["ensinar"] is True and a["app"] == "celular" and "nome_app" not in a
    # fazer por ela: o atalho continua
    a = validar_acao({"tipo": "guiar_app", "app": "playstore", "objetivo": "instalar o Bradesco"}, "app")
    assert a["nome_app"] == "bradesco" and "ensinar" not in a
    # a conversa marca ensinar pelo que a pessoa disse
    r = falar("me ensina a instalar o facebook")
    assert r["acao"]["tipo"] == "guiar_app" and r["acao"].get("ensinar") is True and "nome_app" not in r["acao"]
    obj = "me ensina a instalar o Bradesco"
    loja = guia.LOJA
    # tela inicial do celular: aponta a Play Store
    r = guia.regra_certeira(obj, ["Galeria", "Play Store", "Câmera"], [], "inicio", app="com.sec.android.app.launcher", ensinar=True)
    assert r["tipo"] == "tocar" and r["indice"] == 1
    # tela inicial da loja: a pesquisa (nunca reabre a busca já feita, nunca um Instalar de outro app)
    home = ["Pesquisar apps e jogos", "Instalar — Kwai", "Instalar — Shopee [anúncio]"]
    r = guia.roteiro_loja(obj, home, [], [], titulo="Para você", ensinar=True)
    assert r["tipo"] == "tocar" and r["indice"] == 0
    # campo aberto: escrever o nome
    r = guia.roteiro_loja(obj, ["Voltar", "Pesquisar apps e jogos [campo aberto]"], [], ["Pesquisar apps e jogos"], titulo="", ensinar=True)
    assert r["tipo"] == "esperar" and "Bradesco" in r["fala"]
    # resultados: escolhe o app certo, e a proteção do Instalar continua
    res = ["Bradesco [campo aberto]", "Instalar — Inter&Co [anúncio]", "Instalar — Bradesco: Conta, Cartão e Pix, Banco Bradesco SA"]
    r = guia.roteiro_loja(obj, res, [], ["Pesquisar apps e jogos"], titulo="", ensinar=True)
    assert r["tipo"] == "tocar" and r["indice"] == 2
    # página de outro app: vai pela pesquisa, sem abrir_busca
    r = guia.roteiro_loja(obj, ["Pesquisar", "Nubank", "Instalar"], [], [], titulo="Nubank: conta e cartão", ensinar=True)
    assert r["tipo"] == "tocar" and r["alvo"] == "Pesquisar"
    assert "MODO ENSINO" in guia.montar_prompt(obj, "app", [], [], ensinar=True)
    assert "MODO ENSINO" not in guia.montar_prompt(obj, "app", [], [])


def test_app_de_banco_so_protegido_quando_aberto(monkeypatch):
    import main
    from prompt_lia import montar_sistema
    # o prompt deixa claro: instalar/abrir é permitido, a proteção vale só com o app aberto
    s = montar_sistema("app", {}, None)
    assert "SÓ quando o app está ABERTO" in s and "Nunca recuse esses pedidos" in s

    # a IA recusou por engano: a Lia guia assim mesmo, sem a frase do banco
    async def recusa(*a, **k):
        return {"fala": "Aqui é o aplicativo do seu banco. Por segurança, eu não olho esta tela.", "acao": None}

    monkeypatch.setattr(main, "provedor", lambda: "gemini")
    monkeypatch.setattr(main, "gerar", recusa)
    r = falar("me ensina a instalar o Bradesco")
    assert r["acao"]["tipo"] == "guiar_app" and r["acao"].get("ensinar") is True and r["acao"]["app"] == "celular"
    assert "não olho esta tela" not in r["fala"]
    r = falar("quero instalar o app do Itaú")
    assert r["acao"]["app"] == "playstore" and r["acao"]["nome_app"]
    r = falar("abre o Nubank pra mim")
    assert r["acao"]["app"] == "celular" and r["acao"]["abrir"] == "Nubank" and "não olho esta tela" not in r["fala"]
    r = falar("onde acho o app do Bradesco?")
    assert r["acao"]["tipo"] == "guiar_app" and r["acao"]["app"] == "celular"

    # app do banco ABERTO na tela (o Guia avisa): aí sim, a frase do banco e nada de guiar
    r = falar("abre o Bradesco", contexto={"guia": "um app protegido está aberto; o Guia não olha esta tela"})
    assert r["acao"] is None and "Aqui é o aplicativo do seu banco" in r["fala"]
    # pedido de fazer algo DENTRO do banco continua sem guiar
    r = falar("faz um pix no Bradesco pra mim")
    assert r["acao"] is None

    # sem IA (modo teste), instalar o app do banco também é guiado
    monkeypatch.setattr(main, "provedor", lambda: "teste")
    r = falar("me ensina a instalar o Bradesco")
    assert r["acao"]["tipo"] == "guiar_app" and r["acao"].get("ensinar") is True
