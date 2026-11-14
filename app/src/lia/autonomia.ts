import { ler, gravar, apagarTudoDaPessoa } from './armazenamento';

// Autonomia progressiva (#10): a Lia ajuda menos conforme a pessoa acerta sozinha.
// 0 = faz junto, 1 = só confirma, 2 = só acompanha.
// Regra (por serviço):
// - sobe um nível depois de 2 conclusões SEGUIDAS sem erro (sem toque errado, sem pedir para repetir,
//   sem a Lia precisar corrigir o caminho);
// - conclusão com erro mantém o nível e zera a sequência;
// - 2 conclusões seguidas com muita dificuldade descem um nível.
export type Nivel = 0 | 1 | 2;
export type Registro = {
  nivel: Nivel;
  vezes: number; // conclusões no total
  seguidas: number; // conclusões seguidas sem erro (desde a última mudança de nível)
  dificeis: number; // conclusões seguidas com muita dificuldade
  errosUltima: number; // erros da última vez
};
export type Progresso = Record<string, Registro>;

const CHAVE = 'lia:progresso';
const CHAVE_DEMO = 'lia:nivel-demo';
const SEGUIDAS_PARA_SUBIR = 2;
const DIFICEIS_PARA_DESCER = 2;
const MUITA_DIFICULDADE = 3; // erros numa mesma vez

export const NOMES_NIVEL: Record<Nivel, string> = {
  0: 'Faz junto',
  1: 'Só confirma',
  2: 'Só acompanha',
};

const nivelValido = (n: unknown): Nivel => (n === 1 || n === 2 ? n : 0);

// Progresso antigo (serviço → vezes) vira o registro novo, sem perder o nível que a pessoa já tinha.
function migrar(valor: unknown): Registro {
  if (typeof valor === 'number') {
    const vezes = Math.max(0, Math.floor(valor));
    return { nivel: nivelValido(Math.min(vezes, 2)), vezes, seguidas: 0, dificeis: 0, errosUltima: 0 };
  }
  const r = (valor ?? {}) as Partial<Registro>;
  return {
    nivel: nivelValido(r.nivel),
    vezes: Number(r.vezes) || 0,
    seguidas: Number(r.seguidas) || 0,
    dificeis: Number(r.dificeis) || 0,
    errosUltima: Number(r.errosUltima) || 0,
  };
}

export async function carregarProgresso(): Promise<Progresso> {
  const bruto = await ler<Record<string, unknown>>(CHAVE, {});
  return Object.fromEntries(Object.entries(bruto ?? {}).map(([s, v]) => [s, migrar(v)]));
}

// ---------- nível de demonstração (Ajustes > Demonstrações) ----------
// Ligado, força o mesmo nível em todos os serviços. O progresso real continua guardado e intacto.
export const carregarNivelDemo = async (): Promise<Nivel | null> => {
  const n = await ler<number | null>(CHAVE_DEMO, null);
  return n === null || n === undefined ? null : nivelValido(n);
};
export const definirNivelDemo = (n: Nivel | null) => gravar(CHAVE_DEMO, n);

// O nível que vale agora para este serviço (o da demonstração, se estiver ligado).
export async function nivelPara(servico: string): Promise<Nivel> {
  const demo = await carregarNivelDemo();
  if (demo !== null) return demo;
  return (await carregarProgresso())[servico]?.nivel ?? 0;
}

export async function niveis(): Promise<Record<string, Nivel>> {
  const p = await carregarProgresso();
  const demo = await carregarNivelDemo();
  return Object.fromEntries(Object.entries(p).map(([s, r]) => [s, demo ?? r.nivel]));
}

// ---------- erros da tentativa atual ----------
// Contados enquanto o Guia está na tela: toque errado, pedir para repetir ("e agora?"), a Lia ter que corrigir
// o caminho (mandar voltar sem a pessoa ter seguido a instrução) ou a pessoa ficar parada sem conseguir.
let errosAgora = 0;
export const comecarTentativa = () => { errosAgora = 0; };
export const anotarErro = () => { errosAgora++; };

export type Conquista = { chave: string; quando: string; vezes: number; erros?: number; nivel?: Nivel };
const CHAVE_HIST = 'lia:historico';

export const carregarHistorico = () => ler<Conquista[]>(CHAVE_HIST, []);

export type Resultado = Registro & { mudou: 'subiu' | 'desceu' | null; demo: boolean };

export function aplicarConclusao(antes: Registro | undefined, erros: number): Registro & { mudou: 'subiu' | 'desceu' | null } {
  const r = migrar(antes ?? 0);
  let mudou: 'subiu' | 'desceu' | null = null;
  r.vezes += 1;
  r.errosUltima = erros;
  if (erros === 0) {
    r.dificeis = 0;
    r.seguidas += 1;
    if (r.seguidas >= SEGUIDAS_PARA_SUBIR && r.nivel < 2) {
      r.nivel = (r.nivel + 1) as Nivel;
      r.seguidas = 0;
      mudou = 'subiu';
    }
  } else {
    r.seguidas = 0;
    r.dificeis = erros >= MUITA_DIFICULDADE ? r.dificeis + 1 : 0;
    if (r.dificeis >= DIFICEIS_PARA_DESCER && r.nivel > 0) {
      r.nivel = (r.nivel - 1) as Nivel;
      r.dificeis = 0;
      mudou = 'desceu';
    }
  }
  return { ...r, mudou };
}

export async function registrarConclusao(servico: string): Promise<Resultado> {
  const erros = errosAgora;
  errosAgora = 0;
  const p = await carregarProgresso();
  // Com o nível de demonstração ligado, nada muda no progresso real.
  if ((await carregarNivelDemo()) !== null) {
    return { ...(p[servico] ?? migrar(0)), mudou: null, demo: true };
  }
  const { mudou, ...novo } = aplicarConclusao(p[servico], erros);
  p[servico] = novo;
  await gravar(CHAVE, p);
  const h = await carregarHistorico();
  await gravar(CHAVE_HIST, [{ chave: servico, quando: new Date().toISOString(), vezes: novo.vezes, erros, nivel: novo.nivel }, ...h].slice(0, 60));
  return { ...novo, mudou, demo: false };
}

// "Recomeçar do zero": apaga tudo o que a Lia guardou sobre o que a pessoa já fez
// (progresso, histórico, caminhos, palavras aprendidas, apresentações já faladas, nível de demonstração).
// Família, servidor, nome e ajustes continuam.
export const recomecarDoZero = () => apagarTudoDaPessoa();

// Autonomia geral (0 a 1): média de quanto a pessoa já faz sozinha em cada coisa que já fez.
export function autonomiaGeral(p: Progresso): number {
  const v = Object.values(p).filter((r) => r.vezes > 0);
  if (!v.length) return 0;
  return v.reduce((soma, r) => soma + (r.nivel + 1) / 3, 0) / v.length;
}

export type Medalha = { id: string; nome: string; descricao: string; icone: string; ganhou: boolean };

export function medalhas(p: Progresso): Medalha[] {
  const regs = Object.values(p);
  const total = regs.reduce((a, r) => a + r.vezes, 0);
  const coisas = regs.filter((r) => r.vezes > 0).length;
  const sozinho = regs.some((r) => r.nivel === 2);
  const aulas = Object.entries(p).filter(([k, r]) => k.startsWith('aula:') && r.vezes > 0).length;
  return [
    { id: 'primeiro', nome: 'Primeiro passo', descricao: 'Fez a primeira coisa com a Lia', icone: 'footsteps', ganhou: total >= 1 },
    { id: 'sozinho', nome: 'Faz sozinho', descricao: 'Fez uma tarefa sem precisar de ajuda', icone: 'ribbon', ganhou: sozinho },
    { id: 'curioso', nome: 'Curioso', descricao: 'Fez 3 coisas diferentes', icone: 'compass', ganhou: coisas >= 3 },
    { id: 'aluno', nome: 'Bom aluno', descricao: 'Completou 3 aulas', icone: 'school', ganhou: aulas >= 3 },
    { id: 'constante', nome: 'Constante', descricao: 'Fez 10 tarefas no total', icone: 'flame', ganhou: total >= 10 },
    { id: 'independente', nome: 'Independente', descricao: 'Chegou a 80% de autonomia', icone: 'trophy', ganhou: autonomiaGeral(p) >= 0.8 && coisas >= 3 },
  ];
}
