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
        assert "SIMULAÇÃO" in html
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
