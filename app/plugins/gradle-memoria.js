// Ajuste do Gradle para notebooks com 8 GB de RAM: compila uma tarefa por vez
// e roda o Kotlin no mesmo processo (sem isso, a compilação estoura a memória).
const { withGradleProperties } = require('expo/config-plugins');

const AJUSTES = {
  'org.gradle.parallel': 'false',
  'org.gradle.workers.max': '2',
  'kotlin.compiler.execution.strategy': 'in-process',
};

module.exports = function gradleMemoria(config) {
  return withGradleProperties(config, (c) => {
    for (const [chave, valor] of Object.entries(AJUSTES)) {
      c.modResults = c.modResults.filter((p) => !(p.type === 'property' && p.key === chave));
      c.modResults.push({ type: 'property', key: chave, value: valor });
    }
    return c;
  });
};
