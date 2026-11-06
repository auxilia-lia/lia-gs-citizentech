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
import android.view.accessibility.AccessibilityWindowInfo
import java.util.Locale

// O Guia da Lia. Lê a tela de qualquer app e mostra o próximo passo:
// um anel no botão certo ou um gesto animado (deslizar do topo, rolar, voltar, ir ao início).
// Percebe quando a pessoa toca no lugar errado e quando ela trava, e fala como fazer.
// Quem toca é sempre a pessoa.
//
// Dois modos:
// - passos: a lista de botões já vem pronta (gov.br simulado, testes);
// - IA: a cada tela, o app manda o contexto para a IA e recebe a próxima instrução.
class LiaGuiaService : AccessibilityService() {
  companion object {
    @Volatile
    var instance: LiaGuiaService? = null
      private set

    private const val LIMIAR = 0.30
    private const val MAX_PROFUNDIDADE = 60
    private const val LEMBRETE_MS = 12000L
    private const val MAX_LEMBRETES = 2
    val GESTOS = setOf("painel", "rolar_baixo", "rolar_cima", "voltar", "inicio")
  }

  private data class Alvo(val label: String, val bounds: Rect, val score: Double, val area: Int)

  private data class Contexto(
    val app: String, val tela: String, val elementos: List<String>, val textos: List<String>, val rolavel: Boolean,
  )

  private val handler = Handler(Looper.getMainLooper())
  private var overlay: GuiaOverlayView? = null
  private var tts: TextToSpeech? = null
  private var ttsPronto = false

  // estado comum
  private var ativo = false
  private var modoIA = false
  private var nivel = 0 // 0 faz junto, 1 só confirma, 2 só acompanha
  private var revelado = true
  private var revelarAgendado = false
  private var alvoAtual: Rect? = null
  private var nomeAlvo = ""
  private var falado = false
  private var lembretes = 0
  private var ultimaAssinatura = ""
  private var ultimoErro: String? = null

  // modo passos
  private var passos: List<String> = emptyList()
  private var indice = 0

  // modo IA
  private var tipoIA: String? = null // null = esperando a IA decidir
  private var alvoIA: String? = null
  private var falaIA = ""
  private var assinaturaDaInstrucao = ""
  private var passosIA = 0

  private val avaliar = Runnable { avaliarTela() }
  private val revelar = Runnable { revelado = true; avaliarTela() }
  private val lembrar = Runnable { lembrete() }

  private fun naPrincipal(bloco: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) bloco() else handler.post(bloco)
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
    tts = TextToSpeech(this) { status ->
      ttsPronto = status == TextToSpeech.SUCCESS
      if (ttsPronto) {
        tts?.language = Locale("pt", "BR")
        tts?.setSpeechRate(0.95f)
      }
    }
    LiaGuiaBridge.emit("onStatus", mapOf("enabled" to true))
  }

  override fun onDestroy() {
    pararAgora()
    tts?.shutdown()
    instance = null
    LiaGuiaBridge.emit("onStatus", mapOf("enabled" to false))
    super.onDestroy()
  }

  override fun onInterrupt() {}

  // ================= controle (chamado pelo módulo, em qualquer thread) =================

  fun iniciarGuia(lista: List<String>, nivelPedido: Int = 0): Boolean {
    val limpos = lista.map { it.trim() }.filter { it.isNotEmpty() }
    if (limpos.isEmpty()) return false
    naPrincipal {
      reiniciar(nivelPedido)
      modoIA = false
      passos = limpos
      overlay?.mostrarMensagem("…")
      agendar(800)
    }
    return true
  }

  fun iniciarGuiaIA(nivelPedido: Int = 0): Boolean {
    naPrincipal {
      reiniciar(nivelPedido)
      modoIA = true
      overlay?.mostrarMensagem("Deixa eu ver a tela…")
      agendar(700)
    }
    return true
  }

  // A IA decidiu o próximo passo: "tocar" (com alvo), um gesto, ou "esperar" (só falar).
  fun instruirIA(tipo: String, alvo: String?, fala: String) = naPrincipal {
    if (!ativo || !modoIA) return@naPrincipal
    tipoIA = tipo
    alvoIA = alvo?.takeIf { it.isNotBlank() }
    falaIA = fala
    nomeAlvo = alvoIA ?: ""
    alvoAtual = null
    assinaturaDaInstrucao = ultimaAssinatura
    novaInstrucao()
    when {
      tipo in GESTOS -> { overlay?.mostrarGesto(tipo, fala); falarUmaVez(fala) }
      tipo == "tocar" && alvoIA != null -> agendar(50)
      else -> { overlay?.mostrarMensagem(fala); falarUmaVez(fala) }
    }
  }

  fun concluirIA(fala: String) = naPrincipal { concluir(fala) }

  fun pararGuia() = naPrincipal { pararAgora() }

  // ================= estado =================

  private fun reiniciar(nivelPedido: Int) {
    handler.removeCallbacks(avaliar)
    handler.removeCallbacks(revelar)
    handler.removeCallbacks(lembrar)
    ativo = true
    nivel = nivelPedido.coerceIn(0, 2)
    passos = emptyList(); indice = 0
    tipoIA = null; alvoIA = null; falaIA = ""; passosIA = 0
    alvoAtual = null; nomeAlvo = ""; ultimaAssinatura = ""; ultimoErro = null
    novaInstrucao()
    mostrarOverlay()
  }

  private fun novaInstrucao() {
    falado = false
    lembretes = 0
    handler.removeCallbacks(revelar)
    revelarAgendado = false
    revelado = nivel == 0
    handler.removeCallbacks(lembrar)
    handler.postDelayed(lembrar, LEMBRETE_MS)
  }

  private fun pararAgora() {
    ativo = false
    modoIA = false
    handler.removeCallbacks(avaliar)
    handler.removeCallbacks(revelar)
    handler.removeCallbacks(lembrar)
    esconderOverlay()
  }

  private fun concluir(fala: String) {
    if (!ativo) return
    handler.removeCallbacks(lembrar)
    if (fala.isNotBlank()) falar(fala)
    overlay?.mostrarMensagem(fala)
    LiaGuiaBridge.emit("onStep", mapOf("type" to "finished", "total" to if (modoIA) passosIA else passos.size))
    ativo = false
    handler.postDelayed({ if (!ativo) pararAgora() }, 3000)
  }

  // A pessoa travou: repete com calma e mostra o anel. Na 2ª vez, no modo IA, pede outra ideia à IA.
  private fun lembrete() {
    if (!ativo) return
    lembretes++
    revelado = true
    val instrucao = when {
      modoIA && tipoIA != null -> falaIA
      !modoIA && indice < passos.size -> "Toque em ${nomeAlvo.ifBlank { passos[indice] }}"
      else -> ""
    }
    if (instrucao.isNotBlank()) falar("Vamos com calma. $instrucao")
    avaliarTela()
    if (modoIA && lembretes >= MAX_LEMBRETES) {
      raizAtual()?.let { emitirTela(lerContexto(it), "parado") }
    } else {
      handler.postDelayed(lembrar, LEMBRETE_MS)
    }
  }

  // ================= eventos do Android =================

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null || !ativo) return
    if (event.packageName?.toString() == packageName) return // ignora a própria Lia
    when (event.eventType) {
      AccessibilityEvent.TYPE_VIEW_CLICKED -> aoClicar(event)
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED, AccessibilityEvent.TYPE_WINDOWS_CHANGED -> agendar(450)
      else -> agendar(250)
    }
  }

  private fun aoClicar(event: AccessibilityEvent) {
    val src = event.source ?: return agendar(250)
    val b = Rect().also { src.getBoundsInScreen(it) }
    val alvo = alvoAtual
    if (alvo != null && Rect.intersects(b, alvo)) return acertou()
    val tocado = rotulo(src)
    if (alvo != null && tocado != null) errou(tocado)
    agendar(400)
  }

  private fun acertou() {
    ultimoErro = null
    if (!modoIA) return avancar()
    LiaGuiaBridge.emit("onStep", mapOf("type" to "done_step", "index" to passosIA, "step" to alvoIA))
    passosIA++
    limparInstrucaoIA()
    if (nivel >= 1) falar("Isso!")
    overlay?.mostrarMensagem("…")
    ultimaAssinatura = "" // força mandar a próxima tela para a IA
    agendar(800)
  }

  // Tocou em outro lugar: avisa na hora. Se a tela mudou, a IA recebe o erro e diz como voltar.
  private fun errou(tocado: String) {
    ultimoErro = tocado
    falar("Esse não é o lugar. Procure $nomeAlvo.")
    LiaGuiaBridge.emit("onStep", mapOf("type" to "wrong", "step" to nomeAlvo, "tocado" to tocado))
  }

  private fun avancar() {
    LiaGuiaBridge.emit("onStep", mapOf("type" to "done_step", "index" to indice, "step" to passos.getOrNull(indice)))
    indice++
    alvoAtual = null
    novaInstrucao()
    if (indice >= passos.size) return concluir("Pronto! Você conseguiu.")
    overlay?.mostrarMensagem("")
    if (nivel >= 1) falar("Isso!")
    agendar(700)
  }

  private fun agendar(ms: Long) {
    handler.removeCallbacks(avaliar)
    handler.postDelayed(avaliar, ms)
  }

  // ================= o coração do Guia =================

  private fun avaliarTela() {
    if (!ativo) return
    val root = raizAtual() ?: return
    if (modoIA) avaliarTelaIA(root) else avaliarPassos(root)
  }

  private fun avaliarPassos(root: AccessibilityNodeInfo) {
    if (indice >= passos.size) return
    val passo = passos[indice]
    nomeAlvo = passo
    val achado = melhorAlvo(root, passo)
    // O passo atual sumiu e o próximo já apareceu: a pessoa avançou (alguns apps não avisam o toque).
    if (achado == null && indice + 1 < passos.size && melhorAlvo(root, passos[indice + 1]) != null) return avancar()
    if (achado != null) {
      desenharAlvo(achado, if (nivel == 0) "Toque em ${achado.label}" else "Está aqui: ${achado.label}")
      LiaGuiaBridge.emit("onStep", mapOf("type" to "found", "index" to indice, "total" to passos.size, "step" to passo,
        "label" to achado.label, "score" to achado.score, "nivel" to nivel, "revealed" to revelado, "app" to root.packageName?.toString()))
    } else {
      alvoAtual = null
      val ctx = lerContexto(root)
      val msg = if (ctx.rolavel) "Arraste a tela devagar para procurar \"$passo\"" else "Procurando \"$passo\"…"
      if (ctx.rolavel && (nivel < 2 || revelado)) overlay?.mostrarGesto("rolar_baixo", msg) else overlay?.mostrarMensagem(if (nivel == 2 && !revelado) "" else msg)
      falarUmaVez(msg)
      LiaGuiaBridge.emit("onStep", mapOf("type" to "not_found", "index" to indice, "total" to passos.size, "step" to passo,
        "app" to ctx.app, "visible" to (ctx.elementos + ctx.textos).take(40)))
    }
  }

  private fun avaliarTelaIA(root: AccessibilityNodeInfo) {
    val ctx = lerContexto(root)
    val assinatura = "${ctx.app}|${ctx.tela}|${ctx.elementos.joinToString("|")}"
    val mudou = assinatura != ultimaAssinatura
    ultimaAssinatura = assinatura
    val mudouDesdeInstrucao = assinatura != assinaturaDaInstrucao
    val tipo = tipoIA

    when {
      tipo == null -> if (mudou) emitirTela(ctx, if (ultimoErro != null) "errou" else "mudou")
      tipo == "tocar" -> {
        val achado = alvoIA?.let { melhorAlvo(root, it) }
        when {
          achado != null -> desenharAlvo(achado, falaIA.ifBlank { "Toque em ${achado.label}" })
          mudou && mudouDesdeInstrucao -> emitirTela(ctx, if (ultimoErro != null) "errou" else "mudou")
          else -> { alvoAtual = null; overlay?.mostrarMensagem(falaIA) }
        }
      }
      tipo in GESTOS -> if (mudou && mudouDesdeInstrucao) {
        // A tela mudou: o gesto foi feito.
        LiaGuiaBridge.emit("onStep", mapOf("type" to "done_step", "index" to passosIA, "step" to tipo))
        passosIA++
        if (nivel >= 1) falar("Isso!")
        emitirTela(ctx, "mudou")
      }
      else -> if (mudou && mudouDesdeInstrucao) emitirTela(ctx, "mudou")
    }
  }

  private fun emitirTela(ctx: Contexto, motivo: String) {
    limparInstrucaoIA()
    val erro = ultimoErro
    ultimoErro = null
    overlay?.mostrarMensagem("Deixa eu ver a tela…")
    LiaGuiaBridge.emit("onScreen", mapOf(
      "app" to ctx.app, "tela" to ctx.tela, "elementos" to ctx.elementos, "textos" to ctx.textos,
      "rolavel" to ctx.rolavel, "motivo" to motivo, "errou" to erro,
    ))
  }

  private fun limparInstrucaoIA() {
    tipoIA = null
    alvoIA = null
    alvoAtual = null
    handler.removeCallbacks(lembrar)
    handler.removeCallbacks(revelar)
  }

  private fun desenharAlvo(achado: Alvo, fala: String) {
    alvoAtual = achado.bounds
    nomeAlvo = achado.label
    if (revelado) {
      overlay?.mostrarAlvo(achado.bounds, fala)
      falarUmaVez(fala)
    } else {
      // A pessoa já sabe: a Lia só dá a dica (nível 1) ou fica quieta (nível 2) e mostra o anel se ela travar.
      overlay?.mostrarMensagem(if (nivel == 1) "Você já sabe: procure \"${achado.label}\"" else "")
      if (!revelarAgendado) {
        revelarAgendado = true
        handler.postDelayed(revelar, if (nivel == 1) 8000L else 20000L)
      }
    }
  }

  // ================= leitura da tela =================

  // A janela de cima que ocupa boa parte da tela (o painel rápido, um app, a tela inicial).
  // Sem isso, com o painel aberto a Lia continuava lendo a tela de baixo.
  private fun raizAtual(): AccessibilityNodeInfo? {
    val dm = resources.displayMetrics
    val areaTela = dm.widthPixels.toLong() * dm.heightPixels
    val janelas = try { windows } catch (_: Exception) { emptyList<AccessibilityWindowInfo>() }
    for (w in janelas.sortedByDescending { it.layer }) {
      if (w.type == AccessibilityWindowInfo.TYPE_ACCESSIBILITY_OVERLAY || w.type == AccessibilityWindowInfo.TYPE_INPUT_METHOD) continue
      val b = Rect().also { w.getBoundsInScreen(it) }
      if (b.width().toLong() * b.height() < areaTela * 0.4) continue
      val r = w.root ?: continue
      return if (r.packageName?.toString() == packageName) null else r
    }
    val r = rootInActiveWindow ?: return null
    return if (r.packageName?.toString() == packageName) null else r
  }

  private fun lerContexto(root: AccessibilityNodeInfo): Contexto {
    val app = root.packageName?.toString() ?: ""
    val elementos = LinkedHashSet<String>()
    val textos = LinkedHashSet<String>()
    var rolavel = false
    fun andar(n: AccessibilityNodeInfo, prof: Int) {
      if (prof > MAX_PROFUNDIDADE) return
      if (n.isVisibleToUser) {
        if (n.isScrollable) rolavel = true
        val label = (n.text ?: n.contentDescription)?.toString()?.trim()?.take(80)
        if (!label.isNullOrEmpty()) {
          if (acharClicavel(n) != null) { if (elementos.size < 60) elementos.add(label) }
          else if (textos.size < 25) textos.add(label)
        }
      }
      for (i in 0 until n.childCount) n.getChild(i)?.let { andar(it, prof + 1) }
    }
    andar(root, 0)
    val tela = when {
      app.contains("launcher") -> "inicio"
      app == "com.android.systemui" -> "painel"
      else -> "app"
    }
    return Contexto(app, tela, elementos.toList(), textos.toList(), rolavel)
  }

  fun lerTela(): List<Map<String, Any?>> {
    val root = raizAtual() ?: rootInActiveWindow ?: return emptyList()
    val out = mutableListOf<Map<String, Any?>>()
    fun coletar(n: AccessibilityNodeInfo, prof: Int) {
      if (prof > MAX_PROFUNDIDADE || out.size >= 400) return
      val texto = n.text?.toString()
      val desc = n.contentDescription?.toString()
      if ((!texto.isNullOrBlank() || !desc.isNullOrBlank()) && n.isVisibleToUser) {
        val b = Rect().also { n.getBoundsInScreen(it) }
        out.add(mapOf("text" to texto, "desc" to desc, "id" to n.viewIdResourceName, "clickable" to (acharClicavel(n) != null),
          "package" to n.packageName?.toString(), "x" to b.left, "y" to b.top, "w" to b.width(), "h" to b.height()))
      }
      for (i in 0 until n.childCount) n.getChild(i)?.let { coletar(it, prof + 1) }
    }
    coletar(root, 0)
    return out
  }

  private fun rotulo(n: AccessibilityNodeInfo): String? {
    (n.text ?: n.contentDescription)?.toString()?.trim()?.takeIf { it.isNotEmpty() }?.let { return it.take(80) }
    for (i in 0 until n.childCount) {
      val c = n.getChild(i) ?: continue
      (c.text ?: c.contentDescription)?.toString()?.trim()?.takeIf { it.isNotEmpty() }?.let { return it.take(80) }
    }
    return null
  }

  private fun melhorAlvo(root: AccessibilityNodeInfo, passo: String): Alvo? {
    val achados = mutableListOf<Alvo>()
    fun buscar(n: AccessibilityNodeInfo, prof: Int) {
      if (prof > MAX_PROFUNDIDADE) return
      if (n.isVisibleToUser) {
        val label = (n.text ?: n.contentDescription)?.toString()
        if (!label.isNullOrBlank()) {
          val s = Matcher.score(label, passo)
          if (s <= LIMIAR) {
            // Só vale se der para tocar (o próprio item ou quem o contém): evita apontar para títulos.
            val clicavel = acharClicavel(n)
            if (clicavel != null) {
              val b = Rect().also { clicavel.getBoundsInScreen(it) }
              if (!b.isEmpty) achados.add(Alvo(label.trim(), b, s, b.width() * b.height()))
            }
          }
        }
      }
      for (i in 0 until n.childCount) n.getChild(i)?.let { buscar(it, prof + 1) }
    }
    buscar(root, 0)
    return achados.minWithOrNull(compareBy<Alvo>({ it.score }, { it.area }))
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

  // ================= voz e camada =================

  private fun falar(texto: String) {
    if (ttsPronto && texto.isNotBlank()) tts?.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "lia-guia")
  }

  private fun falarUmaVez(texto: String) {
    if (falado) return
    falado = true
    falar(texto)
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
      PixelFormat.TRANSLUCENT,
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
