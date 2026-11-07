import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../ui/fonte';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import LiaGuia from '../../modules/lia-guia';
import { api, definirEndereco } from '../lia/api';
import { zerarProgresso } from '../lia/autonomia';
import { Botao, Campo, Cartao, IconeCirculo, NomeIcone, Secao, Texto } from '../ui/componentes';
import { Aparecer } from '../ui/anim';
import { cores, espaco, raio, tamanho } from '../ui/tema';
import type { Demo } from '../../App';
import AppsProtegidos from './AppsProtegidos';
import { FamiliaEditar } from './Familia';
import MeusCaminhos from './MeusCaminhos';
import { Caminho, carregarCaminhos } from '../lia/caminhos';
import { carregarPalavras, PALAVRAS } from '../lia/palavras';
import { gravar, ler } from '../lia/armazenamento';

// Ajustes: tudo que é configuração fica aqui, longe de quem usa a Lia no dia a dia.
export default function Ajustes({ abrirDemo, reverBoasVindas, praticar, voltar }: {
  abrirDemo: (d: Demo) => void; reverBoasVindas: () => void; praticar: (c: Caminho) => void; voltar: () => void;
}) {
  const [caminhos, setCaminhos] = useState<Caminho[]>([]);
  const [palavras, setPalavras] = useState<string[]>([]);
  const [comemorar, setComemorar] = useState(true);
  const [guia, setGuia] = useState(false);
  const [micro, setMicro] = useState(false);
  const [avancado, setAvancado] = useState(false);
  const [endereco, setEndereco] = useState(api());
  const [servidor, setServidor] = useState('');
  const [escuta, setEscuta] = useState(() => { try { return LiaGuia.autoListen(); } catch { return true; } });

  const atualizar = useCallback(async () => {
    setCaminhos(await carregarCaminhos());
    setPalavras(await carregarPalavras());
    setComemorar(await ler('lia:comemorar', true));
    setGuia(LiaGuia.isEnabled());
    setMicro((await ExpoSpeechRecognitionModule.getPermissionsAsync()).granted);
  }, []);

  useEffect(() => {
    atualizar();
    const s = AppState.addEventListener('change', (e) => e === 'active' && atualizar());
    return () => s.remove();
  }, [atualizar]);

  const testar = async () => {
    setServidor('Testando…');
    try {
      const j = (await (await fetch(`${api()}/saude`)).json()) as { provedor: string };
      setServidor(`Ligado (IA: ${j.provedor})`);
    } catch {
      setServidor('Não respondeu. Confira o endereço e se o servidor está ligado.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={st.topo}>
        <Pressable onPress={voltar} style={st.voltar} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={26} color={cores.branco} />
        </Pressable>
        <Text style={st.topoTitulo}>Ajustes</Text>
      </View>
    <ScrollView contentContainerStyle={st.tela} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={st.aviso}>
        <Text style={st.avisoTexto}>Feito para quem ajuda a configurar a Lia. Quem usa no dia a dia não precisa mexer aqui.</Text>
      </View>

      <Secao>Contatos da família</Secao>
      <FamiliaEditar />

      <Secao>Meus caminhos</Secao>
      <MeusCaminhos caminhos={caminhos} praticar={praticar} />

      {palavras.length > 0 && (
        <>
          <Secao>Palavras que você já sabe</Secao>
          <Cartao estilo={{ gap: espaco.sm }}>
            <View style={st.chips}>
              {palavras.filter((p) => PALAVRAS[p]).map((p) => (
                <View key={p} style={st.chip}><Ionicons name="checkmark-circle" size={18} color={cores.sucesso} /><Text style={st.chipTexto}>{PALAVRAS[p].nome}</Text></View>
              ))}
            </View>
            <Text style={st.sub}>A Lia explica cada palavra na primeira vez que ela aparece no Guia.</Text>
          </Cartao>
        </>
      )}

      <Secao>Permissões</Secao>
      <Cartao estilo={{ gap: espaco.md }}>
        <Permissao icone="hand-left-outline" nome="Mostrar onde tocar" ok={guia} explica="Deixa a Lia ver a tela e apontar os botões nos outros apps."
          acao={() => LiaGuia.openAccessibilitySettings()} textoAcao="Ativar o Guia" />
        <View style={st.divisor} />
        <Permissao icone="mic-outline" nome="Ouvir sua voz" ok={micro} explica="Deixa a Lia ouvir o que você fala."
          acao={async () => { await ExpoSpeechRecognitionModule.requestPermissionsAsync(); atualizar(); }} textoAcao="Permitir microfone" />
      </Cartao>
      <Texto suave estilo={{ marginTop: espaco.sm, fontSize: tamanho.mini }}>A Lia nunca pede senha. Senhas, CPF, telefone, cartão, valores e nomes são escondidos antes de ir para a inteligência artificial.</Texto>

      <Secao>Apps protegidos</Secao>
      <AppsProtegidos />

      <Secao>Jeito da Lia</Secao>
      <Cartao>
        <Pressable onPress={() => { const n = !escuta; LiaGuia.setAutoListen(n); setEscuta(n); }} style={st.linha}
          accessibilityRole="switch" accessibilityState={{ checked: escuta }}>
          <View style={{ flex: 1 }}>
            <Text style={st.nome}>Ouvir depois de falar</Text>
            <Text style={st.sub}>No Guia, depois de cada instrução, a Lia escuta alguns segundos. Dá para dizer "e agora?" sem tocar no microfone.</Text>
          </View>
          <Switch value={escuta} onValueChange={() => { const n = !escuta; LiaGuia.setAutoListen(n); setEscuta(n); }} trackColor={{ true: cores.primaria, false: '#CDD3E1' }} thumbColor={cores.branco} />
        </Pressable>
        <View style={[st.divisor, { marginVertical: espaco.md }]} />
        <Pressable onPress={() => { const n = !comemorar; gravar('lia:comemorar', n); setComemorar(n); }} style={st.linha}
          accessibilityRole="switch" accessibilityState={{ checked: comemorar }}>
          <View style={{ flex: 1 }}>
            <Text style={st.nome}>Comemorar com a família</Text>
            <Text style={st.sub}>Quando você aprender algo novo, a Lia pergunta se pode contar para alguém da família pelo WhatsApp.</Text>
          </View>
          <Switch value={comemorar} onValueChange={() => { const n = !comemorar; gravar('lia:comemorar', n); setComemorar(n); }} trackColor={{ true: cores.primaria, false: '#CDD3E1' }} thumbColor={cores.branco} />
        </Pressable>
      </Cartao>

      <Secao>Ajuda</Secao>
      <Botao texto="Ver a apresentação de novo" icone="play-circle" tipo="claro" onPress={reverBoasVindas} />

      <Pressable onPress={() => setAvancado(!avancado)} style={st.avancado} accessibilityRole="button">
        <Text style={st.avancadoTexto}>Ajustes avançados</Text>
        <Ionicons name={avancado ? 'chevron-up' : 'chevron-down'} size={22} color={cores.textoSuave} />
      </Pressable>
      {avancado && (
        <Aparecer>
          <Cartao estilo={{ gap: espaco.sm }}>
            <Text style={st.nome}>Servidor da Lia</Text>
            <Campo rotulo="Endereço" value={endereco} onChangeText={setEndereco} autoCapitalize="none" ajuda="O IP do computador onde a API está ligada." />
            <Botao texto="Salvar e testar" icone="wifi" tipo="secundario" onPress={async () => { setEndereco(await definirEndereco(endereco)); testar(); }} />
            {servidor ? <Text style={st.sub}>{servidor}</Text> : null}
            <View style={st.divisor} />
            <Text style={st.nome}>Demonstrações</Text>
            <Botao texto="Lia por ligação" icone="call" tipo="claro" onPress={() => abrirDemo('ligacao')} />
            <Botao texto="Teste do Guia" icone="construct" tipo="claro" onPress={() => abrirDemo('teste')} />
            <Botao texto="Zerar progresso" icone="refresh" tipo="claro" onPress={async () => { await zerarProgresso(); atualizar(); }} />
          </Cartao>
        </Aparecer>
      )}
    </ScrollView>
    </View>
  );
}

function Permissao({ icone, nome, ok, explica, acao, textoAcao }: {
  icone: NomeIcone; nome: string; ok: boolean; explica: string; acao: () => void; textoAcao: string;
}) {
  return (
    <View style={{ gap: espaco.sm }}>
      <View style={st.linha}>
        <IconeCirculo nome={icone} tam={48} cor={ok ? cores.sucesso : cores.destaqueTexto} fundo={ok ? cores.sucessoSuave : cores.destaqueSuave} />
        <View style={{ flex: 1 }}>
          <Text style={st.nome}>{nome}</Text>
          <Text style={[st.sub, { color: ok ? cores.sucesso : cores.destaqueTexto, fontWeight: '600' }]}>{ok ? 'Ativado' : 'Desativado'}</Text>
        </View>
      </View>
      <Text style={st.sub}>{explica}</Text>
      {!ok && <Botao texto={textoAcao} icone="arrow-forward" onPress={acao} />}
    </View>
  );
}

const st = StyleSheet.create({
  tela: { padding: espaco.lg, paddingBottom: espaco.xl },
  topo: { backgroundColor: cores.primaria, flexDirection: 'row', alignItems: 'center', gap: espaco.sm, paddingHorizontal: espaco.md, paddingVertical: espaco.md },
  voltar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  topoTitulo: { fontSize: tamanho.subtitulo, fontWeight: '600', color: cores.branco },
  aviso: { backgroundColor: cores.destaqueSuave, borderRadius: raio.md, padding: espaco.md },
  avisoTexto: { fontSize: tamanho.mini, color: cores.destaqueTexto, lineHeight: 22 },
  decor: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#2A4DB8', top: -110, right: -70 },
  heroiLinha: { flexDirection: 'row', alignItems: 'center' },
  heroiRotulo: { color: '#DCE4FB', fontSize: tamanho.pequeno, fontWeight: '500' },
  heroiNumero: { color: cores.branco, fontSize: 56, fontWeight: '600', },
  heroiNivel: { color: cores.destaque, fontSize: tamanho.corpo, fontWeight: '600' },
  trofeu: { width: 84, height: 84, borderRadius: 42, backgroundColor: cores.primariaEscura, alignItems: 'center', justifyContent: 'center' },
  numeros: { flexDirection: 'row', marginTop: espaco.xs },
  num: { color: cores.branco, fontSize: tamanho.subtitulo, fontWeight: '600' },
  numRotulo: { color: '#C9D6F8', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  medalhas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: espaco.sm },
  medalhaFora: { width: '31.5%' },
  medalha: { backgroundColor: cores.superficie, borderRadius: raio.md, paddingVertical: espaco.sm, paddingHorizontal: 6, alignItems: 'center', gap: 4, minHeight: 156, borderWidth: 1, borderColor: cores.borda },
  medalhaIcone: { width: 50, height: 50, borderRadius: 25, backgroundColor: cores.fundo, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: cores.borda },
  medalhaNome: { fontSize: 13, fontWeight: '600', color: cores.tinta, textAlign: 'center' },
  medalhaDesc: { fontSize: 12, color: cores.textoSuave, textAlign: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  nome: { fontSize: tamanho.corpo, fontWeight: '600', color: cores.tinta },
  sub: { fontSize: tamanho.mini, color: cores.textoSuave, marginTop: 2, lineHeight: 21 },
  degraus: { flexDirection: 'row', gap: 6, marginTop: espaco.md },
  degrauTexto: { fontSize: 13, fontWeight: '500', color: cores.textoSuave, textAlign: 'center' },
  tempo: { flexDirection: 'row', gap: espaco.md },
  tempoMarca: { alignItems: 'center', width: 18 },
  tempoPonto: { width: 16, height: 16, borderRadius: 8, backgroundColor: cores.primaria, marginTop: 6, borderWidth: 3, borderColor: cores.primariaSuave },
  tempoLinha: { flex: 1, width: 2, backgroundColor: cores.primariaBorda, marginTop: 2 },
  divisor: { height: 1, backgroundColor: cores.borda },
  avancado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: espaco.xl, minHeight: 48 },
  avancadoTexto: { fontSize: tamanho.mini, fontWeight: '500', color: cores.textoSuave },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: cores.sucessoSuave, borderRadius: raio.lg, paddingHorizontal: espaco.sm, paddingVertical: 6 },
  chipTexto: { fontSize: tamanho.mini, fontWeight: '500', color: cores.sucesso },
});
