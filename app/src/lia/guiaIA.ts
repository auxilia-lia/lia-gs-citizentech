import LiaGuia, { TelaEvent, TipoPasso } from '../../modules/lia-guia';
import { explicarTela, planoGuia, proximoPasso } from './api';
import { aprenderPalavra, carregarPalavras } from './palavras';
import { acharCaminho, fraseDoPasso, nomeCurto, PassoCaminho, salvarCaminho } from './caminhos';
import { novoMapa, pseudonimizar, restaurar } from './pseudonimizar';
import { modoRobo } from './robo';
import { normalizar } from './texto';

// Guia com IA (#7): o serviço nativo manda o contexto da tela (evento onScreen) e o próximo passo sai, nesta ordem:
// 1. do CAMINHO APRENDIDO (a pessoa já fez isso antes com a Lia) ou do PLANO que a IA montou no começo,
//    quando o próximo passo do caminho está na tela: resolve aqui mesmo, na hora, sem internet;
// 2. senão, da IA (/guia/proximo), que vê a tela e decide.
// Antes de sair do celular, os textos da tela passam pela pseudonimização (#9).
// Ao concluir, o caminho feito fica guardado, e a Lia fala um resumo para a pessoa fixar.

export const PACOTES: Record<string, string> = {
  whatsapp: 'com.whatsapp',
  configuracoes: 'settings',
  celular: 'home',
  playstore: 'com.android.vending',
};

const MAX_PASSOS = 15;
const LOJA = 'com.android.vending';

const FALAS_GESTO: Partial<Record<TipoPasso, string>> = {
  painel: 'Coloque o dedo no alto da tela, do lado direito, e deslize para baixo.',
  rolar_baixo: 'Arraste o dedo de baixo para cima, devagar, para ver mais coisas.',
  rolar_cima: 'Arraste o dedo de cima para baixo, devagar, para voltar ao começo.',
  voltar: 'Vamos voltar uma tela. Deslize o dedo da beirada esquerda para o meio, ou toque na seta de voltar.',
  inicio: 'Vamos para a tela inicial. Deslize o dedo de baixo, da beirada, para cima.',
};

// Botões que confirmam ou decidem algo: no plano da IA, só valem depois que o servidor confere a tela.
const DECIDE = /^(instalar|atualizar|enviar|confirmar|assinar|aceitar|finalizar|concluir|pagar|transferir|pix|comprar|excluir|apagar)\b/;

type Estado = {
  objetivo: string;
  app: string;
  nivel: number;
  feitos: string[];
  caminho: string[]; // telas por onde a pessoa passou (para a IA perceber quando entrou no lugar errado)
  trilha: PassoCaminho[]; // passos cumpridos (vira o caminho aprendido)
  instrucao: PassoCaminho | null; // o passo mostrado agora
  plano: PassoCaminho[];
  aprendido: boolean; // o plano é um caminho que a pessoa já fez (não da IA)
  posPlano: number;
  alertas: Set<string>;
  resumoDito: boolean;
  palavras: string[];
  appAlvo: { nome: string; pkg: string } | null; // o app que a conversa já sabe que é o certo (ex.: Maps para GPS)
  reaberturas: number;
  visitas: Record<string, number>; // quantas vezes passou por cada tela (para perceber quando anda em círculos)
  ultimaTela: string;
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

// "Hoje você tocou em Play Store, Pesquisar e Instalar." (ajuda a lembrar da próxima vez)
export function resumoDoCaminho(passos: PassoCaminho[]): string {
  const frases = passos.slice(0, 6).map((p) => fraseDoPasso(p).replace(/^Toque em /, '').toLowerCase());
  const toques = passos.filter((p) => p.tipo === 'tocar').map((p) => p.nome).slice(0, 5);
  if (toques.length >= 2 && toques.length === passos.length) {
    return `Para lembrar: você tocou em ${toques.slice(0, -1).join(', ')} e ${toques[toques.length - 1]}.`;
  }
  if (frases.length === 0) return '';
  const lista = passos.slice(0, 6).map((p) => fraseDoPasso(p));
  return `Para lembrar, o caminho foi: ${lista.join('; ')}.`;
}

// O próximo passo do plano está na tela? Devolve o número do botão (ou -1 para gesto) e qual passo do plano é.
function passoDoPlano(e: Estado, tela: TelaEvent): { passo: PassoCaminho; indice: number; pos: number } | null {
  if (tela.motivo !== 'mudou' || e.posPlano >= e.plano.length) return null;
  // Na Play Store quem decide é o roteiro do servidor, que confere de qual app é cada botão
  // (o plano só olhava o nome: "Instalar" de outro app, "Banco do Brasil SA" do desenvolvedor…).
  if (tela.app === LOJA) return null;
  // Olha o próximo e, se ela adiantou, os dois seguintes.
  for (let pos = e.posPlano; pos < Math.min(e.plano.length, e.posPlano + 3); pos++) {
    const passo = e.plano[pos];
    if (passo.tipo === 'tocar') {
      const alvo = normalizar(passo.nome);
      if (!alvo) continue;
      if (DECIDE.test(alvo)) return null; // botões que decidem: o servidor sempre confere antes (mesmo no caminho aprendido)
      const i = tela.elementos.findIndex((el) => !el.includes('[anúncio]') && normalizar(nomeCurto(el)) === alvo);
      // Interruptor (Wi-Fi, Bluetooth…): o servidor confere se já está como ela quer, para não desligar sem querer.
      if (i >= 0 && /\[(ligado|desligado)\]/.test(tela.elementos[i])) return null;
      if (i >= 0) return { passo: { ...passo, nome: nomeCurto(tela.elementos[i]) }, indice: i, pos };
    } else if (pos === e.posPlano && e.aprendido && passo.app === tela.app && FALAS_GESTO[passo.tipo]) {
      // Gesto do caminho aprendido, no mesmo app de antes.
      return { passo, indice: -1, pos };
    }
  }
  return null;
}

export function guiarComIA(
  objetivo: string, nivel: number, aoTerminar?: () => void, app = 'celular',
  opcoes: { appAlvo?: { nome: string; pkg: string } } = {},
): boolean {
  pararGuiaIA();
  const mapa = novoMapa();
  const estado: Estado = {
    objetivo, app, nivel, feitos: [], caminho: [], trilha: [], instrucao: null, plano: [], aprendido: false, posPlano: 0,
    alertas: new Set(), resumoDito: false, palavras: [], appAlvo: opcoes.appAlvo ?? null, reaberturas: 0, visitas: {}, ultimaTela: '',
    ocupado: false, pendente: null, remover: () => {},
  };
  const p = (t: string) => pseudonimizar(t, mapa);

  carregarPalavras().then((l) => { estado.palavras = l; });

  // Caminho aprendido (instantâneo) ou plano da IA (pedido em paralelo, sem segurar o começo).
  (async () => {
    const aprendido = modoRobo() ? null : await acharCaminho(objetivo);
    if (atual !== estado) return;
    if (aprendido) {
      estado.plano = aprendido.passos;
      estado.aprendido = true;
      return;
    }
    try {
      const r = await planoGuia(p(objetivo), app);
      if (atual === estado && !estado.aprendido) {
        estado.plano = r.passos.map((x) => ({ tipo: x.tipo, nome: restaurar(x.nome, mapa), app: '' }));
      }
    } catch {
      // sem plano: a IA decide tela a tela, como antes
    }
  })();

  const instruir = (tela: TelaEvent, tipo: TipoPasso, alvo: string | null, fala: string, indice: number) => {
    const nome = !alvo ? '' : tipo === 'tocar_ponto' ? alvo.split('|')[1] ?? '' : nomeCurto(alvo);
    estado.instrucao = tipo === 'esperar' ? null : { tipo, nome, app: tela.app };
    LiaGuia.instruct(tipo, alvo, fala, indice, tela.id ?? -1);
  };

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
      const nomeTela = tela.titulo ? `${tela.titulo} (${tela.app})` : tela.app;
      const mesmaTela = nomeTela === estado.ultimaTela;
      estado.ultimaTela = nomeTela;
      if (estado.caminho[estado.caminho.length - 1] !== nomeTela) {
        estado.caminho = [...estado.caminho, nomeTela].slice(-8);
        estado.visitas[nomeTela] = (estado.visitas[nomeTela] ?? 0) + 1;
      }
      const voltas = estado.visitas[nomeTela] ?? 0;
      // Andando em círculos de verdade: para, sem contar como conquista, e volta para a conversa.
      if (voltas >= 5) {
        LiaGuia.cancel('Estamos andando em círculos. Vou voltar para a Lia, e você me explica de novo o que quer.');
        pararGuiaIA(false);
        return;
      }
      // Caiu na tela inicial e a conversa já sabe o app certo: abre ele direto (nada de procurar ícone ou "voltar").
      if (tela.tela === 'inicio' && estado.appAlvo && estado.reaberturas < 2) {
        estado.reaberturas++;
        LiaGuia.say(`Vou abrir o ${estado.appAlvo.nome} para você.`);
        LiaGuia.openApp(estado.appAlvo.pkg);
        return;
      }

      // 1. Caminho aprendido / plano: o próximo passo está na tela? Mostra na hora.
      const local = passoDoPlano(estado, tela);
      if (local) {
        estado.posPlano = local.pos + 1;
        const fala = local.indice >= 0 ? `Toque em ${local.passo.nome}.` : FALAS_GESTO[local.passo.tipo] ?? '';
        instruir(tela, local.passo.tipo, local.indice >= 0 ? tela.elementos[local.indice] : null, fala, local.indice);
        return;
      }

      // 2. A IA decide.
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
        escondidos: (tela.escondidos ?? []).map(p),
        titulo: tela.titulo ? p(tela.titulo) : '',
        caminho: estado.caminho.map(p),
        plano: estado.plano.slice(estado.posPlano).map((x) => (x.tipo === 'tocar' ? p(x.nome) : x.tipo)),
        imagem: tela.imagem ?? null,
        palavras: estado.palavras,
        repetindo: voltas >= 3,
        mesma_tela: mesmaTela,
      });
      if (atual !== estado) return;
      // Chegou uma tela mais nova enquanto a IA pensava: esta resposta é de uma tela que já passou.
      if (estado.pendente) return;
      if (r.palavra && !estado.palavras.includes(r.palavra)) {
        estado.palavras = [...estado.palavras, r.palavra];
        aprenderPalavra(r.palavra);
      }
      let fala = restaurar(r.fala, mapa);
      // Antigolpe: o aviso vem uma vez só por guia (não repete a cada tela).
      if (r.alerta && !estado.alertas.has(r.alerta)) {
        estado.alertas.add(r.alerta);
        fala = `${restaurar(r.alerta, mapa)} ${fala}`;
      }
      if (r.tipo === 'abrir_busca') {
        // Play Store fora do caminho (tela inicial, página de outro app): reabre a busca do app pedido.
        estado.feitos.push('abrir_busca');
        LiaGuia.say(fala);
        if (r.alvo) LiaGuia.openUrl(`market://search?q=${encodeURIComponent(restaurar(r.alvo, mapa))}&c=apps`);
        return;
      }
      if (r.concluido) {
        const resumo = resumoDoCaminho(estado.trilha);
        estado.resumoDito = true;
        LiaGuia.finishAI(resumo ? `${fala} ${resumo}` : fala);
      } else {
        instruir(tela, r.tipo, r.alvo ? restaurar(r.alvo, mapa) : null, fala, r.indice ?? -1);
      }
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
  // "O que é isso?": explica a tela; a instrução atual continua valendo.
  const sExplicar = LiaGuia.addListener('onExplicar', async (e) => {
    if (atual !== estado) return;
    try {
      const r = await explicarTela({
        pergunta: e.pergunta, app: e.appNome || e.app, titulo: e.titulo ? p(e.titulo) : '',
        elementos: e.elementos.map(p), textos: e.textos.map(p), objetivo: p(objetivo),
      });
      if (atual === estado) LiaGuia.say(restaurar(r.fala, mapa));
    } catch {
      if (atual === estado) LiaGuia.say('Não consegui explicar agora. A internet está lenta.');
    }
  });
  const sPasso = LiaGuia.addListener('onStep', (e) => {
    if (atual !== estado) return;
    if (e.type === 'done_step' && e.step) {
      estado.feitos.push(e.step);
      // O caminho guardado (e o resumo do fim) só tem os passos que levaram adiante:
      // "voltar" desfaz o passo anterior, que era o lugar errado.
      if (estado.instrucao?.tipo === 'voltar') estado.trilha.pop();
      else if (estado.instrucao) estado.trilha.push(estado.instrucao);
      estado.instrucao = null;
    }
    if (e.type === 'finished') {
      // Deu certo: o caminho fica guardado para a próxima vez (e para "Meus caminhos").
      if (!modoRobo()) salvarCaminho(objetivo, app, estado.trilha, nivel);
      // Terminou pelo "já consegui": o resumo vem logo depois do "Que bom!".
      const resumo = estado.resumoDito ? '' : resumoDoCaminho(estado.trilha);
      if (resumo) setTimeout(() => LiaGuia.say(resumo), 2500);
      pararGuiaIA(false);
      aoTerminar?.();
    }
  });
  estado.remover = () => { sTela.remove(); sPasso.remove(); sExplicar.remove(); };
  atual = estado;
  const ok = LiaGuia.startAI(nivel);
  if (!ok) pararGuiaIA(false);
  return ok;
}
