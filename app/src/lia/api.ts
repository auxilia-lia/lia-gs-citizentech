import Constants from 'expo-constants';
import { ler, gravar } from './armazenamento';
import { Mapa, pseudonimizar, restaurar } from './pseudonimizar';

export type Mensagem = { papel: 'pessoa' | 'lia'; texto: string };
export type Canal = 'app' | 'ligacao';
export type Acao =
  | { tipo: 'guiar'; servico: string }
  | { tipo: 'guiar_app'; app: 'whatsapp' | 'configuracoes' | 'celular'; objetivo: string }
  | { tipo: 'avisar_familiar'; contato: string; mensagem: string }
  | { tipo: 'tirar_foto' }
  | { tipo: 'agendar_por_voz'; ubs: string; horario: string; resultado?: { protocolo: string } }
  | { tipo: 'consultar_beneficio'; resultado?: unknown };
export type AnaliseGolpe = { golpe: boolean; nivel: 'alto' | 'medio' | 'baixo'; motivos: string[] };
export type RespostaLia = { fala: string; acao: Acao | null; golpe: AnaliseGolpe | null };
export type Contexto = { autonomia: Record<string, number>; familia: string[] };
export type Fluxo = { titulo: string; caminho: string; passos: string[]; risco: string };

// Endereço da API da Lia. Ordem: o que foi salvo em "Minha Lia" > EXPO_PUBLIC_LIA_API no .env
// > o mesmo computador que roda o Metro (o notebook), na porta 8000.
// No APK da banca não há Metro: configure o endereço em "Minha Lia".
function enderecoPadrao(): string {
  const fixo = process.env.EXPO_PUBLIC_LIA_API;
  if (fixo) return fixo.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? '192.168.0.10'}:8000`;
}

const CHAVE_ENDERECO = 'lia:servidor';
let base = enderecoPadrao();

export const api = () => base;

export async function carregarEnderecoSalvo(): Promise<string> {
  const salvo = await ler<string>(CHAVE_ENDERECO, '');
  if (salvo) base = salvo;
  return base;
}

export async function definirEndereco(url: string): Promise<string> {
  let u = url.trim().replace(/\/$/, '');
  if (!u) {
    base = enderecoPadrao();
    fluxosCache = null;
    await gravar(CHAVE_ENDERECO, '');
    return base;
  }
  if (!/^https?:\/\//.test(u)) u = `http://${u}`;
  if (!/:\d+$/.test(u.replace(/^https?:\/\//, ''))) u = `${u}:8000`;
  base = u;
  fluxosCache = null;
  await gravar(CHAVE_ENDERECO, u);
  return base;
}

async function post<T>(caminho: string, corpo: unknown, tempoMs = 40000): Promise<T> {
  const controle = new AbortController();
  const t = setTimeout(() => controle.abort(), tempoMs);
  try {
    const r = await fetch(`${base}${caminho}`, {
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
  const r = await fetch(`${base}/gov/fluxos`);
  if (!r.ok) throw new Error(`API respondeu ${r.status}`);
  fluxosCache = (await r.json()) as Record<string, Fluxo>;
  return fluxosCache;
}

export const urlGov = (caminho: string) => `${base}${caminho}`;

export type PassoGuia = {
  tipo: 'tocar' | 'painel' | 'rolar_baixo' | 'rolar_cima' | 'voltar' | 'inicio' | 'esperar';
  alvo: string | null;
  fala: string;
  concluido: boolean;
};

export type PedidoGuia = {
  objetivo: string;
  app: string;
  tela: 'inicio' | 'painel' | 'app';
  elementos: string[];
  textos: string[];
  rolavel: boolean;
  motivo: 'mudou' | 'errou' | 'parado';
  errou: string | null;
  feitos: string[];
};

// Guia genérico (#7): manda o contexto da tela (já pseudonimizado) e recebe o próximo passo.
export const proximoPasso = (pedido: PedidoGuia) => post<PassoGuia>('/guia/proximo', pedido, 30000);
