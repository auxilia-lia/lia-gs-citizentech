import * as Speech from 'expo-speech';
import LiaGuia from '../../modules/lia-guia';

// Voz da Lia: a voz mais natural em português do Brasil que o celular tiver
// (as "Enhanced"/de rede soam mais humanas), num ritmo de conversa, nem lento nem corrido.
export const RITMO = 1.08;
let voz: string | undefined;

export async function prepararVoz() {
  try {
    const vozes = await Speech.getAvailableVoicesAsync();
    // 1º: a mesma voz que o Guia usa (assim a Lia soa igual no app e por cima dos outros apps)
    let nome: string | null = null;
    try { nome = LiaGuia.voice(); } catch { nome = null; }
    if (nome && vozes.some((v) => v.identifier === nome)) { voz = nome; return; }
    // 2º: a melhor voz pt-BR: as "de rede" e "Enhanced" soam mais humanas
    const pt = vozes.filter((v) => v.language?.toLowerCase().replace('_', '-').startsWith('pt-br'));
    const pontos = (v: Speech.Voice) => (/network/i.test(v.identifier) ? 2 : 0) + (v.quality === Speech.VoiceQuality.Enhanced ? 1 : 0);
    pt.sort((a, b) => pontos(b) - pontos(a));
    voz = pt[0]?.identifier;
  } catch {
    voz = undefined; // usa a voz padrão do celular
  }
}

let tentouGuia = false;

export function falar(texto: string, opcoes: Speech.SpeechOptions = {}) {
  // Se o Guia foi ligado depois de abrir o app, passa a usar a voz dele.
  if (!tentouGuia) { tentouGuia = true; try { const n = LiaGuia.voice(); if (n) voz = n; } catch { /* sem Guia */ } }
  Speech.speak(texto, { language: 'pt-BR', rate: RITMO, voice: voz, ...opcoes });
}

export const calar = () => Speech.stop();
