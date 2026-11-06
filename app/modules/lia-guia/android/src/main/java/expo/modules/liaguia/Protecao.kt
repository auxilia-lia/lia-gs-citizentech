package expo.modules.liaguia

import android.content.Context
import android.content.Intent

// Apps protegidos e limpeza dos dados da tela.
// Nos apps protegidos (bancos, Pix, carteiras, senhas, e os que a pessoa escolher) a Lia não lê a tela:
// nada sai do celular. Nos outros, senhas, números longos, valores e e-mails são apagados antes de ir para a IA.
object Protecao {
  private const val PREFS = "lia_protecao"
  private const val BLOQUEADOS = "bloqueados" // a pessoa protegeu
  private const val LIBERADOS = "liberados" // a pessoa liberou um que vinha protegido

  // Bancos, Pix, carteiras, investimentos e senhas, pelo nome do pacote.
  private val SENSIVEL = Regex(
    "bank|banco|banking|wallet|carteira|pix|itau|bradesco|santander|nubank|com\\.nu\\.|caixa|intermedium|c6bank|" +
      "sicoob|sicredi|br\\.com\\.bb|picpay|mercadopago|pagbank|pagseguro|paypal|spay|recargapay|ame\\.digital|" +
      "authenticator|password|bitwarden|lastpass|keepass|1password|binance|serasa|\\.xp\\.|btgpactual|inter\\.",
    RegexOption.IGNORE_CASE,
  )

  private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  private fun conjunto(c: Context, chave: String) = prefs(c).getStringSet(chave, emptySet())!!.toSet()

  fun automatico(pkg: String) = SENSIVEL.containsMatchIn(pkg)

  fun bloqueado(c: Context, pkg: String): Boolean {
    if (pkg.isEmpty() || pkg == c.packageName) return false
    return pkg in conjunto(c, BLOQUEADOS) || (automatico(pkg) && pkg !in conjunto(c, LIBERADOS))
  }

  fun definir(c: Context, pkg: String, proteger: Boolean) {
    val b = conjunto(c, BLOQUEADOS).toMutableSet()
    val l = conjunto(c, LIBERADOS).toMutableSet()
    if (proteger) { b.add(pkg); l.remove(pkg) } else { b.remove(pkg); if (automatico(pkg)) l.add(pkg) }
    prefs(c).edit().putStringSet(BLOQUEADOS, b).putStringSet(LIBERADOS, l).apply()
  }

  fun nome(c: Context, pkg: String): String = try {
    c.packageManager.getApplicationLabel(c.packageManager.getApplicationInfo(pkg, 0)).toString()
  } catch (_: Exception) { pkg }

  // Os apps que aparecem na gaveta do celular, com o estado de proteção de cada um.
  fun apps(c: Context): List<Map<String, Any>> {
    val pm = c.packageManager
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    return pm.queryIntentActivities(intent, 0)
      .map { it.activityInfo.packageName to it.loadLabel(pm).toString() }
      .filter { it.first != c.packageName }
      .distinctBy { it.first }
      .sortedBy { it.second.lowercase() }
      .map { (pkg, nome) -> mapOf("pkg" to pkg, "nome" to nome, "auto" to automatico(pkg), "protegido" to bloqueado(c, pkg)) }
  }

  private val VALOR = Regex("R\\$\\s?-?[\\d.]+(,\\d{1,2})?")
  private val EMAIL = Regex("[\\w.+-]+@[\\w-]+\\.[\\w.]+")
  private val CARTAO = Regex("\\b(\\d{4}[ -]){3}\\d{1,4}\\b")
  private val NUMERO = Regex("\\d[\\d.\\-/]{4,}\\d")
  private val DATA = Regex("\\d{1,2}/\\d{1,2}(/\\d{2,4})?")

  // "Saldo R$ 1.234,56 · CPF 123.456.789-00" -> "Saldo R$ [valor] · CPF [número]"
  fun limpar(t: String): String {
    var s = VALOR.replace(t, "R\\$ [valor]")
    s = EMAIL.replace(s, "[e-mail]")
    s = CARTAO.replace(s, "[cartão]")
    s = NUMERO.replace(s) { m -> if (DATA.matches(m.value) || m.value.count { it.isDigit() } < 6) m.value else "[número]" }
    return s
  }
}
