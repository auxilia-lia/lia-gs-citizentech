import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Text } from '../ui/fonte';
import { Ionicons } from '@expo/vector-icons';
import { Caminho, fraseDoPasso, PassoCaminho } from '../lia/caminhos';
import { Botao, Cartao, NomeIcone, Tocavel } from '../ui/componentes';
import { Aparecer } from '../ui/anim';
import { cores, espaco, raio, tamanho } from '../ui/tema';

// "Meus caminhos": cada coisa aprendida com o Guia vira um cartão com os passos em ícones e frases curtas.
// A pessoa revê sem precisar da Lia, pratica sozinha, ou manda para alguém (é o "caderninho" que muitos idosos já fazem à mão).

const ICONES: Record<string, NomeIcone> = {
  tocar: 'hand-left', tocar_ponto: 'hand-left', painel: 'arrow-down', rolar_baixo: 'arrow-up', rolar_cima: 'arrow-down',
  voltar: 'arrow-back', inicio: 'home',
};

const titulo = (o: string) => {
  const t = o.trim().replace(/^(eu )?(quero|queria|preciso|como)( de)? /i, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function textoDoCaminho(c: Caminho): string {
  return `Como ${titulo(c.objetivo).toLowerCase()} (aprendi com a Lia):\n` +
    c.passos.map((p, i) => `${i + 1}. ${fraseDoPasso(p)}`).join('\n');
}

export default function MeusCaminhos({ caminhos, praticar }: { caminhos: Caminho[]; praticar: (c: Caminho) => void }) {
  const [aberto, setAberto] = useState<string | null>(caminhos[0]?.chave ?? null);
  if (caminhos.length === 0) {
    return (
      <Cartao estilo={{ alignItems: 'center', gap: espaco.sm, paddingVertical: espaco.lg }}>
        <Ionicons name="map" size={40} color={cores.primariaBorda} />
        <Text style={[st.sub, { textAlign: 'center' }]}>Quando você terminar algo com o Guia, o caminho fica guardado aqui, para rever quando quiser.</Text>
      </Cartao>
    );
  }
  return (
    <View style={{ gap: espaco.md }}>
      {caminhos.slice(0, 12).map((c, i) => {
        const ab = aberto === c.chave;
        return (
          <Aparecer key={c.chave} atraso={120 + i * 50}>
            <Cartao>
              <Tocavel onPress={() => setAberto(ab ? null : c.chave)} style={st.topo} accessibilityRole="button"
                accessibilityState={{ expanded: ab }} accessibilityLabel={titulo(c.objetivo)}
                fala={`${titulo(c.objetivo)}. ${ab ? 'Toque para fechar os passos.' : 'Toque para ver os passos.'}`}>
                <View style={{ flex: 1 }}>
                  <Text style={st.nome}>{titulo(c.objetivo)}</Text>
                  <Text style={st.sub}>Feito {c.vezes} {c.vezes === 1 ? 'vez' : 'vezes'}{c.sozinho > 0 ? ` · ${c.sozinho} sozinho` : ''} · {c.passos.length} passos</Text>
                </View>
                <Ionicons name={ab ? 'chevron-up' : 'chevron-down'} size={24} color={cores.textoSuave} />
              </Tocavel>
              {ab && (
                <View style={{ gap: espaco.sm, marginTop: espaco.md }}>
                  {c.passos.map((p: PassoCaminho, k) => (
                    <View key={k} style={st.passo}>
                      <View style={st.numero}><Text style={st.numeroTexto}>{k + 1}</Text></View>
                      <Ionicons name={ICONES[p.tipo] ?? 'ellipse'} size={22} color={cores.primaria} />
                      <Text style={st.frase}>{fraseDoPasso(p)}</Text>
                    </View>
                  ))}
                  <View style={st.botoes}>
                    <View style={{ flex: 1 }}><Botao texto="Praticar" icone="fitness" onPress={() => praticar(c)} fala="Praticar: você faz sozinho, e a Lia só acompanha." /></View>
                    <View style={{ flex: 1 }}>
                      <Botao texto="Enviar" icone="share-social" tipo="claro" onPress={() => Share.share({ message: textoDoCaminho(c) })} fala="Enviar esse caminho para alguém, por mensagem." />
                    </View>
                  </View>
                </View>
              )}
            </Cartao>
          </Aparecer>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, minHeight: 48 },
  nome: { fontSize: tamanho.corpo, fontWeight: '600', color: cores.tinta },
  sub: { fontSize: tamanho.mini, color: cores.textoSuave, marginTop: 2 },
  passo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, backgroundColor: cores.fundo, borderRadius: raio.md, padding: espaco.sm },
  numero: { width: 28, height: 28, borderRadius: 14, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { color: cores.branco, fontWeight: '600', fontSize: 14 },
  frase: { flex: 1, fontSize: tamanho.pequeno, color: cores.texto, fontWeight: '600' },
  botoes: { flexDirection: 'row', gap: espaco.sm, marginTop: espaco.xs },
});
