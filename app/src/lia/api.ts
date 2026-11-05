import Constants from 'expo-constants';
import { Mapa, pseudonimizar, restaurar } from './pseudonimizar';

export type Mensagem = { papel: 'pessoa' | 'lia'; texto: string };
export type Canal = 'app' | 'ligacao';
export type Acao =
  | { tipo: 'guiar'; servico: string }
  | { tipo: 'avisar_familiar'; contato: string; mensagem: string }
  | { tipo: 'tirar_foto' }
  | { tipo: 'agendar_por_voz'; ubs: string; horario: string; resultado?: { protocolo: string } }
  | { tipo: 'consultar_beneficio'; resultado?: unknown };
export type AnaliseGolpe = { golpe: boolean; nivel: 'alto' | 'medio' | 'baixo'; motivos: string[] };
export type RespostaLia = { fala: string; acao: Acao | null; golpe: AnaliseGolpe | null };
export type Contexto = { autonomia: Record<string, number>; familia: string[] };
export type Fluxo = { titulo: string; caminho: string; passos: string[]; risco: string };

// Endereço da API da Lia. Por padrão usa o mesmo computador que roda o Metro
// (o notebook), na porta 8000. Para outro endereço: EXPO_PUBLIC_LIA_API no .env do app.
function enderecoApi(): string {
  const fixo = process.env.EXPO_PUBLIC_LIA_API;
  if (fixo) return fixo.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:8000`;
}

export const API = enderecoApi();

async function post<T>(caminho: string, corpo: unknown, tempoMs = 40000): Promise<T> {
  const controle = new AbortController();
  const t = setTimeout(() => controle.abort(), tempoMs);
  try {
    const r = await fetch(`${API}${caminho}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: controle.signal,
    });
    if (!r.ok) throw new Error(`API respondeu ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

// Manda a conversa já pseudonimizada e devolve a resposta com os dados reais restaurados.
export async function conversar(
  historico: Mensagem[],
  mapa: Mapa,
  canal: Canal,
  contexto: Contexto,
): Promise<RespostaLia> {
  const mensagens = historico.slice(-20).map((m) => ({ ...m, texto: pseudonimizar(m.texto, mapa) }));
  const r = await post<RespostaLia>('/conversa', { mensagens, canal, contexto });
  const acao = r.acao && 'mensagem' in r.acao ? { ...r.acao, mensagem: restaurar(r.acao.mensagem, mapa) } : r.acao;
  return { ...r, fala: restaurar(r.fala, mapa), acao };
}

export type RespostaFoto = { fala: string; golpe: boolean; motivo: string };

// Entende (#5): a foto vai para a IA explicar. Na demo, só papéis fictícios.
export const entenderFoto = (imagem_base64: string, mime = 'image/jpeg') =>
  post<RespostaFoto>('/entende', { imagem_base64, mime }, 60000);

let fluxosCache: Record<string, Fluxo> | null = null;

export async function buscarFluxos(): Promise<Record<string, Fluxo>> {
  if (fluxosCache) return fluxosCache;
  const r = await fetch(`${API}/gov/fluxos`);
  if (!r.ok) throw new Error(`API respondeu ${r.status}`);
  fluxosCache = (await r.json()) as Record<string, Fluxo>;
  return fluxosCache;
}

export const urlGov = (caminho: string) => `${API}${caminho}`;
