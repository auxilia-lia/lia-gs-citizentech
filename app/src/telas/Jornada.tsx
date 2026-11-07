import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Medalha } from '../lia/autonomia';
import type { NomeIcone } from '../ui/componentes';
import { Aparecer } from '../ui/anim';
import { cores, espaco, raio, tamanho } from '../ui/tema';

// Jornada visual: as conquistas como um caminho, do primeiro passo até "Independente".
// Mostra o que já foi conquistado, o PRÓXIMO marco (em destaque) e o que vem depois.
export default function Jornada({ marcos }: { marcos: Medalha[] }) {
  const ganhos = marcos.filter((m) => m.ganhou);
  const faltam = marcos.filter((m) => !m.ganhou);
  const ordem = [...ganhos, ...faltam];
  const proximo = faltam[0]?.id;
  return (
    <View style={st.caixa}>
      {ordem.map((m, i) => {
        const eProximo = m.id === proximo;
        const ultimo = i === ordem.length - 1;
        return (
          <Aparecer key={m.id} atraso={200 + i * 60} distancia={8}>
            <View style={st.linha}>
              <View style={st.trilho}>
                <View style={[st.marca, m.ganhou && st.marcaGanha, eProximo && st.marcaProxima]}>
                  <Ionicons name={(m.ganhou ? m.icone : eProximo ? 'flag' : 'lock-closed') as NomeIcone} size={24}
                    color={m.ganhou ? '#8A5A00' : eProximo ? cores.primaria : cores.textoSuave} />
                </View>
                {!ultimo && <View style={[st.ligacao, m.ganhou && { backgroundColor: cores.destaque }]} />}
              </View>
              <View style={[st.texto, eProximo && st.textoProximo]}>
                {eProximo && <Text style={st.etiqueta}>PRÓXIMO MARCO</Text>}
                <Text style={[st.nome, !m.ganhou && !eProximo && { color: cores.textoSuave }]}>{m.nome}</Text>
                <Text style={st.desc}>{m.descricao}</Text>
              </View>
            </View>
          </Aparecer>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  caixa: { backgroundColor: cores.superficie, borderRadius: raio.lg, padding: espaco.md, borderWidth: 1, borderColor: cores.borda },
  linha: { flexDirection: 'row', gap: espaco.md },
  trilho: { alignItems: 'center', width: 52 },
  marca: { width: 52, height: 52, borderRadius: 26, backgroundColor: cores.fundo, borderWidth: 2, borderColor: cores.borda, alignItems: 'center', justifyContent: 'center' },
  marcaGanha: { backgroundColor: cores.destaqueSuave, borderColor: cores.destaque },
  marcaProxima: { backgroundColor: cores.primariaSuave, borderColor: cores.primaria, borderWidth: 3 },
  ligacao: { flex: 1, width: 4, minHeight: 18, backgroundColor: cores.borda, borderRadius: 2, marginVertical: 2 },
  texto: { flex: 1, paddingBottom: espaco.md, paddingTop: 4 },
  textoProximo: { backgroundColor: cores.primariaSuave, borderRadius: raio.md, padding: espaco.sm, marginBottom: espaco.md },
  etiqueta: { fontSize: 12, fontWeight: '800', color: cores.primaria, letterSpacing: 0.5 },
  nome: { fontSize: tamanho.corpo, fontWeight: '800', color: cores.tinta },
  desc: { fontSize: tamanho.mini, color: cores.textoSuave, marginTop: 2 },
});
