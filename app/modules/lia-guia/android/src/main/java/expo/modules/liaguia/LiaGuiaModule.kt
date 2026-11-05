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

    Events("onStep", "onStatus")

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

    // Começa o guia com a lista de passos (o texto de cada botão a tocar).
    Function("start") { steps: List<String> ->
      LiaGuiaService.instance?.iniciarGuia(steps) ?: false
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
