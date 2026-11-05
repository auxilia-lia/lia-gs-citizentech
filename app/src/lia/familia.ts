import { Linking } from 'react-native';
import { ler, gravar } from './armazenamento';
import { distanciaRelativa, normalizar } from './texto';

// Família para o Age (#8). O telefone fica só no celular; a IA só recebe o parentesco.
export type Familiar = { id: string; nome: string; parentesco: string; telefone: string };

const CHAVE = 'lia:familia';

export const carregarFamilia = () => ler<Familiar[]>(CHAVE, []);
export const salvarFamilia = (f: Familiar[]) => gravar(CHAVE, f);

// "minha filha", "Ana", "aninha" ou "a neta" → o familiar mais parecido, se for parecido o bastante.
export function acharFamiliar(contato: string, familia: Familiar[]): Familiar | null {
  const alvo = normalizar(contato).replace(/^(minha|meu|a|o|pra|para)\s+/, '');
  let melhor: { f: Familiar; d: number } | null = null;
  for (const f of familia) {
    const nome = normalizar(f.nome);
    const primeiro = nome.split(' ')[0];
    const d = Math.min(
      distanciaRelativa(alvo, f.parentesco),
      distanciaRelativa(alvo, nome),
      distanciaRelativa(alvo, primeiro),
      alvo.includes(primeiro) || alvo.includes(normalizar(f.parentesco)) ? 0.1 : 1,
    );
    if (!melhor || d < melhor.d) melhor = { f, d };
  }
  return melhor && melhor.d <= 0.34 ? melhor.f : null;
}

export function numeroWhatsApp(telefone: string): string {
  const d = telefone.replace(/\D/g, '');
  return d.startsWith('55') && d.length >= 12 ? d : `55${d}`;
}

// Abre o WhatsApp com a mensagem pronta. Quem toca em "enviar" é a pessoa.
export async function abrirWhatsApp(telefone: string, mensagem: string): Promise<boolean> {
  const n = numeroWhatsApp(telefone);
  const texto = encodeURIComponent(mensagem);
  try {
    await Linking.openURL(`whatsapp://send?phone=${n}&text=${texto}`);
    return true;
  } catch {
    try {
      await Linking.openURL(`https://wa.me/${n}?text=${texto}`);
      return true;
    } catch {
      return false;
    }
  }
}
