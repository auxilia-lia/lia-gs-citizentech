import type { TipoPasso } from '../../modules/lia-guia';
import { gravar, ler } from './armazenamento';
import { normalizar } from './texto';

// Caminhos aprendidos: quando a pessoa conclui algo com o Guia, a sequência de passos fica guardada no celular.
// Da próxima vez, o Guia segue esse caminho sozinho (sem esperar a IA), e a aba "Você" mostra o caminho
// em cartões ("Meus caminhos"), para rever, praticar ou mandar para alguém da família.

export type PassoCaminho = { tipo: TipoPasso; nome: string; app: string };
export type Caminho = {
  chave: string;
  objetivo: string;
  app: string; // whatsapp | configuracoes | celular | playstore | ...
  passos: PassoCaminho[];
  vezes: number;
  sozinho: number; // vezes no nível "só acompanha"
  ultima: string; // ISO
};

const CHAVE = 'lia:caminhos';
const VAZIAS = new Set(['eu', 'quero', 'queria', 'preciso', 'como', 'me', 'ajuda', 'ajudar', 'a', 'o', 'as', 'os', 'um', 'uma',
  'de', 'do', 'da', 'no', 'na', 'pra', 'para', 'meu', 'minha', 'celular', 'por', 'favor', 'voce', 'pode', 'fazer', 'que', 'e']);

// "Quero ligar o Bluetooth, por favor" e "como ligo o bluetooth" viram quase a mesma chave.
export function chaveDe(objetivo: string): string {
  return normalizar(objetivo).split(' ').filter((p) => p.length > 1 && !VAZIAS.has(p)).sort().join(' ');
}

export const carregarCaminhos = () => ler<Caminho[]>(CHAVE, []);

export async function acharCaminho(objetivo: string): Promise<Caminho | null> {
  const k = chaveDe(objetivo);
  if (!k) return null;
  const todos = await carregarCaminhos();
  return todos.find((c) => c.chave === k) ?? null;
}

export async function salvarCaminho(objetivo: string, app: string, passos: PassoCaminho[], nivel: number) {
  const k = chaveDe(objetivo);
  if (!k || passos.length === 0) return;
  const todos = await carregarCaminhos();
  const antigo = todos.find((c) => c.chave === k);
  const novo: Caminho = {
    chave: k,
    objetivo: antigo?.objetivo ?? objetivo,
    app,
    passos: passos.slice(0, 20),
    vezes: (antigo?.vezes ?? 0) + 1,
    sozinho: (antigo?.sozinho ?? 0) + (nivel >= 2 ? 1 : 0),
    ultima: new Date().toISOString(),
  };
  await gravar(CHAVE, [novo, ...todos.filter((c) => c.chave !== k)].slice(0, 40));
}

// Frase curta para cada passo (usada nos cartões e no resumo do fim).
export function fraseDoPasso(p: PassoCaminho): string {
  switch (p.tipo) {
    case 'tocar': return `Toque em ${p.nome}`;
    case 'painel': return 'Puxe do alto da tela, pelo lado direito';
    case 'rolar_baixo': return 'Arraste a tela para cima';
    case 'rolar_cima': return 'Arraste a tela para baixo';
    case 'voltar': return 'Volte uma tela';
    case 'inicio': return 'Vá para a tela inicial';
    default: return p.nome || 'Espere';
  }
}

// "Instalar — Pier [anúncio]" -> "Instalar" (o nome que a pessoa vê no botão)
export function nomeCurto(elemento: string): string {
  return elemento.split(' — ')[0].replace(/\s*\[[^\]]*\]/g, '').trim();
}
