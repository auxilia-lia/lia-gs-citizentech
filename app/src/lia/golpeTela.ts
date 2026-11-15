import LiaGuia from '../../modules/lia-guia';
import { golpeNaTela } from './api';
import { novoMapa, pseudonimizar, restaurar } from './pseudonimizar';
import { registrar } from './registro';

// "Lia, isso aqui é golpe?" em qualquer app: a pessoa toca na bolinha da Lia e pergunta.
// O serviço manda os textos da tela (só nessa hora, nunca sozinho); aqui eles passam pela pseudonimização
// de sempre antes de ir para a API, e a resposta volta para o serviço, que fala e mostra como sair.
let ligado = false;

export function ligarAntigolpeDaTela() {
  if (ligado) return;
  ligado = true;
  LiaGuia.addListener('onGolpe', async (e) => {
    const mapa = novoMapa();
    const p = (t: string) => pseudonimizar(t, mapa);
    const t0 = Date.now();
    try {
      const r = await golpeNaTela({ textos: e.textos.map(p), app: e.app, endereco: p(e.endereco ?? '') });
      registrar('app_golpe_tela', { golpe: r.golpe, nivel: r.nivel, ms: Date.now() - t0 });
      LiaGuia.golpeResposta(restaurar(r.fala, mapa), r.golpe);
    } catch {
      LiaGuia.golpeResposta('Não consegui verificar agora, a internet está ruim. Na dúvida, não digite nada e não pague nada.', false);
    }
  });
}
