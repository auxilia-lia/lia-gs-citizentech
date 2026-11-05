package expo.modules.liaguia

// Ponte entre o serviço de acessibilidade (que roda sozinho) e o módulo do app (JS).
object LiaGuiaBridge {
  @Volatile
  var listener: ((String, Map<String, Any?>) -> Unit)? = null

  fun emit(name: String, body: Map<String, Any?>) {
    listener?.invoke(name, body)
  }
}
