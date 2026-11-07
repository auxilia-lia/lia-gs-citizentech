import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './fonte';
import { Ionicons } from '@expo/vector-icons';
import { cores } from './tema';
import { NomeIcone } from './componentes';
import { useMargens } from './margens';
import { falar } from '../lia/fala';

// "conversa" não aparece na barra: é a continuação do Início (o botão Início fica aceso).
export type Aba = 'inicio' | 'conversa' | 'familia' | 'eu';

const ABAS: { id: Aba; texto: string; icone: NomeIcone; iconeAtivo: NomeIcone }[] = [
  { id: 'inicio', texto: 'Início', icone: 'home-outline', iconeAtivo: 'home' },
  { id: 'familia', texto: 'Família', icone: 'people-outline', iconeAtivo: 'people' },
  { id: 'eu', texto: 'Eu', icone: 'star-outline', iconeAtivo: 'star' },
];

// Barra simples embaixo: ícone e texto, a aba atual em azul. Segurar uma aba faz a Lia dizer o nome dela.
export default function BarraAbas({ aba, mudar }: { aba: Aba; mudar: (a: Aba) => void }) {
  const ins = useMargens();
  const atual = aba === 'conversa' ? 'inicio' : aba;
  return (
    <View style={[st.barra, { paddingBottom: Math.max(ins.bottom, 8) }]}>
      {ABAS.map((a) => {
        const ativa = a.id === atual;
        return (
          <Pressable key={a.id} onPress={() => mudar(a.id)} onLongPress={() => falar(a.texto)} style={st.item}
            accessibilityRole="tab" accessibilityState={{ selected: ativa }} accessibilityLabel={a.texto}>
            <Ionicons name={ativa ? a.iconeAtivo : a.icone} size={27} color={ativa ? cores.primaria : cores.textoSuave} />
            <Text style={[st.texto, ativa && { color: cores.primaria }]}>{a.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  barra: { flexDirection: 'row', backgroundColor: cores.superficie, borderTopWidth: 1, borderTopColor: cores.borda, paddingTop: 8 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60, gap: 3 },
  texto: { fontSize: 14, fontWeight: '600', color: cores.textoSuave },
});
