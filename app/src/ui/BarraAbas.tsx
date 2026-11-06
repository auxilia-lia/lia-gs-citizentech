import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores, raio, sombra } from './tema';
import { NomeIcone } from './componentes';
import { useMargens } from './margens';

export type Aba = 'inicio' | 'conversa' | 'familia' | 'voce';

const ABAS: { id: Aba; texto: string; icone: NomeIcone; iconeAtivo: NomeIcone }[] = [
  { id: 'inicio', texto: 'Início', icone: 'home-outline', iconeAtivo: 'home' },
  { id: 'conversa', texto: 'Conversar', icone: 'chatbubble-ellipses-outline', iconeAtivo: 'chatbubble-ellipses' },
  { id: 'familia', texto: 'Família', icone: 'people-outline', iconeAtivo: 'people' },
  { id: 'voce', texto: 'Você', icone: 'person-circle-outline', iconeAtivo: 'person-circle' },
];

// Barra flutuante embaixo: um "pílula" azul desliza até a aba escolhida e o ícone dá um pulinho.
export default function BarraAbas({ aba, mudar }: { aba: Aba; mudar: (a: Aba) => void }) {
  const ins = useMargens();
  const [largura, setLargura] = useState(0);
  const indice = ABAS.findIndex((a) => a.id === aba);
  const pos = useRef(new Animated.Value(indice)).current;

  useEffect(() => {
    Animated.spring(pos, { toValue: indice, useNativeDriver: true, speed: 16, bounciness: 7 }).start();
  }, [indice, pos]);

  const itemL = largura / ABAS.length;
  return (
    <View style={[st.fora, { paddingBottom: Math.max(ins.bottom, 10) }]}>
      <View style={st.barra} onLayout={(e) => setLargura(e.nativeEvent.layout.width - 12)}>
        {largura > 0 && (
          <Animated.View style={[st.pilula, { width: itemL, transform: [{ translateX: pos.interpolate({ inputRange: [0, ABAS.length - 1], outputRange: [0, itemL * (ABAS.length - 1)] }) }] }]} />
        )}
        {ABAS.map((a) => <Item key={a.id} {...a} ativa={a.id === aba} onPress={() => mudar(a.id)} />)}
      </View>
    </View>
  );
}

function Item({ texto, icone, iconeAtivo, ativa, onPress }: { texto: string; icone: NomeIcone; iconeAtivo: NomeIcone; ativa: boolean; onPress: () => void }) {
  const pulo = useRef(new Animated.Value(ativa ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(pulo, { toValue: ativa ? 1 : 0, duration: 360, easing: Easing.out(Easing.back(2.5)), useNativeDriver: true }).start();
  }, [ativa, pulo]);
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: ativa }} accessibilityLabel={texto} style={st.item}>
      <Animated.View style={{ transform: [
        { scale: pulo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
        { translateY: pulo.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
      ] }}>
        <Ionicons name={ativa ? iconeAtivo : icone} size={28} color={ativa ? cores.primaria : cores.textoSuave} />
      </Animated.View>
      <Text style={[st.texto, ativa && st.textoAtivo]}>{texto}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  fora: { paddingHorizontal: 12, paddingTop: 6 },
  barra: { flexDirection: 'row', backgroundColor: cores.superficie, borderRadius: raio.lg, padding: 6, borderWidth: 1, borderColor: cores.borda, ...sombra },
  pilula: { position: 'absolute', top: 6, bottom: 6, left: 6, borderRadius: raio.md, backgroundColor: cores.primariaSuave },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, minHeight: 64 },
  texto: { fontSize: 14, fontWeight: '700', color: cores.textoSuave, marginTop: 2 },
  textoAtivo: { color: cores.primaria },
});
