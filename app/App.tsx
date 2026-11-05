import { useEffect, useRef, useState } from 'react';
import {
  AppState, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LiaGuia, { StepEvent } from './modules/lia-guia';

// Teste de 1 dia do Guia (backlog #4): a Lia consegue ler a tela de outro app,
// achar o botão certo e apontar para ele? Os passos aqui fazem o papel da IA,
// que depois vai decidir sozinha o que tocar.

type Teste = { nome: string; app: string; passos: string[] };

const TESTES: Teste[] = [
  { nome: 'Ligar o Wi-Fi', app: 'settings', passos: ['Conexões', 'Wi-Fi'] },
  { nome: 'Aumentar a letra', app: 'settings', passos: ['Tela', 'Tamanho e estilo da fonte'] },
  { nome: 'Ver a versão do Android', app: 'settings', passos: ['Sobre o telefone', 'Informações do software'] },
  { nome: 'WhatsApp: conversa nova', app: 'com.whatsapp', passos: ['Nova conversa'] },
];

const hora = () => new Date().toLocaleTimeString('pt-BR');

export default function App() {
  const [ativo, setAtivo] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [livre, setLivre] = useState('');
  const [appLivre, setAppLivre] = useState<'settings' | 'com.whatsapp'>('settings');
  const ultimo = useRef('');

  const registrar = (linha: string) => {
    if (linha === ultimo.current) return; // a tela muda muito; evita repetir
    ultimo.current = linha;
    setLog((l) => [`${hora()}  ${linha}`, ...l].slice(0, 300));
  };

  useEffect(() => {
    const checar = () => setAtivo(LiaGuia.isEnabled());
    checar();
    const sApp = AppState.addEventListener('change', (s) => s === 'active' && checar());
    const sStatus = LiaGuia.addListener('onStatus', (e) => setAtivo(e.enabled));
    const sStep = LiaGuia.addListener('onStep', (e: StepEvent) => {
      switch (e.type) {
        case 'found':
          registrar(`✅ Passo ${e.index + 1}/${e.total} "${e.step}" → achou "${e.label}" (nota ${e.score.toFixed(2)}) em ${e.app}`);
          break;
        case 'not_found':
          registrar(`❌ Passo ${e.index + 1}/${e.total} "${e.step}" não achado em ${e.app}. Na tela: ${(e.visible ?? []).join(' | ')}`);
          break;
        case 'done_step':
          registrar(`👆 Tocou no passo ${e.index + 1} "${e.step}"`);
          break;
        case 'finished':
          registrar(`🎉 Terminou os ${e.total} passos`);
          break;
      }
    });
    return () => { sApp.remove(); sStatus.remove(); sStep.remove(); };
  }, []);

  const rodar = (t: Teste) => {
    registrar(`▶️ Teste "${t.nome}": ${t.passos.join(' → ')}`);
    if (!LiaGuia.start(t.passos)) return registrar('⚠️ Guia não iniciou (acessibilidade desligada?)');
    if (!LiaGuia.openApp(t.app)) {
      LiaGuia.stop();
      registrar(`⚠️ Não consegui abrir ${t.app}`);
    }
  };

  const rodarLivre = () => {
    const passos = livre.split(',').map((p) => p.trim()).filter(Boolean);
    if (passos.length) rodar({ nome: 'Livre', app: appLivre, passos });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Lia · teste do Guia</Text>

      <View style={[styles.status, { backgroundColor: ativo ? '#E3F5E1' : '#FDE7E7' }]}>
        <Text style={styles.statusText}>
          {ativo ? 'Guia ativado na acessibilidade' : 'Guia desligado'}
        </Text>
        {!ativo && (
          <Botao texto="Ativar a Lia na acessibilidade" onPress={() => LiaGuia.openAccessibilitySettings()} />
        )}
      </View>

      <Text style={styles.section}>Testes prontos</Text>
      {TESTES.map((t) => (
        <Botao key={t.nome} texto={t.nome} onPress={() => rodar(t)} disabled={!ativo} />
      ))}

      <Text style={styles.section}>Teste livre</Text>
      <TextInput
        style={styles.input}
        value={livre}
        onChangeText={setLivre}
        placeholder="Passos separados por vírgula. Ex.: Conexões, Bluetooth"
      />
      <View style={styles.row}>
        <Chip texto="Configurações" ativo={appLivre === 'settings'} onPress={() => setAppLivre('settings')} />
        <Chip texto="WhatsApp" ativo={appLivre === 'com.whatsapp'} onPress={() => setAppLivre('com.whatsapp')} />
      </View>
      <Botao texto="Rodar teste livre" onPress={rodarLivre} disabled={!ativo} />

      <View style={styles.row}>
        <Chip texto="Parar guia" onPress={() => { LiaGuia.stop(); registrar('⏹️ Parado'); }} />
        <Chip texto="Compartilhar registro" onPress={() => Share.share({ message: [...log].reverse().join('\n') })} />
        <Chip texto="Limpar" onPress={() => setLog([])} />
      </View>

      <Text style={styles.section}>Registro</Text>
      {log.length === 0 && <Text style={styles.vazio}>Nada ainda.</Text>}
      {log.map((l, i) => <Text key={i} style={styles.log}>{l}</Text>)}
    </ScrollView>
  );
}

function Botao({ texto, onPress, disabled }: { texto: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.botao, disabled && { opacity: 0.4 }]}>
      <Text style={styles.botaoTexto}>{texto}</Text>
    </Pressable>
  );
}

function Chip({ texto, onPress, ativo }: { texto: string; onPress: () => void; ativo?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, ativo && styles.chipAtivo]}>
      <Text style={[styles.chipTexto, ativo && { color: '#fff' }]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 56, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  status: { borderRadius: 16, padding: 16, marginBottom: 8 },
  statusText: { fontSize: 18, fontWeight: '600' },
  section: { fontSize: 20, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  botao: { backgroundColor: '#FF6D00', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 16, marginTop: 10 },
  botaoTexto: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 14, fontSize: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { borderWidth: 1, borderColor: '#FF6D00', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 },
  chipAtivo: { backgroundColor: '#FF6D00' },
  chipTexto: { fontSize: 16, color: '#FF6D00', fontWeight: '600' },
  vazio: { color: '#777' },
  log: { fontSize: 13, fontFamily: 'monospace', marginBottom: 6, color: '#222' },
});
