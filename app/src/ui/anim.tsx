import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, PressableProps, StyleProp, View, ViewStyle } from 'react-native';
import { cores } from './tema';

// Animações da Lia: suaves e curtas (nada que distraia ou deixe lento).

// Entra deslizando de baixo e aparecendo. Use "atraso" para escalonar uma lista.
export function Aparecer({ children, atraso = 0, estilo, distancia = 18 }: {
  children: ReactNode; atraso?: number; estilo?: StyleProp<ViewStyle>; distancia?: number;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay: atraso, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, atraso]);
  return (
    <Animated.View style={[estilo, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distancia, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// Área tocável que "afunda" um pouco ao tocar (dá a sensação de botão de verdade).
export function Toque({ children, estilo, escala = 0.96, ...props }: PressableProps & {
  children: ReactNode; estilo?: StyleProp<ViewStyle>; escala?: number;
}) {
  const v = useRef(new Animated.Value(1)).current;
  const ir = (para: number) => Animated.spring(v, { toValue: para, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable {...props} onPressIn={(e) => { ir(escala); props.onPressIn?.(e); }} onPressOut={(e) => { ir(1); props.onPressOut?.(e); }}>
      <Animated.View style={[estilo, { transform: [{ scale: v }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// Ondas que saem de um círculo (microfone ouvindo, botão principal chamando atenção).
export function Ondas({ tamanho, cor = cores.branco, ativo = true, quantas = 2 }: {
  tamanho: number; cor?: string; ativo?: boolean; quantas?: number;
}) {
  const vs = useRef(Array.from({ length: quantas }, () => new Animated.Value(0))).current;
  useEffect(() => {
    if (!ativo) { vs.forEach((v) => v.setValue(0)); return; }
    const loops = vs.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 700),
      Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [ativo, vs]);
  if (!ativo) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      {vs.map((v, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', width: tamanho, height: tamanho, borderRadius: tamanho / 2, borderWidth: 3, borderColor: cor,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
        }} />
      ))}
    </View>
  );
}

// Flutuar devagar para cima e para baixo (ícone de destaque).
export function Flutuar({ children }: { children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, [v]);
  return <Animated.View style={{ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }}>{children}</Animated.View>;
}

// Barra de progresso que enche com animação.
export function BarraAnimada({ fracao, cor = cores.primaria, fundo = cores.borda, altura = 10 }: {
  fracao: number; cor?: string; fundo?: string; altura?: number;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: Math.max(0, Math.min(1, fracao)), duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [v, fracao]);
  return (
    <View style={{ height: altura, borderRadius: altura / 2, backgroundColor: fundo, overflow: 'hidden' }}>
      <Animated.View style={{ height: altura, borderRadius: altura / 2, backgroundColor: cor, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}
