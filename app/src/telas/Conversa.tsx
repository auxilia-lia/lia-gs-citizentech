import { ComponentRef, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import LiaGuia from '../../modules/lia-guia';
import { Acao, AnaliseGolpe, API, buscarFluxos, conversar, entenderFoto, Mensagem, urlGov } from '../lia/api';
import { carregarProgresso, nivelDe, NOMES_NIVEL, registrarConclusao } from '../lia/autonomia';
import { montarContexto } from '../lia/contexto';
import { abrirWhatsApp, acharFamiliar, carregarFamilia, Familiar } from '../lia/familia';
import { novoMapa, quantosEscondidos } from '../lia/pseudonimizar';
import { precisaConfirmar, respostaSimNao } from '../lia/risco';
import { useVoz } from '../lia/useVoz';

const BOAS_VINDAS = 'Oi, eu sou a Lia. Me fala o que você quer fazer.';

type Pendente = { familiar: Familiar; mensagem: string };

export default function Conversa() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([{ papel: 'lia', texto: BOAS_VINDAS }]);
  const [pensando, setPensando] = useState(false);
  const [digitado, setDigitado] = useState('');
  const [golpe, setGolpe] = useState<AnaliseGolpe | null>(null);
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [escondidos, setEscondidos] = useState(0);
  const mapa = useRef(novoMapa());
  const guiaAtivo = useRef<string | null>(null);
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);
  const pendenteRef = useRef<Pendente | null>(null);
  pendenteRef.current = pendente;

  const voz = useVoz((texto) => {
    if (!texto) return;
    if (pendenteRef.current) return responderConfirmacao(texto);
    enviar(texto);
  });

  const dizer = (texto: string, depois?: () => void) => {
    setMensagens((m) => [...m, { papel: 'lia', texto }]);
    voz.falar(texto, depois);
  };

  // Quando o Guia termina um serviço, conta para a autonomia progressiva.
  useEffect(() => {
    const s = LiaGuia.addListener('onStep', async (e) => {
      if (e.type !== 'finished' || !guiaAtivo.current) return;
      const servico = guiaAtivo.current;
      guiaAtivo.current = null;
      const vezes = await registrarConclusao(servico);
      const nivel = NOMES_NIVEL[nivelDe(vezes)];
      setMensagens((m) => [...m, { papel: 'lia', texto: `Parabéns! Você já fez isso ${vezes} ${vezes === 1 ? 'vez' : 'vezes'}. Agora eu ajudo assim: ${nivel.toLowerCase()}.` }]);
    });
    return () => s.remove();
  }, []);

  // ---------- conversa ----------
  const enviar = async (texto: string) => {
    voz.calar();
    const historico: Mensagem[] = [...mensagens, { papel: 'pessoa', texto }];
    setMensagens(historico);
    setPensando(true);
    voz.setErro('');
    try {
      const r = await conversar(historico.slice(1), mapa.current, 'app', await montarContexto());
      setEscondidos(quantosEscondidos(mapa.current));
      setGolpe(r.golpe);
      setMensagens((m) => [...m, { papel: 'lia', texto: r.fala }]);
      voz.falar(r.fala, () => r.acao && executar(r.acao));
    } catch {
      voz.setErro(`Não consegui falar com o servidor da Lia (${API}). Ele está ligado?`);
    } finally {
      setPensando(false);
    }
  };

  // ---------- ações (Guia, Age, Entende) ----------
  const executar = async (acao: Acao) => {
    if (acao.tipo === 'guiar') return guiar(acao.servico);
    if (acao.tipo === 'tirar_foto') return tirarFoto();
    if (acao.tipo === 'avisar_familiar') return prepararAviso(acao.contato, acao.mensagem);
  };

  const guiar = async (servico: string) => {
    try {
      const fluxo = (await buscarFluxos())[servico];
      if (!fluxo) return;
      const nivel = nivelDe((await carregarProgresso())[servico] ?? 0);
      if (LiaGuia.isEnabled()) {
        guiaAtivo.current = servico;
        LiaGuia.start(fluxo.passos, nivel);
      } else {
        voz.setErro('O Guia na tela está desligado. Ative na aba "Teste do Guia" para a Lia apontar onde tocar.');
      }
      await Linking.openURL(urlGov(fluxo.caminho));
    } catch {
      voz.setErro(`Não consegui abrir o gov.br simulado (${API}).`);
    }
  };

  const prepararAviso = async (contato: string, mensagem: string) => {
    const familia = await carregarFamilia();
    const familiar = acharFamiliar(contato, familia);
    if (!familiar) return dizer(`Não achei ${contato} na sua família. Peça para alguém cadastrar na aba Minha Lia.`);
    if (!familiar.telefone) return dizer(`Falta o telefone de ${familiar.nome}. Dá para cadastrar na aba Minha Lia.`);
    if (!precisaConfirmar('avisar_familiar')) return enviarAviso({ familiar, mensagem });
    const p = { familiar, mensagem };
    setPendente(p);
    pendenteRef.current = p;
    dizer(`Vou mandar para ${familiar.nome}: ${mensagem}. Posso mandar?`, () => voz.ouvir());
  };

  const responderConfirmacao = (falado: string) => {
    const r = respostaSimNao(falado);
    if (r === null) return dizer('Não entendi. Posso mandar? Fala sim ou não.', () => voz.ouvir());
    confirmar(r);
  };

  const confirmar = async (sim: boolean) => {
    const p = pendenteRef.current;
    setPendente(null);
    pendenteRef.current = null;
    if (!p) return;
    if (!sim) return dizer('Tudo bem, não mandei nada.');
    await enviarAviso(p);
  };

  const enviarAviso = async ({ familiar, mensagem }: Pendente) => {
    const ok = await abrirWhatsApp(familiar.telefone, mensagem);
    dizer(ok
      ? `Abri o WhatsApp com a mensagem para ${familiar.nome}. É só tocar no botão verde de enviar.`
      : 'Não consegui abrir o WhatsApp. Ele está instalado?');
  };

  const tirarFoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return dizer('Preciso da câmera para ler o papel.');
    const foto = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, mediaTypes: ['images'] });
    if (foto.canceled || !foto.assets[0]?.base64) return;
    setMensagens((m) => [...m, { papel: 'pessoa', texto: '📷 (foto de um papel)' }]);
    setPensando(true);
    try {
      const r = await entenderFoto(foto.assets[0].base64, foto.assets[0].mimeType ?? 'image/jpeg');
      setGolpe(r.golpe ? { golpe: true, nivel: 'alto', motivos: r.motivo ? [r.motivo] : [] } : null);
      dizer(r.golpe ? `${r.fala} Cuidado: isso pode ser golpe. ${r.motivo}` : r.fala);
    } catch {
      voz.setErro('Não consegui mandar a foto para a Lia.');
    } finally {
      setPensando(false);
    }
  };

  const enviarDigitado = () => {
    const t = digitado.trim();
    if (!t || pensando) return;
    setDigitado('');
    if (pendenteRef.current) return responderConfirmacao(t);
    enviar(t);
  };

  const rotulo = voz.ouvindo ? 'Estou ouvindo… toque para parar' : pensando ? 'Pensando…' : 'Toque para falar';

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
            onPress={() => m.papel === 'lia' && voz.falar(m.texto)}
            style={[styles.balao, m.papel === 'lia' ? styles.balaoLia : styles.balaoPessoa]}
          >
            <Text style={[styles.texto, m.papel === 'pessoa' && { color: '#fff' }]}>{m.texto}</Text>
          </Pressable>
        ))}
        {voz.parcial ? <Text style={styles.parcial}>{voz.parcial}</Text> : null}
      </ScrollView>

      {golpe?.golpe && (
        <Pressable style={styles.golpe} onPress={() => setGolpe(null)}>
          <Text style={styles.golpeTitulo}>⚠️ Pode ser golpe</Text>
          {golpe.motivos.slice(0, 3).map((m, i) => <Text key={i} style={styles.golpeTexto}>• {m}</Text>)}
          <Text style={styles.golpeTexto}>Não clique, não pague e não passe códigos.</Text>
        </Pressable>
      )}

      {pendente && (
        <View style={styles.confirmar}>
          <Text style={styles.confirmarTexto}>
            Mandar para <Text style={{ fontWeight: '800' }}>{pendente.familiar.nome}</Text> ({pendente.familiar.parentesco}):
            {'\n'}“{pendente.mensagem}”
          </Text>
          <View style={styles.linha}>
            <Pressable style={[styles.simNao, { backgroundColor: '#2E7D32' }]} onPress={() => confirmar(true)}>
              <Text style={styles.simNaoTexto}>Sim, pode mandar</Text>
            </Pressable>
            <Pressable style={[styles.simNao, { backgroundColor: '#B3261E' }]} onPress={() => confirmar(false)}>
              <Text style={styles.simNaoTexto}>Não</Text>
            </Pressable>
          </View>
        </View>
      )}

      {voz.erro ? <Text style={styles.erro}>{voz.erro}</Text> : null}
      {escondidos > 0 && <Text style={styles.privacidade}>🔒 {escondidos} dado(s) pessoal(is) escondido(s) da IA</Text>}

      <View style={styles.linha}>
        <Pressable
          onPress={() => (voz.ouvindo ? voz.pararDeOuvir() : voz.ouvir())}
          disabled={pensando}
          style={[styles.microfone, voz.ouvindo && styles.microfoneAtivo, pensando && { opacity: 0.5 }]}
        >
          <Text style={styles.microfoneIcone}>🎤</Text>
          <Text style={styles.microfoneTexto}>{rotulo}</Text>
        </Pressable>
        <Pressable onPress={tirarFoto} disabled={pensando} style={styles.foto}>
          <Text style={styles.microfoneIcone}>📷</Text>
          <Text style={styles.fotoTexto}>Ler papel</Text>
        </Pressable>
      </View>

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
  golpe: { marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 16, backgroundColor: '#FDECEA', borderWidth: 2, borderColor: '#B3261E' },
  golpeTitulo: { fontSize: 20, fontWeight: '800', color: '#B3261E', marginBottom: 4 },
  golpeTexto: { fontSize: 17, color: '#5F1410' },
  confirmar: { marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 16, backgroundColor: '#F1F8E9' },
  confirmarTexto: { fontSize: 19, marginBottom: 10 },
  simNao: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  simNaoTexto: { color: '#fff', fontSize: 19, fontWeight: '800' },
  erro: { color: '#B3261E', fontSize: 16, paddingHorizontal: 16, paddingBottom: 6, textAlign: 'center' },
  privacidade: { color: '#2E7D32', fontSize: 14, textAlign: 'center', paddingBottom: 6 },
  linha: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  microfone: { flex: 3, borderRadius: 28, backgroundColor: '#FF6D00', paddingVertical: 18, alignItems: 'center' },
  microfoneAtivo: { backgroundColor: '#C62828' },
  microfoneIcone: { fontSize: 32 },
  microfoneTexto: { color: '#fff', fontSize: 19, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  foto: { flex: 1, borderRadius: 28, backgroundColor: '#202124', paddingVertical: 18, alignItems: 'center' },
  fotoTexto: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 4 },
  digitar: { flexDirection: 'row', gap: 8, padding: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 14, paddingHorizontal: 14, fontSize: 18 },
  enviar: { backgroundColor: '#202124', borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center' },
  enviarTexto: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
