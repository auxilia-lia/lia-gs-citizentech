package expo.modules.liaguia

import android.content.Intent
import android.os.Build
import android.view.WindowInsets
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LiaGuiaModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext) { "Contexto do app indisponível" }

  override fun definition() = ModuleDefinition {
    Name("LiaGuia")

    Events("onStep", "onStatus", "onScreen", "onVoz", "onExplicar", "onGolpe")

    OnCreate {
      LiaGuiaBridge.listener = { name, body -> sendEvent(name, body) }
    }

    OnDestroy {
      LiaGuiaBridge.listener = null
    }

    // A Lia está ativada nas configurações de acessibilidade?
    // Margens das barras do sistema (status em cima, navegação embaixo), em dp.
    // Substitui o react-native-safe-area-context, que estoura o limite de caminho do Windows.
    Function("insets") {
      val d = context.resources.displayMetrics.density
      val ins = appContext.currentActivity?.window?.decorView?.rootWindowInsets
      if (ins == null) {
        mapOf("top" to 24.0, "bottom" to 24.0)
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val i = ins.getInsets(WindowInsets.Type.systemBars())
        mapOf("top" to (i.top / d).toDouble(), "bottom" to (i.bottom / d).toDouble())
      } else {
        @Suppress("DEPRECATION")
        mapOf("top" to (ins.systemWindowInsetTop / d).toDouble(), "bottom" to (ins.systemWindowInsetBottom / d).toDouble())
      }
    }

    // Apps do celular com o estado de proteção (nos protegidos a Lia não olha a tela).
    Function("apps") {
      Protecao.apps(context)
    }

    Function("setProtected") { pkg: String, proteger: Boolean ->
      Protecao.definir(context, pkg, proteger)
    }

    Function("autoListen") { Protecao.escutaAuto(context) }
    Function("setAutoListen") { ligado: Boolean -> Protecao.definirEscutaAuto(context, ligado) }

    // Abre um link (ex.: a busca da Play Store direto no app pedido, no "faz por mim").
    Function("openUrl") { url: String ->
      try {
        context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        true
      } catch (_: Exception) { false }
    }

    Function("state") {
      LiaGuiaService.instance?.estado() ?: "o Guia está desligado"
    }

    Function("isEnabled") {
      LiaGuiaService.instance != null
    }

    Function("openAccessibilitySettings") {
      context.startActivity(
        Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    // Abre outro app: "settings" para as Configurações, ou o nome do pacote.
    Function("openApp") { pkg: String ->
      val intent = if (pkg == "settings") {
        Intent(Settings.ACTION_SETTINGS)
      } else if (pkg == "home") {
        // Tela inicial do celular (para o Guia começar do começo).
        Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
      } else {
        context.packageManager.getLaunchIntentForPackage(pkg)
      } ?: return@Function false
      // Abre do começo (tela principal do app), não onde a pessoa parou da última vez:
      // o Guia pensa a partir do início do app.
      val limpar = if (pkg == "home") 0 else Intent.FLAG_ACTIVITY_CLEAR_TASK
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or limpar))
      true
    }

    // Começa o guia com a lista de passos (o texto de cada botão a tocar)
    // e o nível de autonomia da pessoa nesse serviço (0, 1 ou 2).
    Function("start") { steps: List<String>, nivel: Int ->
      LiaGuiaService.instance?.iniciarGuia(steps, nivel) ?: false
    }

    // Guia genérico: a tela vai para o app (evento onScreen) e a IA decide o toque.
    Function("startAI") { nivel: Int ->
      LiaGuiaService.instance?.iniciarGuiaIA(nivel) ?: false
    }

    // A IA decidiu: tipo = "tocar" | "painel" | "rolar_baixo" | "rolar_cima" | "voltar" | "inicio" | "esperar".
    // indice = número do botão na lista enviada (lugar exato); tela = id da tela a que a resposta se refere.
    Function("instruct") { tipo: String, alvo: String?, fala: String, indice: Int, tela: Int ->
      LiaGuiaService.instance?.instruirIA(tipo, alvo, fala, indice, tela)
    }

    Function("point") { label: String, fala: String ->
      LiaGuiaService.instance?.instruirIA("tocar", label, fala)
    }

    // A Lia fala por cima do outro app (resposta da conversa durante o Guia).
    Function("say") { texto: String ->
      LiaGuiaService.instance?.dizer(texto)
    }

    Function("shutUp") {
      LiaGuiaService.instance?.calarVoz()
    }

    Function("sayNext") { texto: String ->
      LiaGuiaService.instance?.dizerEmSeguida(texto)
    }

    // Registro de uso: aparece no logcat (LIA_ROBO), para analisar bugs do uso real.
    Function("log") { evento: String, json: String ->
      LiaGuiaService.instance?.registrar(evento, json) ?: android.util.Log.i("LIA_ROBO", "{\"evento\":\"$evento\",\"semServico\":true}")
    }

    // Para o Guia sem contar como conquista (a pessoa desistiu) e volta para a Lia.
    Function("cancel") { fala: String ->
      LiaGuiaService.instance?.cancelar(fala)
    }

    // "Isso aqui é golpe?": a resposta da API volta para o serviço, que fala e, se for golpe, mostra como sair.
    Function("golpeResposta") { fala: String, golpe: Boolean ->
      LiaGuiaService.instance?.respostaGolpe(fala, golpe)
    }

    // Voz que o Guia está usando (o app usa a mesma).
    Function("voice") {
      LiaGuiaService.instance?.nomeVoz()
    }

    Function("finishAI") { fala: String ->
      LiaGuiaService.instance?.concluirIA(fala)
    }

    Function("stop") {
      LiaGuiaService.instance?.pararGuia()
    }

    // O que a Lia está lendo na tela agora.
    Function("readScreen") {
      LiaGuiaService.instance?.lerTela() ?: emptyList<Map<String, Any?>>()
    }
  }
}
