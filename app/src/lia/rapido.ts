import { normalizar } from './texto';
import type { Acao } from './api';

// Pedidos comuns resolvidos no próprio celular, sem esperar a IA: a resposta e o Guia saem na hora.
// Só coisas do painel rápido e das Configurações, com pedido claro. O resto continua indo para a IA.
const PAINEL = /\b(lig\w*|ativ\w*|acend\w*|deslig\w*|desativ\w*|apag\w*|abr\w*)\b.{0,25}\b(bluetooth|blutu\w*|wi-?fi|wifi|uai fai|lanterna|modo aviao|dados moveis)\b/;
const AJUSTE = /\b(aument\w*|diminu\w*|mud\w*|deix\w*)\b.{0,25}\b(letra|fonte|brilho|tela mais clara|tela mais escura)\b/;
const OUTRO_APP = /\b(whatsapp|youtube|maps|gps|instagram|facebook|banco|pix)\b/;

export function respostaRapida(texto: string): { fala: string; acao: Acao } | null {
  const t = normalizar(texto);
  if (OUTRO_APP.test(t) || t.split(/\s+/).length > 14) return null;
  if (PAINEL.test(t)) return { fala: 'Certo! Vou te mostrar onde tocar.', acao: { tipo: 'guiar_app', app: 'celular', objetivo: texto } as Acao };
  if (AJUSTE.test(t)) return { fala: 'Certo! Vou te mostrar nas configurações.', acao: { tipo: 'guiar_app', app: 'configuracoes', objetivo: texto } as Acao };
  return null;
}
