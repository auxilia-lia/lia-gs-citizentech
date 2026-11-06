import * as Speech from 'expo-speech';

// Voz da Lia: a voz mais natural em português do Brasil que o celular tiver
// (as "Enhanced"/de rede soam mais humanas), num ritmo de conversa, nem lento nem corrido.
export const RITMO = 1.08;
let voz: string | undefined;

export async function prepararVoz() {
  try {
    const vozes = await Speech.getAvailableVoicesAsync();
    const pt = vozes.filter((v) => v.language?.toLowerCase().replace('_', '-').startsWith('pt-br'));
    pt.sort((a, b) => Number(b.quality === Speech.VoiceQuality.Enhanced) - Number(a.quality === Speech.VoiceQuality.Enhanced)
      || Number(/network/i.test(b.identifier)) - Number(/network/i.test(a.identifier)));
    voz = pt[0]?.identifier;
  } catch {
    voz = undefined; // usa a voz padrão do celular
  }
}

export function falar(texto: string, opcoes: Speech.SpeechOptions = {}) {
  Speech.speak(texto, { language: 'pt-BR', rate: RITMO, voice: voz, ...opcoes });
}

export const calar = () => Speech.stop();
