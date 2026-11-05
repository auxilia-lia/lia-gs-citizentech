import { ComponentRef, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { API, conversar, Mensagem } from '../lia/api';

type Estado = 'parada' | 'ouvindo' | 'pensando' | 'falando';

const BOAS_VINDAS = 'Oi, eu sou a Lia. Me fala o que você quer fazer.';

export default function Conversa() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([{ papel: 'lia', texto: BOAS_VINDAS }]);
  const [estado, setEstado] = useState<Estado>('parada');
  const [parcial, setParcial] = useState('');
  const [digitado, setDigitado] = useState('');
  const [erro, setErro] = useState('');
  const ouvido = useRef('');
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);

  // ---- ouvir ----
  useSpeechRecognitionEvent('result', (e) => {
    const texto = e.results[0]?.transcript ?? '';
    setParcial(texto);
    if (e.isFinal) ouvido.current = texto;
  });
  useSpeechRecognitionEvent('end', () => {
    const texto = (ouvido.current || parcial).trim();
    ouvido.current = '';
    setParcial('');
    if (texto) enviar(texto);
    else setEstado('parada');
  });
  useSpeechRecognitionEvent('error', (e) => {
    setEstado('parada');
    if (e.error !== 'no-speech' && e.error !== 'aborted') setErro(`Não consegui ouvir (${e.error}).`);
  });

  const ouvir = async () => {
    setErro('');
    if (estado === 'ouvindo') return ExpoSpeechRecognitionModule.stop();
    Speech.stop();
    const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!p.granted) return setErro('Preciso da permissão do microfone para te ouvir.');
    setEstado('ouvindo');
    ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true, continuous: false });
  };

  // ---- pensar e falar ----
  const enviar = async (texto: string) => {
    const nova: Mensagem[] = [...mensagens, { papel: 'pessoa', texto }];
    setMensagens(nova);
    setEstado('pensando');
    try {
      // A boas-vindas é só da tela; a IA recebe a conversa a partir da pessoa.
      const resposta = await conversar(nova.slice(1));
      setMensagens((m) => [...m, { papel: 'lia', texto: resposta }]);
      falar(resposta);
    } catch {
      setEstado('parada');
      setErro(`Não consegui falar com o servidor da Lia (${API}). Ele está ligado?`);
    }
  };

  const falar = (texto: string) => {
    setEstado('falando');
    Speech.speak(texto, {
      language: 'pt-BR',
      rate: 0.95,
      onDone: () => setEstado('parada'),
      onStopped: () => setEstado('parada'),
      onError: () => setEstado('parada'),
    });
  };

  const enviarDigitado = () => {
    const t = digitado.trim();
    if (!t || estado === 'pensando') return;
    setDigitado('');
    Speech.stop();
    enviar(t);
  };

  const rotulo = {
    parada: 'Toque para falar',
    ouvindo: 'Estou ouvindo… toque para parar',
    pensando: 'Pensando…',
    falando: 'Toque para falar',
  }[estado];

  return (
    <KeyboardAvoidingView style={styles.tela} behavior="height">
      <ScrollView
        ref={rolagem}
        contentContainerStyle={styles.lista}
        onContentSizeChange={() => rolagem.current?.scrollToEnd({ animated: true })}
      >
        {mensagens.map((m, i) => (
          <Pressable
            key={i}
            onPress={() => m.papel === 'lia' && falar(m.texto)}
            style={[styles.balao, m.papel === 'lia' ? styles.balaoLia : styles.balaoPessoa]}
          >
            <Text style={[styles.texto, m.papel === 'pessoa' && { color: '#fff' }]}>{m.texto}</Text>
          </Pressable>
        ))}
        {parcial ? <Text style={styles.parcial}>{parcial}</Text> : null}
      </ScrollView>

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <Pressable
        onPress={ouvir}
        disabled={estado === 'pensando'}
        style={[styles.microfone, estado === 'ouvindo' && styles.microfoneAtivo, estado === 'pensando' && { opacity: 0.5 }]}
      >
        <Text style={styles.microfoneIcone}>🎤</Text>
        <Text style={styles.microfoneTexto}>{rotulo}</Text>
      </Pressable>

      <View style={styles.digitar}>
        <TextInput
          style={styles.input}
          value={digitado}
          onChangeText={setDigitado}
          placeholder="Ou escreva aqui"
          onSubmitEditing={enviarDigitado}
          returnKeyType="send"
        />
        <Pressable onPress={enviarDigitado} style={styles.enviar}>
          <Text style={styles.enviarTexto}>Enviar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#fff' },
  lista: { padding: 16, gap: 10 },
  balao: { maxWidth: '85%', borderRadius: 20, padding: 14 },
  balaoLia: { alignSelf: 'flex-start', backgroundColor: '#FFF1E6' },
  balaoPessoa: { alignSelf: 'flex-end', backgroundColor: '#FF6D00' },
  texto: { fontSize: 20, lineHeight: 28, color: '#202124' },
  parcial: { alignSelf: 'flex-end', fontSize: 18, color: '#888', fontStyle: 'italic' },
  erro: { color: '#B3261E', fontSize: 16, paddingHorizontal: 16, paddingBottom: 6, textAlign: 'center' },
  microfone: {
    marginHorizontal: 16, marginTop: 4, borderRadius: 28, backgroundColor: '#FF6D00',
    paddingVertical: 22, alignItems: 'center',
  },
  microfoneAtivo: { backgroundColor: '#C62828' },
  microfoneIcone: { fontSize: 36 },
  microfoneTexto: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 4 },
  digitar: { flexDirection: 'row', gap: 8, padding: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 14, paddingHorizontal: 14, fontSize: 18 },
  enviar: { backgroundColor: '#202124', borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center' },
  enviarTexto: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
