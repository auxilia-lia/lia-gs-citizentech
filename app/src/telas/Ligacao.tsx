import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { conversar, Mensagem } from '../lia/api';
import { montarContexto } from '../lia/contexto';
import { novoMapa } from '../lia/pseudonimizar';
import { useVoz } from '../lia/useVoz';

// Canal por ligação (#11), simulado: para quem não tem smartphone nem internet.
// Só voz, sem tela: a pessoa liga para a Lia e conversa. A central da Lia faz as ações.
const ALO = 'Alô! Aqui é a Lia. Pode falar, que eu estou ouvindo.';

type Estado = 'desligada' | 'chamando' | 'em_ligacao';

export default function Ligacao() {
  const [estado, setEstado] = useState<Estado>('desligada');
  const [segundos, setSegundos] = useState(0);
  const [legenda, setLegenda] = useState('');
  const historico = useRef<Mensagem[]>([]);
  const mapa = useRef(novoMapa());
  const silencios = useRef(0);
  const ativa = useRef(false);

  const voz = useVoz((texto) => {
    if (!ativa.current) return;
    if (!texto) {
      silencios.current++;
      if (silencios.current <= 2) return voz.ouvir();
      return falar('Ainda está aí? Quando quiser, é só tocar em falar.');
    }
    silencios.current = 0;
    responder(texto);
  });

  useEffect(() => {
    if (estado !== 'em_ligacao') return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [estado]);

  const falar = (texto: string, depois?: () => void) => {
    setLegenda(texto);
    historico.current.push({ papel: 'lia', texto });
    voz.falar(texto, depois);
  };

  const ligar = () => {
    ativa.current = true;
    historico.current = [];
    mapa.current = novoMapa();
    silencios.current = 0;
    setSegundos(0);
    setEstado('chamando');
    setLegenda('Chamando a Lia…');
    setTimeout(() => {
      if (!ativa.current) return;
      setEstado('em_ligacao');
      falar(ALO, () => ativa.current && voz.ouvir());
    }, 1800);
  };

  const desligar = () => {
    ativa.current = false;
    voz.calar();
    voz.pararDeOuvir();
    setEstado('desligada');
    setLegenda('');
  };

  const responder = async (texto: string) => {
    historico.current.push({ papel: 'pessoa', texto });
    setLegenda('…');
    try {
      // A saudação é só do telefone; a IA recebe a conversa a partir da pessoa.
      const conversa = historico.current.filter((m, i) => !(i === 0 && m.texto === ALO));
      const r = await conversar(conversa, mapa.current, 'ligacao', await montarContexto());
      if (!ativa.current) return;
      falar(r.fala, () => ativa.current && voz.ouvir());
    } catch {
      if (ativa.current) falar('A ligação está ruim, não consegui te ouvir direito. Pode repetir?', () => voz.ouvir());
    }
  };

  const tempo = `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;

  if (estado === 'desligada') {
    return (
      <View style={[styles.tela, styles.centro]}>
        <Text style={styles.explica}>
          Simulação do canal por ligação comum, para quem não tem smartphone nem internet. Aqui não tem tela: é só conversar.
        </Text>
        <Text style={styles.numero}>0800 000 5420</Text>
        <Text style={styles.sub}>Lia · ligação gratuita (número fictício)</Text>
        <Pressable style={[styles.botaoRedondo, { backgroundColor: '#2E7D32' }]} onPress={ligar}>
          <Text style={styles.icone}>📞</Text>
        </Pressable>
        <Text style={styles.sub}>Ligar</Text>
      </View>
    );
  }

  return (
    <View style={[styles.tela, styles.escura]}>
      <Text style={styles.nome}>Lia</Text>
      <Text style={styles.status}>{estado === 'chamando' ? 'Chamando…' : tempo}</Text>
      <Text style={styles.legenda}>{voz.parcial || legenda}</Text>
      <Text style={styles.estadoVoz}>{voz.ouvindo ? '🎙️ Ouvindo' : voz.falando ? '🔊 Lia falando' : ''}</Text>
      <View style={styles.botoes}>
        <View style={styles.centro}>
          <Pressable style={[styles.botaoRedondo, { backgroundColor: '#455A64' }]} onPress={() => (voz.ouvindo ? voz.pararDeOuvir() : voz.ouvir())}>
            <Text style={styles.icone}>🎤</Text>
          </Pressable>
          <Text style={styles.subClaro}>Falar</Text>
        </View>
        <View style={styles.centro}>
          <Pressable style={[styles.botaoRedondo, { backgroundColor: '#C62828' }]} onPress={desligar}>
            <Text style={styles.icone}>📵</Text>
          </Pressable>
          <Text style={styles.subClaro}>Desligar</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#fff', padding: 24 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  escura: { backgroundColor: '#0B1533', alignItems: 'center', paddingTop: 48 },
  explica: { fontSize: 17, color: '#555', textAlign: 'center', marginBottom: 32 },
  numero: { fontSize: 34, fontWeight: '800', letterSpacing: 1 },
  sub: { fontSize: 16, color: '#666', marginTop: 8, marginBottom: 24 },
  subClaro: { fontSize: 16, color: '#ddd', marginTop: 8 },
  nome: { fontSize: 40, fontWeight: '800', color: '#fff' },
  status: { fontSize: 20, color: '#bbb', marginTop: 6 },
  legenda: { fontSize: 22, color: '#fff', textAlign: 'center', marginTop: 40, minHeight: 160, lineHeight: 32 },
  estadoVoz: { fontSize: 18, color: '#F5B544', marginTop: 12, minHeight: 24 },
  botoes: { flexDirection: 'row', gap: 56, marginTop: 'auto', marginBottom: 32 },
  botaoRedondo: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  icone: { fontSize: 36 },
});
