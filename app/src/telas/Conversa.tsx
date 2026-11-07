import { ComponentRef, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import LiaGuia from '../../modules/lia-guia';
import { Acao, AnaliseGolpe, buscarFluxos, conversar, entenderFoto, Mensagem, urlGov } from '../lia/api';
import { carregarProgresso, nivelDe, NOMES_NIVEL, registrarConclusao } from '../lia/autonomia';
import { montarContexto } from '../lia/contexto';
import { abrirWhatsApp, acharFamiliar, carregarFamilia, Familiar } from '../lia/familia';
import { guiarComIA, objetivoAtual, PACOTES, pararGuiaIA } from '../lia/guiaIA';
import { novoMapa, quantosEscondidos } from '../lia/pseudonimizar';
import { precisaConfirmar, respostaSimNao } from '../lia/risco';
import { useVoz } from '../lia/useVoz';
import type { Aula } from '../lia/aulas';
import type { Caminho } from '../lia/caminhos';
import { Aviso, Botao } from '../ui/componentes';
import { Aparecer, Ondas, Toque } from '../ui/anim';
import { cores, espaco, raio, sombra, tamanho } from '../ui/tema';

export type Pedido = { id: number; tipo: 'texto' | 'foto' | 'ouvir' | 'aula' | 'praticar'; texto?: string; aula?: Aula; caminho?: Caminho };

const BOAS_VINDAS = 'Oi! Eu sou a Lia. Me fala o que você quer fazer, que eu te ajudo.';
const SEM_SERVIDOR = 'Não consegui falar com a Lia agora. Confira se o celular está com internet e tente de novo.';

type Pendente = { familiar: Familiar; mensagem: string };

const estadoDoGuia = () => {
  try { return LiaGuia.state(); } catch { return 'desconhecido'; }
};

export default function Conversa({ ativa, pedido }: { ativa: boolean; pedido: Pedido | null }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([{ papel: 'lia', texto: BOAS_VINDAS }]);
  const [pensando, setPensando] = useState(false);
  const [escrevendo, setEscrevendo] = useState(false);
  const [digitado, setDigitado] = useState('');
  const [golpe, setGolpe] = useState<AnaliseGolpe | null>(null);
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [escondidos, setEscondidos] = useState(0);
  const mapa = useRef(novoMapa());
  const guiaAtivo = useRef<string | null>(null);
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);
  const pendenteRef = useRef<Pendente | null>(null);
  pendenteRef.current = pendente;
  const ativaRef = useRef(ativa);
  ativaRef.current = ativa;

  const voz = useVoz((texto) => {
    if (!texto || !ativaRef.current) return;
    if (pendenteRef.current) return responderConfirmacao(texto);
    enviar(texto);
  });

  const dizer = (texto: string, depois?: () => void) => {
    setMensagens((m) => [...m, { papel: 'lia', texto }]);
    voz.falar(texto, depois);
  };

  // Atalhos do Início chegam como pedido.
  useEffect(() => {
    if (!pedido) return;
    if (pedido.tipo === 'texto' && pedido.texto) enviar(pedido.texto);
    else if (pedido.tipo === 'foto') tirarFoto();
    else if (pedido.tipo === 'ouvir') voz.ouvir();
    else if (pedido.tipo === 'aula' && pedido.aula) {
      const a = pedido.aula;
      setMensagens((m) => [...m, { papel: 'pessoa', texto: `Quero aprender: ${a.titulo}` }]);
      dizer(`Vamos aprender: ${a.titulo.toLowerCase()}. Eu vou te mostrando cada passo na tela.`, () => guiarApp(a.app, a.objetivo, `aula:${a.id}`));
    } else if (pedido.tipo === 'praticar' && pedido.caminho) {
      // "Tenta sozinho que eu olho": nível "só acompanha"; a Lia só aparece se ela travar.
      const cm = pedido.caminho;
      setMensagens((m) => [...m, { papel: 'pessoa', texto: `Quero praticar: ${cm.objetivo}` }]);
      dizer('Vamos praticar. Desta vez você faz sozinho, e eu só fico olhando. Se travar, eu mostro.',
        () => guiarApp(cm.app, cm.objetivo, undefined, undefined, 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido?.id]);

  // Quando o Guia termina um serviço, conta para a autonomia progressiva.
  useEffect(() => {
    const s = LiaGuia.addListener('onStep', async (e) => {
      if (e.type !== 'finished' || !guiaAtivo.current) return;
      const servico = guiaAtivo.current;
      guiaAtivo.current = null;
      parabens(await registrarConclusao(servico));
    });
    return () => s.remove();
  }, []);

  // Conversa durante o Guia: a pessoa tocou no microfone por cima do outro app.
  useEffect(() => {
    const s = LiaGuia.addListener('onVoz', async (e) => {
      const guiando = objetivoAtual() ?? (guiaAtivo.current ? `fazer: ${guiaAtivo.current}` : null);
      if (e.protegeu || e.tratado) return; // "não olha esse app", "e agora?": o Guia já resolveu sozinho
      if (e.conseguiu) {
        // "Já consegui": o Guia conclui e conta para a autonomia (o evento de fim chega em seguida).
        setMensagens((m) => [...m, { papel: 'pessoa', texto: e.texto }]);
        return;
      }
      if (e.parou) {
        pararGuiaIA(false);
        guiaAtivo.current = null;
        setMensagens((m) => [...m, { papel: 'pessoa', texto: e.texto }, { papel: 'lia', texto: 'Tudo bem, parei. Se precisar, é só me chamar.' }]);
        return;
      }
      setMensagens((m) => [...m, { papel: 'pessoa', texto: e.texto }]);
      try {
        const historico: Mensagem[] = [{ papel: 'pessoa', texto: e.texto }];
        const r = await conversar(historico, mapa.current, 'app', { ...(await montarContexto()), guia: guiando ? `${guiando} (na tela agora: ${estadoDoGuia()})` : guiando });
        setMensagens((m) => [...m, { papel: 'lia', texto: r.fala }]);
        LiaGuia.say(r.fala); // por cima do outro app
        const a = r.acao;
        if (a?.tipo === 'parar_guia') {
          pararOGuia(!!a.conseguiu);
        } else if (a?.tipo === 'guiar_app' || a?.tipo === 'guiar') {
          guiaAtivo.current = null;
          setTimeout(() => executar(a), 2500); // depois de falar, troca o objetivo do Guia
        } else if (a) {
          LiaGuia.say('Para isso, volte para a Lia: é só abrir o app dela.');
        }
      } catch {
        LiaGuia.say('A internet está ruim agora. Tente de novo daqui a pouco.');
      }
    });
    return () => s.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Conseguiu: conclui e conta como conquista. Desistiu: só para, sem dizer que conseguiu.
  const pararOGuia = (conseguiu: boolean) => {
    if (conseguiu) return LiaGuia.finishAI('Que bom! Você conseguiu.');
    pararGuiaIA(false);
    guiaAtivo.current = null;
    LiaGuia.cancel('Tudo bem, parei. Quando quiser, a gente tenta de novo.');
  };

  const parabens = (vezes: number) => {
    const nivel = NOMES_NIVEL[nivelDe(vezes)].toLowerCase();
    setMensagens((m) => [...m, { papel: 'lia', texto: `Parabéns! Você já fez isso ${vezes} ${vezes === 1 ? 'vez' : 'vezes'}. Da próxima, eu ajudo assim: ${nivel}.` }]);
  };

  // ---------- conversa ----------
  const enviar = async (texto: string) => {
    voz.calar();
    voz.setErro('');
    const historico: Mensagem[] = [...mensagens, { papel: 'pessoa', texto }];
    setMensagens(historico);
    setPensando(true);
    try {
      const r = await conversar(historico.slice(1), mapa.current, 'app', await montarContexto());
      setEscondidos(quantosEscondidos(mapa.current));
      setGolpe(r.golpe);
      setMensagens((m) => [...m, { papel: 'lia', texto: r.fala }]);
      voz.falar(r.fala, () => r.acao && executar(r.acao));
    } catch {
      voz.setErro(SEM_SERVIDOR);
    } finally {
      setPensando(false);
    }
  };

  // ---------- ações ----------
  const executar = async (acao: Acao) => {
    if (acao.tipo === 'guiar') return guiar(acao.servico);
    if (acao.tipo === 'guiar_app') return guiarApp(acao.app, acao.objetivo, undefined, acao.atalho ? acao.nome_app : undefined);
    if (acao.tipo === 'tirar_foto') return tirarFoto();
    if (acao.tipo === 'avisar_familiar') return prepararAviso(acao.contato, acao.mensagem);
    if (acao.tipo === 'parar_guia') return pararOGuia(!!acao.conseguiu);
  };

  const semGuia = () => dizer('Para eu te mostrar onde tocar, falta ativar uma permissão. Vá na aba Você e toque em Ativar o Guia.');

  const guiar = async (servico: string) => {
    try {
      const fluxo = (await buscarFluxos())[servico];
      if (!fluxo) return;
      if (!LiaGuia.isEnabled()) return semGuia();
      const nivel = nivelDe((await carregarProgresso())[servico] ?? 0);
      guiaAtivo.current = servico;
      LiaGuia.start(fluxo.passos, nivel);
      await Linking.openURL(urlGov(fluxo.caminho));
    } catch {
      voz.setErro(SEM_SERVIDOR);
    }
  };

  // atalhoApp: a pessoa só quer resolver ("instala pra mim"): a Play Store já abre na busca do app pedido,
  // longe dos anúncios da página inicial. Sem atalho, ela faz o caminho todo (e aprende).
  const guiarApp = async (app: string, objetivo: string, chaveAula?: string, atalhoApp?: string, nivelForcado?: number) => {
    if (!LiaGuia.isEnabled()) return semGuia();
    const chave = chaveAula ?? `app:${app}`;
    const nivel = nivelForcado ?? nivelDe((await carregarProgresso())[chave] ?? 0);
    guiarComIA(objetivo, nivel, async () => parabens(await registrarConclusao(chave)), app);
    const abriu = app === 'playstore' && atalhoApp
      ? LiaGuia.openUrl(`market://search?q=${encodeURIComponent(atalhoApp)}&c=apps`)
      : LiaGuia.openApp(PACOTES[app] ?? app);
    if (!abriu) dizer('Não consegui abrir esse app. Ele está instalado?');
  };

  const prepararAviso = async (contato: string, mensagem: string) => {
    const familiar = acharFamiliar(contato, await carregarFamilia());
    if (!familiar) return dizer(`Ainda não conheço "${contato}". Cadastre essa pessoa na aba Família, que eu aviso na hora.`);
    if (!familiar.telefone) return dizer(`Falta o número do WhatsApp de ${familiar.nome}. Dá para colocar na aba Família.`);
    if (!precisaConfirmar('avisar_familiar')) return enviarAviso({ familiar, mensagem });
    const p = { familiar, mensagem };
    setPendente(p);
    pendenteRef.current = p;
    dizer(`Vou mandar para ${familiar.nome}: "${mensagem}". Posso mandar?`, () => voz.ouvir());
  };

  const responderConfirmacao = (falado: string) => {
    const r = respostaSimNao(falado);
    if (r === null) return dizer('Não entendi. Posso mandar? Pode falar sim ou não.', () => voz.ouvir());
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
    dizer(ok ? `Abri o WhatsApp com a mensagem para ${familiar.nome}. Agora é só tocar no botão verde de enviar.` : 'Não consegui abrir o WhatsApp. Ele está instalado?');
  };

  const tirarFoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return dizer('Preciso da câmera para ler o papel. Toque em Permitir quando o celular perguntar.');
    const foto = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, mediaTypes: ['images'] });
    if (foto.canceled || !foto.assets[0]?.base64) return;
    setMensagens((m) => [...m, { papel: 'pessoa', texto: '📷 Foto de um papel' }]);
    setPensando(true);
    try {
      const r = await entenderFoto(foto.assets[0].base64, foto.assets[0].mimeType ?? 'image/jpeg');
      setGolpe(r.golpe ? { golpe: true, nivel: 'alto', motivos: r.motivo ? [r.motivo] : [] } : null);
      dizer(r.golpe ? `${r.fala} Cuidado: isso pode ser golpe. ${r.motivo}` : r.fala);
    } catch {
      voz.setErro(SEM_SERVIDOR);
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

  const status = voz.ouvindo ? 'Estou ouvindo…' : pensando ? 'Pensando…' : voz.falando ? 'Falando…' : 'Pronta para ajudar';

  return (
    <KeyboardAvoidingView style={st.tela} behavior="height">
      <View style={st.cab}>
        <View style={st.avatar}><Ionicons name="chatbubble-ellipses" size={24} color={cores.branco} /></View>
        <View style={{ flex: 1 }}>
          <Text style={st.nome}>Lia</Text>
          <Text style={[st.status, (voz.ouvindo || pensando) && { color: cores.primaria }]}>{status}</Text>
        </View>
        {escondidos > 0 && (
          <View style={st.cadeado} accessibilityLabel={`${escondidos} dados pessoais escondidos da inteligência artificial`}>
            <Ionicons name="lock-closed" size={16} color={cores.sucesso} />
            <Text style={st.cadeadoTexto}>{escondidos} protegido{escondidos > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      <ScrollView ref={rolagem} contentContainerStyle={st.lista} onContentSizeChange={() => rolagem.current?.scrollToEnd({ animated: true })}>
        {mensagens.map((m, i) => (
          m.papel === 'lia' ? (
            <Aparecer key={i} distancia={12} estilo={{ alignSelf: 'flex-start', maxWidth: '88%' }}>
              <Pressable onPress={() => voz.falar(m.texto)} accessibilityHint="Toque para ouvir de novo" style={[st.balao, st.balaoLia]}>
                <Text style={st.texto}>{m.texto}</Text>
                <View style={st.ouvir}><Ionicons name="volume-high" size={18} color={cores.primaria} /><Text style={st.ouvirTexto}>Ouvir de novo</Text></View>
              </Pressable>
            </Aparecer>
          ) : (
            <Aparecer key={i} distancia={12} estilo={{ alignSelf: 'flex-end', maxWidth: '88%' }}>
              <View style={[st.balao, st.balaoPessoa]}><Text style={[st.texto, { color: cores.branco }]}>{m.texto}</Text></View>
            </Aparecer>
          )
        ))}
        {voz.parcial ? <View style={[st.balao, st.balaoPessoa, { opacity: 0.6, alignSelf: 'flex-end', maxWidth: '88%' }]}><Text style={[st.texto, { color: cores.branco }]}>{voz.parcial}</Text></View> : null}
        {pensando && <View style={[st.balao, st.balaoLia, { alignSelf: 'flex-start' }]}><Text style={st.texto}>…</Text></View>}
      </ScrollView>

      <View style={st.extras}>
        {golpe?.golpe && (
          <Pressable onPress={() => setGolpe(null)}>
            <Aviso tipo="perigo" titulo="Cuidado: pode ser golpe" texto={[...golpe.motivos.slice(0, 2), 'Não clique, não pague e não passe códigos.'].join('\n')} />
          </Pressable>
        )}
        {pendente && (
          <Aviso tipo="info" titulo={`Mandar para ${pendente.familiar.nome}?`} texto={`"${pendente.mensagem}"`}>
            <View style={{ flexDirection: 'row', gap: espaco.sm }}>
              <Botao texto="Sim, mandar" icone="checkmark" tipo="sucesso" onPress={() => confirmar(true)} estilo={{ flex: 1 }} />
              <Botao texto="Não" icone="close" tipo="claro" onPress={() => confirmar(false)} estilo={{ flex: 1 }} />
            </View>
          </Aviso>
        )}
        {voz.erro ? <Aviso tipo="atencao" titulo="Opa" texto={voz.erro} /> : null}
      </View>

      {escrevendo && (
        <View style={st.digitar}>
          <TextInput
            style={st.input} value={digitado} onChangeText={setDigitado} placeholder="Escreva aqui…"
            placeholderTextColor="#9AA3B8" onSubmitEditing={enviarDigitado} returnKeyType="send" autoFocus
          />
          <Pressable onPress={enviarDigitado} style={st.enviar} accessibilityLabel="Enviar">
            <Ionicons name="send" size={24} color={cores.branco} />
          </Pressable>
        </View>
      )}

      <View style={st.doca}>
        <BotaoLado icone="camera" texto="Ler papel" onPress={tirarFoto} disabled={pensando} />
        <View style={st.microArea}>
          <Ondas tamanho={96} cor={cores.perigo} ativo={voz.ouvindo} />
          <Toque
            onPress={() => (voz.ouvindo ? voz.pararDeOuvir() : voz.ouvir())}
            disabled={pensando}
            accessibilityRole="button"
            accessibilityLabel={voz.ouvindo ? 'Parar de ouvir' : 'Falar com a Lia'}
            estilo={[st.micro, voz.ouvindo && st.microAtivo, pensando && { opacity: 0.5 }]}
          >
            <Ionicons name={voz.ouvindo ? 'stop' : 'mic'} size={44} color={cores.branco} />
          </Toque>
        </View>
        <BotaoLado icone={escrevendo ? 'close' : 'create'} texto={escrevendo ? 'Fechar' : 'Escrever'} onPress={() => setEscrevendo(!escrevendo)} />
      </View>
      <Text style={st.dica}>{voz.ouvindo ? 'Pode falar. Toque de novo para parar.' : 'Toque no microfone e fale'}</Text>
    </KeyboardAvoidingView>
  );
}

function BotaoLado({ icone, texto, onPress, disabled }: { icone: 'camera' | 'create' | 'close'; texto: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={texto} style={[st.lado, disabled && { opacity: 0.5 }]}>
      <View style={st.ladoCirculo}><Ionicons name={icone} size={28} color={cores.primaria} /></View>
      <Text style={st.ladoTexto}>{texto}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, paddingBottom: espaco.sm },
  cab: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, paddingHorizontal: espaco.lg, paddingVertical: espaco.md, backgroundColor: cores.superficie, borderBottomWidth: 1, borderColor: cores.borda },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center' },
  nome: { fontSize: tamanho.subtitulo, fontWeight: '800', color: cores.tinta },
  status: { fontSize: tamanho.mini, color: cores.textoSuave, fontWeight: '700' },
  cadeado: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: cores.sucessoSuave, borderRadius: raio.pilula, paddingHorizontal: 10, paddingVertical: 6 },
  cadeadoTexto: { color: cores.sucesso, fontSize: 13, fontWeight: '800' },
  lista: { padding: espaco.md, gap: espaco.md },
  balao: { borderRadius: raio.md, padding: espaco.md },
  balaoLia: { backgroundColor: cores.superficie, borderTopLeftRadius: 6, ...sombra, elevation: 2 },
  balaoPessoa: { backgroundColor: cores.primaria, borderTopRightRadius: 6 },
  texto: { fontSize: tamanho.corpo, lineHeight: 29, color: cores.texto },
  ouvir: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: espaco.sm },
  ouvirTexto: { color: cores.primaria, fontSize: tamanho.mini, fontWeight: '800' },
  extras: { paddingHorizontal: espaco.md, gap: espaco.sm },
  digitar: { flexDirection: 'row', gap: espaco.sm, paddingHorizontal: espaco.md, paddingTop: espaco.sm },
  input: { flex: 1, minHeight: 56, borderWidth: 2, borderColor: cores.primariaBorda, borderRadius: raio.md, paddingHorizontal: espaco.md, fontSize: tamanho.corpo, backgroundColor: cores.superficie, color: cores.texto },
  enviar: { width: 56, height: 56, borderRadius: 28, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center' },
  doca: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingTop: espaco.md },
  microArea: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  micro: { width: 96, height: 96, borderRadius: 48, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: cores.primariaSuave, ...sombra },
  microAtivo: { backgroundColor: cores.perigo, borderColor: cores.perigoSuave },
  lado: { alignItems: 'center', width: 90 },
  ladoCirculo: { width: 60, height: 60, borderRadius: 30, backgroundColor: cores.superficie, borderWidth: 2, borderColor: cores.primariaBorda, alignItems: 'center', justifyContent: 'center' },
  ladoTexto: { fontSize: tamanho.mini, fontWeight: '800', color: cores.primaria, marginTop: 4 },
  dica: { textAlign: 'center', color: cores.textoSuave, fontSize: tamanho.mini, fontWeight: '700', marginTop: espaco.sm },
});
