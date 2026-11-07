import { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LiaGuia from '../../modules/lia-guia';
import { AULAS } from '../lia/aulas';
import { autonomiaGeral, carregarProgresso, Progresso } from '../lia/autonomia';
import { Caminho, carregarCaminhos } from '../lia/caminhos';
import { Aviso, Botao, Cartao, IconeCirculo, NomeIcone, Secao } from '../ui/componentes';
import { Aparecer, BarraAnimada, Flutuar, Ondas, Toque } from '../ui/anim';
import { Aba } from '../ui/BarraAbas';
import { cores, espaco, raio, sombra, tamanho } from '../ui/tema';
import type { Pedido } from './Conversa';

type Atalho = { titulo: string; sub: string; icone: NomeIcone; pedido: Omit<Pedido, 'id'> };

// O que a Lia faz, em linguagem de quem usa.
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

const DIAS_PRATICA = 2; // depois de quantos dias a Lia sugere praticar sozinho

export default function Inicio({ pedir, irPara }: { pedir: (p: Omit<Pedido, 'id'>) => void; irPara: (a: Aba) => void }) {
  const [guiaAtivo, setGuiaAtivo] = useState(true);
  const [progresso, setProgresso] = useState<Progresso>({});
  const [caminhos, setCaminhos] = useState<Caminho[]>([]);

  const atualizar = useCallback(async () => {
    setGuiaAtivo(LiaGuia.isEnabled());
    setProgresso(await carregarProgresso());
    setCaminhos(await carregarCaminhos());
  }, []);

  useEffect(() => {
    atualizar();
    const s = AppState.addEventListener('change', (e) => e === 'active' && atualizar());
    const g = LiaGuia.addListener('onStatus', (e) => setGuiaAtivo(e.enabled));
    return () => { s.remove(); g.remove(); };
  }, [atualizar]);

  // "Tenta sozinho que eu olho": algo que ela já fez com a Lia há uns dias e ainda não faz sozinha.
  // Repetir espaçado é o que transforma "fiz com a Lia" em "sei fazer".
  const praticar = caminhos
    .filter((c) => c.sozinho < 2 && Date.now() - new Date(c.ultima).getTime() > DIAS_PRATICA * 86400000)
    .sort((a, b) => a.ultima.localeCompare(b.ultima))[0];

  const aulasFeitas = AULAS.filter((a) => (progresso[`aula:${a.id}`] ?? 0) > 0).length;
  const autonomia = Math.round(autonomiaGeral(progresso) * 100);

  return (
    <ScrollView contentContainerStyle={st.tela} showsVerticalScrollIndicator={false}>
      <Aparecer>
        <View style={st.topo}>
          <View style={{ flex: 1 }}>
            <Text style={st.ola}>{saudacao()}</Text>
            <Text style={st.pergunta}>O que vamos fazer hoje?</Text>
          </View>
          <Flutuar><View style={st.logo}><Ionicons name="chatbubble-ellipses" size={26} color={cores.branco} /></View></Flutuar>
        </View>
      </Aparecer>

      {/* Falar com a Lia */}
      <Aparecer atraso={80}>
        <Toque onPress={() => pedir({ tipo: 'ouvir' })} accessibilityRole="button" accessibilityLabel="Falar com a Lia" estilo={st.heroi} escala={0.98}>
          <View style={st.decor1} />
          <View style={st.decor2} />
          <Text style={st.heroiTitulo}>Fale comigo</Text>
          <Text style={st.heroiTexto}>Toque no microfone e diga o que você precisa. Eu te ajudo, passo a passo.</Text>
          <View style={st.microArea}>
            <Ondas tamanho={112} />
            <View style={st.micro}><Ionicons name="mic" size={44} color={cores.primaria} /></View>
          </View>
          <Text style={st.heroiDica}>Toque para falar</Text>
        </Toque>
      </Aparecer>

      {!guiaAtivo && (
        <Aparecer atraso={140} estilo={{ marginTop: espaco.lg }}>
          <Aviso tipo="atencao" titulo="Falta uma permissão" texto="Para eu te mostrar onde tocar nos outros apps, peça para alguém de confiança me ativar uma vez.">
            <Botao texto="Ativar agora" icone="hand-left" onPress={() => LiaGuia.openAccessibilitySettings()} />
          </Aviso>
        </Aparecer>
      )}

      {praticar && (
        <Aparecer atraso={150} estilo={{ marginTop: espaco.lg }}>
          <Cartao estilo={st.praticar} onPress={() => pedir({ tipo: 'praticar', caminho: praticar })}>
            <View style={st.praticarTopo}>
              <IconeCirculo nome="fitness" cor="#8A5A00" fundo={cores.destaqueSuave} tam={52} />
              <View style={{ flex: 1 }}>
                <Text style={st.praticarTitulo}>Hora de praticar</Text>
                <Text style={st.praticarTexto}>Lembra como {praticar.objetivo.toLowerCase().replace(/^(quero|eu quero|como) /, '')}? Tente sozinho, que eu só fico olhando.</Text>
              </View>
            </View>
            <Botao texto="Praticar agora" icone="play" onPress={() => pedir({ tipo: 'praticar', caminho: praticar })} />
          </Cartao>
        </Aparecer>
      )}

      {/* Aprender: aulas curtas e contínuas */}
      <Aparecer atraso={160}>
        <View style={st.aprender}>
          <View style={st.aprenderTopo}>
            <IconeCirculo nome="school" cor={cores.branco} fundo={cores.primaria} tam={52} />
            <View style={{ flex: 1 }}>
              <Text style={st.aprenderTitulo}>Aprender a usar o celular</Text>
              <Text style={st.aprenderSub}>{aulasFeitas === 0 ? 'Aulas curtas, eu te mostro cada passo' : `${aulasFeitas} de ${AULAS.length} aulas feitas`}</Text>
            </View>
          </View>
          <BarraAnimada fracao={aulasFeitas / AULAS.length} fundo={cores.branco} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.aulas}>
            {AULAS.map((a, i) => {
              const vezes = progresso[`aula:${a.id}`] ?? 0;
              return (
                <Aparecer key={a.id} atraso={220 + i * 60} distancia={10}>
                  <Toque estilo={st.aula} onPress={() => pedir({ tipo: 'aula', aula: a })} accessibilityRole="button" accessibilityLabel={`Aula: ${a.titulo}`}>
                    <View style={st.aulaIcone}>
                      <Ionicons name={a.icone} size={28} color={cores.primaria} />
                      {vezes > 0 && <View style={st.feito}><Ionicons name="checkmark" size={14} color={cores.branco} /></View>}
                    </View>
                    <Text style={st.aulaTitulo} numberOfLines={2}>{a.titulo}</Text>
                    <Text style={st.aulaSub}>{vezes > 0 ? 'Fazer de novo' : 'Começar'}</Text>
                  </Toque>
                </Aparecer>
              );
            })}
          </ScrollView>
          <Botao texto="Quero aprender outra coisa" icone="sparkles" tipo="claro" onPress={() => pedir({ tipo: 'texto', texto: 'Quero aprender a usar uma coisa no celular' })} />
        </View>
      </Aparecer>

      <Aparecer atraso={240}><Secao>Posso te ajudar com</Secao></Aparecer>
      <View style={st.grade}>
        {ATALHOS.map((a, i) => (
          <Aparecer key={a.titulo} atraso={280 + i * 70} estilo={st.atalhoFora}>
            <Cartao estilo={st.atalho} onPress={() => pedir(a.pedido)}>
              <IconeCirculo nome={a.icone} />
              <Text style={st.atalhoTitulo}>{a.titulo}</Text>
              <Text style={st.atalhoSub}>{a.sub}</Text>
            </Cartao>
          </Aparecer>
        ))}
      </View>

      <Aparecer atraso={560}>
        <Cartao estilo={st.linha} onPress={() => irPara('voce')}>
          <IconeCirculo nome="trophy" cor="#8A5A00" fundo={cores.destaqueSuave} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={st.atalhoTitulo}>{autonomia === 0 ? 'Seu progresso' : `Sua autonomia: ${autonomia}%`}</Text>
            <BarraAnimada fracao={autonomia / 100} cor={cores.destaque} />
          </View>
          <Ionicons name="chevron-forward" size={26} color={cores.textoSuave} />
        </Cartao>
      </Aparecer>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  tela: { padding: espaco.lg, paddingBottom: espaco.xl },
  topo: { flexDirection: 'row', alignItems: 'center', marginBottom: espaco.lg },
  ola: { fontSize: tamanho.subtitulo, color: cores.textoSuave, fontWeight: '700' },
  pergunta: { fontSize: tamanho.titulo, color: cores.tinta, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  logo: { width: 52, height: 52, borderRadius: 26, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center' },
  heroi: { backgroundColor: cores.primaria, borderRadius: raio.lg, padding: espaco.lg, paddingBottom: espaco.xl, alignItems: 'center', overflow: 'hidden', ...sombra },
  decor1: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#2A4DB8', top: -120, right: -80 },
  decor2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: cores.primariaEscura, bottom: -90, left: -60 },
  heroiTitulo: { fontSize: tamanho.titulo, fontWeight: '800', color: cores.branco, alignSelf: 'flex-start' },
  heroiTexto: { fontSize: tamanho.pequeno + 1, color: '#DCE4FB', lineHeight: 26, marginTop: espaco.sm, alignSelf: 'flex-start' },
  microArea: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center', marginTop: espaco.lg },
  micro: { width: 112, height: 112, borderRadius: 56, backgroundColor: cores.branco, alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: '#3D5FC6' },
  heroiDica: { color: cores.branco, fontSize: tamanho.pequeno, fontWeight: '800', marginTop: espaco.sm },
  aprender: { marginTop: espaco.lg, backgroundColor: cores.primariaSuave, borderRadius: raio.lg, padding: espaco.md + 2, gap: espaco.md, borderWidth: 1, borderColor: cores.primariaBorda },
  aprenderTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  aprenderTitulo: { fontSize: tamanho.corpo + 1, fontWeight: '800', color: cores.tinta },
  aprenderSub: { fontSize: tamanho.mini, color: cores.textoSuave, marginTop: 2 },
  aulas: { gap: espaco.sm, paddingVertical: 4, paddingRight: espaco.sm },
  aula: { width: 140, minHeight: 150, backgroundColor: cores.superficie, borderRadius: raio.md, padding: espaco.md, gap: 6, ...sombra, elevation: 3 },
  aulaIcone: { width: 52, height: 52, borderRadius: 26, backgroundColor: cores.primariaSuave, alignItems: 'center', justifyContent: 'center' },
  feito: { position: 'absolute', right: -4, top: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: cores.sucesso, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: cores.branco },
  aulaTitulo: { fontSize: tamanho.pequeno, fontWeight: '800', color: cores.tinta },
  aulaSub: { fontSize: tamanho.mini, fontWeight: '800', color: cores.primaria, marginTop: 'auto' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md, marginBottom: espaco.md },
  atalhoFora: { width: '47.5%' },
  atalho: { minHeight: 170, gap: espaco.sm },
  atalhoTitulo: { fontSize: tamanho.corpo, fontWeight: '800', color: cores.tinta },
  atalhoSub: { fontSize: tamanho.mini, color: cores.textoSuave },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  praticar: { gap: espaco.md, borderWidth: 2, borderColor: cores.destaque },
  praticarTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  praticarTitulo: { fontSize: tamanho.corpo, fontWeight: '800', color: cores.tinta },
  praticarTexto: { fontSize: tamanho.mini, color: cores.textoSuave, lineHeight: 21, marginTop: 2 },
});
