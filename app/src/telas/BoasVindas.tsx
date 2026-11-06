import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calar, falar } from '../lia/fala';
import { useMargens } from '../ui/margens';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import LiaGuia from '../../modules/lia-guia';
import { NomeIcone } from '../ui/componentes';
import { Aparecer, Flutuar } from '../ui/anim';
import { Aba } from '../ui/BarraAbas';
import { cores, espaco, raio, tamanho, TOQUE_MIN } from '../ui/tema';

type Passo = { icone: NomeIcone; titulo: string; texto: string; acao?: 'microfone' | 'guia' | 'familia' };

// Primeira vez: uma ideia por tela, tudo falado em voz alta, permissões pedidas com o porquê.
const PASSOS: Passo[] = [
  { icone: 'chatbubble-ellipses', titulo: 'Oi, eu sou a Lia', texto: 'Eu te ajudo a usar o celular sozinho: o gov.br, o INSS, o WhatsApp e as suas contas.' },
  { icone: 'mic', titulo: 'É só falar comigo', texto: 'Você fala o que precisa e eu entendo. Não precisa escrever nada.', acao: 'microfone' },
  { icone: 'hand-left', titulo: 'Eu mostro onde tocar', texto: 'Nos outros apps, eu aponto o botão certo e você toca. Para isso, peça para alguém de confiança me ativar, uma vez só.', acao: 'guia' },
  { icone: 'people', titulo: 'Quem eu posso avisar?', texto: 'Quando você quiser, eu mando recado no WhatsApp para alguém da família. Você pode cadastrar agora ou depois.', acao: 'familia' },
];

export default function BoasVindas({ aoTerminar }: { aoTerminar: (irPara?: Aba) => void }) {
  const [i, setI] = useState(0);
  const [feito, setFeito] = useState(false);
  const ins = useMargens();
  const passo = PASSOS[i];
  const ultimo = i === PASSOS.length - 1;

  useEffect(() => {
    setFeito(passo.acao === 'guia' ? LiaGuia.isEnabled() : false);
    calar();
    falar(`${passo.titulo}. ${passo.texto}`);
  }, [passo]);

  const terminar = (irPara?: Aba) => { calar(); aoTerminar(irPara); };

  const fazerAcao = async () => {
    if (passo.acao === 'microfone') {
      const r = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setFeito(r.granted);
    } else if (passo.acao === 'guia') {
      LiaGuia.openAccessibilitySettings();
    } else if (passo.acao === 'familia') {
      terminar('familia');
    }
  };

  const textoAcao = { microfone: 'Permitir o microfone', guia: 'Ativar a Lia', familia: 'Cadastrar agora' } as const;

  return (
    <View style={[st.tela, { paddingTop: ins.top + espaco.xl, paddingBottom: ins.bottom + espaco.lg }]}>
      <View style={st.decor1} />
      <View style={st.decor2} />
      {!ultimo && (
        <Pressable onPress={() => terminar()} style={st.pular} accessibilityRole="button">
          <Text style={st.pularTexto}>Pular</Text>
        </Pressable>
      )}

      <Aparecer key={i} estilo={st.centro}>
        <Flutuar><View style={st.icone}><Ionicons name={passo.icone} size={72} color={cores.primaria} /></View></Flutuar>
        <Text style={st.titulo} accessibilityRole="header">{passo.titulo}</Text>
        <Text style={st.texto}>{passo.texto}</Text>
        {feito && (
          <View style={st.ok}><Ionicons name="checkmark-circle" size={24} color={cores.branco} /><Text style={st.okTexto}>Pronto!</Text></View>
        )}
      </Aparecer>

      <View style={st.pontos}>
        {PASSOS.map((_, n) => <View key={n} style={[st.ponto, n === i && st.pontoAtivo]} />)}
      </View>

      {passo.acao && !feito && (
        <Pressable onPress={fazerAcao} style={[st.botao, st.botaoBranco]} accessibilityRole="button">
          <Text style={[st.botaoTexto, { color: cores.primaria }]}>{textoAcao[passo.acao]}</Text>
        </Pressable>
      )}
      <Pressable
        onPress={() => (ultimo ? terminar() : setI(i + 1))}
        style={[st.botao, passo.acao && !feito ? st.botaoContorno : st.botaoBranco]}
        accessibilityRole="button"
      >
        <Text style={[st.botaoTexto, { color: passo.acao && !feito ? cores.branco : cores.primaria }]}>
          {ultimo ? 'Começar' : passo.acao && !feito ? 'Agora não' : 'Continuar'}
        </Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.primaria, paddingHorizontal: espaco.lg, overflow: 'hidden' },
  decor1: { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: '#2A4DB8', top: -140, right: -120 },
  decor2: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: cores.primariaEscura, bottom: 120, left: -150 },
  pular: { alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center', paddingHorizontal: espaco.sm },
  pularTexto: { color: cores.branco, fontSize: tamanho.pequeno, fontWeight: '800', textDecorationLine: 'underline' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icone: { width: 148, height: 148, borderRadius: 74, backgroundColor: cores.branco, alignItems: 'center', justifyContent: 'center', marginBottom: espaco.xl },
  titulo: { fontSize: 34, fontWeight: '800', color: cores.branco, textAlign: 'center', letterSpacing: -0.5 },
  texto: { fontSize: tamanho.corpo + 1, lineHeight: 31, color: '#E1E8FC', textAlign: 'center', marginTop: espaco.md },
  ok: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: espaco.lg, backgroundColor: cores.sucesso, borderRadius: raio.pilula, paddingHorizontal: 16, paddingVertical: 8 },
  okTexto: { color: cores.branco, fontSize: tamanho.pequeno, fontWeight: '800' },
  pontos: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: espaco.lg },
  ponto: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#5C78D0' },
  pontoAtivo: { backgroundColor: cores.branco, width: 32 },
  botao: { minHeight: TOQUE_MIN + 8, borderRadius: raio.pilula, alignItems: 'center', justifyContent: 'center', marginBottom: espaco.sm },
  botaoBranco: { backgroundColor: cores.branco },
  botaoContorno: { borderWidth: 2, borderColor: '#9FB2EA' },
  botaoTexto: { fontSize: tamanho.corpo, fontWeight: '800' },
});
