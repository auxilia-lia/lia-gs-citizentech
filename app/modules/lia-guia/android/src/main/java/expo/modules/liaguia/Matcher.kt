package expo.modules.liaguia

import java.text.Normalizer

// Compara o texto de um botão com o que a Lia procura, tolerando acento,
// maiúscula e pequenos erros (distância de Levenshtein).
object Matcher {
  private val marks = "\\p{Mn}+".toRegex()
  private val nonAlnum = "[^a-z0-9]+".toRegex()

  fun normalize(s: String): String =
    Normalizer.normalize(s, Normalizer.Form.NFD)
      .replace(marks, "")
      .lowercase()
      .replace(nonAlnum, " ")
      .trim()

  // 0.0 = igual; quanto maior, mais diferente.
  fun score(label: String, target: String): Double {
    val a = normalize(label)
    val b = normalize(target)
    if (a.isEmpty() || b.isEmpty()) return 1.0
    if (a == b) return 0.0
    if (a.contains(b)) return 0.1 + 0.3 * (1.0 - b.length.toDouble() / a.length)
    return levenshtein(a, b).toDouble() / maxOf(a.length, b.length)
  }

  fun levenshtein(a: String, b: String): Int {
    var prev = IntArray(b.length + 1) { it }
    var curr = IntArray(b.length + 1)
    for (i in 1..a.length) {
      curr[0] = i
      for (j in 1..b.length) {
        val cost = if (a[i - 1] == b[j - 1]) 0 else 1
        curr[j] = minOf(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      }
      val t = prev; prev = curr; curr = t
    }
    return prev[b.length]
  }
}
