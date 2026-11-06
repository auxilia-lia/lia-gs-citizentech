import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import LiaGuia from '../../modules/lia-guia';
import { api, definirEndereco } from '../lia/api';
import { carregarProgresso, nivelDe, Progresso, zerarProgresso } from '../lia/autonomia';
import { Aviso, Botao, Campo, Cartao, IconeCirculo, NomeIcone, Secao, Texto, Titulo } from '../ui/componentes';
import { cores, espaco, raio, tamanho } from '../ui/tema';
import type { Demo } from '../../App';

const SERVICOS: { chave: string; nome: string; icone: NomeIcone }[] = [
  { chave: 'consulta', nome: 'Marcar consulta', icone: 'medkit' },
  { chave: 'beneficio', nome: 'Ver o INSS', icone: 'wallet' },
  { chave: 'multas', nome: 'Consultar multas', icone: 'car' },
  { chave: 'app:celular', nome: 'Usar o celular', icone: 'phone-portrait' },
  { chave: 'app:whatsapp', nome: 'Usar o WhatsApp', icone: 'logo-whatsapp' },
  { chave: 'app:configuracoes', nome: 'Configurar o celular', icone: 'settings' },
];
const DEGRAUS = ['Faz junto', 'Só confirma', 'Sozinho'];

export default function Voce({ abrirDemo, reverBoasVindas }: { abrirDemo: (d: Demo) => void; reverBoasVindas: () => void }) {
  const [progresso, setProgresso] = useState<Progresso>({});
  const [guia, setGuia] = useState(false);
  const [micro, setMicro] = useState(false);
  const [avancado, setAvancado] = useState(false);
  const [endereco, setEndereco] = useState(api());
  const [servidor, setServidor] = useState('');

  const atualizar = useCallback(async () => {
    setProgresso(await carregarProgresso());
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
    <ScrollView contentContainerStyle={st.tela}>
      <Titulo>Você</Titulo>

      <Secao>O que você já faz sozinho</Secao>
      <Texto suave estilo={{ marginTop: -espaco.sm, marginBottom: espaco.md }}>A cada vez que você faz, eu ajudo um pouco menos.</Texto>
      {SERVICOS.map((sv) => {
        const vezes = progresso[sv.chave] ?? 0;
        const nivel = nivelDe(vezes);
        return (
          <Cartao key={sv.chave} estilo={{ marginBottom: espaco.md }}>
            <View style={st.linha}>
              <IconeCirculo nome={sv.icone} tam={48} />
              <View style={{ flex: 1 }}>
                <Text style={st.nome}>{sv.nome}</Text>
                <Text style={st.sub}>{vezes === 0 ? 'Ainda não fizemos juntos' : `Feito ${vezes} ${vezes === 1 ? 'vez' : 'vezes'}`}</Text>
              </View>
              {vezes > 0 && nivel === 2 && <Ionicons name="trophy" size={28} color={cores.destaque} />}
            </View>
            <View style={st.degraus}>
              {DEGRAUS.map((d, i) => {
                const ok = vezes > 0 && i <= nivel;
                return (
                  <View key={d} style={{ flex: 1 }}>
                    <View style={[st.barra, ok && st.barraOk]} />
                    <Text style={[st.degrauTexto, ok && { color: cores.primaria }]}>{d}</Text>
                  </View>
                );
              })}
            </View>
          </Cartao>
        );
      })}

      <Secao>Permissões</Secao>
      <Cartao estilo={{ gap: espaco.md }}>
        <Permissao icone="hand-left" nome="Mostrar onde tocar" ok={guia} explica="Deixa a Lia ver a tela e apontar os botões nos outros apps."
          acao={() => LiaGuia.openAccessibilitySettings()} textoAcao="Ativar o Guia" />
        <View style={st.divisor} />
        <Permissao icone="mic" nome="Ouvir sua voz" ok={micro} explica="Deixa a Lia ouvir o que você fala."
          acao={async () => { await ExpoSpeechRecognitionModule.requestPermissionsAsync(); atualizar(); }} textoAcao="Permitir microfone" />
      </Cartao>
      <Texto suave estilo={{ marginTop: espaco.sm, fontSize: tamanho.mini }}>A Lia nunca pede senha e não guarda o que aparece na sua tela.</Texto>

      <Secao>Ajuda</Secao>
      <Botao texto="Ver a apresentação de novo" icone="play-circle" tipo="claro" onPress={reverBoasVindas} />

      <Pressable onPress={() => setAvancado(!avancado)} style={st.avancado} accessibilityRole="button">
        <Text style={st.avancadoTexto}>Ajustes avançados</Text>
        <Ionicons name={avancado ? 'chevron-up' : 'chevron-down'} size={22} color={cores.textoSuave} />
      </Pressable>
      {avancado && (
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
      )}
    </ScrollView>
  );
}

function Permissao({ icone, nome, ok, explica, acao, textoAcao }: {
  icone: NomeIcone; nome: string; ok: boolean; explica: string; acao: () => void; textoAcao: string;
}) {
  return (
    <View style={{ gap: espaco.sm }}>
      <View style={st.linha}>
        <IconeCirculo nome={icone} tam={48} cor={ok ? cores.sucesso : '#8A5A00'} fundo={ok ? cores.sucessoSuave : cores.destaqueSuave} />
        <View style={{ flex: 1 }}>
          <Text style={st.nome}>{nome}</Text>
          <Text style={[st.sub, { color: ok ? cores.sucesso : '#8A5A00', fontWeight: '800' }]}>{ok ? 'Ativado' : 'Desativado'}</Text>
        </View>
      </View>
      <Text style={st.sub}>{explica}</Text>
      {!ok && <Botao texto={textoAcao} icone="arrow-forward" onPress={acao} />}
    </View>
  );
}

const st = StyleSheet.create({
  tela: { padding: espaco.lg, paddingBottom: espaco.xl },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  nome: { fontSize: tamanho.corpo, fontWeight: '800', color: cores.tinta },
  sub: { fontSize: tamanho.mini, color: cores.textoSuave, marginTop: 2, lineHeight: 21 },
  degraus: { flexDirection: 'row', gap: 6, marginTop: espaco.md },
  barra: { height: 10, borderRadius: 5, backgroundColor: cores.borda },
  barraOk: { backgroundColor: cores.primaria },
  degrauTexto: { fontSize: 13, fontWeight: '700', color: cores.textoSuave, marginTop: 4, textAlign: 'center' },
  divisor: { height: 1, backgroundColor: cores.borda },
  avancado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: espaco.xl, minHeight: 48 },
  avancadoTexto: { fontSize: tamanho.mini, fontWeight: '700', color: cores.textoSuave },
});
