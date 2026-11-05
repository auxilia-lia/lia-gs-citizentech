package expo.modules.liaguia

import android.accessibilityservice.AccessibilityService
import android.graphics.PixelFormat
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.util.Locale

// O Guia: lê a tela de qualquer app, acha o botão do passo atual,
// desenha um anel em volta e fala a instrução. Quem toca é a pessoa.
class LiaGuiaService : AccessibilityService() {
  companion object {
    @Volatile
    var instance: LiaGuiaService? = null
      private set

    private const val LIMIAR = 0.30 // até onde um texto ainda conta como "o mesmo"
    private const val MAX_PROFUNDIDADE = 60
  }

  private data class Alvo(val label: String, val bounds: Rect, val score: Double, val area: Int)

  private val handler = Handler(Looper.getMainLooper())
  private var overlay: GuiaOverlayView? = null
  private var tts: TextToSpeech? = null
  private var ttsPronto = false

  private var passos: List<String> = emptyList()
  private var indice = -1
  private var alvoAtual: Rect? = null
  private var falado = -1
  private var faladoRolar = -1

  // Autonomia progressiva: 0 = faz junto, 1 = só confirma, 2 = só acompanha.
  private var nivel = 0
  private var revelado = true // o anel aparece? (no nível 0, sempre)
  private var revelarAgendado = false

  private val avaliar = Runnable { avaliarTela() }
  private val revelar = Runnable { revelado = true; avaliarTela() }

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
    tts = TextToSpeech(this) { status ->
      ttsPronto = status == TextToSpeech.SUCCESS
      if (ttsPronto) tts?.language = Locale("pt", "BR")
    }
    LiaGuiaBridge.emit("onStatus", mapOf("enabled" to true))
  }

  override fun onDestroy() {
    pararGuia()
    tts?.shutdown()
    instance = null
    LiaGuiaBridge.emit("onStatus", mapOf("enabled" to false))
    super.onDestroy()
  }

  override fun onInterrupt() {}

  // ---------- controle (chamado pelo módulo) ----------

  fun iniciarGuia(lista: List<String>, nivelPedido: Int = 0): Boolean {
    val limpos = lista.map { it.trim() }.filter { it.isNotEmpty() }
    if (limpos.isEmpty()) return false
    passos = limpos
    indice = 0
    falado = -1
    faladoRolar = -1
    alvoAtual = null
    nivel = nivelPedido.coerceIn(0, 2)
    reiniciarRevelacao()
    mostrarOverlay()
    agendar(800)
    return true
  }

  private fun reiniciarRevelacao() {
    handler.removeCallbacks(revelar)
    revelarAgendado = false
    revelado = nivel == 0
  }

  fun pararGuia() {
    handler.removeCallbacks(avaliar)
    handler.removeCallbacks(revelar)
    indice = -1
    passos = emptyList()
    alvoAtual = null
    esconderOverlay()
  }

  // Lista do que está na tela agora (para depurar e, depois, mandar para a IA).
  fun lerTela(): List<Map<String, Any?>> {
    val root = rootInActiveWindow ?: return emptyList()
    val out = mutableListOf<Map<String, Any?>>()
    coletar(root, 0, out)
    return out
  }

  private fun coletar(n: AccessibilityNodeInfo, prof: Int, out: MutableList<Map<String, Any?>>) {
    if (prof > MAX_PROFUNDIDADE || out.size >= 400) return
    val texto = n.text?.toString()
    val desc = n.contentDescription?.toString()
    if ((!texto.isNullOrBlank() || !desc.isNullOrBlank()) && n.isVisibleToUser) {
      val b = Rect().also { n.getBoundsInScreen(it) }
      out.add(
        mapOf(
          "text" to texto,
          "desc" to desc,
          "id" to n.viewIdResourceName,
          "clickable" to (acharClicavel(n) != null),
          "package" to n.packageName?.toString(),
          "x" to b.left, "y" to b.top, "w" to b.width(), "h" to b.height()
        )
      )
    }
    for (i in 0 until n.childCount) n.getChild(i)?.let { coletar(it, prof + 1, out) }
  }

  // ---------- eventos do Android ----------

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null || indice < 0) return
    if (event.packageName?.toString() == packageName) return // ignora a própria Lia
    when (event.eventType) {
      AccessibilityEvent.TYPE_VIEW_CLICKED -> aoClicar(event)
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> agendar(500)
      else -> agendar(250)
    }
  }

  private fun aoClicar(event: AccessibilityEvent) {
    val alvo = alvoAtual ?: return
    val src = event.source ?: return
    val b = Rect().also { src.getBoundsInScreen(it) }
    if (Rect.intersects(b, alvo)) avancar() else agendar(250)
  }

  private fun avancar() {
    LiaGuiaBridge.emit("onStep", mapOf("type" to "done_step", "index" to indice, "step" to passos.getOrNull(indice)))
    indice++
    alvoAtual = null
    reiniciarRevelacao()
    if (indice >= passos.size) {
      falar("Pronto! Você conseguiu.")
      LiaGuiaBridge.emit("onStep", mapOf("type" to "finished", "total" to passos.size))
      overlay?.show(null, "Pronto! Você conseguiu.")
      handler.postDelayed({ if (indice >= passos.size) pararGuia() }, 2500)
      indice = passos.size // mantém o guia "terminado" até sumir
      return
    }
    overlay?.show(null, "")
    if (nivel >= 1) falar("Isso!")
    agendar(700)
  }

  private fun agendar(ms: Long) {
    handler.removeCallbacks(avaliar)
    handler.postDelayed(avaliar, ms)
  }

  // ---------- o coração do Guia ----------

  private fun avaliarTela() {
    if (indice < 0 || indice >= passos.size) return
    val root = rootInActiveWindow ?: return
    if (root.packageName?.toString() == packageName) return
    val passo = passos[indice]

    val achado = melhorAlvo(root, passo)
    // Se o passo atual sumiu mas o próximo já está na tela, a pessoa avançou
    // (alguns apps não avisam o toque).
    if (achado == null && indice + 1 < passos.size && melhorAlvo(root, passos[indice + 1]) != null) {
      avancar()
      return
    }

    if (achado != null) {
      alvoAtual = achado.bounds
      if (revelado) {
        overlay?.show(achado.bounds, "Toque aqui: ${achado.label}")
        if (falado != indice) {
          falado = indice
          falar(if (nivel == 0) "Toque em ${achado.label}" else "Está aqui: ${achado.label}")
        }
      } else {
        // A pessoa já sabe: a Lia só dá a dica (nível 1) ou fica quieta (nível 2)
        // e mostra o anel se ela travar.
        overlay?.show(null, if (nivel == 1) "Você já sabe: procure \"${achado.label}\"" else "")
        if (!revelarAgendado) {
          revelarAgendado = true
          handler.postDelayed(revelar, if (nivel == 1) 8000L else 20000L)
        }
      }
      LiaGuiaBridge.emit(
        "onStep",
        mapOf(
          "type" to "found", "index" to indice, "total" to passos.size, "step" to passo,
          "label" to achado.label, "score" to achado.score, "nivel" to nivel, "revealed" to revelado,
          "app" to root.packageName?.toString()
        )
      )
    } else {
      alvoAtual = null
      val rolavel = temRolagem(root, 0)
      val msg = if (rolavel) "Role a tela para procurar \"$passo\"" else "Procurando \"$passo\"…"
      overlay?.show(null, if (nivel == 2 && !revelado) "" else msg)
      if (rolavel && faladoRolar != indice && (nivel < 2 || revelado)) {
        faladoRolar = indice
        falar("Não estou vendo $passo. Role a tela devagar.")
      }
      LiaGuiaBridge.emit(
        "onStep",
        mapOf("type" to "not_found", "index" to indice, "total" to passos.size, "step" to passo,
          "app" to root.packageName?.toString(),
          // o que está visível, para ajustar o nome do passo no teste
          "visible" to lerTela().mapNotNull { (it["text"] ?: it["desc"]) as String? }.distinct().take(40))
      )
    }
  }

  private fun melhorAlvo(root: AccessibilityNodeInfo, passo: String): Alvo? {
    val achados = mutableListOf<Alvo>()
    buscar(root, passo, 0, achados)
    return achados.minWithOrNull(compareBy<Alvo>({ it.score }, { it.area }))
  }

  private fun buscar(n: AccessibilityNodeInfo, passo: String, prof: Int, out: MutableList<Alvo>) {
    if (prof > MAX_PROFUNDIDADE) return
    if (n.isVisibleToUser) {
      val label = (n.text ?: n.contentDescription)?.toString()
      if (!label.isNullOrBlank()) {
        val s = Matcher.score(label, passo)
        if (s <= LIMIAR) {
          // Só vale se der para tocar (o próprio item ou quem o contém).
          // Isso evita apontar para o título da página.
          val clicavel = acharClicavel(n)
          if (clicavel != null) {
            val b = Rect().also { clicavel.getBoundsInScreen(it) }
            if (!b.isEmpty) out.add(Alvo(label.trim(), b, s, b.width() * b.height()))
          }
        }
      }
    }
    for (i in 0 until n.childCount) n.getChild(i)?.let { buscar(it, passo, prof + 1, out) }
  }

  private fun acharClicavel(n: AccessibilityNodeInfo): AccessibilityNodeInfo? {
    var atual: AccessibilityNodeInfo? = n
    var subidas = 0
    while (atual != null && subidas <= 5) {
      if (atual.isClickable) return atual
      atual = atual.parent
      subidas++
    }
    return null
  }

  private fun temRolagem(n: AccessibilityNodeInfo, prof: Int): Boolean {
    if (prof > MAX_PROFUNDIDADE) return false
    if (n.isScrollable && n.isVisibleToUser) return true
    for (i in 0 until n.childCount) {
      val c = n.getChild(i) ?: continue
      if (temRolagem(c, prof + 1)) return true
    }
    return false
  }

  // ---------- voz e camada ----------

  private fun falar(texto: String) {
    if (ttsPronto) tts?.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "lia-guia")
  }

  private fun mostrarOverlay() {
    if (overlay != null) return
    val wm = getSystemService(WINDOW_SERVICE) as WindowManager
    val view = GuiaOverlayView(this)
    val lp = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT
    )
    lp.gravity = Gravity.TOP or Gravity.START
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
      lp.fitInsetsTypes = 0
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
    }
    wm.addView(view, lp)
    overlay = view
  }

  private fun esconderOverlay() {
    val v = overlay ?: return
    (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(v)
    overlay = null
  }
}
