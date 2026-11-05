package expo.modules.liaguia

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.view.View

// Camada transparente por cima de outro app: anel no botão + balão com a instrução.
// Não recebe toques (quem toca é a pessoa, no app de baixo).
class GuiaOverlayView(context: Context) : View(context) {
  private val density = resources.displayMetrics.density
  private var target: Rect? = null
  private var message: String = ""
  private var pulse = 0f
  private val loc = IntArray(2)

  private val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = 6 * density
    color = Color.parseColor("#FF6D00")
  }
  private val halo = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = 14 * density
    color = Color.parseColor("#55FF6D00")
  }
  private val bubble = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#E6202124") }
  private val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    textSize = 22 * density
    isFakeBoldText = true
  }

  private val animator = ValueAnimator.ofFloat(0f, 1f).apply {
    duration = 900
    repeatMode = ValueAnimator.REVERSE
    repeatCount = ValueAnimator.INFINITE
    addUpdateListener { pulse = it.animatedValue as Float; invalidate() }
  }

  fun show(rect: Rect?, text: String) {
    target = rect?.let { Rect(it) }
    message = text
    if (!animator.isStarted) animator.start()
    invalidate()
  }

  override fun onDetachedFromWindow() {
    animator.cancel()
    super.onDetachedFromWindow()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    // As posições vêm em coordenadas da tela; compensa onde esta camada começa.
    getLocationOnScreen(loc)
    val pad = (10 + 6 * pulse) * density
    var bubbleTop: Float

    val t = target
    if (t != null) {
      val r = RectF(t).apply { offset(-loc[0].toFloat(), -loc[1].toFloat()); inset(-pad, -pad) }
      val radius = 18 * density
      canvas.drawRoundRect(r, radius, radius, halo)
      canvas.drawRoundRect(r, radius, radius, ring)
      // Balão abaixo do botão; se não couber, acima.
      bubbleTop = r.bottom + 16 * density
      if (bubbleTop > height * 0.8f) bubbleTop = r.top - 16 * density - 110 * density
    } else {
      bubbleTop = height * 0.7f
    }
    if (message.isBlank()) return

    val margin = 20 * density
    val inner = 16 * density
    val maxW = (width - 2 * margin - 2 * inner).toInt().coerceAtLeast(100)
    val layout = StaticLayout.Builder.obtain(message, 0, message.length, textPaint, maxW)
      .setAlignment(Layout.Alignment.ALIGN_CENTER)
      .build()
    val h = layout.height + 2 * inner
    bubbleTop = bubbleTop.coerceIn(margin, height - h - margin)
    val box = RectF(margin, bubbleTop, width - margin, bubbleTop + h)
    canvas.drawRoundRect(box, 20 * density, 20 * density, bubble)
    canvas.save()
    canvas.translate(margin + inner, bubbleTop + inner)
    layout.draw(canvas)
    canvas.restore()
  }
}
