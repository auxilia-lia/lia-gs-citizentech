package expo.modules.liaguia

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

// Camada transparente por cima de outro app. Mostra UMA coisa por vez:
// - um anel no botão a tocar, ou
// - um gesto animado (deslizar do topo, rolar, voltar, ir ao início), ou
// - só um balão com a instrução.
// Não recebe toques: quem toca é a pessoa, no app de baixo.
// Sempre criada e usada na thread principal.
class GuiaOverlayView(context: Context) : View(context) {
  private enum class Modo { NADA, ALVO, GESTO, MENSAGEM }

  private val d = resources.displayMetrics.density
  private var modo = Modo.NADA
  private var alvo: Rect? = null
  private var gesto = ""
  private var mensagem = ""
  private var fase = 0f
  private val loc = IntArray(2)

  private val ambar = Color.parseColor("#FFB300")
  private val anel = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 6 * d; color = ambar }
  private val halo = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 16 * d; color = Color.parseColor("#55FFB300") }
  private val trilha = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE; strokeWidth = 8 * d; strokeCap = Paint.Cap.ROUND; color = Color.parseColor("#CCFFB300")
  }
  private val seta = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL; color = ambar }
  private val dedo = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL; color = Color.WHITE }
  private val dedoBorda = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 5 * d; color = ambar }
  private val balao = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#F00B1B4D") }
  private val texto = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; textSize = 22 * d; isFakeBoldText = true }

  private val animador = ValueAnimator.ofFloat(0f, 1f).apply {
    duration = 1400
    repeatCount = ValueAnimator.INFINITE
    interpolator = AccelerateDecelerateInterpolator()
    addUpdateListener { fase = it.animatedValue as Float; invalidate() }
  }

  fun mostrarAlvo(rect: Rect, msg: String) { modo = Modo.ALVO; alvo = Rect(rect); mensagem = msg; animar() }
  fun mostrarGesto(tipo: String, msg: String) { modo = Modo.GESTO; gesto = tipo; mensagem = msg; animar() }
  fun mostrarMensagem(msg: String) { modo = if (msg.isBlank()) Modo.NADA else Modo.MENSAGEM; mensagem = msg; animar() }
  fun limpar() { modo = Modo.NADA; mensagem = ""; invalidate() }

  private fun animar() {
    if (!animador.isStarted) animador.start()
    invalidate()
  }

  override fun onDetachedFromWindow() {
    animador.cancel()
    super.onDetachedFromWindow()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    getLocationOnScreen(loc) // as posições vêm em coordenadas da tela
    val w = width.toFloat()
    val h = height.toFloat()
    when (modo) {
      Modo.NADA -> return
      Modo.ALVO -> {
        val t = alvo ?: return
        val pulso = if (fase < 0.5f) fase * 2 else (1 - fase) * 2
        val r = RectF(t).apply { offset(-loc[0].toFloat(), -loc[1].toFloat()); inset(-(10 + 6 * pulso) * d, -(10 + 6 * pulso) * d) }
        val raio = 18 * d
        canvas.drawRoundRect(r, raio, raio, halo)
        canvas.drawRoundRect(r, raio, raio, anel)
        var topo = r.bottom + 16 * d
        if (topo > h * 0.78f) topo = r.top - 16 * d - 120 * d
        desenharBalao(canvas, topo)
      }
      Modo.GESTO -> {
        // início e fim do movimento do dedo, em fração da tela
        val (ini, fim, topoBalao) = when (gesto) {
          "painel" -> Triple(floatArrayOf(0.5f, 0.01f), floatArrayOf(0.5f, 0.38f), 0.46f)
          "rolar_baixo" -> Triple(floatArrayOf(0.5f, 0.72f), floatArrayOf(0.5f, 0.38f), 0.14f)
          "rolar_cima" -> Triple(floatArrayOf(0.5f, 0.38f), floatArrayOf(0.5f, 0.72f), 0.14f)
          "voltar" -> Triple(floatArrayOf(0.01f, 0.5f), floatArrayOf(0.4f, 0.5f), 0.2f)
          "inicio" -> Triple(floatArrayOf(0.5f, 0.995f), floatArrayOf(0.5f, 0.74f), 0.4f)
          else -> Triple(floatArrayOf(0.5f, 0.5f), floatArrayOf(0.5f, 0.5f), 0.4f)
        }
        val x0 = ini[0] * w; val y0 = ini[1] * h
        val x1 = fim[0] * w; val y1 = fim[1] * h
        canvas.drawLine(x0, y0, x1, y1, trilha)
        desenharSeta(canvas, x0, y0, x1, y1)
        val x = x0 + (x1 - x0) * fase
        val y = y0 + (y1 - y0) * fase
        canvas.drawCircle(x, y, 20 * d, dedo)
        canvas.drawCircle(x, y, 20 * d, dedoBorda)
        desenharBalao(canvas, topoBalao * h)
      }
      Modo.MENSAGEM -> desenharBalao(canvas, h * 0.7f)
    }
  }

  private fun desenharSeta(canvas: Canvas, x0: Float, y0: Float, x1: Float, y1: Float) {
    val ang = atan2((y1 - y0).toDouble(), (x1 - x0).toDouble())
    val tam = 26 * d
    val p = Path().apply {
      moveTo(x1, y1)
      lineTo((x1 - tam * cos(ang - 0.5)).toFloat(), (y1 - tam * sin(ang - 0.5)).toFloat())
      lineTo((x1 - tam * cos(ang + 0.5)).toFloat(), (y1 - tam * sin(ang + 0.5)).toFloat())
      close()
    }
    canvas.drawPath(p, seta)
  }

  private fun desenharBalao(canvas: Canvas, topoPedido: Float) {
    if (mensagem.isBlank()) return
    val margem = 20 * d
    val dentro = 18 * d
    val largura = (width - 2 * margem - 2 * dentro).toInt().coerceAtLeast(100)
    val layout = StaticLayout.Builder.obtain(mensagem, 0, mensagem.length, texto, largura)
      .setAlignment(Layout.Alignment.ALIGN_CENTER)
      .build()
    val alt = layout.height + 2 * dentro
    val topo = topoPedido.coerceIn(margem, height - alt - margem)
    canvas.drawRoundRect(RectF(margem, topo, width - margem, topo + alt), 24 * d, 24 * d, balao)
    canvas.save()
    canvas.translate(margem + dentro, topo + dentro)
    layout.draw(canvas)
    canvas.restore()
  }
}
