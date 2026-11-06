import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMargens } from './margens';
import { cores, raio, sombra } from './tema';
import { NomeIcone } from './componentes';

export type Aba = 'inicio' | 'conversa' | 'familia' | 'voce';

const ABAS: { id: Aba; texto: string; icone: NomeIcone; iconeAtivo: NomeIcone }[] = [
  { id: 'inicio', texto: 'Início', icone: 'home-outline', iconeAtivo: 'home' },
  { id: 'conversa', texto: 'Conversar', icone: 'chatbubble-ellipses-outline', iconeAtivo: 'chatbubble-ellipses' },
  { id: 'familia', texto: 'Família', icone: 'people-outline', iconeAtivo: 'people' },
  { id: 'voce', texto: 'Você', icone: 'person-circle-outline', iconeAtivo: 'person-circle' },
];

// Barra flutuante embaixo, sempre com ícone + nome (nunca só ícone).
export default function BarraAbas({ aba, mudar }: { aba: Aba; mudar: (a: Aba) => void }) {
  const ins = useMargens();
  return (
    <View style={[st.fora, { paddingBottom: Math.max(ins.bottom, 10) }]}>
      <View style={st.barra}>
        {ABAS.map((a) => {
          const ativa = a.id === aba;
          return (
            <Pressable
              key={a.id}
              onPress={() => mudar(a.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativa }}
              accessibilityLabel={a.texto}
              style={[st.item, ativa && st.itemAtivo]}
            >
              <Ionicons name={ativa ? a.iconeAtivo : a.icone} size={28} color={ativa ? cores.primaria : cores.textoSuave} />
              <Text style={[st.texto, ativa && st.textoAtivo]}>{a.texto}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  fora: { paddingHorizontal: 12, paddingTop: 6, backgroundColor: 'transparent' },
  barra: {
    flexDirection: 'row', backgroundColor: cores.superficie, borderRadius: raio.lg, padding: 6,
    borderWidth: 1, borderColor: cores.borda, ...sombra,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: raio.md, minHeight: 64 },
  itemAtivo: { backgroundColor: cores.primariaSuave },
  texto: { fontSize: 14, fontWeight: '700', color: cores.textoSuave, marginTop: 2 },
  textoAtivo: { color: cores.primaria },
});
