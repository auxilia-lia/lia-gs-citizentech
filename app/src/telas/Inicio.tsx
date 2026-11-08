import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../ui/fonte';
import { Ionicons } from '@expo/vector-icons';
import LiaGuia from '../../modules/lia-guia';
import { AULAS } from '../lia/aulas';
import { carregarProgresso, Progresso } from '../lia/autonomia';
import { Caminho, carregarCaminhos } from '../lia/caminhos';
import { falar } from '../lia/fala';
import { apresentar } from '../lia/apresentar';
import { NomeIcone } from '../ui/componentes';
import { Aparecer, Toque } from '../ui/anim';
import { cores, espaco, raio, tamanho } from '../ui/tema';
import type { Pedido } from './Conversa';

// Quatro coisas, cada uma com ícone e texto. Segurar o botão faz a Lia dizer o que ele faz (para quem não lê).
type Atalho = { titulo: string; fala: string; icone: NomeIcone; pedido?: Omit<Pedido, 'id'> };
const ATALHOS: Atalho[] = [
  { titulo: 'Falar com\na família', fala: 'Mandar um recado para alguém da família.', icone: 'call-outline', pedido: { tipo: 'texto', texto: 'Quero mandar um recado para a minha família' } },
  { titulo: 'Ler um\npapel', fala: 'Tirar foto de uma carta, conta ou exame, e eu explico.', icone: 'document-text-outline', pedido: { tipo: 'foto' } },
  { titulo: 'Ajuda no\ncelular', fala: 'Eu mostro na tela onde tocar, passo a passo.', icone: 'phone-portrait-outline', pedido: { tipo: 'texto', texto: 'Quero ajuda para usar o celular' } },
  { titulo: 'Aprender', fala: 'Aulas curtas para aprender a usar o celular.', icone: 'book-outline' },
];

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

const DIAS_PRATICA = 2; // depois de quantos dias a Lia sugere praticar sozinho

function iconeDaAula(nome: string): NomeIcone {
  const contorno = `${nome}-outline`;
  return (contorno in Ionicons.glyphMap ? contorno : nome) as NomeIcone;
}

export default function Inicio({ pedir }: { pedir: (p: Omit<Pedido, 'id'>) => void }) {
  const [guiaAtivo, setGuiaAtivo] = useState(true);
  const [progresso, setProgresso] = useState<Progresso>({});
  const [caminhos, setCaminhos] = useState<Caminho[]>([]);
  const [aprender, setAprender] = useState(false);

  const atualizar = useCallback(async () => {
    setGuiaAtivo(LiaGuia.isEnabled());
    setProgresso(await carregarProgresso());
    setCaminhos(await carregarCaminhos());
  }, []);

  useEffect(() => {
    apresentar('inicio');
    atualizar();
    const s = AppState.addEventListener('change', (e) => e === 'active' && atualizar());
    const g = LiaGuia.addListener('onStatus', (e) => setGuiaAtivo(e.enabled));
    return () => { s.remove(); g.remove(); };
  }, [atualizar]);

  // "Tenta sozinho que eu olho": algo feito com a Lia há uns dias e que a pessoa ainda não faz sozinha.
  const praticar = caminhos
    .filter((c) => c.sozinho < 2 && Date.now() - new Date(c.ultima).getTime() > DIAS_PRATICA * 86400000)
    .sort((a, b) => a.ultima.localeCompare(b.ultima))[0];

  if (aprender) {
    return (
      <ScrollView contentContainerStyle={st.lista} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setAprender(false)} style={st.voltar} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={cores.primaria} />
          <Text style={st.voltarTexto}>Voltar</Text>
        </Pressable>
        <Text style={st.listaTitulo}>Aprender</Text>
        <Text style={st.listaSub}>Escolha uma aula. Eu mostro cada passo.</Text>
        <View style={st.caixa}>
          {AULAS.map((a, i) => {
            const feita = (progresso[`aula:${a.id}`] ?? 0) > 0;
            return (
              <Pressable key={a.id} onPress={() => pedir({ tipo: 'aula', aula: a })} onLongPress={() => falar(a.titulo)}
                style={({ pressed }) => [st.aula, i === AULAS.length - 1 && { borderBottomWidth: 0 }, pressed && { backgroundColor: cores.fundo }]}
                accessibilityRole="button" accessibilityLabel={`Aula: ${a.titulo}`}>
                <Ionicons name={iconeDaAula(a.icone)} size={26} color={cores.primaria} />
                <Text style={st.aulaTexto}>{a.titulo}</Text>
                {feita ? <Ionicons name="checkmark" size={22} color={cores.sucesso} /> : <Ionicons name="chevron-forward" size={20} color="#B5BCCD" />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <View style={st.heroi}>
        <Text style={st.ola}>{saudacao()}</Text>
        <Text style={st.pergunta}>Como posso ajudar?</Text>
        <Toque onPress={() => pedir({ tipo: 'ouvir' })} onLongPress={() => falar('Toque aqui e fale o que você precisa.')}
          accessibilityRole="button" accessibilityLabel="Toque e fale com a Lia" estilo={st.anel} escala={0.95}>
          <View style={st.micro}><Ionicons name="mic-outline" size={58} color={cores.primaria} /></View>
        </Toque>
        <Text style={st.toque}>Toque e fale</Text>
      </View>

      <View style={st.corpo}>
        {!guiaAtivo && (
          <Pressable onPress={() => LiaGuia.openAccessibilitySettings()} style={st.alerta} accessibilityRole="button">
            <Ionicons name="hand-left-outline" size={24} color={cores.destaqueTexto} />
            <Text style={st.alertaTexto}>Falta ativar o Guia. Peça para alguém da família tocar aqui.</Text>
          </Pressable>
        )}

        {praticar && (
          <Aparecer>
            <Pressable onPress={() => pedir({ tipo: 'praticar', caminho: praticar })} style={st.praticar} accessibilityRole="button">
              <Ionicons name="refresh-outline" size={26} color={cores.primaria} />
              <View style={{ flex: 1 }}>
                <Text style={st.praticarTitulo}>Vamos praticar?</Text>
                <Text style={st.praticarTexto} numberOfLines={2}>Tente sozinho: {praticar.objetivo.toLowerCase().replace(/^(quero|eu quero|como) /, '')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#B5BCCD" />
            </Pressable>
          </Aparecer>
        )}

        <View style={st.grade}>
          {ATALHOS.map((a, i) => (
            <Aparecer key={a.titulo} atraso={60 + i * 50} estilo={st.celula}>
              <Toque
                onPress={() => (a.pedido ? pedir(a.pedido) : setAprender(true))}
                onLongPress={() => falar(a.fala)}
                accessibilityRole="button" accessibilityLabel={a.titulo.replace('\n', ' ')} accessibilityHint={a.fala}
                estilo={st.atalho} escala={0.97}
              >
                <Ionicons name={a.icone} size={36} color={cores.primaria} />
                <Text style={st.atalhoTexto}>{a.titulo}</Text>
              </Toque>
            </Aparecer>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  heroi: { backgroundColor: cores.primaria, alignItems: 'center', paddingTop: espaco.xl, paddingBottom: espaco.xl + 4, paddingHorizontal: espaco.lg },
  ola: { fontSize: tamanho.pequeno, color: '#DDE4FD' },
  pergunta: { fontSize: tamanho.titulo, fontWeight: '600', color: cores.branco, marginTop: 2, textAlign: 'center' },
  anel: { marginTop: espaco.lg, width: 164, height: 164, borderRadius: 82, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  micro: { width: 136, height: 136, borderRadius: 68, backgroundColor: cores.branco, alignItems: 'center', justifyContent: 'center' },
  toque: { marginTop: espaco.md, fontSize: tamanho.corpo, fontWeight: '600', color: cores.branco },
  corpo: { flex: 1, padding: espaco.lg, gap: espaco.md },
  alerta: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, backgroundColor: cores.destaqueSuave, borderRadius: raio.md, padding: espaco.md },
  alertaTexto: { flex: 1, fontSize: tamanho.mini, color: cores.destaqueTexto, lineHeight: 21 },
  praticar: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, backgroundColor: cores.superficie, borderRadius: raio.md, padding: espaco.md, borderLeftWidth: 4, borderLeftColor: cores.destaque },
  praticarTitulo: { fontSize: tamanho.pequeno, fontWeight: '600', color: cores.tinta },
  praticarTexto: { fontSize: tamanho.mini, color: cores.textoSuave },
  grade: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: espaco.md },
  celula: { width: '48%' },
  atalho: { minHeight: 132, backgroundColor: cores.superficie, borderRadius: raio.md, alignItems: 'center', justifyContent: 'center', gap: espaco.sm, padding: espaco.md },
  atalhoTexto: { fontSize: tamanho.pequeno, fontWeight: '600', color: cores.tinta, textAlign: 'center', lineHeight: 23 },
  lista: { padding: espaco.lg, paddingBottom: espaco.xl },
  voltar: { flexDirection: 'row', alignItems: 'center', minHeight: 48, alignSelf: 'flex-start' },
  voltarTexto: { fontSize: tamanho.pequeno, fontWeight: '500', color: cores.primaria },
  listaTitulo: { fontSize: tamanho.titulo, fontWeight: '600', color: cores.tinta, textAlign: 'center', marginTop: espaco.sm },
  listaSub: { fontSize: tamanho.pequeno, color: cores.textoSuave, textAlign: 'center', marginTop: espaco.xs, marginBottom: espaco.lg },
  caixa: { backgroundColor: cores.superficie, borderRadius: raio.md, overflow: 'hidden' },
  aula: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, paddingHorizontal: espaco.md + 2, minHeight: 64, borderBottomWidth: 1, borderBottomColor: cores.borda },
  aulaTexto: { flex: 1, fontSize: tamanho.pequeno, fontWeight: '500', color: cores.tinta },
});
