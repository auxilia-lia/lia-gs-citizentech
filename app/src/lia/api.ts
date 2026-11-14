import Constants from 'expo-constants';
import { fetch as fetchEmPartes } from 'expo/fetch';
import { ler, gravar } from './armazenamento';
import { Mapa, pseudonimizar, restaurar } from './pseudonimizar';

export type Mensagem = { papel: 'pessoa' | 'lia'; texto: string };
export type Canal = 'app' | 'ligacao';
export type Acao =
  | { tipo: 'guiar'; servico: string }
  | { tipo: 'guiar_app'; app: 'whatsapp' | 'configuracoes' | 'celular' | 'playstore'; objetivo: string; nome_app?: string; abrir?: string; ensinar?: boolean }
  | { tipo: 'avisar_familiar'; contato: string; mensagem: string }
  | { tipo: 'tirar_foto' }
  | { tipo: 'parar_guia'; conseguiu?: boolean }
  | { tipo: 'agendar_por_voz'; ubs: string; horario: string; resultado?: { protocolo: string } }
  | { tipo: 'consultar_beneficio'; resultado?: unknown };
export type AnaliseGolpe = { golpe: boolean; nivel: 'alto' | 'medio' | 'baixo'; motivos: string[] };
export type RespostaLia = { fala: string; acao: Acao | null; golpe: AnaliseGolpe | null };
export type Contexto = { autonomia: Record<string, number>; familia: string[]; guia?: string | null };
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
  // No APK da nuvem, um endereço local salvo antes (localhost do cabo ou IP do notebook) não vale mais.
  const local = /localhost|127\.0\.0\.1|192\.168\.|10\.0\./.test(salvo);
  if (salvo && !(!__DEV__ && process.env.EXPO_PUBLIC_LIA_API && local)) base = salvo;
  return base;
}

// A API na nuvem (plano grátis) dorme quando fica parada: o app a acorda assim que abre, em segundo plano,
// para que a primeira mensagem da pessoa não espere. Sem resposta, não faz nada.
export function acordarServidor() {
  fetch(`${base}/saude`).catch(() => undefined);
}

// Robô de testes: usa a API pelo cabo USB (adb reverse → localhost), sem depender do Wi-Fi,
// e depois devolve o endereço que estava antes.
export async function enderecoTemporario(url: string) {
  const antes = await ler<string>(CHAVE_ENDERECO, '');
  if (!(await ler<string>('lia:servidor-antes', ''))) await gravar('lia:servidor-antes', antes || '-');
  await definirEndereco(url); // guardado: vale mesmo se o app recarregar no meio do teste
}

export async function voltarEndereco() {
  const antes = await ler<string>('lia:servidor-antes', '');
  if (!antes) return;
  await gravar('lia:servidor-antes', '');
  await definirEndereco(antes === '-' ? '' : antes);
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
      headers: { 'Content-Type': 'application/json', 'X-Lia-Token': process.env.EXPO_PUBLIC_LIA_TOKEN ?? '' },
      body: JSON.stringify(corpo),
      signal: controle.signal,
    });
    if (!r.ok) throw new Error(`API respondeu ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

const FALA = /"fala"\s*:\s*"((?:[^"\\]|\\.)*)/;

// A fala às vezes chega como JSON (cru, dentro de ```json ou cortado no meio). Nunca mostra nem fala isso:
// tira a "fala" de dentro quando dá; se o JSON veio cortado, fica só com as frases inteiras; senão, ''.
export function limparFala(texto: string): string {
  const t = (texto ?? '').trim().replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
  if (!t.startsWith('{') && !FALA.test(t)) return t;
  try {
    const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
    if (typeof j?.fala === 'string') return limparFala(j.fala);
  } catch {
    // JSON cortado: segue abaixo
  }
  const m = FALA.exec(t);
  if (!m) return '';
  let dentro: string;
  try {
    dentro = JSON.parse(`"${m[1]}"`);
  } catch {
    dentro = m[1].replace(/\\"/g, '"').replace(/\\n/g, ' ');
  }
  if (FALA.test(dentro)) return limparFala(dentro);
  return (/^[\s\S]*[.!?…](?=\s|$)/.exec(dentro)?.[0] ?? '').trim();
}

// O que falta falar da fala final depois das frases que já chegaram em partes (ignora diferenças de espaço).
export function restoDaFala(fala: string, partes: string[]): string {
  if (!partes.length) return fala;
  const norm = (s: string) => s.split(/\s+/).filter(Boolean).join(' ');
  const f = norm(fala);
  const dito = norm(partes.join(' '));
  if (f.startsWith(dito)) return f.slice(dito.length).trim();
  const ultima = norm(partes[partes.length - 1]);
  const i = f.lastIndexOf(ultima);
  return i >= 0 ? f.slice(i + ultima.length).trim() : '';
}

// Manda a conversa já pseudonimizada e devolve a resposta com os dados reais restaurados.
export async function conversar(
  historico: Mensagem[],
  mapa: Mapa,
  canal: Canal,
  contexto: Contexto,
): Promise<RespostaLia> {
  const mensagens = historico.slice(-20).map((m) => ({ ...m, texto: pseudonimizar(m.texto, mapa) }));
  const r = await post<RespostaLia>('/conversa', { mensagens, canal, contexto }, 20000);
  const acao = r.acao && 'mensagem' in r.acao ? { ...r.acao, mensagem: restaurar(r.acao.mensagem, mapa) } : r.acao;
  const fala = limparFala(r.fala) || 'Desculpa, não entendi. Pode repetir?';
  return { ...r, fala: restaurar(fala, mapa), acao };
}

// Igual a conversar(), mas a resposta chega em partes: aoParcial recebe cada frase pronta da fala, para a Lia
// começar a falar antes de a resposta inteira chegar. Se o servidor não mandar em partes, quem chamou usa conversar().
export async function conversarEmPartes(
  historico: Mensagem[],
  mapa: Mapa,
  canal: Canal,
  contexto: Contexto,
  aoParcial: (frase: string) => void,
): Promise<RespostaLia> {
  const mensagens = historico.slice(-20).map((m) => ({ ...m, texto: pseudonimizar(m.texto, mapa) }));
  const controle = new AbortController();
  const t = setTimeout(() => controle.abort(), 25000);
  try {
    const r = await fetchEmPartes(`${base}/conversa/fluxo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lia-Token': process.env.EXPO_PUBLIC_LIA_TOKEN ?? '' },
      body: JSON.stringify({ mensagens, canal, contexto }),
      signal: controle.signal,
    });
    if (!r.ok || !r.body) throw new Error(`API respondeu ${r.status}`);
    const leitor = r.body.getReader();
    const decodificar = new TextDecoder();
    let resto = '';
    let final: RespostaLia | null = null;
    const ditas: string[] = [];
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      resto += decodificar.decode(value, { stream: true });
      let i: number;
      while ((i = resto.indexOf('\n')) >= 0) {
        const linha = resto.slice(0, i).trim();
        resto = resto.slice(i + 1);
        if (!linha) continue;
        const j = JSON.parse(linha) as { parcial?: string; final?: RespostaLia };
        const frase = j.parcial ? limparFala(j.parcial) : '';
        if (frase) {
          ditas.push(frase);
          aoParcial(restaurar(frase, mapa));
        }
        if (j.final) final = j.final;
      }
    }
    // Sem final ou com fala que não presta: fica com o que já foi dito; se nada foi dito, quem chamou usa conversar().
    if (!final && !ditas.length) throw new Error('resposta sem final');
    const resposta: RespostaLia = final ?? { fala: '', acao: null, golpe: null };
    const fala = limparFala(resposta.fala) || ditas.join(' ');
    if (!fala) throw new Error('resposta sem fala');
    const acao = resposta.acao && 'mensagem' in resposta.acao ? { ...resposta.acao, mensagem: restaurar(resposta.acao.mensagem, mapa) } : resposta.acao;
    return { ...resposta, fala: restaurar(fala, mapa), acao };
  } finally {
    clearTimeout(t);
  }
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
  /** abrir_busca: na Play Store, reabrir a busca do app pedido (alvo = nome do app); resolvido no app, não no Guia. */
  tipo: 'tocar' | 'tocar_ponto' | 'painel' | 'rolar_baixo' | 'rolar_cima' | 'voltar' | 'inicio' | 'esperar' | 'abrir_busca';
  alvo: string | null;
  /** Número do botão na lista "elementos" enviada (-1 quando não é tocar). */
  indice: number;
  /** Aviso antigolpe sobre algo que apareceu na tela (falado uma vez). */
  alerta?: string | null;
  /** Palavra do celular explicada nesta fala (vira "aprendida"). */
  palavra?: string | null;
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
  seguiu: string | null;
  feitos: string[];
  escondidos?: string[];
  titulo?: string;
  caminho?: string[];
  plano?: string[];
  /** Imagem da tela (JPEG em base64, dados pessoais cobertos), só quando o Guia travou. */
  imagem?: string | null;
  /** Palavras do celular que ela já aprendeu (a Lia não explica de novo). */
  palavras?: string[];
  /** Ela já passou por esta tela várias vezes (andando em círculos): a IA precisa mudar de caminho. */
  repetindo?: boolean;
  mesma_tela?: boolean;
  teclado?: boolean;
  /** Pedido de ensinar: sem atalhos, a pessoa faz cada passo desde o começo. */
  ensinar?: boolean;
};

// Guia genérico (#7): manda o contexto da tela (já pseudonimizado) e recebe o próximo passo.
export const proximoPasso = (pedido: PedidoGuia) => post<PassoGuia>('/guia/proximo', pedido, pedido.imagem ? 20000 : 12000);

// "O que é isso?": a explicação da tela em palavras simples.
export const explicarTela = (pedido: { pergunta: string; app: string; titulo: string; elementos: string[]; textos: string[]; objetivo: string }) =>
  post<{ fala: string }>('/guia/explicar', pedido, 12000);

// Caminho provável, pedido uma vez no começo do Guia.
export const planoGuia = (objetivo: string, app: string) =>
  post<{ passos: { tipo: Exclude<PassoGuia['tipo'], 'abrir_busca'>; nome: string }[] }>('/guia/plano', { objetivo, app }, 8000);
