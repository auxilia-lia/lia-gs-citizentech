package expo.modules.liaguia

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.accessibilityservice.AccessibilityService.ScreenshotResult
import android.accessibilityservice.AccessibilityService.TakeScreenshotCallback
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.util.Base64
import android.view.Display
import android.view.View
import java.io.ByteArrayOutputStream
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.tts.Voice
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
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
    private const val DIGITANDO_MS = 2500L
    private const val ID_INSTRUCAO = "lia-instrucao"
    private const val ASSENTAR_MS = 600L // a tela precisa ficar parada esse tempo antes de ir para a IA
    private const val ROLANDO_MS = 5000L
    val GESTOS = setOf("painel", "rolar_baixo", "rolar_cima", "voltar", "inicio")

    // "deixa pra lá", "para", "não quero mais"… (já sem acento)
    // "já consegui", "pronto", "deu certo"… (sem acento)
    private val CONSEGUI = Regex("\\b(ja consegui|consegui|deu certo|ja fiz|ja foi|pronto|ja liguei|ja desliguei|ja abri|obrigad[oa])\\b")
    private val NAO_CONSEGUI = Regex("\\bnao (consegui|deu|foi|fiz)")
    private val PROTEGER = Regex("\\b(nao (entra|entre|olha|olhe|leia|le)|bloqueia|bloquear|bloqueie|protege|proteger|proteja)\\b.*\\b(nesse|neste|esse|este|aqui|app|aplicativo)\\b")
    // "e agora?", "qual o próximo passo?", "não tô vendo nada"… (frases curtas): o Guia resolve sem ir para a conversa.
    private val AJUDA = Regex("\\b(proximo passo|e agora|o que (eu )?(faco|fasso|toco|aperto)|nao (sei|to vendo|estou vendo|vejo|achei|acho|apareceu|aparece|mostrou|mostra|falou)|cade|onde (eu )?(toco|clico|aperto|esta)|travou|nada na tela|mostra de novo|repete|repetir|fala de novo|nao entendi)\\b")
    // "o que é isso?", "o que tem nessa tela?", "pra que serve esse botão?"
    private val EXPLICAR = Regex("\\b(o que (e|eh) (isso|isto|essa tela|esta tela|esse botao|isso aqui|aqui)|o que tem (nessa|nesta|na) tela|(pra|para) que serve|explica (essa|esta|a) tela|que tela e essa|onde eu estou)\\b")
    // Perguntas sobre a tela ("já baixou?", "terminou?"): vão para a conversa, que agora sabe o que está na tela.
    private val PERGUNTA = Regex("\\b(ja (baixou|instalou|terminou|ligou|desligou|abriu|mandou|enviou)|terminou|acabou|esta (baixando|ligado|desligado))\\b")
    private val PAUSAR = Regex("^(espera|espere|pera|peraí|perai|pausa|pausar|pausa ai|um minuto|um momento|calma ai)\\b")
    private val CONTINUAR = Regex("\\b(continua|continuar|continue|pode continuar|pode seguir|voltei|vamos continuar|vamos la)\\b")
    private val PARAR = Regex("^(para|pare|parar|chega|sair|tchau|deixa|nao precisa)\\b|\\b(pode parar|para de|parar de|cancela|cancelar|desisto|deixa (pra|para) la|nao quero mais|esquece)\\b")
  }

  private data class Alvo(val label: String, val bounds: Rect, val score: Double, val area: Int)

  // elementos[i] é o nome do botão (com o que está ao redor) e alvos[i] é o lugar exato dele na tela.
  private data class Contexto(
    val app: String, val tela: String, val elementos: List<String>, val textos: List<String>, val rolavel: Boolean,
    val alvos: List<Rect> = emptyList(),
    val escondidos: List<String> = emptyList(), // botões cortados/atrás das barras: só aparecem rolando
    val titulo: String = "", // o nome da tela atual ("Visor", "Papel de parede"), para a IA saber onde a pessoa está
    val sensiveis: List<Rect> = emptyList(), // onde há dado pessoal (senha, campo digitado, CPF, valor): tarja na imagem
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
  private var pontoIA: Rect? = null // "tocar_ponto": lugar que a IA viu na imagem

  // "500,320" (milésimos da tela) -> um quadrado de 56dp em volta desse ponto
  private fun pontoDe(alvo: String?): Rect? {
    val partes = alvo?.split(",")?.mapNotNull { it.trim().toIntOrNull() } ?: return null
    if (partes.size != 2 || partes.any { it !in 0..1000 }) return null
    val dm = resources.displayMetrics
    val x = dm.widthPixels * partes[0] / 1000
    val y = dm.heightPixels * partes[1] / 1000
    val m = (28 * dm.density).toInt()
    return Rect(x - m, y - m, x + m, y + m)
  }
  private var telaEnviada = 0 // conta as telas enviadas para a IA (resposta de tela antiga é descartada)
  private var rotulosEnviados: List<String> = emptyList()
  private var alvosEnviados: List<Rect> = emptyList()
  private var assinaturaEmitida = "" // a última tela mandada para a IA

  // O que a pessoa está fazendo (para a Lia não se confundir quando ela mexe no celular)
  private var candidata = ""
  private var candidataDesde = 0L
  private var ultimaRolagem = 0L
  private var ultimoDeltaY = 0
  private var ultimoAlvoRect: Rect? = null // onde o botão estava quando a Lia apontou
  private var appAtual = ""
  private var appDaInstrucao = ""
  private var trocaEsperada = false
  private var avisouErro = false
  private var pausado = false
  private var appPausado = ""

  private val avaliar = Runnable { agendadoPara = 0L; seguro("avaliar") { avaliarTela() } }

  // Uma falha num app estranho não pode derrubar o Guia (o Android desliga o serviço se ele quebrar):
  // registra, tenta de novo daqui a pouco e segue.
  private fun seguro(onde: String, bloco: () -> Unit) {
    try { bloco() } catch (e: Throwable) { log(onde, e); if (ativo) handler.postDelayed({ agendar(0) }, 1500) }
  }
  private fun log(onde: String, e: Throwable) = android.util.Log.e("LiaGuia", "falha em $onde", e)

  // Registro para o robô de testes (adb logcat -s LIA_ROBO): o que o Guia está mostrando, em JSON.
  private fun robo(evento: String, vararg dados: Pair<String, Any?>) {
    try {
      val j = org.json.JSONObject().put("evento", evento).put("t", System.currentTimeMillis())
      dados.forEach { (k, v) -> j.put(k, v ?: org.json.JSONObject.NULL) }
      android.util.Log.i("LIA_ROBO", j.toString())
    } catch (_: Exception) {}
  }

  // Vigia: depois de mandar a tela para a IA, a Lia nunca fica muda nem parada esperando para sempre.
  private val aguardando = Runnable {
    if (ativo && modoIA && tipoIA == null && emProtegido == null && !pausado) falar("Só um momento, estou olhando a tela.")
  }
  private val reenviar = Runnable {
    if (!ativo || !modoIA || tipoIA != null || emProtegido != null || pausado) return@Runnable
    val root = raizAtual()
    if (root == null) { reagendarVigia(3000); return@Runnable }
    enviarTela(lerContexto(root), "parado")
  }
  private fun reagendarVigia(ms: Long) { handler.removeCallbacks(reenviar); handler.postDelayed(reenviar, ms) }
  private fun pararVigia() { handler.removeCallbacks(aguardando); handler.removeCallbacks(reenviar) }
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
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
          override fun onStart(id: String?) { handler.post { pausarEscutaParaFalar() } }
          override fun onError(id: String?) { handler.post { agendarEscuta(400) } }
          override fun onDone(id: String?) { handler.post { agendarEscuta(350) } } // terminou de falar: volta a escutar
        })
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
    if (pausado || emProtegido != null) return@naPrincipal // pausado: ao continuar, a tela é olhada de novo
    indiceIA = indice
    faltas = 0
    pararVigia()
    appDaInstrucao = appAtual
    trocaEsperada = false
    ultimoAlvoRect = null
    tipoIA = tipo
    alvoIA = alvo?.takeIf { it.isNotBlank() }
    // "tocar_ponto": alvo = "x,y|nome" (x e y em milésimos da tela)
    pontoIA = if (tipo == "tocar_ponto") pontoDe(alvoIA?.substringBefore("|")) else null
    if (tipo == "tocar_ponto") alvoIA = alvoIA?.substringAfter("|", "")?.ifBlank { null } ?: "aqui"
    falaIA = fala
    nomeAlvo = alvoIA ?: ""
    alvoAtual = null
    assinaturaDaInstrucao = ultimaAssinatura
    novaInstrucao()
    robo("instrucao", "tipo" to tipo, "alvo" to alvoIA, "fala" to fala)
    when {
      tipo in GESTOS -> { overlay?.mostrarGesto(tipo, fala); falarUmaVez(fala) }
      (tipo == "tocar" && (alvoIA != null || indice >= 0)) || (tipo == "tocar_ponto" && pontoIA != null) -> { overlay?.mostrarMensagem("…"); agendar(50) }
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

  // A pessoa pediu ajuda ("e agora?"): repete o que está valendo ou, se não há nada na tela, olha de novo.
  private fun mostrarDeNovo() {
    if (!ativo) return
    emProtegido?.let { falar("Este app é protegido, então eu não olho esta tela. Saia dele para eu voltar a ajudar."); return }
    if (pausado) { falar("Estou pausada. Para continuar, diga continuar."); return }
    val tipo = tipoIA
    if (!modoIA) {
      falado = false; revelado = true; avaliarTela(); return
    }
    if (tipo == null || (tipo == "tocar" && alvoAtual == null)) {
      pediuVer = true
      raizAtual()?.let { enviarTela(lerContexto(it), "parado") } ?: agendar(800)
      return
    }
    revelado = true
    falado = false
    when {
      tipo == "tocar" -> avaliarTela()
      tipo in GESTOS -> { overlay?.mostrarGesto(tipo, falaIA); falarUmaVez(falaIA) }
      else -> { overlay?.mostrarMensagem(falaIA); falarUmaVez(falaIA) }
    }
  }

  // "O que é isso?": manda a tela (só a lista de textos, já limpa) para a Lia explicar em palavras simples.
  // Ensina a ENTENDER o celular, não só onde tocar.
  private fun explicarTela(pergunta: String) {
    if (emProtegido != null) return falar("Este app é protegido, então eu não olho esta tela.")
    val root = raizAtual() ?: return falar("Não consegui ver a tela agora. Pergunte de novo daqui a pouco.")
    val ctx = lerContexto(root)
    overlay?.mostrarMensagem("Deixa eu te explicar esta tela…")
    handler.removeCallbacks(lembrar)
    handler.postDelayed(lembrar, LEMBRETE_MS * 2) // dá tempo de ouvir a explicação antes de lembrar o passo
    LiaGuiaBridge.emit("onExplicar", mapOf(
      "pergunta" to pergunta, "app" to ctx.app, "appNome" to Protecao.nome(this, ctx.app), "titulo" to ctx.titulo,
      "elementos" to ctx.elementos.take(30), "textos" to ctx.textos.take(15),
    ))
  }

  // O que o Guia está mostrando agora (a conversa usa isso para não dizer "siga a tela" quando não há nada nela).
  fun estado(): String = when {
    !ativo -> "o Guia está desligado"
    emProtegido != null -> "um app protegido está aberto; o Guia não olha esta tela"
    pausado -> "pausado: o Guia está esperando a pessoa voltar ao app ou dizer continuar"
    !modoIA -> if (alvoAtual != null) "mostrando: Toque em $nomeAlvo" else "procurando \"$nomeAlvo\" na tela"
    tipoIA == null -> "nada ainda: o Guia está olhando a tela para decidir o próximo passo"
    tipoIA == "tocar" && alvoAtual == null -> "nada ainda: procurando o botão na tela"
    else -> "mostrando: $falaIA"
  } + if (resumoTela.isNotEmpty() && ativo) " | agora na $resumoTela" else ""
  private var resumoTela = ""

  // Nome da voz escolhida (o app usa a mesma, para a Lia soar igual em todo lugar).
  fun nomeVoz(): String? = if (ttsPronto) tts?.voice?.name else null

  // ================= conversar durante o Guia =================

  private fun ouvir() {
    if (!SpeechRecognizer.isRecognitionAvailable(this)) return falar("Não consigo ouvir neste celular.")
    handler.removeCallbacks(escutar)
    if (escutaAutomatica) reconhecedor?.cancel()
    escutaAutomatica = false
    botao?.atento = false
    tts?.stop()
    handler.removeCallbacks(lembrar)
    escutaManual = true
    iniciarEscuta()
  }

  private fun iniciarEscuta() {
    val r = reconhecedor ?: SpeechRecognizer.createSpeechRecognizer(this).also {
      it.setRecognitionListener(ouvinte)
      reconhecedor = it
    }
    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
      .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
      .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
      .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
      .putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
    if (escutaAutomatica) botao?.atento = true else botao?.ouvindo = true
    r.startListening(intent)
  }

  private fun comandoDoGuia(texto: String): Boolean {
    val t = Matcher.normalize(texto)
    if (t.isBlank()) return false
    return listOf(PARAR, PAUSAR, CONTINUAR, AJUDA, CONSEGUI, PROTEGER, EXPLICAR, PERGUNTA).any { it.containsMatchIn(t) }
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
      EXPLICAR.containsMatchIn(Matcher.normalize(texto)) -> {
        LiaGuiaBridge.emit("onVoz", mapOf("texto" to texto, "parou" to false, "tratado" to true))
        explicarTela(texto)
        return
      }
      PAUSAR.containsMatchIn(Matcher.normalize(texto)) -> {
        LiaGuiaBridge.emit("onVoz", mapOf("texto" to texto, "parou" to false, "tratado" to true))
        if (!pausado) {
          pausado = true; appPausado = "\u0000" // pausa pela voz: só volta com "continuar"
          alvoAtual = null; pararVigia(); handler.removeCallbacks(lembrar)
          overlay?.mostrarMensagem("Pausado. Quando quiser, toque no microfone e diga \"continuar\".")
          falar("Tudo bem, eu espero. Quando quiser, diga continuar.")
        }
        return
      }
      CONTINUAR.containsMatchIn(Matcher.normalize(texto)) && pausado -> {
        LiaGuiaBridge.emit("onVoz", mapOf("texto" to texto, "parou" to false, "tratado" to true))
        falar("Vamos lá.")
        continuar()
        return
      }
      AJUDA.containsMatchIn(Matcher.normalize(texto)) && texto.trim().split(Regex("\\s+")).size <= 8 -> {
        LiaGuiaBridge.emit("onVoz", mapOf("texto" to texto, "parou" to false, "tratado" to true))
        mostrarDeNovo()
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
    agendarEscuta(600)
  }

  private val ouvinte = object : RecognitionListener {
    override fun onResults(results: Bundle?) {
      val texto = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: ""
      if (!escutaManual) {
        escutaAutomatica = false
        botao?.atento = false
        val chamou = Regex("^(oi |ola |ei )?lia\\b[ ,]*").find(Matcher.normalize(texto))
        when {
          chamou != null -> aoOuvir(Matcher.normalize(texto).removeRange(chamou.range).ifBlank { "e agora" })
          comandoDoGuia(texto) -> aoOuvir(texto)
          else -> agendarEscuta(300) // conversa da sala, TV: ignora em silêncio e continua escutando
        }
        return
      }
      escutaManual = false
      aoOuvir(texto)
    }
    override fun onError(error: Int) {
      botao?.ouvindo = false
      // Escuta automática (ou cancelada porque a Lia foi falar): silêncio ou barulho, tudo bem, recomeça.
      if (!escutaManual || error == SpeechRecognizer.ERROR_CLIENT) {
        escutaAutomatica = false
        botao?.atento = false
        agendarEscuta(if (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) 1200 else 300)
        return
      }
      escutaManual = false
      agendarEscuta(1500)
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
    assinaturaEmitida = ""; candidata = ""; pausado = false; appPausado = ""; appDaInstrucao = ""; trocaEsperada = false
    novaInstrucao()
    mostrarOverlay()
    ligarEscuta()
  }

  private fun novaInstrucao() {
    instrucaoDesde = System.currentTimeMillis()
    falado = false
    faltas = 0
    lembretes = 0
    handler.removeCallbacks(revelar)
    revelarAgendado = false
    dicaRolar = false
    avisouErro = false
    revelado = nivel == 0
    handler.removeCallbacks(lembrar)
    handler.postDelayed(lembrar, LEMBRETE_MS)
  }

  private fun pararAgora() {
    if (ativo) robo("parou")
    ativo = false
    modoIA = false
    handler.removeCallbacks(avaliar)
    handler.removeCallbacks(revelar)
    handler.removeCallbacks(lembrar)
    pararVigia()
    desligarEscuta()
    esconderOverlay()
  }

  private fun concluir(fala: String) {
    if (!ativo) return
    robo("fim", "fala" to fala)
    handler.removeCallbacks(lembrar)
    if (fala.isNotBlank()) falar(fala)
    overlay?.mostrarMensagem(fala)
    LiaGuiaBridge.emit("onStep", mapOf("type" to "finished", "total" to if (modoIA) passosIA else passos.size))
    ativo = false
    handler.postDelayed({ if (!ativo) pararAgora() }, 3000)
  }

  // A pessoa travou: repete com calma e mostra o anel. Na 2ª vez, no modo IA, pede outra ideia à IA.
  private fun lembrete() {
    if (!ativo || emProtegido != null || pausado) return
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
      raizAtual()?.let { enviarTela(lerContexto(it), "parado") }
    } else {
      handler.postDelayed(lembrar, LEMBRETE_MS)
    }
  }

  // ================= eventos do Android =================

  override fun onAccessibilityEvent(event: AccessibilityEvent?) = seguro("evento") { aoEvento(event) }

  private fun aoEvento(event: AccessibilityEvent?) {
    if (event == null || !ativo) return
    if (event.packageName?.toString() == packageName) return // ignora a própria Lia
    if (emProtegido != null && event.packageName?.toString() == emProtegido) return agendar(450) // não lê nada do app protegido
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) adiarLembrete()
    if (event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
      ultimaRolagem = SystemClock.uptimeMillis()
      if (Build.VERSION.SDK_INT >= 28 && event.scrollDeltaY != 0) ultimoDeltaY = event.scrollDeltaY
    }
    if (event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
      ultimaDigitacao = SystemClock.uptimeMillis()
      return agendar(DIGITANDO_MS + 100) // reavalia só quando ela parar de digitar
    }
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
    vibrar() // ela sente que acertou, mesmo sem ouvir
    overlay?.mostrarAcerto(alvoAtual) // e vê: círculo verde com "check" no lugar tocado
    if (!modoIA) return avancar()
    seguiu = alvoIA
    LiaGuiaBridge.emit("onStep", mapOf("type" to "done_step", "index" to passosIA, "step" to alvoIA))
    passosIA++
    limparInstrucaoIA()
    trocaEsperada = true
    if (nivel >= 1) falar("Isso!")
    overlay?.mostrarMensagem("Boa! Deixa eu ver…")
    ultimaAssinatura = "" // força mandar a próxima tela para a IA
    assinaturaEmitida = ""
    agendar(500)
  }

  // Tocou em outro lugar: avisa na hora. Se a tela mudou, a IA recebe o erro e diz como voltar.
  private fun errou(tocado: String) {
    ultimoErro = tocado
    // Avisa uma vez por passo; tocar de novo em outro lugar não vira bronca repetida.
    if (!avisouErro) falar("Esse não é o lugar. O certo é ${curto(nomeAlvo)}, onde está o círculo.")
    avisouErro = true
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
    // Tela de transição (sem janela legível): tenta de novo em vez de ficar parado.
    val root = raizAtual() ?: return agendar(1000)
    val pkg = root.packageName?.toString() ?: ""
    if (Protecao.bloqueado(this, pkg)) return protegido(pkg)
    if (emProtegido != null) { emProtegido = null; ultimaAssinatura = "" }
    atualizarTeclado()
    if (pausado) {
      // Pausado porque ela saiu do app: quando voltar para ele, continua sozinho.
      if (pkg == appPausado) continuar() else return
    }
    if (digitando()) return esperarDigitar()
    if (modoIA) avaliarTelaIA(root) else avaliarPassos(root)
  }

  // Enquanto ela escreve: não manda a tela para a IA a cada letra; só tranquiliza e espera.
  private fun esperarDigitar() {
    if (alvoAtual == null) overlay?.mostrarMensagem("Escreva com calma. Quando terminar, eu continuo.")
    agendar(DIGITANDO_MS + 100)
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
    robo("protegido", "app" to pkg)
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
    if (achado != null && !bemVisivel(achado.bounds)) return pedirRolagem(achado)
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

  // A tela parou de mudar? (carregando, animando ou a pessoa ainda mexendo: espera antes de mandar para a IA)
  private fun assentou(assinatura: String): Boolean {
    val agora = SystemClock.uptimeMillis()
    if (assinatura != candidata) { candidata = assinatura; candidataDesde = agora; agendar(ASSENTAR_MS + 50); return false }
    val falta = ASSENTAR_MS - (agora - candidataDesde)
    if (falta > 0) { agendar(falta + 50); return false }
    return true
  }

  private fun avaliarTelaIA(root: AccessibilityNodeInfo) {
    val ctx = lerContexto(root)
    val assinatura = "${ctx.app}|${ctx.tela}|${estavel(ctx.elementos)}"
    ultimaAssinatura = assinatura
    appAtual = ctx.app
    val mudouDesdeInstrucao = assinatura != assinaturaDaInstrucao
    val tipo = tipoIA
    val motivo = if (ultimoErro != null) "errou" else "mudou"

    // Saiu do app por conta própria no meio de um passo: pausa em vez de correr atrás dela.
    if (tipo != null && tipo !in GESTOS && saiuPorContaPropria(ctx)) return pausar()

    when {
      tipo == null -> if (assinatura != assinaturaEmitida && assentou(assinatura)) enviarTela(ctx, motivo)
      tipo == "tocar" && trocouEstado(ctx) -> acertou()
      tipo == "tocar" -> {
        val achado = localizar(root, ctx)
        val rolandoAgora = SystemClock.uptimeMillis() - ultimaRolagem < ROLANDO_MS
        when {
          achado != null && !bemVisivel(achado.bounds) -> { faltas = 0; pedirRolagem(achado) }
          achado != null -> { faltas = 0; desenharAlvo(achado, falaIA.ifBlank { "Toque em ${achado.label}" }) }
          // Ela rolou e o botão (que já estava na tela) saiu de vista: a instrução continua a mesma, só volta a rolagem.
          rolandoAgora && ultimoAlvoRect != null && ctx.app == appDaInstrucao -> voltarRolagem()
          mudouDesdeInstrucao -> if (assentou(assinatura)) emitirTela(ctx, motivo)
          else -> {
            // O botão escolhido não está na tela: a Lia não mostra nem fala a instrução, e pede outra ideia logo.
            alvoAtual = null
            overlay?.mostrarMensagem("Deixa eu ver a tela…")
            faltas++
            if (faltas >= 2) enviarTela(ctx, "parado") else agendar(400)
          }
        }
      }
      tipo == "tocar_ponto" -> when {
        // A IA viu o botão só na imagem: o anel vai no ponto que ela indicou.
        !mudouDesdeInstrucao -> pontoIA?.let { desenharAlvo(Alvo(curto(nomeAlvo).ifBlank { "aqui" }, it, 0.0, it.width() * it.height()), falaIA) }
        assentou(assinatura) -> { seguiu = nomeAlvo; trocaEsperada = true; emitirTela(ctx, motivo) }
      }
      tipo in GESTOS -> if (mudouDesdeInstrucao && (tipo != "painel" || ctx.tela == "painel") && assentou(assinatura)) {
        // A tela mudou: o gesto foi feito.
        seguiu = tipo
        trocaEsperada = true
        LiaGuiaBridge.emit("onStep", mapOf("type" to "done_step", "index" to passosIA, "step" to tipo))
        passosIA++
        if (nivel >= 1) falar("Isso!")
        emitirTela(ctx, "mudou")
      }
      else -> if (mudouDesdeInstrucao && assentou(assinatura)) emitirTela(ctx, "mudou")
    }
  }

  // Ela trocou de app sem ser pelo passo pedido (ex.: abriu outro app, apertou o início).
  // Da tela inicial para um app não conta (é o caminho normal), nem o painel rápido.
  private fun saiuPorContaPropria(ctx: Contexto): Boolean {
    if (trocaEsperada || appDaInstrucao.isEmpty() || ctx.app == appDaInstrucao) return false
    if (ctx.tela == "painel" || appDaInstrucao.contains("launcher") || appDaInstrucao == "com.android.systemui") return false
    // O app novo tem o nome do botão pedido (tocou nele e o toque não foi avisado): é o caminho certo.
    val nomeApp = Matcher.normalize(Protecao.nome(this, ctx.app))
    val alvo = Matcher.normalize(curto(alvoIA ?: nomeAlvo))
    if (alvo.isNotEmpty() && (nomeApp.contains(alvo) || alvo.contains(nomeApp))) return false
    return true
  }

  private fun pausar() {
    if (pausado) return
    pausado = true
    appPausado = appDaInstrucao
    alvoAtual = null
    pararVigia()
    handler.removeCallbacks(lembrar)
    handler.removeCallbacks(revelar)
    val nome = Protecao.nome(this, appPausado)
    val msg = "Pausei. Quando você voltar para o $nome, eu continuo. Ou toque no microfone e diga \"continuar\"."
    overlay?.mostrarMensagem(msg)
    falar(msg)
    LiaGuiaBridge.emit("onStep", mapOf("type" to "paused", "app" to appPausado))
    robo("pausado", "app" to appPausado)
  }

  private fun continuar() {
    pausado = false
    appPausado = ""
    falado = false
    candidata = ""
    if (!modoIA) { avaliarTela(); return }
    val agora = raizAtual()?.packageName?.toString() ?: appAtual
    if (tipoIA != null && agora == appDaInstrucao) { appAtual = agora; novaInstrucao(); agendar(200); return } // mesmo app: repete o passo
    // Em outro lugar: olha a tela de novo e decide a partir dela.
    limparInstrucaoIA()
    assinaturaEmitida = ""
    trocaEsperada = true
    agendar(200)
  }

  // A pessoa rolou e o botão saiu da tela: mostra para que lado voltar.
  private fun voltarRolagem() {
    alvoAtual = null
    val paraCima = ultimoDeltaY > 0 // o conteúdo desceu: o botão ficou mais acima
    val msg = "O \"$nomeAlvo\" ficou para trás. Arraste devagar para ${if (paraCima) "baixo" else "cima"} para ele voltar."
    overlay?.mostrarGesto(if (paraCima) "rolar_cima" else "rolar_baixo", msg)
    if (!dicaRolar) { falado = false; dicaRolar = true; robo("instrucao", "tipo" to (if (paraCima) "rolar_cima" else "rolar_baixo"), "fala" to msg) }
    falarUmaVez(msg)
    agendar(800)
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
      // O número não vale mais (a tela mudou): o nome curto ainda pode estar em outro lugar,
      // mas nunca o "oposto" ("Ativado" não é "Desativado": era o mesmo botão, que já mudou de estado).
      return melhorAlvo(root, curto(rotulo))?.takeUnless { oposto(it.label, curto(rotulo)) }
    }
    return alvoIA?.let { a -> melhorAlvo(root, curto(a))?.takeUnless { oposto(it.label, curto(a)) } }
  }

  private fun oposto(a: String, b: String): Boolean {
    val x = Matcher.normalize(a).trim()
    val y = Matcher.normalize(b).trim()
    if (x == y) return false
    val pares = listOf("ligado" to "desligado", "ativado" to "desativado", "ativar" to "desativar", "ligar" to "desligar", "on" to "off")
    return x.removePrefix("des") == y.removePrefix("des") || pares.any { (p, q) -> (x.contains(p) && y.contains(q)) || (x.contains(q) && y.contains(p)) } &&
      x.replace(Regex("\\b(des)?(ligad[oa]|ativad[oa]|ligar|ativar|on|off)\\b"), "").trim() == y.replace(Regex("\\b(des)?(ligad[oa]|ativad[oa]|ligar|ativar|on|off)\\b"), "").trim()
  }

  // O botão pedido continua no MESMO lugar, mas o estado mudou ([desligado] → [ligado]): a pessoa tocou nele.
  // (Alguns interruptores do Samsung não avisam o toque; antes a Lia mandava tocar de novo e desligava.)
  private val ESTADO = Regex("\\[(ligado|desligado|selecionado)\\]")
  private fun trocouEstado(ctx: Contexto): Boolean {
    val i = indiceIA
    if (i !in rotulosEnviados.indices || i !in alvosEnviados.indices) return false
    val antes = ESTADO.find(rotulosEnviados[i].substringBefore(" — "))?.value ?: return false
    val lugar = alvosEnviados[i]
    val j = ctx.alvos.indexOfFirst { kotlin.math.abs(it.centerX() - lugar.centerX()) < 12 && kotlin.math.abs(it.centerY() - lugar.centerY()) < 12 }
    if (j < 0) return false
    val agora = ESTADO.find(ctx.elementos[j].substringBefore(" — "))?.value ?: return false
    return agora != antes
  }

  // "Instalar — Pier: Seguro Auto [anúncio]" → "Instalar"
  private fun curto(rotulo: String) = rotulo.substringBefore(" — ").replace(Regex("\\s*\\[[^\\]]*\\]"), "").trim()

  // ================= imagem da tela (plano B quando trava) =================
  // Só quando o Guia travou (ou a tela quase não tem botões com nome): a Lia olha a imagem da tela.
  // Antes de sair do celular, senhas, campos digitados, CPF, valores e e-mails ganham uma tarja preta.
  // Nunca em app protegido, e a imagem não fica guardada em lugar nenhum.
  private var ultimaImagem = 0L
  private var pediuVer = false

  private fun querImagem(ctx: Contexto, motivo: String): Boolean {
    if (Build.VERSION.SDK_INT < 30 || emProtegido != null || Protecao.bloqueado(this, ctx.app)) return false
    if (SystemClock.uptimeMillis() - ultimaImagem < 15000) return false
    return motivo == "parado" || pediuVer || (ctx.tela == "app" && ctx.elementos.size < 3)
  }

  private fun enviarTela(ctx: Contexto, motivo: String) {
    if (!querImagem(ctx, motivo)) return emitirTela(ctx, motivo)
    ultimaImagem = SystemClock.uptimeMillis()
    pediuVer = false
    overlay?.mostrarMensagem("Deixa eu olhar a tela com mais atenção…")
    falar("Deixa eu olhar a tela com mais atenção.")
    // Esconde o balão e o botão por um instante, para a foto mostrar só o app.
    overlay?.visibility = View.INVISIBLE
    botao?.visibility = View.INVISIBLE
    handler.postDelayed({ capturar(ctx, motivo) }, 150)
  }

  private fun capturar(ctx: Contexto, motivo: String) {
    fun reexibir() { overlay?.visibility = View.VISIBLE; botao?.visibility = View.VISIBLE }
    if (Build.VERSION.SDK_INT < 30) { reexibir(); return emitirTela(ctx, motivo) }
    try {
      takeScreenshot(Display.DEFAULT_DISPLAY, mainExecutor, object : TakeScreenshotCallback {
        override fun onSuccess(r: ScreenshotResult) {
          reexibir()
          val img = try { prepararImagem(r, ctx.sensiveis) } catch (_: Exception) { null } finally { r.hardwareBuffer.close() }
          if (ativo) emitirTela(ctx, motivo, img)
        }
        override fun onFailure(codigo: Int) { reexibir(); if (ativo) emitirTela(ctx, motivo) }
      })
    } catch (_: Exception) { reexibir(); emitirTela(ctx, motivo) }
  }

  private fun prepararImagem(r: ScreenshotResult, sensiveis: List<Rect>): String? {
    if (Build.VERSION.SDK_INT < 30) return null
    val hw = Bitmap.wrapHardwareBuffer(r.hardwareBuffer, r.colorSpace) ?: return null
    val bmp = hw.copy(Bitmap.Config.ARGB_8888, true)
    hw.recycle()
    val tarja = Paint().apply { color = Color.BLACK }
    Canvas(bmp).apply { sensiveis.forEach { drawRect(it, tarja) } }
    val largura = 540
    val menor = Bitmap.createScaledBitmap(bmp, largura, (bmp.height * largura.toFloat() / bmp.width).toInt(), true)
    bmp.recycle()
    val out = ByteArrayOutputStream()
    menor.compress(Bitmap.CompressFormat.JPEG, 60, out)
    menor.recycle()
    return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
  }

  private fun emitirTela(ctx: Contexto, motivo: String, imagem: String? = null) {
    limparInstrucaoIA()
    telaEnviada++
    rotulosEnviados = ctx.elementos
    alvosEnviados = ctx.alvos
    assinaturaEmitida = "${ctx.app}|${ctx.tela}|${estavel(ctx.elementos)}"
    candidata = ""
    resumoTela = "tela \"${ctx.titulo}\" do app ${Protecao.nome(this, ctx.app)}; botões: " + ctx.elementos.take(12).joinToString(", ") { curto(it) + (Regex("\\[(ligado|desligado)\\]").find(it)?.value?.let { e -> " $e" } ?: "") }
    robo("tela", "id" to telaEnviada + 0, "motivo" to motivo, "app" to ctx.app, "titulo" to ctx.titulo, "botoes" to ctx.elementos.size, "imagem" to (imagem != null))
    val erro = ultimoErro?.let { Protecao.limpar(it) }
    ultimoErro = null
    val cumpriu = seguiu
    seguiu = null
    overlay?.mostrarMensagem("Deixa eu ver a tela…")
    pararVigia()
    handler.postDelayed(aguardando, 5000)
    handler.postDelayed(reenviar, 15000)
    LiaGuiaBridge.emit("onScreen", mapOf(
      "app" to ctx.app, "tela" to ctx.tela, "elementos" to ctx.elementos, "textos" to ctx.textos,
      "rolavel" to ctx.rolavel, "motivo" to motivo, "errou" to erro, "seguiu" to cumpriu, "id" to telaEnviada,
      "escondidos" to ctx.escondidos, "titulo" to ctx.titulo, "imagem" to imagem,
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

  // O botão existe, mas está cortado (atrás da barra do voltar, por exemplo): primeiro rolar, depois apontar.
  // Antes, o anel aparecia no pedacinho visível, em cima da barra de navegação.
  private var dicaRolar = false
  private fun pedirRolagem(achado: Alvo) {
    alvoAtual = null
    val abaixo = achado.bounds.centerY() > areaUtil().centerY()
    val msg = if (abaixo) "Arraste a tela devagar para cima, para aparecer \"${achado.label}\"."
      else "Arraste a tela devagar para baixo, para aparecer \"${achado.label}\"."
    if (!dicaRolar) falado = false
    dicaRolar = true
    overlay?.mostrarGesto(if (abaixo) "rolar_baixo" else "rolar_cima", msg)
    if (!falado) robo("instrucao", "tipo" to (if (abaixo) "rolar_baixo" else "rolar_cima"), "fala" to msg)
    falarUmaVez(msg)
  }

  private fun desenharAlvo(achado: Alvo, fala: String) {
    if (dicaRolar) { dicaRolar = false; falado = false } // agora sim fala "Toque em…"
    if (alvoAtual != achado.bounds) robo("tocar", "x" to achado.bounds.centerX(), "y" to achado.bounds.centerY(), "nome" to achado.label, "fala" to fala)
    alvoAtual = achado.bounds
    ultimoAlvoRect = Rect(achado.bounds)
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

  // A parte da tela onde a pessoa toca de verdade: sem a barra de status (em cima) e a de navegação (voltar, embaixo).
  private fun dimen(nome: String): Int {
    val id = resources.getIdentifier(nome, "dimen", "android")
    return if (id > 0) resources.getDimensionPixelSize(id) else 0
  }
  private fun areaUtil(): Rect {
    val dm = resources.displayMetrics
    val baixo = dm.heightPixels - dimen("navigation_bar_height")
    return Rect(0, dimen("status_bar_height"), dm.widthPixels, tecladoTopo?.coerceAtMost(baixo) ?: baixo)
  }

  // ================= teclado e digitação =================
  // Com o teclado aberto, o balão vai para o alto (não cobre o teclado nem o campo), o botão de falar sai de cima
  // do teclado, e enquanto a pessoa digita a Lia não reavalia a tela: espera ela terminar.
  private var tecladoTopo: Int? = null
  private var ultimaDigitacao = 0L
  private var botaoYAntes: Int? = null

  private fun lerTeclado(): Int? {
    val janelas = try { windows } catch (_: Exception) { emptyList<AccessibilityWindowInfo>() }
    val dm = resources.displayMetrics
    for (w in janelas) {
      if (w.type != AccessibilityWindowInfo.TYPE_INPUT_METHOD) continue
      val b = Rect().also { w.getBoundsInScreen(it) }
      if (b.height() > dm.heightPixels * 0.12) return b.top
    }
    return null
  }

  private fun atualizarTeclado() {
    val novo = lerTeclado()
    if (novo == tecladoTopo) return
    tecladoTopo = novo
    overlay?.definirTeclado(novo, dimen("status_bar_height"))
    moverBotao(novo)
  }

  private fun moverBotao(teclado: Int?) {
    val b = botao ?: return
    val lp = b.layoutParams as? WindowManager.LayoutParams ?: return
    val wm = getSystemService(WINDOW_SERVICE) as WindowManager
    val d = resources.displayMetrics.density
    if (teclado != null) {
      if (lp.y + lp.height <= teclado) return // já está fora do teclado
      botaoYAntes = lp.y
      lp.y = dimen("status_bar_height") + (90 * d).toInt()
    } else {
      lp.y = botaoYAntes ?: return
      botaoYAntes = null
    }
    try { wm.updateViewLayout(b, lp) } catch (_: Exception) {}
  }

  // A pessoa está digitando agora (teclado aberto e escreveu algo há pouco).
  private fun digitando() = tecladoTopo != null && SystemClock.uptimeMillis() - ultimaDigitacao < DIGITANDO_MS

  // O botão está bem visível? (quase todo dentro da área útil; um pedacinho atrás da barra não conta)
  private fun bemVisivel(b: Rect, util: Rect = areaUtil()): Boolean {
    val v = Rect(b)
    if (!v.intersect(util)) return false
    val d = resources.displayMetrics.density
    return v.height() >= b.height() * 0.6f || v.height() >= 72 * d
  }

  private fun lerContexto(root: AccessibilityNodeInfo): Contexto {
    val app = root.packageName?.toString() ?: ""
    val dm = resources.displayMetrics
    val telaToda = Rect(0, 0, dm.widthPixels, dm.heightPixels)
    val util = areaUtil()
    val escondidos = LinkedHashSet<String>()
    val sensiveis = mutableListOf<Rect>()
    val elementos = mutableListOf<String>()
    val alvos = mutableListOf<Rect>()
    val vistos = HashSet<String>()
    val textos = LinkedHashSet<String>()
    var rolavel = false
    var titulo = ""
    var tituloY = Int.MAX_VALUE
    var tituloCabecalho = false
    val faixaTitulo = util.top + (util.height() * 0.22f).toInt()
    fun andar(n: AccessibilityNodeInfo, prof: Int) {
      if (prof > MAX_PROFUNDIDADE) return
      if (n.isVisibleToUser) {
        if (n.isScrollable) rolavel = true
        val bruto = (n.text ?: n.contentDescription)?.toString()
        if (n.isPassword || n.isEditable || (bruto != null && Protecao.limpar(bruto) != bruto)) {
          if (sensiveis.size < 60) sensiveis.add(Rect().also { n.getBoundsInScreen(it) })
        }
        val label = nomeDe(n)
        if (!label.isNullOrEmpty()) {
          val c = acharClicavel(n)
          if (c == null) {
            if (textos.size < 25) textos.add(label)
            // Título: um cabeçalho, ou o texto mais alto no topo da tela.
            val b = Rect().also { n.getBoundsInScreen(it) }
            val cab = Build.VERSION.SDK_INT >= 28 && n.isHeading
            if (b.top in util.top..faixaTitulo && label.length in 2..40 && ((cab && !tituloCabecalho) || (cab == tituloCabecalho && b.top < tituloY))) {
              titulo = label; tituloY = b.top; tituloCabecalho = cab
            }
          }
          else if (elementos.size < 60) {
            val b = Rect().also { c.getBoundsInScreen(it) }
            // Só o que está de fato na tela e uma vez por botão (vários textos podem levar ao mesmo botão).
            if (!b.isEmpty && Rect.intersects(b, telaToda) && vistos.add(b.flattenToString())) {
              val nome = nomeDe(c)?.takeIf { it.isNotEmpty() } ?: label
              if (bemVisivel(b, util)) {
                elementos.add(nome + estadoDe(c) + contextoDe(c, nome))
                alvos.add(b)
              } else if (escondidos.size < 15) {
                escondidos.add(nome + if (b.centerY() > util.centerY()) " (mais abaixo)" else " (mais acima)")
              }
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
    if (titulo.isEmpty()) titulo = (if (Build.VERSION.SDK_INT >= 24) root.window?.title?.toString() else null)?.take(40) ?: ""
    return Contexto(app, tela, elementos, textos.toList(), rolavel, alvos, escondidos.toList(), titulo, sensiveis)
  }

  // " [ligado]" / " [desligado]" / " [selecionado]" / " [indisponível]": o estado do botão, de qualquer app.
  // Interruptores (Wi-Fi, Bluetooth, opções das Configurações) costumam ter o estado num filho "marcável".
  private fun estadoDe(c: AccessibilityNodeInfo): String {
    fun marcavel(n: AccessibilityNodeInfo, prof: Int): AccessibilityNodeInfo? {
      if (n.isCheckable) return n
      if (prof >= 3) return null
      for (i in 0 until n.childCount) n.getChild(i)?.let { f -> marcavel(f, prof + 1)?.let { return it } }
      return null
    }
    marcavel(c, 0)?.let { return if (it.isChecked) " [ligado]" else " [desligado]" }
    val desc = listOfNotNull(
      if (Build.VERSION.SDK_INT >= 30) c.stateDescription?.toString() else null,
      c.contentDescription?.toString(),
    ).joinToString(" ").lowercase()
    when {
      Regex("\\b(desligad[oa]|desativad[oa]|off)\\b").containsMatchIn(desc) -> return " [desligado]"
      Regex("\\b(ligad[oa]|ativad[oa]|on)\\b").containsMatchIn(desc) -> return " [ligado]"
    }
    if (c.isSelected) return " [selecionado]"
    if (!c.isEnabled) return " [indisponível]"
    return ""
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
    if (texto.isNotBlank()) robo("fala", "texto" to texto, "tts" to ttsPronto)
    if (ttsPronto && texto.isNotBlank()) tts?.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "lia-guia")
  }

  private fun falarUmaVez(texto: String) {
    if (falado) return
    falado = true
    if (ttsPronto && texto.isNotBlank()) tts?.speak(texto, TextToSpeech.QUEUE_FLUSH, null, ID_INSTRUCAO)
  }

  // ================= microfone aberto durante o Guia =================
  // Enquanto o Guia está na tela, a Lia escuta o tempo todo (para enquanto ela mesma fala, para não ouvir a si própria).
  // Pedidos do Guia valem direto ("e agora?", "espera", "para", "já baixou?", "o que é isso?"); qualquer outra coisa
  // precisa começar com "Lia" ("Lia, quero outra coisa"), para conversa da sala ou TV não virar mensagem.
  private var escutaAutomatica = false
  private var escutaManual = false // a pessoa tocou no microfone (só aí a Lia diz "não ouvi")
  private var escutaContinua = false
  private val escutar = Runnable {
    if (!escutaContinua || !ativo || botao?.ouvindo == true || tts?.isSpeaking == true) return@Runnable
    escutaAutomatica = true
    try { iniciarEscuta() } catch (e: Exception) { log("escuta", e); agendarEscuta(2000) }
  }
  private fun agendarEscuta(ms: Long) { handler.removeCallbacks(escutar); if (escutaContinua) handler.postDelayed(escutar, ms) }

  private fun ligarEscuta() {
    if (!Protecao.escutaAuto(this) || !SpeechRecognizer.isRecognitionAvailable(this)) return
    if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) return
    escutaContinua = true
    silenciarBipes(true)
    agendarEscuta(1500)
  }

  private fun desligarEscuta() {
    escutaContinua = false
    handler.removeCallbacks(escutar)
    if (escutaAutomatica) try { reconhecedor?.cancel() } catch (_: Exception) {}
    escutaAutomatica = false
    botao?.atento = false
    silenciarBipes(false)
  }

  // O reconhecimento de voz faz um "bip" cada vez que recomeça: silencia os sons do sistema só durante o Guia.
  private var bipesMudos = false
  private fun silenciarBipes(mudo: Boolean) {
    if (mudo == bipesMudos) return
    val am = getSystemService(AUDIO_SERVICE) as android.media.AudioManager
    val acao = if (mudo) android.media.AudioManager.ADJUST_MUTE else android.media.AudioManager.ADJUST_UNMUTE
    for (st in intArrayOf(android.media.AudioManager.STREAM_SYSTEM, android.media.AudioManager.STREAM_NOTIFICATION)) {
      try { am.adjustStreamVolume(st, acao, 0) } catch (_: Exception) {}
    }
    bipesMudos = mudo
  }

  // Uma fala da Lia começou: para de escutar (senão ela se ouve) e volta quando terminar.
  private fun pausarEscutaParaFalar() {
    if (escutaAutomatica) { try { reconhecedor?.cancel() } catch (_: Exception) {}; escutaAutomatica = false; botao?.atento = false }
  }

  // ================= vibrar no acerto =================
  private fun vibrar() {
    try {
      val v = if (Build.VERSION.SDK_INT >= 31) (getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        else @Suppress("DEPRECATION") (getSystemService(VIBRATOR_SERVICE) as Vibrator)
      if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(45, VibrationEffect.DEFAULT_AMPLITUDE))
      else @Suppress("DEPRECATION") v.vibrate(45)
    } catch (_: Exception) {}
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
    botaoYAntes = null
  }


  private fun esconderOverlay() {
    val wm = getSystemService(WINDOW_SERVICE) as WindowManager
    reconhecedor?.destroy()
    reconhecedor = null
    botao?.let { wm.removeView(it) }
    botao = null
    tecladoTopo = null
    val v = overlay ?: return
    wm.removeView(v)
    overlay = null
  }
}
