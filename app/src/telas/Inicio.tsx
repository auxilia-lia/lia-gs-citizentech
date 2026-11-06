import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LiaGuia from '../../modules/lia-guia';
import { carregarProgresso } from '../lia/autonomia';
import { Aviso, Botao, Cartao, IconeCirculo, NomeIcone, Secao } from '../ui/componentes';
import { Aba } from '../ui/BarraAbas';
import { cores, espaco, raio, sombra, tamanho } from '../ui/tema';
import type { Pedido } from './Conversa';

type Atalho = { titulo: string; sub: string; icone: NomeIcone; pedido: Omit<Pedido, 'id'> };

// O que a Lia faz, em linguagem de quem usa (não de quem programa).
const ATALHOS: Atalho[] = [
  { titulo: 'Marcar consulta', sub: 'No posto de saúde', icone: 'medkit', pedido: { tipo: 'texto', texto: 'Quero marcar uma consulta' } },
  { titulo: 'Ver meu INSS', sub: 'Quanto e quando cai', icone: 'wallet', pedido: { tipo: 'texto', texto: 'Quero ver o dinheiro do INSS' } },
  { titulo: 'Ler um papel', sub: 'Carta, conta, exame', icone: 'document-text', pedido: { tipo: 'foto' } },
  { titulo: 'Avisar a família', sub: 'Pelo WhatsApp', icone: 'logo-whatsapp', pedido: { tipo: 'texto', texto: 'Quero mandar um recado para a minha família' } },
];

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia!' : h < 18 ? 'Boa tarde!' : 'Boa noite!';
}

export default function Inicio({ pedir, irPara }: { pedir: (p: Omit<Pedido, 'id'>) => void; irPara: (a: Aba) => void }) {
  const [guiaAtivo, setGuiaAtivo] = useState(true);
  const [feitos, setFeitos] = useState(0);

  const atualizar = useCallback(async () => {
    setGuiaAtivo(LiaGuia.isEnabled());
    const p = await carregarProgresso();
    setFeitos(Object.values(p).reduce((a, b) => a + b, 0));
  }, []);

  useEffect(() => {
    atualizar();
    const s = AppState.addEventListener('change', (e) => e === 'active' && atualizar());
    const g = LiaGuia.addListener('onStatus', (e) => setGuiaAtivo(e.enabled));
    return () => { s.remove(); g.remove(); };
  }, [atualizar]);

  return (
    <ScrollView contentContainerStyle={st.tela} showsVerticalScrollIndicator={false}>
      <View style={st.topo}>
        <View style={{ flex: 1 }}>
          <Text style={st.ola}>{saudacao()}</Text>
          <Text style={st.pergunta}>O que vamos fazer hoje?</Text>
        </View>
        <View style={st.logo}><Ionicons name="chatbubble-ellipses" size={26} color={cores.branco} /></View>
      </View>

      {/* Cartão principal: falar com a Lia */}
      <Pressable
        onPress={() => pedir({ tipo: 'ouvir' })}
        accessibilityRole="button"
        accessibilityLabel="Falar com a Lia"
        style={({ pressed }) => [st.heroi, pressed && { opacity: 0.92 }]}
      >
        <View style={st.circuloDecor1} />
        <View style={st.circuloDecor2} />
        <Text style={st.heroiTitulo}>Fale comigo</Text>
        <Text style={st.heroiTexto}>Toque no microfone e diga o que você precisa. Eu te ajudo, passo a passo.</Text>
        <View style={st.micro}>
          <Ionicons name="mic" size={44} color={cores.primaria} />
        </View>
        <Text style={st.heroiDica}>Toque para falar</Text>
      </Pressable>

      {!guiaAtivo && (
        <View style={{ marginTop: espaco.lg }}>
          <Aviso tipo="atencao" titulo="Falta uma permissão" texto="Para eu te mostrar onde tocar nos outros apps, peça para alguém de confiança ativar a Lia uma vez.">
            <Botao texto="Ativar agora" icone="hand-left" onPress={() => LiaGuia.openAccessibilitySettings()} />
          </Aviso>
        </View>
      )}

      <Secao>Posso te ajudar com</Secao>
      <View style={st.grade}>
        {ATALHOS.map((a) => (
          <Cartao key={a.titulo} estilo={st.atalho} onPress={() => pedir(a.pedido)}>
            <IconeCirculo nome={a.icone} />
            <Text style={st.atalhoTitulo}>{a.titulo}</Text>
            <Text style={st.atalhoSub}>{a.sub}</Text>
          </Cartao>
        ))}
      </View>

      <Cartao estilo={st.linha} onPress={() => pedir({ tipo: 'texto', texto: 'Quero aprender a usar uma coisa no celular' })}>
        <IconeCirculo nome="phone-portrait" />
        <View style={{ flex: 1 }}>
          <Text style={st.atalhoTitulo}>Me ensina no celular</Text>
          <Text style={st.atalhoSub}>Wi-Fi, letra maior, foto no WhatsApp…</Text>
        </View>
        <Ionicons name="chevron-forward" size={26} color={cores.textoSuave} />
      </Cartao>

      <Cartao estilo={[st.linha, { marginTop: espaco.md }]} onPress={() => irPara('voce')}>
        <IconeCirculo nome="trophy" cor="#8A5A00" fundo={cores.destaqueSuave} />
        <View style={{ flex: 1 }}>
          <Text style={st.atalhoTitulo}>{feitos === 0 ? 'Seu progresso' : `Você já fez ${feitos} ${feitos === 1 ? 'coisa' : 'coisas'} comigo`}</Text>
          <Text style={st.atalhoSub}>{feitos === 0 ? 'Cada vez que você faz, eu ajudo menos' : 'Veja o que você já faz sozinho'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={26} color={cores.textoSuave} />
      </Cartao>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  tela: { padding: espaco.lg, paddingBottom: espaco.xl },
  topo: { flexDirection: 'row', alignItems: 'center', marginBottom: espaco.lg },
  ola: { fontSize: tamanho.subtitulo, color: cores.textoSuave, fontWeight: '700' },
  pergunta: { fontSize: tamanho.titulo, color: cores.tinta, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  logo: { width: 52, height: 52, borderRadius: 26, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center' },
  heroi: {
    backgroundColor: cores.primaria, borderRadius: raio.lg, padding: espaco.lg, paddingBottom: espaco.xl,
    alignItems: 'center', overflow: 'hidden', ...sombra,
  },
  circuloDecor1: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#2A4DB8', top: -120, right: -80 },
  circuloDecor2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: cores.primariaEscura, bottom: -90, left: -60 },
  heroiTitulo: { fontSize: tamanho.titulo, fontWeight: '800', color: cores.branco, alignSelf: 'flex-start' },
  heroiTexto: { fontSize: tamanho.pequeno + 1, color: '#DCE4FB', lineHeight: 26, marginTop: espaco.sm, alignSelf: 'flex-start' },
  micro: {
    width: 112, height: 112, borderRadius: 56, backgroundColor: cores.branco, alignItems: 'center', justifyContent: 'center',
    marginTop: espaco.lg, borderWidth: 8, borderColor: '#3D5FC6',
  },
  heroiDica: { color: cores.branco, fontSize: tamanho.pequeno, fontWeight: '800', marginTop: espaco.sm },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md, marginBottom: espaco.md },
  atalho: { width: '47.5%', minHeight: 170, gap: espaco.sm },
  atalhoTitulo: { fontSize: tamanho.corpo, fontWeight: '800', color: cores.tinta },
  atalhoSub: { fontSize: tamanho.mini, color: cores.textoSuave },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
});
