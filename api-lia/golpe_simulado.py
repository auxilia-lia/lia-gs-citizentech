"""Site de GOLPE SIMULADO, para demonstrar o antigolpe da Lia no vídeo.
Projeto acadêmico: marca inventada ("Resgata Já"), sem imitar órgão, banco ou empresa real.
Nada aqui funciona: não há formulário, nenhum dado é enviado nem guardado, o "Pix" não tem valor.
O texto reúne os sinais clássicos do golpe de "dinheiro esquecido" (prêmio + pressa + taxa por Pix + CPF),
que o antigolpe.py reconhece.
"""
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/resgate")

CSS = """
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#0f7a3d;color:#111}
.topo{background:#ffd400;color:#0b3d1f;text-align:center;padding:10px 14px;font-weight:800;font-size:15px;letter-spacing:.3px}
.marca{display:flex;align-items:center;gap:10px;padding:18px 18px 6px;color:#fff}
.marca b{font-size:24px;letter-spacing:-.5px}
.selo{width:40px;height:40px;border-radius:50%;background:#ffd400;color:#0b3d1f;display:flex;align-items:center;
      justify-content:center;font-weight:900;font-size:22px}
.cartao{background:#fff;margin:14px;border-radius:18px;padding:22px 18px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
h1{font-size:26px;line-height:1.15;margin:0 0 10px;color:#0b3d1f}
.valor{font-size:40px;font-weight:900;color:#0f7a3d;margin:6px 0 2px}
.pequeno{font-size:14px;color:#555;margin:0 0 14px}
.relogio{background:#ffefef;color:#b00020;border-radius:12px;padding:10px 12px;font-weight:700;font-size:15px;margin:12px 0}
label{display:block;font-weight:700;margin:14px 0 6px}
.campo{width:100%;font-size:20px;padding:14px;border:2px solid #0f7a3d;border-radius:12px;background:#f7fff9}
.botao{display:block;text-align:center;background:#ffd400;color:#0b3d1f;font-weight:900;font-size:20px;padding:16px;
       border-radius:14px;text-decoration:none;margin-top:16px}
.lista{margin:10px 0 0;padding-left:20px;font-size:15px;line-height:1.5}
.pix{font-family:monospace;font-size:13px;background:#f2f2f2;border-radius:10px;padding:12px;word-break:break-all}
.depo{color:#e8ffe9;font-size:14px;margin:4px 18px;line-height:1.45}
.rodape{color:#cfe9d7;font-size:12px;text-align:center;padding:18px 20px 30px;line-height:1.4}
"""

RODAPE = ('<div class="rodape">Página de demonstração de um projeto acadêmico. Marca inventada.<br>'
          'Nada aqui funciona de verdade e nenhum dado é enviado.</div>')


def pagina(titulo: str, corpo: str) -> HTMLResponse:
    return HTMLResponse(f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>{titulo}</title>
<style>{CSS}</style></head><body>
<div class="topo">ÚLTIMAS HORAS PARA RESGATAR SEU DINHEIRO</div>
<div class="marca"><div class="selo">R$</div><b>Resgata Já</b></div>
{corpo}
{RODAPE}
</body></html>""")


@router.get("")
@router.get("/")
def inicio():
    return pagina("Resgata Já - dinheiro esquecido", """
<div class="cartao">
  <h1>Você tem dinheiro esquecido para receber!</h1>
  <div class="valor">R$ 1.847,32</div>
  <p class="pequeno">valor encontrado em seu nome</p>
  <div class="relogio">⏰ Urgente: o resgate vence hoje às 23h59</div>
  <label>Digite seu CPF para liberar</label>
  <input class="campo" inputmode="numeric" placeholder="000.000.000-00" autocomplete="off">
  <a class="botao" href="/resgate/liberar">Resgatar agora</a>
  <ul class="lista">
    <li>Pague só a taxa de liberação de R$ 29,90 por Pix</li>
    <li>O dinheiro cai na sua conta em 5 minutos</li>
  </ul>
</div>
<p class="depo">"Recebi R$ 2.300 que eu nem sabia que tinha!" — D. Cida</p>
""")


@router.get("/liberar")
def liberar():
    return pagina("Resgata Já - pagar taxa", """
<div class="cartao">
  <h1>Falta só um passo!</h1>
  <p class="pequeno">Para liberar os <b>R$ 1.847,32</b>, pague a taxa de liberação agora.</p>
  <div class="valor">R$ 29,90</div>
  <div class="relogio">⏰ Se não pagar hoje, o valor será cancelado</div>
  <label>Pix copia e cola</label>
  <div class="pix">DEMONSTRACAO-SEM-VALOR-0000-0000-0000</div>
  <a class="botao" href="/resgate/liberar">Pagar agora</a>
</div>
""")
