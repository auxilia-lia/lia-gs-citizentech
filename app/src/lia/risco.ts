// Confirmação conforme o risco (RF05). Quanto mais a ação mexe na vida da pessoa,
// mais a Lia confirma antes. O núcleo em Java tem a mesma regra no servidor; quando ele responde, vale a dele.
export type Risco = 'baixo' | 'medio' | 'alto';

export const RISCO_DA_ACAO: Record<string, Risco> = {
  guiar: 'baixo', // só aponta; quem toca é a pessoa
  tirar_foto: 'baixo',
  avisar_familiar: 'medio', // manda mensagem em nome dela
  agendar_por_voz: 'medio', // igual ao núcleo Java: ação comum, confirma com sim ou não
};

export const precisaConfirmar = (tipo: string) => (RISCO_DA_ACAO[tipo] ?? 'alto') !== 'baixo';

const SIM = ['sim', 'pode', 'manda', 'mande', 'isso', 'claro', 'ok', 'quero', 'confirmo', 'certo'];
const NAO = ['nao', 'cancela', 'espera', 'para', 'nunca', 'deixa'];

// Entende "sim"/"não" falado. Devolve null se não deu para saber.
export function respostaSimNao(falado: string): boolean | null {
  const t = falado.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (NAO.some((p) => new RegExp(`\\b${p}\\b`).test(t))) return false;
  if (SIM.some((p) => new RegExp(`\\b${p}\\b`).test(t))) return true;
  return null;
}
