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

export async function registrarConclusao(servico: string): Promise<number> {
  const p = await carregarProgresso();
  p[servico] = (p[servico] ?? 0) + 1;
  await gravar(CHAVE, p);
  return p[servico];
}

export const zerarProgresso = () => gravar<Progresso>(CHAVE, {});
