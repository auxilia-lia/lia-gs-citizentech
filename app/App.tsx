import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Conversa from './src/telas/Conversa';
import TesteGuia from './src/telas/TesteGuia';

type Aba = 'conversa' | 'guia';

export default function App() {
  const [aba, setAba] = useState<Aba>('conversa');
  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.topo}>
        <Text style={styles.nome}>Lia</Text>
        <View style={styles.abas}>
          <Aba texto="Conversar" ativa={aba === 'conversa'} onPress={() => setAba('conversa')} />
          <Aba texto="Teste do Guia" ativa={aba === 'guia'} onPress={() => setAba('guia')} />
        </View>
      </View>
      {aba === 'conversa' ? <Conversa /> : <TesteGuia />}
    </View>
  );
}

function Aba({ texto, ativa, onPress }: { texto: string; ativa: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.aba, ativa && styles.abaAtiva]}>
      <Text style={[styles.abaTexto, ativa && { color: '#fff' }]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#fff', paddingTop: 48 },
  topo: { paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderColor: '#eee' },
  nome: { fontSize: 30, fontWeight: '800', color: '#FF6D00' },
  abas: { flexDirection: 'row', gap: 8, marginTop: 8 },
  aba: { borderRadius: 999, borderWidth: 1, borderColor: '#FF6D00', paddingVertical: 8, paddingHorizontal: 14 },
  abaAtiva: { backgroundColor: '#FF6D00' },
  abaTexto: { fontSize: 16, fontWeight: '600', color: '#FF6D00' },
});
