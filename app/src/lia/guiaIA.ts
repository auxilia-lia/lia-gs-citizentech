import LiaGuia, { TelaEvent } from '../../modules/lia-guia';
import { proximoPasso } from './api';
import { novoMapa, pseudonimizar, restaurar } from './pseudonimizar';

// Guia com IA (#7): o serviço nativo manda o contexto da tela (evento onScreen),
// a IA escolhe o próximo passo (tocar, deslizar do topo, rolar, voltar, ir ao início)
// e o Guia mostra e fala. Funciona em qualquer app. Antes de sair do celular,
// os textos da tela passam pela pseudonimização (#9).

export const PACOTES: Record<string, string> = {
  whatsapp: 'com.whatsapp',
  configuracoes: 'settings',
  celular: 'home',
  playstore: 'com.android.vending',
};

const MAX_PASSOS = 15;

type Estado = {
  objetivo: string;
  feitos: string[];
  ocupado: boolean;
  pendente: TelaEvent | null;
  remover: () => void;
};

let atual: Estado | null = null;

export const guiaIAAtivo = () => atual !== null;
export const objetivoAtual = () => atual?.objetivo ?? null;

export function pararGuiaIA(pararNativo = true) {
  atual?.remover();
  atual = null;
  if (pararNativo) LiaGuia.stop();
}

export function guiarComIA(objetivo: string, nivel: number, aoTerminar?: () => void): boolean {
  pararGuiaIA();
  const mapa = novoMapa();
  const estado: Estado = { objetivo, feitos: [], ocupado: false, pendente: null, remover: () => {} };
  const p = (t: string) => pseudonimizar(t, mapa);

  const decidir = async (tela: TelaEvent) => {
    if (atual !== estado) return;
    if (estado.ocupado) {
      estado.pendente = tela; // decide pela tela mais recente depois
      return;
    }
    estado.ocupado = true;
    try {
      if (estado.feitos.length >= MAX_PASSOS) {
        LiaGuia.finishAI('Já demos muitos passos. Vamos voltar para a Lia e tentar de novo?');
        return;
      }
      const r = await proximoPasso({
        objetivo: p(objetivo),
        app: tela.app,
        tela: tela.tela,
        elementos: tela.elementos.map(p),
        textos: tela.textos.map(p),
        rolavel: tela.rolavel,
        motivo: tela.motivo,
        errou: tela.errou ? p(tela.errou) : null,
        seguiu: tela.seguiu ? p(tela.seguiu) : null,
        feitos: estado.feitos.map(p),
      });
      if (atual !== estado) return;
      // Chegou uma tela mais nova enquanto a IA pensava: esta resposta é de uma tela que já passou.
      if (estado.pendente) return;
      const fala = restaurar(r.fala, mapa);
      if (r.concluido) LiaGuia.finishAI(fala);
      else LiaGuia.instruct(r.tipo, r.alvo ? restaurar(r.alvo, mapa) : null, fala, r.indice ?? -1, tela.id ?? -1);
    } catch {
      // Sem resposta: avisa e deixa o vigia do Guia olhar a tela de novo em seguida (ele não fica parado).
      if (atual === estado && !estado.pendente) LiaGuia.say('A internet está lenta. Já tento de novo.');
    } finally {
      estado.ocupado = false;
      const pend = estado.pendente;
      estado.pendente = null;
      if (pend) decidir(pend);
    }
  };

  const sTela = LiaGuia.addListener('onScreen', (e) => decidir(e));
  const sPasso = LiaGuia.addListener('onStep', (e) => {
    if (atual !== estado) return;
    if (e.type === 'done_step' && e.step) estado.feitos.push(e.step);
    if (e.type === 'finished') {
      pararGuiaIA(false);
      aoTerminar?.();
    }
  });
  estado.remover = () => { sTela.remove(); sPasso.remove(); };
  atual = estado;
  const ok = LiaGuia.startAI(nivel);
  if (!ok) pararGuiaIA(false);
  return ok;
}

