import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Conversa from './src/telas/Conversa';
import TesteGuia from './src/telas/TesteGuia';
import Ligacao from './src/telas/Ligacao';
import MinhaLia from './src/telas/MinhaLia';
import BoasVindas from './src/telas/BoasVindas';
import { carregarEnderecoSalvo } from './src/lia/api';
import { gravar, ler } from './src/lia/armazenamento';

type Aba = 'conversa' | 'ligacao' | 'minha' | 'guia';

export default function App() {
  const [aba, setAba] = useState<Aba>('conversa');
  const [pronto, setPronto] = useState(false);
  const [primeiraVez, setPrimeiraVez] = useState(false);

  useEffect(() => {
    Promise.all([carregarEnderecoSalvo(), ler('lia:boas-vindas', false)]).then(([, viu]) => {
      setPrimeiraVez(!viu);
      setPronto(true);
    });
  }, []);

  if (!pronto) return <View style={{ flex: 1, backgroundColor: '#FF6D00' }} />;
  if (primeiraVez) {
    return (
      <>
        <StatusBar style="light" />
        <BoasVindas aoTerminar={() => { gravar('lia:boas-vindas', true); setPrimeiraVez(false); }} />
      </>
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.topo}>
        <Text style={styles.nome}>Lia</Text>
        <View style={styles.abas}>
          <Aba texto="Conversar" ativa={aba === 'conversa'} onPress={() => setAba('conversa')} />
          <Aba texto="Ligação" ativa={aba === 'ligacao'} onPress={() => setAba('ligacao')} />
          <Aba texto="Minha Lia" ativa={aba === 'minha'} onPress={() => setAba('minha')} />
          <Aba texto="Teste do Guia" ativa={aba === 'guia'} onPress={() => setAba('guia')} />
        </View>
      </View>
      {aba === 'conversa' && <Conversa />}
      {aba === 'ligacao' && <Ligacao />}
      {aba === 'minha' && <MinhaLia />}
      {aba === 'guia' && <TesteGuia />}
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
  abas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  aba: { borderRadius: 999, borderWidth: 1, borderColor: '#FF6D00', paddingVertical: 8, paddingHorizontal: 14 },
  abaAtiva: { backgroundColor: '#FF6D00' },
  abaTexto: { fontSize: 16, fontWeight: '600', color: '#FF6D00' },
});
