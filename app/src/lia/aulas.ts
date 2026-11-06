import type { NomeIcone } from '../ui/componentes';

// Aulas curtas para aprender a usar o celular. Cada uma é guiada na tela pela Lia,
// e cada vez que a pessoa repete, a Lia ajuda menos (autonomia progressiva).
export type Aula = { id: string; titulo: string; icone: NomeIcone; app: 'celular' | 'configuracoes' | 'whatsapp' | 'playstore'; objetivo: string };

export const AULAS: Aula[] = [
  { id: 'wifi', titulo: 'Ligar o Wi-Fi', icone: 'wifi', app: 'celular', objetivo: 'ligar o Wi-Fi' },
  { id: 'lanterna', titulo: 'Acender a lanterna', icone: 'flashlight', app: 'celular', objetivo: 'acender a lanterna' },
  { id: 'letra', titulo: 'Aumentar a letra', icone: 'text', app: 'configuracoes', objetivo: 'aumentar o tamanho da letra' },
  { id: 'foto-whats', titulo: 'Mandar foto no WhatsApp', icone: 'image', app: 'whatsapp', objetivo: 'mandar uma foto para alguém no WhatsApp' },
  { id: 'video-whats', titulo: 'Chamada de vídeo', icone: 'videocam', app: 'whatsapp', objetivo: 'fazer uma chamada de vídeo no WhatsApp' },
  { id: 'bluetooth', titulo: 'Ligar o Bluetooth', icone: 'bluetooth', app: 'celular', objetivo: 'ligar o Bluetooth' },
  { id: 'brilho', titulo: 'Deixar a tela mais clara', icone: 'sunny', app: 'celular', objetivo: 'aumentar o brilho da tela' },
  { id: 'instalar', titulo: 'Instalar um app', icone: 'download', app: 'playstore', objetivo: 'procurar e instalar um aplicativo' },
];
