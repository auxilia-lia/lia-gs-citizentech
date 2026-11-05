import Constants from 'expo-constants';

export type Mensagem = { papel: 'pessoa' | 'lia'; texto: string };

// Endereço da API da Lia. Por padrão usa o mesmo computador que roda o Metro
// (o notebook), na porta 8000. Para outro endereço: EXPO_PUBLIC_LIA_API no .env do app.
function enderecoApi(): string {
  const fixo = process.env.EXPO_PUBLIC_LIA_API;
  if (fixo) return fixo.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:8000`;
}

export const API = enderecoApi();

export async function conversar(mensagens: Mensagem[]): Promise<string> {
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), 30000);
  try {
    const r = await fetch(`${API}/conversa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagens: mensagens.slice(-20) }),
      signal: controle.signal,
    });
    if (!r.ok) throw new Error(`API respondeu ${r.status}`);
    const dados = (await r.json()) as { resposta: string };
    return dados.resposta;
  } finally {
    clearTimeout(tempo);
  }
}
