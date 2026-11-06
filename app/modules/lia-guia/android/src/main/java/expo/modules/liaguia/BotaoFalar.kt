package expo.modules.liaguia

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import kotlin.math.abs

// Botão redondo de microfone que fica por cima dos outros apps enquanto o Guia está ativo.
// Tocar nele = falar com a Lia ("deixa pra lá", "quero outra coisa", uma dúvida).
// Fica azul royal parado e vermelho pulsando enquanto ouve.
class BotaoFalar(context: Context) : View(context) {
  private val d = resources.displayMetrics.density
  var ouvindo = false
    set(v) { field = v; if (v) pulso.start() else { pulso.cancel(); fase = 0f }; invalidate() }

  private var fase = 0f
  private val fundo = Paint(Paint.ANTI_ALIAS_FLAG)
  private val anel = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 4 * d; color = Color.WHITE }
  private val halo = Paint(Paint.ANTI_ALIAS_FLAG)
  private val branco = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
  private val traco = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 4 * d; color = Color.WHITE; strokeCap = Paint.Cap.ROUND }

  private val pulso = ValueAnimator.ofFloat(0f, 1f).apply {
    duration = 900
    repeatCount = ValueAnimator.INFINITE
    addUpdateListener { fase = it.animatedValue as Float; invalidate() }
  }

  // Chamado num toque rápido (sem arrastar).
  var aoTocar: (() -> Unit)? = null

  // Arrastar para tirar o botão da frente de um texto. Mover pouco = toque.
  private var xIni = 0f
  private var yIni = 0f
  private var lpX = 0
  private var lpY = 0
  private var arrastou = false

  init {
    contentDescription = "Falar com a Lia. Segure e arraste para mudar de lugar."
    isClickable = true
  }

  override fun onTouchEvent(e: MotionEvent): Boolean {
    val lp = layoutParams as? WindowManager.LayoutParams ?: return super.onTouchEvent(e)
    val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    when (e.actionMasked) {
      MotionEvent.ACTION_DOWN -> { xIni = e.rawX; yIni = e.rawY; lpX = lp.x; lpY = lp.y; arrastou = false }
      MotionEvent.ACTION_MOVE -> {
        val dx = e.rawX - xIni
        val dy = e.rawY - yIni
        if (!arrastou && (abs(dx) > 12 * d || abs(dy) > 12 * d)) arrastou = true
        if (arrastou) {
          val dm = resources.displayMetrics
          lp.x = (lpX + dx).toInt().coerceIn(0, dm.widthPixels - width)
          lp.y = (lpY + dy).toInt().coerceIn(0, dm.heightPixels - height)
          try { wm.updateViewLayout(this, lp) } catch (_: Exception) {}
        }
      }
      MotionEvent.ACTION_UP -> if (!arrastou) { performClick(); aoTocar?.invoke() }
    }
    return true
  }

  override fun performClick(): Boolean = super.performClick()

  override fun onDetachedFromWindow() {
    pulso.cancel()
    super.onDetachedFromWindow()
  }

  override fun onDraw(canvas: Canvas) {
    val cx = width / 2f
    val cy = height / 2f
    val r = 30 * d
    val cor = if (ouvindo) Color.parseColor("#C2362B") else Color.parseColor("#1B3A9E")
    if (ouvindo) {
      halo.color = Color.argb((90 * (1 - fase)).toInt(), 194, 54, 43)
      canvas.drawCircle(cx, cy, r + 14 * d * fase, halo)
    }
    fundo.color = cor
    canvas.drawCircle(cx, cy, r, fundo)
    canvas.drawCircle(cx, cy, r, anel)
    // microfone: cápsula + arco + haste
    val w = 8 * d
    val h = 13 * d
    canvas.drawRoundRect(RectF(cx - w, cy - h - 3 * d, cx + w, cy + 3 * d), w, w, branco)
    canvas.drawArc(RectF(cx - 13 * d, cy - 10 * d, cx + 13 * d, cy + 10 * d), 20f, 140f, false, traco)
    canvas.drawLine(cx, cy + 10 * d, cx, cy + 16 * d, traco)
  }
}
