package expo.modules.liaguia

import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LiaGuiaModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext) { "Contexto do app indisponível" }

  override fun definition() = ModuleDefinition {
    Name("LiaGuia")

    Events("onStep", "onStatus", "onScreen")

    OnCreate {
      LiaGuiaBridge.listener = { name, body -> sendEvent(name, body) }
    }

    OnDestroy {
      LiaGuiaBridge.listener = null
    }

    // A Lia está ativada nas configurações de acessibilidade?
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
      } else {
        context.packageManager.getLaunchIntentForPackage(pkg)
      } ?: return@Function false
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
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

    Function("point") { label: String, fala: String ->
      LiaGuiaService.instance?.apontarIA(label, fala)
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
