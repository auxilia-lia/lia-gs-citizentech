import { ler, gravar } from './armazenamento';

// Autonomia progressiva (#10): cada vez que a pessoa conclui um serviço, a Lia ajuda menos.
// 0 = faz junto, 1 = só confirma, 2 = só acompanha.
export type Nivel = 0 | 1 | 2;
export type Progresso = Record<string, number>; // serviço → vezes concluídas

const CHAVE = 'lia:progresso';

export const NOMES_NIVEL: Record<Nivel, string> = {
  0: 'Faz junto',
  1: 'Só confirma',
  2: 'Só acompanha',
};

export const carregarProgresso = () => ler<Progresso>(CHAVE, {});

export const nivelDe = (vezes: number): Nivel => (Math.min(vezes, 2) as Nivel);

export async function niveis(): Promise<Record<string, Nivel>> {
  const p = await carregarProgresso();
  return Object.fromEntries(Object.entries(p).map(([s, v]) => [s, nivelDe(v)]));
}

export type Conquista = { chave: string; quando: string; vezes: number };
const CHAVE_HIST = 'lia:historico';

export const carregarHistorico = () => ler<Conquista[]>(CHAVE_HIST, []);

export async function registrarConclusao(servico: string): Promise<number> {
  const p = await carregarProgresso();
  p[servico] = (p[servico] ?? 0) + 1;
  await gravar(CHAVE, p);
  const h = await carregarHistorico();
  await gravar(CHAVE_HIST, [{ chave: servico, quando: new Date().toISOString(), vezes: p[servico] }, ...h].slice(0, 60));
  return p[servico];
}

export async function zerarProgresso() {
  await gravar<Progresso>(CHAVE, {});
  await gravar<Conquista[]>(CHAVE_HIST, []);
  await gravar('lia:caminhos', []);
  await gravar('lia:palavras', []);
}

// Autonomia geral (0 a 1): média de quanto a pessoa já faz sozinha em cada coisa que já fez.
export function autonomiaGeral(p: Progresso): number {
  const v = Object.values(p).filter((n) => n > 0);
  if (!v.length) return 0;
  return v.reduce((soma, n) => soma + (nivelDe(n) + 1) / 3, 0) / v.length;
}

export type Medalha = { id: string; nome: string; descricao: string; icone: string; ganhou: boolean };

export function medalhas(p: Progresso): Medalha[] {
  const total = Object.values(p).reduce((a, b) => a + b, 0);
  const coisas = Object.values(p).filter((n) => n > 0).length;
  const sozinho = Object.values(p).some((n) => nivelDe(n) === 2);
  const aulas = Object.entries(p).filter(([k, n]) => k.startsWith('aula:') && n > 0).length;
  return [
    { id: 'primeiro', nome: 'Primeiro passo', descricao: 'Fez a primeira coisa com a Lia', icone: 'footsteps', ganhou: total >= 1 },
    { id: 'sozinho', nome: 'Faz sozinho', descricao: 'Fez uma tarefa sem precisar de ajuda', icone: 'ribbon', ganhou: sozinho },
    { id: 'curioso', nome: 'Curioso', descricao: 'Fez 3 coisas diferentes', icone: 'compass', ganhou: coisas >= 3 },
    { id: 'aluno', nome: 'Bom aluno', descricao: 'Completou 3 aulas', icone: 'school', ganhou: aulas >= 3 },
    { id: 'constante', nome: 'Constante', descricao: 'Fez 10 tarefas no total', icone: 'flame', ganhou: total >= 10 },
    { id: 'independente', nome: 'Independente', descricao: 'Chegou a 80% de autonomia', icone: 'trophy', ganhou: autonomiaGeral(p) >= 0.8 && coisas >= 3 },
  ];
}
