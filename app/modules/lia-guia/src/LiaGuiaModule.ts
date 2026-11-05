import { NativeModule, requireNativeModule } from 'expo';

export type StepEvent =
  | { type: 'found'; index: number; total: number; step: string; label: string; score: number; app?: string }
  | { type: 'not_found'; index: number; total: number; step: string; app?: string; visible?: string[] }
  | { type: 'done_step'; index: number; step?: string }
  | { type: 'finished'; total: number };

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
};

declare class LiaGuiaModule extends NativeModule<LiaGuiaEvents> {
  isEnabled(): boolean;
  openAccessibilitySettings(): void;
  openApp(pkg: string): boolean;
  start(steps: string[]): boolean;
  stop(): void;
  readScreen(): ScreenNode[];
}

export default requireNativeModule<LiaGuiaModule>('LiaGuia');
