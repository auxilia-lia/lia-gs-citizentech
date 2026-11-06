package expo.modules.liaguia

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.graphics.PixelFormat
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.tts.Voice
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
    private const val LEMBRETE_MS = 15000L
    private const val ESPERA_CARREGAR_MS = 2500L
    private const val MAX_LEMBRETES = 2
    val GESTOS = setOf("painel", "rolar_baixo", "rolar_cima", "voltar", "inicio")

    // "deixa pra lá", "para", "não quero mais"… (já sem acento)
    // "já consegui", "pronto", "deu certo"… (sem acento)
    private val CONSEGUI = Regex("\\b(ja consegui|consegui|deu certo|ja fiz|ja foi|pronto|ja liguei|ja desliguei|ja abri|obrigad[oa])\\b")
    private val NAO_CONSEGUI = Regex("\\bnao (consegui|deu|foi|fiz)")
    private val PROTEGER = Regex("\\b(nao (entra|entre|olha|olhe|leia|le)|bloqueia|bloquear|bloqueie|protege|proteger|proteja)\\b.*\\b(nesse|neste|esse|este|aqui|app|aplicativo)\\b")
    private val PARAR = Regex("^(para|pare|parar|chega|sair|tchau|deixa|nao precisa)\\b|\\b(pode parar|para de|parar de|cancela|cancelar|desisto|deixa (pra|para) la|nao quero mais|esquece)\\b")
  }

  private data class Alvo(val label: String, val bounds: Rect, val score: Double, val area: Int)

  // elementos[i] é o nome do botão (com o que está ao redor) e alvos[i] é o lugar exato dele na tela.
  private data class Contexto(
    val app: String, val tela: String, val elementos: List<String>, val textos: List<String>, val rolavel: Boolean,
    val alvos: List<Rect> = emptyList(),
  )

  private val handler = Handler(Looper.getMainLooper())
  private var overlay: GuiaOverlayView? = null
  private var botao: BotaoFalar? = null
  private var reconhecedor: SpeechRecognizer? = null
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
  private var seguiu: String? = null // a última instrução que a pessoa cumpriu (para a IA não culpar a pessoa)
  private var ultimaMudanca = 0L
  private var instrucaoDesde = 0L

  // modo passos
  private var passos: List<String> = emptyList()
  private var indice = 0

  // modo IA
  private var tipoIA: String? = null // null = esperando a IA decidir
  private var alvoIA: String? = null
  private var falaIA = ""
  private var assinaturaDaInstrucao = ""
  private var passosIA = 0
  private var faltas = 0 // leituras seguidas sem achar o botão que a IA pediu
  private var indiceIA = -1 // número do botão escolhido na última tela enviada
  private var telaEnviada = 0 // conta as telas enviadas para a IA (resposta de tela antiga é descartada)
  private var rotulosEnviados: List<String> = emptyList()

  private val avaliar = Runnable { agendadoPara = 0L; avaliarTela() }
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
        escolherVoz()
        tts?.setSpeechRate(1.08f)
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
  fun instruirIA(tipo: String, alvo: String?, fala: String, indice: Int = -1, tela: Int = -1) = naPrincipal {
    if (!ativo || !modoIA) return@naPrincipal
    // Resposta para uma tela que já não é a atual: ignora e espera a resposta da tela nova.
    if (tela >= 0 && tela != telaEnviada) return@naPrincipal
    indiceIA = indice
    faltas = 0
    tipoIA = tipo
    alvoIA = alvo?.takeIf { it.isNotBlank() }
    falaIA = fala
    nomeAlvo = alvoIA ?: ""
    alvoAtual = null
    assinaturaDaInstrucao = ultimaAssinatura
    novaInstrucao()
    when {
      tipo in GESTOS -> { overlay?.mostrarGesto(tipo, fala); falarUmaVez(fala) }
      tipo == "tocar" && (alvoIA != null || indice >= 0) -> { overlay?.mostrarMensagem("…"); agendar(50) }
      else -> { overlay?.mostrarMensagem(fala); falarUmaVez(fala) }
    }
  }

  fun concluirIA(fala: String) = naPrincipal { concluir(fala) }

  fun pararGuia() = naPrincipal { pararAgora() }

  // A Lia fala por cima do outro app (resposta da conversa durante o Guia).
  fun dizer(texto: String) = naPrincipal { falar(texto) }

  // A pessoa desistiu: para sem dizer que conseguiu, e volta para a Lia.
  fun cancelar(fala: String) = naPrincipal {
    falar(fala)
    pararAgora()
    voltarParaLia()
  }

  // Nome da voz escolhida (o app usa a mesma, para a Lia soar igual em todo lugar).
  fun nomeVoz(): String? = if (ttsPronto) tts?.voice?.name else null

  // ================= conversar durante o Guia =================

  private fun ouvir() {
    if (!SpeechRecognizer.isRecognitionAvailable(this)) return falar("Não consigo ouvir neste celular.")
    tts?.stop()
    handler.removeCallbacks(lembrar)
    val r = reconhecedor ?: SpeechRecognizer.createSpeechRecognizer(this).also {
      it.setRecognitionListener(ouvinte)
      reconhecedor = it
    }
    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
      .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
      .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
      .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    botao?.ouvindo = true
    r.startListening(intent)
  }

  private fun aoOuvir(texto: String) {
    botao?.ouvindo = false
    when {
      texto.isBlank() -> falar("Não ouvi. Toque no microfone e fale de novo.")
      PROTEGER.containsMatchIn(Matcher.normalize(texto)) -> {
        val pkg = raizAtual()?.packageName?.toString()
        if (pkg == null) return falar("Abra o app que você quer proteger e me peça de novo.")
        Protecao.definir(this, pkg, true)
        LiaGuiaBridge.emit("onVoz", mapOf("texto" to texto, "parou" to false, "protegeu" to pkg))
        falar("Pronto. Não vou mais olhar o ${Protecao.nome(this, pkg)}.")
        emProtegido = pkg // já falou o aviso
        alvoAtual = null
        if (modoIA) { limparInstrucaoIA(); telaEnviada++; ultimaAssinatura = "protegido|$pkg" }
        overlay?.mostrarMensagem("O ${Protecao.nome(this, pkg)} agora é protegido.")
        return
      }
      PARAR.containsMatchIn(Matcher.normalize(texto)) -> {
        // Parar não depende da internet nem do app: resolve aqui mesmo e volta para a Lia.
        LiaGuiaBridge.emit("onVoz", mapOf("texto" to texto, "parou" to true))
        falar("Tudo bem, parei. Se precisar, é só me chamar.")
        pararAgora()
        voltarParaLia()
        return
      }
      CONSEGUI.containsMatchIn(Matcher.normalize(texto)) && !NAO_CONSEGUI.containsMatchIn(Matcher.normalize(texto)) -> {
        LiaGuiaBridge.emit("onVoz", mapOf("texto" to texto, "parou" to true, "conseguiu" to true))
        concluir("Que bom! Você conseguiu.")
        return
      }
      else -> {
        overlay?.mostrarMensagem("Entendi: \"$texto\"")
        LiaGuiaBridge.emit("onVoz", mapOf("texto" to texto, "parou" to false))
      }
    }
    if (ativo) handler.postDelayed(lembrar, LEMBRETE_MS)
  }

  private val ouvinte = object : RecognitionListener {
    override fun onResults(results: Bundle?) {
      aoOuvir(results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: "")
    }
    override fun onError(error: Int) {
      botao?.ouvindo = false
      falar("Não ouvi direito. Toque no microfone e fale de novo.")
      if (ativo) handler.postDelayed(lembrar, LEMBRETE_MS)
    }
    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onPartialResults(partialResults: Bundle?) {}
    override fun onEvent(eventType: Int, params: Bundle?) {}
  }

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
    instrucaoDesde = System.currentTimeMillis()
    falado = false
    faltas = 0
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
    if (!ativo || emProtegido != null) return
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
    if (emProtegido != null && event.packageName?.toString() == emProtegido) return agendar(450) // não lê nada do app protegido
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) adiarLembrete()
    when (event.eventType) {
      AccessibilityEvent.TYPE_VIEW_CLICKED -> aoClicar(event)
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED, AccessibilityEvent.TYPE_WINDOWS_CHANGED -> agendar(450)
      else -> agendar(250)
    }
  }

  // A pessoa mexeu na tela: o lembrete espera de novo (não repete enquanto ela está agindo).
  private fun adiarLembrete() {
    if (!ativo) return
    handler.removeCallbacks(lembrar)
    if (!modoIA || tipoIA != null) handler.postDelayed(lembrar, LEMBRETE_MS)
  }

  private fun aoClicar(event: AccessibilityEvent) {
    val src = event.source ?: return agendar(250)
    val b = Rect().also { src.getBoundsInScreen(it) }
    val alvo = alvoAtual
    // Margem generosa: dedos menos precisos tocam na borda do botão, e isso conta como acerto.
    val margem = (40 * resources.displayMetrics.density).toInt()
    if (alvo != null && Rect.intersects(b, Rect(alvo).apply { inset(-margem, -margem) })) return acertou()
    val tocado = rotulo(src)
    if (alvo != null && tocado != null) errou(tocado)
    agendar(400)
  }

  private fun acertou() {
    ultimoErro = null
    if (!modoIA) return avancar()
    seguiu = alvoIA
    LiaGuiaBridge.emit("onStep", mapOf("type" to "done_step", "index" to passosIA, "step" to alvoIA))
    passosIA++
    limparInstrucaoIA()
    if (nivel >= 1) falar("Isso!")
    overlay?.mostrarMensagem("Boa! Deixa eu ver…")
    ultimaAssinatura = "" // força mandar a próxima tela para a IA
    agendar(500)
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

  // Agenda a leitura da tela SEM ficar adiando: se já tem uma leitura marcada para antes, mantém.
  // (O painel rápido dispara eventos sem parar; antes, cada evento empurrava a leitura para frente.)
  private var agendadoPara = 0L
  private fun agendar(ms: Long) {
    val agora = SystemClock.uptimeMillis()
    val quando = agora + ms
    if (agendadoPara > agora && agendadoPara <= quando) return
    handler.removeCallbacks(avaliar)
    agendadoPara = quando
    handler.postAtTime(avaliar, quando)
  }

  // ================= o coração do Guia =================

  private fun avaliarTela() {
    if (!ativo) return
    val root = raizAtual() ?: return
    val pkg = root.packageName?.toString() ?: ""
    if (Protecao.bloqueado(this, pkg)) return protegido(pkg)
    if (emProtegido != null) { emProtegido = null; ultimaAssinatura = "" }
    if (modoIA) avaliarTelaIA(root) else avaliarPassos(root)
  }

  // App protegido aberto: a Lia não lê nada desta tela (nada sai do celular) e volta a ajudar quando a pessoa sair dele.
  private var emProtegido: String? = null
  private fun protegido(pkg: String) {
    if (emProtegido == pkg) return
    emProtegido = pkg
    alvoAtual = null
    handler.removeCallbacks(lembrar)
    handler.removeCallbacks(revelar)
    if (modoIA) { limparInstrucaoIA(); telaEnviada++; ultimaAssinatura = "protegido|$pkg" }
    val msg = "O ${Protecao.nome(this, pkg)} é um app protegido. Por segurança, eu não olho esta tela. Se precisar, peça ajuda a alguém de confiança."
    overlay?.mostrarMensagem(msg)
    falar(msg)
    LiaGuiaBridge.emit("onStep", mapOf("type" to "protected", "app" to pkg))
  }

  private fun avaliarPassos(root: AccessibilityNodeInfo) {
    if (indice >= passos.size) return
    val passo = passos[indice]
    val assinatura = "${root.packageName}|${estavel(lerContexto(root).elementos)}"
    if (assinatura != ultimaAssinatura) { ultimaAssinatura = assinatura; ultimaMudanca = System.currentTimeMillis() }
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
      // A tela acabou de mudar (página carregando): espera um pouco em vez de mandar procurar.
      val desde = System.currentTimeMillis() - ultimaMudanca
      if (desde < ESPERA_CARREGAR_MS) {
        overlay?.mostrarMensagem("…")
        return agendar(ESPERA_CARREGAR_MS - desde + 100)
      }
      val ctx = lerContexto(root)
      if (ultimaMudanca > instrucaoDesde && ctx.textos.any { Matcher.score(it, passo) <= LIMIAR }) return avancar()
      val msg = if (ctx.rolavel) "Arraste a tela devagar para procurar \"$passo\"" else "Procurando \"$passo\"…"
      if (ctx.rolavel && (nivel < 2 || revelado)) overlay?.mostrarGesto("rolar_baixo", msg) else overlay?.mostrarMensagem(if (nivel == 2 && !revelado) "" else msg)
      falarUmaVez(msg)
      LiaGuiaBridge.emit("onStep", mapOf("type" to "not_found", "index" to indice, "total" to passos.size, "step" to passo,
        "app" to ctx.app, "visible" to (ctx.elementos + ctx.textos).take(40)))
    }
  }

  private fun avaliarTelaIA(root: AccessibilityNodeInfo) {
    val ctx = lerContexto(root)
    val assinatura = "${ctx.app}|${ctx.tela}|${estavel(ctx.elementos)}"
    val mudou = assinatura != ultimaAssinatura
    ultimaAssinatura = assinatura
    val mudouDesdeInstrucao = assinatura != assinaturaDaInstrucao
    val tipo = tipoIA

    when {
      tipo == null -> if (mudou) emitirTela(ctx, if (ultimoErro != null) "errou" else "mudou")
      tipo == "tocar" -> {
        val achado = localizar(root, ctx)
        when {
          achado != null -> { faltas = 0; desenharAlvo(achado, falaIA.ifBlank { "Toque em ${achado.label}" }) }
          mudou && mudouDesdeInstrucao -> emitirTela(ctx, if (ultimoErro != null) "errou" else "mudou")
          else -> {
            // O botão escolhido não está na tela: a Lia não mostra nem fala a instrução, e pede outra ideia logo.
            alvoAtual = null
            overlay?.mostrarMensagem("Deixa eu ver a tela…")
            faltas++
            if (faltas >= 2) emitirTela(ctx, "parado") else agendar(400)
          }
        }
      }
      tipo in GESTOS -> if (mudou && mudouDesdeInstrucao) {
        // A tela mudou: o gesto foi feito.
        seguiu = tipo
        LiaGuiaBridge.emit("onStep", mapOf("type" to "done_step", "index" to passosIA, "step" to tipo))
        passosIA++
        if (nivel >= 1) falar("Isso!")
        emitirTela(ctx, "mudou")
      }
      else -> if (mudou && mudouDesdeInstrucao) emitirTela(ctx, "mudou")
    }
  }

  private val DIGITOS = Regex("\\d+")
  private fun estavel(elementos: List<String>) = elementos.joinToString("|") { it.replace(DIGITOS, "#").lineSequence().first() }

  // Acha na tela o botão que a IA escolheu: primeiro pelo número (lugar exato), depois pelo nome completo,
  // e só por último pelo nome parecido. Nunca aponta para outro botão "parecido" quando o número bate.
  private fun localizar(root: AccessibilityNodeInfo, ctx: Contexto): Alvo? {
    val i = indiceIA
    if (i in rotulosEnviados.indices) {
      val rotulo = rotulosEnviados[i]
      val j = if (i < ctx.elementos.size && ctx.elementos[i] == rotulo) i else ctx.elementos.indexOf(rotulo)
      if (j >= 0 && j < ctx.alvos.size) {
        val b = ctx.alvos[j]
        return Alvo(curto(rotulo), b, 0.0, b.width() * b.height())
      }
      // O número não vale mais (a tela mudou): o nome curto ainda pode estar em outro lugar.
      return melhorAlvo(root, curto(rotulo))
    }
    return alvoIA?.let { melhorAlvo(root, curto(it)) }
  }

  // "Instalar — Pier: Seguro Auto [anúncio]" → "Instalar"
  private fun curto(rotulo: String) = rotulo.substringBefore(" — ").replace(" [anúncio]", "").trim()

  private fun emitirTela(ctx: Contexto, motivo: String) {
    limparInstrucaoIA()
    telaEnviada++
    rotulosEnviados = ctx.elementos
    val erro = ultimoErro?.let { Protecao.limpar(it) }
    ultimoErro = null
    val cumpriu = seguiu
    seguiu = null
    overlay?.mostrarMensagem("Deixa eu ver a tela…")
    LiaGuiaBridge.emit("onScreen", mapOf(
      "app" to ctx.app, "tela" to ctx.tela, "elementos" to ctx.elementos, "textos" to ctx.textos,
      "rolavel" to ctx.rolavel, "motivo" to motivo, "errou" to erro, "seguiu" to cumpriu, "id" to telaEnviada,
    ))
  }

  private fun limparInstrucaoIA() {
    tipoIA = null
    alvoIA = null
    indiceIA = -1
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
      val area = b.width().toLong() * b.height()
      val r = w.root ?: continue
      val doSistema = r.packageName?.toString() == "com.android.systemui"
      if (area < areaTela * (if (doSistema) 0.15 else 0.4)) continue
      return if (r.packageName?.toString() == packageName) null else r
    }
    val r = rootInActiveWindow ?: return null
    return if (r.packageName?.toString() == packageName) null else r
  }

  private val ANUNCIO = Regex("^(patrocinad[oa]|an[uú]ncio|sponsored|ad|promovid[oa]|publicidade)\\b", RegexOption.IGNORE_CASE)

  // Nome do item como vai para a IA: campo de senha nunca; campo de texto vai pela dica, não pelo que a pessoa digitou;
  // números longos, valores e e-mails apagados.
  private fun nomeDe(n: AccessibilityNodeInfo): String? {
    if (n.isPassword) return null
    if (n.isEditable) return (if (Build.VERSION.SDK_INT >= 26) n.hintText?.toString() else null)?.trim()?.take(60) ?: "Campo de texto"
    return (n.text ?: n.contentDescription)?.toString()?.trim()?.replace('\n', ' ')?.let { Protecao.limpar(it) }?.take(60)
  }

  // Textos dentro de um nó (até um limite), para dar contexto ao botão.
  private fun textosDe(n: AccessibilityNodeInfo, out: MutableList<String>, prof: Int = 0) {
    if (prof > 6 || out.size >= 10) return
    nomeDe(n)?.takeIf { it.isNotEmpty() }?.let { out.add(it) }
    for (i in 0 until n.childCount) n.getChild(i)?.let { textosDe(it, out, prof + 1) }
  }

  private fun lerContexto(root: AccessibilityNodeInfo): Contexto {
    val app = root.packageName?.toString() ?: ""
    val dm = resources.displayMetrics
    val telaToda = Rect(0, 0, dm.widthPixels, dm.heightPixels)
    val elementos = mutableListOf<String>()
    val alvos = mutableListOf<Rect>()
    val vistos = HashSet<String>()
    val textos = LinkedHashSet<String>()
    var rolavel = false
    fun andar(n: AccessibilityNodeInfo, prof: Int) {
      if (prof > MAX_PROFUNDIDADE) return
      if (n.isVisibleToUser) {
        if (n.isScrollable) rolavel = true
        val label = nomeDe(n)
        if (!label.isNullOrEmpty()) {
          val c = acharClicavel(n)
          if (c == null) { if (textos.size < 25) textos.add(label) }
          else if (elementos.size < 60) {
            val b = Rect().also { c.getBoundsInScreen(it) }
            // Só o que está de fato na tela e uma vez por botão (vários textos podem levar ao mesmo botão).
            if (!b.isEmpty && Rect.intersects(b, telaToda) && vistos.add(b.flattenToString())) {
              val nome = nomeDe(c)?.takeIf { it.isNotEmpty() } ?: label
              elementos.add(nome + contextoDe(c, nome))
              alvos.add(b)
            }
          }
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
    return Contexto(app, tela, elementos, textos.toList(), rolavel, alvos)
  }

  // " — Pier: Seguro Auto [anúncio]": o que está ao redor do botão, para a IA saber de qual item ele é.
  private fun contextoDe(c: AccessibilityNodeInfo, nome: String): String {
    val perto = mutableListOf<String>()
    var anuncio = false
    var p: AccessibilityNodeInfo? = c
    for (nivelAcima in 0..2) {
      p = p ?: break
      val t = mutableListOf<String>()
      textosDe(p, t)
      if (t.any { ANUNCIO.containsMatchIn(it) }) anuncio = true
      if (nivelAcima >= 1 && perto.isEmpty()) perto += t.filter { it != nome && !ANUNCIO.containsMatchIn(it) && it.length > 1 }.distinct().take(2)
      p = p.parent
      if (perto.isNotEmpty() && nivelAcima >= 1) break
    }
    val ctx = if (perto.isEmpty()) "" else " — " + perto.joinToString(", ") { it.take(40) }
    return ctx + if (anuncio) " [anúncio]" else ""
  }

  fun lerTela(): List<Map<String, Any?>> {
    val root = raizAtual() ?: rootInActiveWindow ?: return emptyList()
    if (Protecao.bloqueado(this, root.packageName?.toString() ?: "")) return emptyList()
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

  // A voz mais natural em português do Brasil que o celular tiver (as "neurais"/de rede soam mais humanas).
  private fun escolherVoz() {
    val t = tts ?: return
    val vozes = try { t.voices } catch (_: Exception) { null } ?: return
    val pt = vozes.filter {
      it.locale.language == "pt" && it.locale.country in setOf("BR", "") &&
        !it.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
    }
    // Voz que roda no próprio celular primeiro: a "de rede" fica muda quando a internet oscila.
    val melhor = pt.maxWithOrNull(compareBy<Voice>({ if (it.isNetworkConnectionRequired) 0 else 1 }, { it.quality }, { it.name }))
    if (melhor != null) t.voice = melhor
  }

  // Volta para o app da Lia (quando a pessoa pede para parar).
  private fun voltarParaLia() {
    packageManager.getLaunchIntentForPackage(packageName)?.let {
      it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
      try { startActivity(it) } catch (_: Exception) {}
    }
  }

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
    mostrarBotao(wm)
  }

  // Botão de falar: no lado direito, um pouco acima do meio (longe dos botões que os apps põem embaixo).
  private fun mostrarBotao(wm: WindowManager) {
    if (botao != null) return
    val d = resources.displayMetrics.density
    val b = BotaoFalar(this).apply { aoTocar = { ouvir() } }
    val lado = (88 * d).toInt()
    val lp = WindowManager.LayoutParams(
      lado, lado,
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT,
    )
    lp.gravity = Gravity.TOP or Gravity.START
    lp.x = resources.displayMetrics.widthPixels - lado - (6 * d).toInt()
    lp.y = (resources.displayMetrics.heightPixels * 0.55).toInt()
    wm.addView(b, lp)
    botao = b
  }


  private fun esconderOverlay() {
    val wm = getSystemService(WINDOW_SERVICE) as WindowManager
    reconhecedor?.destroy()
    reconhecedor = null
    botao?.let { wm.removeView(it) }
    botao = null
    val v = overlay ?: return
    wm.removeView(v)
    overlay = null
  }
}
