import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import LiaGuia from '../../modules/lia-guia';
import { api, definirEndereco } from '../lia/api';
import { AULAS } from '../lia/aulas';
import { autonomiaGeral, carregarHistorico, carregarProgresso, Conquista, medalhas, nivelDe, Progresso, zerarProgresso } from '../lia/autonomia';
import { Botao, Campo, Cartao, IconeCirculo, NomeIcone, Secao, Texto, Titulo } from '../ui/componentes';
import { Aparecer, BarraAnimada, Flutuar } from '../ui/anim';
import { cores, espaco, raio, sombra, tamanho } from '../ui/tema';
import type { Demo } from '../../App';
import AppsProtegidos from './AppsProtegidos';

// Nome e ícone de cada coisa que a pessoa pode aprender a fazer sozinha.
const NOMES: Record<string, { nome: string; icone: NomeIcone }> = {
  consulta: { nome: 'Marcar consulta', icone: 'medkit' },
  beneficio: { nome: 'Ver o INSS', icone: 'wallet' },
  multas: { nome: 'Consultar multas', icone: 'car' },
  'app:celular': { nome: 'Usar o celular', icone: 'phone-portrait' },
  'app:whatsapp': { nome: 'Usar o WhatsApp', icone: 'logo-whatsapp' },
  'app:configuracoes': { nome: 'Configurar o celular', icone: 'settings' },
  'app:playstore': { nome: 'Instalar apps', icone: 'download' },
  ...Object.fromEntries(AULAS.map((a) => [`aula:${a.id}`, { nome: a.titulo, icone: a.icone }])),
};
const DEGRAUS = ['Faz junto', 'Só confirma', 'Sozinho'];

function nivelGeral(pct: number) {
  if (pct >= 80) return 'Independente';
  if (pct >= 50) return 'Quase lá';
  if (pct > 0) return 'Aprendendo';
  return 'Começando';
}

function quando(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(Date.now() - 86400000);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`;
  if (d.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function Voce({ abrirDemo, reverBoasVindas }: { abrirDemo: (d: Demo) => void; reverBoasVindas: () => void }) {
  const [progresso, setProgresso] = useState<Progresso>({});
  const [historico, setHistorico] = useState<Conquista[]>([]);
  const [guia, setGuia] = useState(false);
  const [micro, setMicro] = useState(false);
  const [avancado, setAvancado] = useState(false);
  const [endereco, setEndereco] = useState(api());
  const [servidor, setServidor] = useState('');
  const [escuta, setEscuta] = useState(() => { try { return LiaGuia.autoListen(); } catch { return true; } });

  const atualizar = useCallback(async () => {
    setProgresso(await carregarProgresso());
    setHistorico(await carregarHistorico());
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

  const pct = Math.round(autonomiaGeral(progresso) * 100);
  const total = Object.values(progresso).reduce((a, b) => a + b, 0);
  const lista = Object.entries(progresso).filter(([k, n]) => n > 0 && NOMES[k]).sort((a, b) => b[1] - a[1]);
  const meds = medalhas(progresso);
  const ganhas = meds.filter((m) => m.ganhou).length;

  return (
    <ScrollView contentContainerStyle={st.tela} showsVerticalScrollIndicator={false}>
      <Aparecer><Titulo>Seu progresso</Titulo></Aparecer>

      {/* Autonomia geral */}
      <Aparecer atraso={80}>
        <View style={st.heroi}>
          <View style={st.decor} />
          <View style={st.heroiLinha}>
            <View style={{ flex: 1 }}>
              <Text style={st.heroiRotulo}>Sua autonomia</Text>
              <Text style={st.heroiNumero}>{pct}%</Text>
              <Text style={st.heroiNivel}>{nivelGeral(pct)}</Text>
            </View>
            <Flutuar>
              <View style={st.trofeu}><Ionicons name="trophy" size={44} color={cores.destaque} /></View>
            </Flutuar>
          </View>
          <BarraAnimada fracao={pct / 100} cor={cores.destaque} fundo="#2E4FB5" altura={14} />
          <View style={st.numeros}>
            <Numero valor={total} rotulo="tarefas feitas" />
            <Numero valor={lista.length} rotulo="coisas diferentes" />
            <Numero valor={ganhas} rotulo="conquistas" />
          </View>
        </View>
      </Aparecer>

      {/* Conquistas */}
      <Aparecer atraso={160}><Secao>Conquistas</Secao></Aparecer>
      <View style={st.medalhas}>
        {meds.map((m, i) => (
          <Aparecer key={m.id} atraso={200 + i * 60} estilo={st.medalhaFora}>
            <View style={[st.medalha, !m.ganhou && { opacity: 0.45 }]}>
              <View style={[st.medalhaIcone, m.ganhou && { backgroundColor: cores.destaqueSuave, borderColor: cores.destaque }]}>
                <Ionicons name={(m.ganhou ? m.icone : 'lock-closed') as NomeIcone} size={28} color={m.ganhou ? '#8A5A00' : cores.textoSuave} />
              </View>
              <Text style={st.medalhaNome} numberOfLines={2}>{m.nome}</Text>
              <Text style={st.medalhaDesc} numberOfLines={3}>{m.descricao}</Text>
            </View>
          </Aparecer>
        ))}
      </View>

      {/* O que já faz sozinho */}
      <Aparecer atraso={240}><Secao>O que você já faz</Secao></Aparecer>
      {lista.length === 0 && (
        <Cartao estilo={{ alignItems: 'center', gap: espaco.sm, paddingVertical: espaco.lg }}>
          <Ionicons name="sparkles" size={40} color={cores.primariaBorda} />
          <Texto suave estilo={{ textAlign: 'center' }}>Quando você fizer algo comigo, aparece aqui. A cada vez, eu ajudo um pouco menos.</Texto>
        </Cartao>
      )}
      {lista.map(([chave, vezes], i) => {
        const nivel = nivelDe(vezes);
        const n = NOMES[chave];
        return (
          <Aparecer key={chave} atraso={280 + i * 50}>
            <Cartao estilo={{ marginBottom: espaco.md }}>
              <View style={st.linha}>
                <IconeCirculo nome={n.icone} tam={48} />
                <View style={{ flex: 1 }}>
                  <Text style={st.nome}>{n.nome}</Text>
                  <Text style={st.sub}>Feito {vezes} {vezes === 1 ? 'vez' : 'vezes'} · {DEGRAUS[nivel]}</Text>
                </View>
                {nivel === 2 && <Ionicons name="ribbon" size={28} color={cores.destaque} />}
              </View>
              <View style={st.degraus}>
                {DEGRAUS.map((d, k) => (
                  <View key={d} style={{ flex: 1, gap: 4 }}>
                    <BarraAnimada fracao={k <= nivel ? 1 : 0} />
                    <Text style={[st.degrauTexto, k <= nivel && { color: cores.primaria }]}>{d}</Text>
                  </View>
                ))}
              </View>
            </Cartao>
          </Aparecer>
        );
      })}

      {/* Linha do tempo */}
      {historico.length > 0 && (
        <>
          <Secao>Últimas conquistas</Secao>
          <Cartao>
            {historico.slice(0, 6).map((h, i) => (
              <View key={`${h.quando}-${i}`} style={st.tempo}>
                <View style={st.tempoMarca}>
                  <View style={st.tempoPonto} />
                  {i < Math.min(historico.length, 6) - 1 && <View style={st.tempoLinha} />}
                </View>
                <View style={{ flex: 1, paddingBottom: espaco.md }}>
                  <Text style={st.nome}>{NOMES[h.chave]?.nome ?? 'Tarefa'}</Text>
                  <Text style={st.sub}>{quando(h.quando)} · {h.vezes}ª vez</Text>
                </View>
              </View>
            ))}
          </Cartao>
        </>
      )}

      <Secao>Permissões</Secao>
      <Cartao estilo={{ gap: espaco.md }}>
        <Permissao icone="hand-left" nome="Mostrar onde tocar" ok={guia} explica="Deixa a Lia ver a tela e apontar os botões nos outros apps."
          acao={() => LiaGuia.openAccessibilitySettings()} textoAcao="Ativar o Guia" />
        <View style={st.divisor} />
        <Permissao icone="mic" nome="Ouvir sua voz" ok={micro} explica="Deixa a Lia ouvir o que você fala."
          acao={async () => { await ExpoSpeechRecognitionModule.requestPermissionsAsync(); atualizar(); }} textoAcao="Permitir microfone" />
      </Cartao>
      <Texto suave estilo={{ marginTop: espaco.sm, fontSize: tamanho.mini }}>A Lia nunca pede senha. Senhas, CPF, telefone, cartão, valores e nomes são escondidos antes de ir para a inteligência artificial.</Texto>

      <Secao>Apps protegidos</Secao>
      <AppsProtegidos />

      <Secao>Jeito da Lia</Secao>
      <Cartao>
        <Pressable onPress={() => { const n = !escuta; LiaGuia.setAutoListen(n); setEscuta(n); }} style={st.linha}
          accessibilityRole="switch" accessibilityState={{ checked: escuta }}>
          <IconeCirculo nome="ear" tam={48} cor={escuta ? cores.sucesso : cores.textoSuave} fundo={escuta ? cores.sucessoSuave : cores.fundo} />
          <View style={{ flex: 1 }}>
            <Text style={st.nome}>Ouvir depois de falar</Text>
            <Text style={st.sub}>No Guia, depois de cada instrução, a Lia escuta alguns segundos. Dá para dizer "e agora?" sem tocar no microfone.</Text>
          </View>
          <Ionicons name={escuta ? 'toggle' : 'toggle-outline'} size={44} color={escuta ? cores.sucesso : cores.textoSuave} />
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
  );
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={st.num}>{valor}</Text>
      <Text style={st.numRotulo}>{rotulo}</Text>
    </View>
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
  heroi: { marginTop: espaco.md, backgroundColor: cores.primaria, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.md, overflow: 'hidden', ...sombra },
  decor: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#2A4DB8', top: -110, right: -70 },
  heroiLinha: { flexDirection: 'row', alignItems: 'center' },
  heroiRotulo: { color: '#DCE4FB', fontSize: tamanho.pequeno, fontWeight: '700' },
  heroiNumero: { color: cores.branco, fontSize: 56, fontWeight: '800', letterSpacing: -1 },
  heroiNivel: { color: cores.destaque, fontSize: tamanho.corpo, fontWeight: '800' },
  trofeu: { width: 84, height: 84, borderRadius: 42, backgroundColor: cores.primariaEscura, alignItems: 'center', justifyContent: 'center' },
  numeros: { flexDirection: 'row', marginTop: espaco.xs },
  num: { color: cores.branco, fontSize: tamanho.subtitulo, fontWeight: '800' },
  numRotulo: { color: '#C9D6F8', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  medalhas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: espaco.sm },
  medalhaFora: { width: '31.5%' },
  medalha: { backgroundColor: cores.superficie, borderRadius: raio.md, paddingVertical: espaco.sm, paddingHorizontal: 6, alignItems: 'center', gap: 4, minHeight: 156, borderWidth: 1, borderColor: cores.borda },
  medalhaIcone: { width: 50, height: 50, borderRadius: 25, backgroundColor: cores.fundo, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: cores.borda },
  medalhaNome: { fontSize: 13, fontWeight: '800', color: cores.tinta, textAlign: 'center' },
  medalhaDesc: { fontSize: 12, color: cores.textoSuave, textAlign: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  nome: { fontSize: tamanho.corpo, fontWeight: '800', color: cores.tinta },
  sub: { fontSize: tamanho.mini, color: cores.textoSuave, marginTop: 2, lineHeight: 21 },
  degraus: { flexDirection: 'row', gap: 6, marginTop: espaco.md },
  degrauTexto: { fontSize: 13, fontWeight: '700', color: cores.textoSuave, textAlign: 'center' },
  tempo: { flexDirection: 'row', gap: espaco.md },
  tempoMarca: { alignItems: 'center', width: 18 },
  tempoPonto: { width: 16, height: 16, borderRadius: 8, backgroundColor: cores.primaria, marginTop: 6, borderWidth: 3, borderColor: cores.primariaSuave },
  tempoLinha: { flex: 1, width: 2, backgroundColor: cores.primariaBorda, marginTop: 2 },
  divisor: { height: 1, backgroundColor: cores.borda },
  avancado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: espaco.xl, minHeight: 48 },
  avancadoTexto: { fontSize: tamanho.mini, fontWeight: '700', color: cores.textoSuave },
});
