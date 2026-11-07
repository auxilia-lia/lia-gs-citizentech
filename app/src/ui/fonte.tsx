import { Text as RNText, StyleSheet, TextProps, TextStyle } from 'react-native';
import { fontes } from './tema';

// Texto da Lia: usa a Poppins no peso certo. No Android, "fontWeight" não escolhe o arquivo da fonte,
// então o peso pedido no estilo vira o arquivo (Regular, Medium ou SemiBold).
export function Text({ style, ...props }: TextProps) {
  const plano = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  if (plano.fontFamily) return <RNText {...props} style={style} />;
  const peso = String(plano.fontWeight ?? '400');
  const familia = peso === 'bold' || Number(peso) >= 600 ? fontes.forte : Number(peso) >= 500 ? fontes.media : fontes.regular;
  const { fontWeight: _peso, ...resto } = plano;
  return <RNText {...props} style={[resto, { fontFamily: familia, includeFontPadding: false }]} />;
}
