import { NativeModule, requireNativeModule } from 'expo';

export type StepEvent =
  | { type: 'found'; index: number; total: number; step: string; label: string; score: number; app?: string; nivel: number; revealed: boolean }
  | { type: 'not_found'; index: number; total: number; step: string; app?: string; visible?: string[] }
  | { type: 'done_step'; index: number; step?: string }
  | { type: 'wrong'; step: string; tocado: string }
  | { type: 'finished'; total: number }
  /** A pessoa abriu um app protegido: a Lia não lê a tela dele. */
  | { type: 'protected'; app: string };

export type AppDoCelular = { pkg: string; nome: string; auto: boolean; protegido: boolean };

export type TelaEvent = {
  app: string;
  tela: 'inicio' | 'painel' | 'app';
  elementos: string[];
  textos: string[];
  rolavel: boolean;
  motivo: 'mudou' | 'errou' | 'parado';
  errou: string | null;
  /** A instrução que a pessoa acabou de cumprir (para a IA não culpar a pessoa). */
  seguiu: string | null;
  /** Número desta tela: a resposta da IA volta com ele, e resposta de tela antiga é descartada. */
  id: number;
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
  onVoz: (e: { texto: string; parou: boolean; conseguiu?: boolean; protegeu?: string; tratado?: boolean }) => void;
};

declare class LiaGuiaModule extends NativeModule<LiaGuiaEvents> {
  isEnabled(): boolean;
  /** O que o Guia está mostrando agora, em português (para a conversa saber se há algo na tela). */
  state(): string;
  /** Apps do celular e se cada um é protegido (neles a Lia não olha a tela). */
  apps(): AppDoCelular[];
  setProtected(pkg: string, proteger: boolean): void;
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
  /** indice = número do botão na lista "elementos" da tela (lugar exato); tela = id da tela respondida. */
  instruct(tipo: TipoPasso, alvo: string | null, fala: string, indice: number, tela: number): void;
  point(label: string, fala: string): void;
  finishAI(fala: string): void;
  /** Para sem contar como conquista (a pessoa desistiu) e volta para a Lia. */
  cancel(fala: string): void;
  /** Nome da voz que o Guia usa (null se o Guia não estiver ativo). */
  voice(): string | null;
  /** A Lia fala por cima do outro app. */
  say(texto: string): void;
  readScreen(): ScreenNode[];
}

export default requireNativeModule<LiaGuiaModule>('LiaGuia');
