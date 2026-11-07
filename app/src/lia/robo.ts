// Modo robô de testes (ferramentas/robo-lia): ligado por lia://pedir?...&robo=1.
// O robô testa sempre do jeito de quem nunca usou: Guia no nível "faz junto", sem contar progresso
// e sem guardar caminhos (senão um teste muda o comportamento do seguinte).
let ligado = false;
export const modoRobo = () => ligado;
export const ligarModoRobo = () => { ligado = true; };
