import * as Speech from 'expo-speech';
import LiaGuia from '../../modules/lia-guia';
import { proximoPasso } from './api';
import { novoMapa, pseudonimizar, restaurar } from './pseudonimizar';

// Guia genérico (#7): o serviço nativo manda o que está na tela (evento onScreen),
// a IA escolhe o próximo toque e o Guia aponta. Funciona em qualquer app.
// Antes de sair do celular, os textos da tela passam pela pseudonimização (#9).

export const PACOTES: Record<string, string> = {
  whatsapp: 'com.whatsapp',
  configuracoes: 'settings',
};

const MAX_PASSOS = 12;

type Estado = {
  objetivo: string;
  feitos: string[];
  ocupado: boolean;
  pendente: { app: string; elementos: string[] } | null;
  ultimaFala: string;
  remover: () => void;
};

let atual: Estado | null = null;

export function guiaIAAtivo() {
  return atual !== null;
}

export function pararGuiaIA(pararNativo = true) {
  atual?.remover();
  atual = null;
  if (pararNativo) LiaGuia.stop();
}

export function guiarComIA(objetivo: string, nivel: number, aoTerminar?: () => void): boolean {
  pararGuiaIA();
  const mapa = novoMapa();
  const estado: Estado = { objetivo, feitos: [], ocupado: false, pendente: null, ultimaFala: '', remover: () => {} };

  const decidir = async (app: string, elementos: string[]) => {
    if (atual !== estado) return;
    if (estado.ocupado) {
      estado.pendente = { app, elementos }; // processa a tela mais recente depois
      return;
    }
    estado.ocupado = true;
    try {
      if (estado.feitos.length >= MAX_PASSOS) {
        LiaGuia.finishAI('Já demos muitos passos. Vamos voltar para a Lia e tentar de novo?');
        return;
      }
      const r = await proximoPasso(
        pseudonimizar(objetivo, mapa),
        app,
        elementos.map((e) => pseudonimizar(e, mapa)),
        estado.feitos.map((f) => pseudonimizar(f, mapa)),
      );
      if (atual !== estado) return;
      const fala = restaurar(r.fala, mapa);
      if (r.concluido) LiaGuia.finishAI(fala);
      else if (r.alvo) LiaGuia.point(restaurar(r.alvo, mapa), fala);
      else if (fala !== estado.ultimaFala) Speech.speak(fala, { language: 'pt-BR', rate: 0.95 });
      estado.ultimaFala = fala;
    } catch {
      if (atual === estado) Speech.speak('Não consegui falar com o servidor da Lia.', { language: 'pt-BR' });
    } finally {
      estado.ocupado = false;
      const p = estado.pendente;
      estado.pendente = null;
      if (p) decidir(p.app, p.elementos);
    }
  };

  const sTela = LiaGuia.addListener('onScreen', (e) => decidir(e.app, e.elementos));
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
