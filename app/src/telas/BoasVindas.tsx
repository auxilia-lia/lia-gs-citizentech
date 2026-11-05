import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import LiaGuia from '../../modules/lia-guia';

// Primeira vez na Lia: 4 telas curtas, uma ideia por tela, tudo falado em voz alta.
const PASSOS = [
  { icone: '👋', titulo: 'Oi, eu sou a Lia', texto: 'Eu te ajudo a usar o celular sozinha: o gov.br, o INSS, o WhatsApp e as suas contas.' },
  { icone: '🎤', titulo: 'É só falar comigo', texto: 'Toque no botão laranja e me fale o que você quer. Não precisa escrever nada.' },
  { icone: '👆', titulo: 'Eu mostro onde tocar', texto: 'Nos outros apps, eu aponto o botão certo e você toca. Cada vez eu ajudo menos, até você fazer sozinha.' },
  { icone: '🔒', titulo: 'Uma permissão, uma vez só', texto: 'Para eu ver a tela e te mostrar onde tocar, peça para alguém de confiança ativar a Lia nas configurações. Eu nunca peço senha.' },
];

export default function BoasVindas({ aoTerminar }: { aoTerminar: () => void }) {
  const [i, setI] = useState(0);
  const passo = PASSOS[i];
  const ultimo = i === PASSOS.length - 1;

  useEffect(() => {
    Speech.stop();
    Speech.speak(`${passo.titulo}. ${passo.texto}`, { language: 'pt-BR', rate: 0.95 });
  }, [passo]);

  const terminar = () => { Speech.stop(); aoTerminar(); };

  return (
    <View style={styles.tela}>
      <Text style={styles.icone}>{passo.icone}</Text>
      <Text style={styles.titulo}>{passo.titulo}</Text>
      <Text style={styles.texto}>{passo.texto}</Text>

      <View style={styles.pontos}>
        {PASSOS.map((_, n) => <View key={n} style={[styles.ponto, n === i && styles.pontoAtivo]} />)}
      </View>

      {ultimo && (
        <Pressable style={[styles.botao, styles.botaoClaro]} onPress={() => LiaGuia.openAccessibilitySettings()}>
          <Text style={[styles.botaoTexto, { color: '#FF6D00' }]}>Ativar a Lia agora</Text>
        </Pressable>
      )}
      <Pressable style={styles.botao} onPress={() => (ultimo ? terminar() : setI(i + 1))}>
        <Text style={styles.botaoTexto}>{ultimo ? 'Começar' : 'Continuar'}</Text>
      </Pressable>
      {!ultimo && (
        <Pressable onPress={terminar}><Text style={styles.pular}>Pular</Text></Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#FF6D00', padding: 28, paddingTop: 96, alignItems: 'center' },
  icone: { fontSize: 80 },
  titulo: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center', marginTop: 24 },
  texto: { fontSize: 22, lineHeight: 32, color: '#fff', textAlign: 'center', marginTop: 16 },
  pontos: { flexDirection: 'row', gap: 10, marginTop: 'auto', marginBottom: 24 },
  ponto: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFB27A' },
  pontoAtivo: { backgroundColor: '#fff', width: 28 },
  botao: { alignSelf: 'stretch', backgroundColor: '#202124', borderRadius: 20, paddingVertical: 20, marginBottom: 12 },
  botaoClaro: { backgroundColor: '#fff' },
  botaoTexto: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  pular: { color: '#fff', fontSize: 18, textDecorationLine: 'underline', marginBottom: 8 },
});
