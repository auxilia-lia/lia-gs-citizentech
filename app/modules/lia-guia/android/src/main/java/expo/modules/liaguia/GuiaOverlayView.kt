package expo.modules.liaguia

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.os.SystemClock
import android.provider.Settings
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.view.View
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

// Camada transparente por cima de outro app. Mostra UMA coisa por vez:
// - o botão a tocar (holofote: o resto escurece; anel âmbar com ondas e um dedo que "toca"), ou
// - um gesto animado (dedo encosta, desliza deixando um rastro e levanta), ou
// - só o balão da Lia (com os três pontinhos quando ela está pensando).
// As trocas são animadas: o anel desliza de um botão para o outro, o holofote e o balão aparecem suavemente,
// e no acerto um círculo verde com um "check" confirma. Se o celular está com as animações desligadas
// (acessibilidade), tudo aparece sem movimento.
// Não recebe toques: quem toca é a pessoa, no app de baixo. Sempre criada e usada na thread principal.
class GuiaOverlayView(context: Context) : View(context) {
  private enum class Modo { NADA, ALVO, GESTO, MENSAGEM }

  private val d = resources.displayMetrics.density
  private val loc = IntArray(2)
  private val semMovimento = try {
    Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
  } catch (_: Exception) { false }

  // ---------- cores (as mesmas do app) ----------
  private val ambar = Color.parseColor("#F5B544")
  private val ambarForte = Color.parseColor("#FFB300")
  private val marinho = Color.parseColor("#0B1B4D")
  private val verde = Color.parseColor("#16A06A")

  // ---------- estado ----------
  private var modo = Modo.NADA
  private var gesto = ""
  private var mensagem = ""
  private var alvo: RectF? = null // onde o anel está indo
  private var alvoDe: RectF? = null // de onde o anel saiu (para deslizar)
  private var tAlvo = 0L
  private var tGesto = 0L
  private var tMsg = 0L
  private var tHolofote = 0L
  private var holofoteDe = 0f // opacidade do holofote quando a troca começou
  private var holofotePara = 0f
  private var ultimoBuraco: RectF? = null // onde estava o botão: o holofote some a partir dele, sem "piscar"
  private data class Acerto(val r: RectF, val t: Long)
  private val acertos = mutableListOf<Acerto>()

  // ---------- pincéis ----------
  private val anel = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 5 * d; color = ambar }
  private val brilho = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
  private val onda = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 3 * d }
  private val sombraTela = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
  private val dedo = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL; color = Color.WHITE }
  private val dedoBorda = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 4 * d; color = ambarForte }
  private val dedoSombra = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL; color = Color.argb(60, 0, 0, 0) }
  private val rastro = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 10 * d; strokeCap = Paint.Cap.ROUND }
  private val seta = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 5 * d; strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND }
  private val balao = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = marinho }
  private val balaoSombra = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(70, 0, 0, 0) }
  private val avatar = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ambar }
  private val barra = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = marinho; strokeCap = Paint.Cap.ROUND; style = Paint.Style.STROKE; strokeWidth = 3 * d }
  private val ponto = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
  private val sucesso = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
  private val check = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 6 * d; color = Color.WHITE; strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND }

  // Segue o tamanho de letra do celular: quem usa letra grande vê o balão grande.
  private val escalaFonte = resources.configuration.fontScale.coerceIn(1f, 1.5f)
  private val texto = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; textSize = 21 * d * escalaFonte; isFakeBoldText = true }

  // Teclado aberto: o balão vai para o alto da tela, menor, e nunca fica por cima do teclado.
  private var tecladoTopo: Int? = null
  private var barraTopo = resources.getIdentifier("status_bar_height", "dimen", "android").let { if (it > 0) resources.getDimensionPixelSize(it) else (24 * d).toInt() }
  fun definirTeclado(topo: Int?, barra: Int) { tecladoTopo = topo; barraTopo = barra; invalidate() }

  // ================= API usada pelo serviço =================

  fun mostrarAlvo(rect: Rect, msg: String) {
    val novo = RectF(rect)
    val agora = SystemClock.uptimeMillis()
    if (modo != Modo.ALVO || alvo == null) {
      alvoDe = null // aparece no lugar (com zoom)
      tAlvo = agora
    } else if (!igual(alvo!!, novo)) {
      alvoDe = anelAgora(agora) // desliza do lugar onde estava
      tAlvo = agora
    }
    alvo = novo
    trocarMensagem(msg)
    trocarModo(Modo.ALVO, agora)
  }

  fun mostrarGesto(tipo: String, msg: String) {
    val agora = SystemClock.uptimeMillis()
    if (modo != Modo.GESTO || gesto != tipo) tGesto = agora
    gesto = tipo
    trocarMensagem(msg)
    trocarModo(Modo.GESTO, agora)
  }

  fun mostrarMensagem(msg: String) {
    val agora = SystemClock.uptimeMillis()
    trocarMensagem(msg)
    trocarModo(if (msg.isBlank()) Modo.NADA else Modo.MENSAGEM, agora)
  }

  fun limpar() { mostrarMensagem("") }

  // Acertou: círculo verde com "check" no lugar tocado (sobrevive à troca de tela).
  fun mostrarAcerto(rect: Rect?) {
    val r = rect?.let { RectF(it) } ?: return
    acertos.add(Acerto(r, SystemClock.uptimeMillis()))
    postInvalidateOnAnimation()
  }

  // ================= transições =================

  private fun trocarModo(novo: Modo, agora: Long) {
    val holofote = if (novo == Modo.ALVO) 1f else 0f
    if (holofote != holofotePara) {
      holofoteDe = holofoteAgora(agora)
      holofotePara = holofote
      tHolofote = agora
    }
    modo = novo
    postInvalidateOnAnimation()
  }

  private fun trocarMensagem(msg: String) {
    if (msg != mensagem) {
      // Só reanima se o texto mudou de verdade (os "…" de espera não piscam a cada leitura).
      if (msg.trimEnd('…', '.', ' ') != mensagem.trimEnd('…', '.', ' ')) tMsg = SystemClock.uptimeMillis()
      mensagem = msg
    }
  }

  private fun igual(a: RectF, b: RectF) = kotlin.math.abs(a.centerX() - b.centerX()) < 2 && kotlin.math.abs(a.centerY() - b.centerY()) < 2 &&
    kotlin.math.abs(a.width() - b.width()) < 2

  // Progresso 0..1 de uma animação que começou em t0 e dura `dur` ms.
  private fun prog(t0: Long, dur: Long, agora: Long): Float =
    if (semMovimento) 1f else ((agora - t0).toFloat() / dur).coerceIn(0f, 1f)

  private fun suave(t: Float) = t * t * (3 - 2 * t) // ease in-out
  private fun saida(t: Float) = 1 - (1 - t) * (1 - t) * (1 - t) // ease out
  private fun mola(t: Float): Float { // ease out com um leve "passar do ponto"
    val c = 1.4f
    val x = t - 1
    return 1 + (c + 1) * x * x * x + c * x * x
  }

  private fun holofoteAgora(agora: Long) = holofoteDe + (holofotePara - holofoteDe) * suave(prog(tHolofote, 260, agora))

  private fun anelAgora(agora: Long): RectF {
    val para = alvo ?: return RectF()
    val de = alvoDe
    val t = mola(prog(tAlvo, 420, agora))
    if (de == null) {
      // Primeira vez: o anel "chega" crescendo um pouco e assentando.
      val e = (1 - t) * 18 * d
      return RectF(para.left - e, para.top - e, para.right + e, para.bottom + e)
    }
    return RectF(
      de.left + (para.left - de.left) * t, de.top + (para.top - de.top) * t,
      de.right + (para.right - de.right) * t, de.bottom + (para.bottom - de.bottom) * t,
    )
  }

  // ================= desenho =================

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    getLocationOnScreen(loc) // as posições vêm em coordenadas da tela
    val agora = SystemClock.uptimeMillis()
    val w = width.toFloat()
    val h = height.toFloat()
    canvas.save()
    canvas.translate(-loc[0].toFloat(), -loc[1].toFloat())

    val holofote = holofoteAgora(agora)
    when (modo) {
      Modo.ALVO -> alvo?.let { desenharAlvo(canvas, agora, holofote) }
      Modo.GESTO -> { desenharSombra(canvas, ultimoBuraco, holofote); desenharGesto(canvas, agora) }
      else -> desenharSombra(canvas, ultimoBuraco, holofote)
    }
    desenharAcertos(canvas, agora)
    canvas.restore()

    if (mensagem.isNotBlank()) {
      val topo = when (modo) {
        Modo.ALVO -> alvo?.let { posicaoBalaoAlvo(anelAgora(agora), h) } ?: h * 0.7f
        Modo.GESTO -> h * when (gesto) { "painel" -> 0.46f; "rolar_baixo", "rolar_cima" -> 0.12f; "voltar" -> 0.18f; else -> 0.4f }
        else -> if (tecladoTopo != null) 0f else h * 0.68f
      }
      val ponta = if (modo == Modo.ALVO) alvo?.let { anelAgora(agora).centerX() - loc[0] } else null
      desenharBalao(canvas, topo, agora, ponta, alvo?.let { anelAgora(agora).centerY() - loc[1] })
    }

    // Continua animando enquanto houver algo na tela.
    if (modo != Modo.NADA || acertos.isNotEmpty() || holofote > 0.01f) postInvalidateOnAnimation()
  }

  // Escurece tudo menos o buraco (o botão certo).
  private fun desenharSombra(canvas: Canvas, buraco: RectF?, forca: Float) {
    if (forca <= 0.01f) return
    sombraTela.color = Color.argb((125 * forca).toInt(), 6, 12, 32)
    val w = (width + loc[0]).toFloat()
    val h = (height + loc[1]).toFloat()
    if (buraco == null) { canvas.drawRect(0f, 0f, w, h, sombraTela); return }
    val raio = min(22 * d, min(buraco.width(), buraco.height()) / 2)
    val p = Path().apply {
      fillType = Path.FillType.EVEN_ODD
      addRect(0f, 0f, w, h, Path.Direction.CW)
      addRoundRect(buraco, raio, raio, Path.Direction.CW)
    }
    canvas.drawPath(p, sombraTela)
  }

  private fun desenharAlvo(canvas: Canvas, agora: Long, holofote: Float) {
    val base = anelAgora(agora)
    val folga = 10 * d
    val r = RectF(base.left - folga, base.top - folga, base.right + folga, base.bottom + folga)
    val raio = min(22 * d, min(r.width(), r.height()) / 2)
    ultimoBuraco = RectF(r)
    desenharSombra(canvas, r, holofote)

    val chegada = saida(prog(tAlvo, 300, agora))
    val alfa = (255 * chegada).toInt()

    // Ondas: dois anéis que saem do botão e somem, como um sinal chamando.
    if (!semMovimento) {
      for (k in 0..1) {
        val f = (((agora - tAlvo) + k * 800L) % 1600L) / 1600f
        val e = 4 * d + 20 * d * saida(f)
        onda.color = Color.argb(((1 - f) * 150 * chegada).toInt(), 245, 181, 68)
        canvas.drawRoundRect(RectF(r.left - e, r.top - e, r.right + e, r.bottom + e), raio + e, raio + e, onda)
      }
    }
    // Brilho macio em volta (camadas do mais largo ao mais fino).
    val respira = if (semMovimento) 0.5f else (0.5f + 0.5f * sin((agora - tAlvo) / 1000f * 2 * PI).toFloat())
    for ((larg, a) in listOf(18f to 28, 12f to 45, 8f to 70)) {
      brilho.strokeWidth = larg * d
      brilho.color = Color.argb(((a + 20 * respira) * chegada).toInt(), 255, 179, 0)
      canvas.drawRoundRect(r, raio, raio, brilho)
    }
    anel.alpha = alfa
    canvas.drawRoundRect(r, raio, raio, anel)

    // Dedo que "toca" no botão, de tempos em tempos (mostra o que fazer, sem precisar ler).
    if (!semMovimento && agora - tAlvo > 600) {
      val f = ((agora - tAlvo - 600) % 2200L) / 2200f
      val cx = base.centerX() + min(base.width() * 0.25f, 26 * d)
      val cy = base.centerY() + min(base.height() * 0.25f, 22 * d)
      val desce = when {
        f < 0.18f -> suave(f / 0.18f)
        f < 0.30f -> 1f
        f < 0.48f -> 1 - suave((f - 0.30f) / 0.18f)
        else -> 0f
      }
      if (f in 0.18f..0.62f) { // onda do toque
        val g = (f - 0.18f) / 0.44f
        onda.color = Color.argb(((1 - g) * 200).toInt(), 255, 255, 255)
        canvas.drawCircle(cx, cy, 10 * d + 26 * d * saida(g), onda)
      }
      val raioDedo = 17 * d * (1 - 0.18f * desce)
      val sobe = 10 * d * (1 - desce)
      canvas.drawCircle(cx + 2 * d, cy + 4 * d - sobe, raioDedo, dedoSombra)
      canvas.drawCircle(cx, cy - sobe, raioDedo, dedo)
      canvas.drawCircle(cx, cy - sobe, raioDedo, dedoBorda)
    }
  }

  private fun desenharGesto(canvas: Canvas, agora: Long) {
    // início e fim do movimento do dedo, em fração da tela
    val (ini, fim) = when (gesto) {
      "painel" -> floatArrayOf(0.82f, 0.015f) to floatArrayOf(0.82f, 0.36f)
      "rolar_baixo" -> floatArrayOf(0.5f, 0.74f) to floatArrayOf(0.5f, 0.40f)
      "rolar_cima" -> floatArrayOf(0.5f, 0.40f) to floatArrayOf(0.5f, 0.74f)
      "voltar" -> floatArrayOf(0.01f, 0.52f) to floatArrayOf(0.42f, 0.52f)
      "inicio" -> floatArrayOf(0.5f, 0.995f) to floatArrayOf(0.5f, 0.74f)
      else -> floatArrayOf(0.5f, 0.5f) to floatArrayOf(0.5f, 0.5f)
    }
    val tw = (width + loc[0]).toFloat()
    val th = (height + loc[1]).toFloat()
    val x0 = ini[0] * tw; val y0 = ini[1] * th
    val x1 = fim[0] * tw; val y1 = fim[1] * th

    // Ciclo: encosta (0–15%) → desliza (15–70%) → levanta (70–85%) → pausa.
    val f = if (semMovimento) 0.7f else ((agora - tGesto) % 2000L) / 2000f
    val mov = when { f < 0.15f -> 0f; f < 0.70f -> suave((f - 0.15f) / 0.55f); else -> 1f }
    val presenca = when { f < 0.15f -> saida(f / 0.15f); f < 0.70f -> 1f; f < 0.85f -> 1 - (f - 0.70f) / 0.15f; else -> 0f }
    val x = x0 + (x1 - x0) * mov
    val y = y0 + (y1 - y0) * mov

    // Caminho guia fixo (pontilhado suave) e seta no fim: mostram o movimento mesmo parado.
    val ang = atan2((y1 - y0).toDouble(), (x1 - x0).toDouble())
    seta.color = Color.argb(150, 255, 255, 255)
    val passos = 9
    for (i in 0..passos) {
      val t = i / passos.toFloat()
      canvas.drawCircle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 2.5f * d, ponto.apply { alpha = 120 })
    }
    val tam = 22 * d
    canvas.drawLine(x1, y1, (x1 - tam * cos(ang - 0.55)).toFloat(), (y1 - tam * sin(ang - 0.55)).toFloat(), seta)
    canvas.drawLine(x1, y1, (x1 - tam * cos(ang + 0.55)).toFloat(), (y1 - tam * sin(ang + 0.55)).toFloat(), seta)
    ponto.alpha = 255

    // Rastro: do ponto de partida até o dedo, sumindo para trás.
    if (mov > 0.02f && presenca > 0f) {
      rastro.shader = LinearGradient(x0, y0, x, y, Color.argb(0, 245, 181, 68), Color.argb((220 * presenca).toInt(), 245, 181, 68), Shader.TileMode.CLAMP)
      canvas.drawLine(x0, y0, x, y, rastro)
    }
    if (presenca <= 0f) return
    // Dedo: encosta (afunda um pouco), desliza e levanta.
    val pressao = if (f < 0.15f) 1.25f - 0.25f * saida(f / 0.15f) else 1f
    val raio = 22 * d * pressao
    if (f < 0.25f) { // onda de quando encosta
      val g = f / 0.25f
      onda.color = Color.argb(((1 - g) * 180).toInt(), 255, 255, 255)
      canvas.drawCircle(x0, y0, raio + 20 * d * saida(g), onda)
    }
    val a = (255 * presenca).toInt()
    dedoSombra.alpha = (60 * presenca).toInt()
    dedo.alpha = a; dedoBorda.alpha = a
    canvas.drawCircle(x + 2 * d, y + 4 * d, raio, dedoSombra)
    canvas.drawCircle(x, y, raio, dedo)
    canvas.drawCircle(x, y, raio, dedoBorda)
    dedo.alpha = 255; dedoBorda.alpha = 255; dedoSombra.alpha = 60
  }

  // Círculo verde que se expande com um "check" desenhado: confirma que ela tocou no lugar certo.
  private fun desenharAcertos(canvas: Canvas, agora: Long) {
    val dur = 750L
    acertos.removeAll { agora - it.t > dur }
    for (a in acertos) {
      val f = ((agora - a.t).toFloat() / dur).coerceIn(0f, 1f)
      val cx = a.r.centerX(); val cy = a.r.centerY()
      val some = if (f > 0.7f) 1 - (f - 0.7f) / 0.3f else 1f
      val raio = 30 * d * mola(min(1f, f / 0.45f))
      onda.color = Color.argb(((1 - f) * 160).toInt(), 22, 160, 106)
      canvas.drawCircle(cx, cy, raio + 30 * d * saida(f), onda)
      sucesso.color = verde
      sucesso.alpha = (240 * some).toInt()
      canvas.drawCircle(cx, cy, raio, sucesso)
      // check: dois traços desenhados em sequência
      val t = ((f - 0.15f) / 0.4f).coerceIn(0f, 1f)
      check.alpha = (255 * some).toInt()
      val p1x = cx - 11 * d; val p1y = cy + 1 * d
      val p2x = cx - 3 * d; val p2y = cy + 9 * d
      val p3x = cx + 13 * d; val p3y = cy - 9 * d
      val t1 = min(1f, t / 0.4f)
      canvas.drawLine(p1x, p1y, p1x + (p2x - p1x) * t1, p1y + (p2y - p1y) * t1, check)
      if (t > 0.4f) {
        val t2 = (t - 0.4f) / 0.6f
        canvas.drawLine(p2x, p2y, p2x + (p3x - p2x) * t2, p2y + (p3y - p2y) * t2, check)
      }
    }
  }

  // ---------- balão da Lia ----------

  // O balão fica LONGE do botão, na metade oposta da tela: colado nele, cobria o que vinha logo abaixo
  // (na Play Store, tampava o próprio "Instalar"). A ponta do balão continua indicando para onde olhar.
  private fun posicaoBalaoAlvo(anelTela: RectF, h: Float): Float {
    val r = RectF(anelTela).apply { offset(-loc[0].toFloat(), -loc[1].toFloat()) }
    val fundo = tecladoTopo?.let { it - loc[1].toFloat() } ?: h
    return if (r.centerY() > fundo * 0.5f) barraTopo - loc[1] + 24 * d else fundo - 230 * d
  }

  private fun desenharBalao(canvas: Canvas, topoPedido: Float, agora: Long, pontaX: Float?, alvoY: Float?) {
    val pensando = mensagem.endsWith("…") || mensagem.endsWith("...")
    val frase = if (pensando) mensagem.trimEnd('…', '.', ' ') else mensagem
    val teclado = tecladoTopo?.let { it - loc[1].toFloat() }
    val margem = 16 * d
    val dentro = (if (teclado != null) 12 else 16) * d
    texto.textSize = (if (teclado != null) 17 else 21) * d * escalaFonte
    val tamAvatar = (if (teclado != null) 30 else 40) * d
    val largura = (width - 2 * margem - 3 * dentro - tamAvatar).toInt().coerceAtLeast(100)
    val layout = if (frase.isEmpty()) null else StaticLayout.Builder.obtain(frase, 0, frase.length, texto, largura)
      .setAlignment(Layout.Alignment.ALIGN_NORMAL).setLineSpacing(2 * d, 1f).build()
    val altTexto = max(layout?.height?.toFloat() ?: 0f, if (pensando) 14 * d else 0f) + if (pensando && layout != null) 18 * d else 0f
    val alt = max(altTexto, tamAvatar) + 2 * dentro

    val minimo = if (teclado != null) barraTopo - loc[1] + 8 * d else margem
    val maximo = (teclado ?: height.toFloat()) - alt - margem
    val topoFinal = if (teclado != null && topoPedido + alt > teclado) minimo else topoPedido.coerceIn(minimo, max(minimo, maximo))

    // Entrada: sobe 14dp e aparece (a cada frase nova).
    val e = saida(prog(tMsg, 260, agora))
    val topo = topoFinal + (1 - e) * 14 * d
    val alfa = (255 * e).toInt()
    val caixa = RectF(margem, topo, width - margem, topo + alt)
    val raio = 22 * d

    canvas.saveLayerAlpha(0f, 0f, width.toFloat(), height.toFloat(), alfa)
    canvas.drawRoundRect(RectF(caixa).apply { offset(0f, 4 * d) }, raio, raio, balaoSombra)
    // Ponta do balão apontando para o botão.
    if (pontaX != null && alvoY != null) {
      val px = pontaX.coerceIn(caixa.left + raio + 12 * d, caixa.right - raio - 12 * d)
      val emBaixo = alvoY > caixa.centerY()
      val y = if (emBaixo) caixa.bottom else caixa.top
      val dir = if (emBaixo) 1 else -1
      val p = Path().apply {
        moveTo(px - 12 * d, y); lineTo(px, y + dir * 12 * d); lineTo(px + 12 * d, y); close()
      }
      canvas.drawPath(p, balao)
    }
    canvas.drawRoundRect(caixa, raio, raio, balao)

    // Avatar da Lia: círculo âmbar com ondas de voz que se mexem de leve.
    val ax = caixa.left + dentro + tamAvatar / 2
    val ay = caixa.top + dentro + tamAvatar / 2
    canvas.drawCircle(ax, ay, tamAvatar / 2, avatar)
    val alturas = floatArrayOf(0.35f, 0.7f, 0.5f)
    for (i in 0..2) {
      val vai = if (semMovimento) 0.6f else (0.55f + 0.45f * sin(agora / 180.0 + i * 1.3).toFloat())
      val hb = tamAvatar * alturas[i] * vai
      val bx = ax + (i - 1) * tamAvatar * 0.2f
      canvas.drawLine(bx, ay - hb / 2, bx, ay + hb / 2, barra)
    }

    // Texto
    val tx = ax + tamAvatar / 2 + dentro
    if (layout != null) {
      canvas.save()
      canvas.translate(tx, caixa.top + dentro + max(0f, (tamAvatar - layout.height) / 2).coerceAtMost(8 * d))
      layout.draw(canvas)
      canvas.restore()
    }
    // Três pontinhos pulando (a Lia está pensando).
    if (pensando) {
      val py = if (layout != null) caixa.top + dentro + layout.height + 10 * d else ay
      for (i in 0..2) {
        val s = if (semMovimento) 0f else sin(agora / 160.0 - i * 0.9).toFloat().coerceAtLeast(0f)
        ponto.alpha = (150 + 105 * s).toInt()
        canvas.drawCircle(tx + 6 * d + i * 16 * d, py - 5 * d * s, 5 * d, ponto)
      }
      ponto.alpha = 255
    }
    canvas.restore()
  }
}
