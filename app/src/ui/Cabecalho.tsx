import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores, espaco, tamanho } from './tema';

// Cabeçalho de tela secundária, com "Voltar" escrito (não só uma seta).
export default function Cabecalho({ titulo, voltar }: { titulo: string; voltar: () => void }) {
  return (
    <View style={st.cab}>
      <Pressable onPress={voltar} accessibilityRole="button" accessibilityLabel="Voltar" style={st.voltar}>
        <Ionicons name="chevron-back" size={28} color={cores.primaria} />
        <Text style={st.voltarTexto}>Voltar</Text>
      </Pressable>
      <Text style={st.titulo} numberOfLines={1}>{titulo}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  cab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: espaco.md, paddingVertical: espaco.sm, gap: espaco.sm, borderBottomWidth: 1, borderColor: cores.borda, backgroundColor: cores.superficie },
  voltar: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingRight: espaco.sm },
  voltarTexto: { fontSize: tamanho.pequeno, fontWeight: '800', color: cores.primaria },
  titulo: { fontSize: tamanho.corpo, fontWeight: '800', color: cores.tinta, flex: 1 },
});
