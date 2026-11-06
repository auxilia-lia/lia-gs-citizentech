import { NativeModule, requireNativeModule } from 'expo';

export type StepEvent =
  | { type: 'found'; index: number; total: number; step: string; label: string; score: number; app?: string; nivel: number; revealed: boolean }
  | { type: 'not_found'; index: number; total: number; step: string; app?: string; visible?: string[] }
  | { type: 'done_step'; index: number; step?: string }
  | { type: 'wrong'; step: string; tocado: string }
  | { type: 'finished'; total: number };

export type TelaEvent = {
  app: string;
  tela: 'inicio' | 'painel' | 'app';
  elementos: string[];
  textos: string[];
  rolavel: boolean;
  motivo: 'mudou' | 'errou' | 'parado';
  errou: string | null;
};

export type TipoPasso = 'tocar' | 'painel' | 'rolar_baixo' | 'rolar_cima' | 'voltar' | 'inicio' | 'esperar';

export type ScreenNode = {
  text: string | null;
  desc: string | null;
  id: string | null;
  clickable: boolean;
  package: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
};

type LiaGuiaEvents = {
  onStep: (e: StepEvent) => void;
  onStatus: (e: { enabled: boolean }) => void;
  onScreen: (e: TelaEvent) => void;
  /** A pessoa falou pelo botão de microfone durante o Guia. */
  onVoz: (e: { texto: string; parou: boolean }) => void;
};

declare class LiaGuiaModule extends NativeModule<LiaGuiaEvents> {
  isEnabled(): boolean;
  /** Margens das barras do sistema, em dp. */
  insets(): { top: number; bottom: number };
  openAccessibilitySettings(): void;
  /** "settings", "home" (tela inicial) ou o pacote do app */
  openApp(pkg: string): boolean;
  /** nivel: 0 = faz junto, 1 = só confirma, 2 = só acompanha */
  start(steps: string[], nivel: number): boolean;
  stop(): void;
  /** Guia com IA: a tela chega pelo evento onScreen e a IA decide o passo. */
  startAI(nivel: number): boolean;
  instruct(tipo: TipoPasso, alvo: string | null, fala: string): void;
  point(label: string, fala: string): void;
  finishAI(fala: string): void;
  /** A Lia fala por cima do outro app. */
  say(texto: string): void;
  readScreen(): ScreenNode[];
}

export default requireNativeModule<LiaGuiaModule>('LiaGuia');
