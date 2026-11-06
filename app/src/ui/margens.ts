import { useEffect, useState } from 'react';
import { AppState, StatusBar } from 'react-native';
import LiaGuia from '../../modules/lia-guia';

export type Margens = { top: number; bottom: number };

function ler(): Margens {
  try {
    const m = LiaGuia.insets();
    return { top: m.top || StatusBar.currentHeight || 24, bottom: m.bottom };
  } catch {
    return { top: StatusBar.currentHeight ?? 24, bottom: 24 };
  }
}

// Espaço das barras do sistema (status em cima, navegação embaixo), para nada ficar escondido atrás delas.
export function useMargens(): Margens {
  const [m, setM] = useState<Margens>(ler);
  useEffect(() => {
    const t = setTimeout(() => setM(ler()), 300); // a janela já está medida
    const s = AppState.addEventListener('change', (e) => e === 'active' && setM(ler()));
    return () => { clearTimeout(t); s.remove(); };
  }, []);
  return m;
}
