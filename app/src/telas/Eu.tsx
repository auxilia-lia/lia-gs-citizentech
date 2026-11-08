import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../ui/fonte';
import { Ionicons } from '@expo/vector-icons';
import { AULAS } from '../lia/aulas';
import { carregarProgresso, nivelDe, Progresso } from '../lia/autonomia';
import { ler } from '../lia/armazenamento';
import { falar } from '../lia/fala';
import { apresentar } from '../lia/apresentar';
import { Botao, Titulo } from '../ui/componentes';
import { Aparecer, BarraAnimada } from '../ui/anim';
import { cores, espaco, raio, tamanho } from '../ui/tema';
import Certificado from './Certificado';

// Nome de cada coisa que a pessoa pode aprender a fazer sozinha.
export const NOMES: Record<string, string> = {
  consulta: 'Marcar consulta',
  beneficio: 'Ver o INSS',
  multas: 'Consultar multas',
  'app:celular': 'Usar o celular',
  'app:whatsapp': 'Usar o WhatsApp',
  'app:configuracoes': 'Configurar o celular',
  'app:playstore': 'Instalar apps',
  ...Object.fromEntries(AULAS.map((a) => [`aula:${a.id}`, a.titulo])),
};

// Sem porcentagem: cor e palavra dizem onde a pessoa está.
const ETAPAS = [
  { texto: 'Com a Lia', cor: cores.primaria, fracao: 0.33 },
  { texto: 'Quase lá', cor: cores.destaque, fracao: 0.66 },
  { texto: 'Sozinho', cor: cores.sucesso, fracao: 1 },
];

export default function Eu({ abrirAjustes }: { abrirAjustes: () => void }) {
  const [progresso, setProgresso] = useState<Progresso>({});
  const [nome, setNome] = useState('');
  const [certificado, setCertificado] = useState<string | null>(null);

  const atualizar = useCallback(async () => {
    setProgresso(await carregarProgresso());
    setNome(await ler('lia:nome', ''));
  }, []);

  useEffect(() => {
    apresentar('eu');
    atualizar();
    const s = AppState.addEventListener('change', (e) => e === 'active' && atualizar());
    return () => s.remove();
  }, [atualizar]);

  const lista = Object.entries(progresso).filter(([k, n]) => n > 0 && NOMES[k]).sort((a, b) => b[1] - a[1]);
  const conquistado = lista.find(([, n]) => nivelDe(n) === 2);

  return (
    <ScrollView contentContainerStyle={st.tela} showsVerticalScrollIndicator={false}>
      <Aparecer>
        <View style={st.perfil}>
          <View style={st.foto}>
            {nome ? <Text style={st.fotoTexto}>{nome[0].toUpperCase()}</Text> : <Ionicons name="person-outline" size={38} color={cores.branco} />}
          </View>
          <Titulo>{nome || 'O que você já faz'}</Titulo>
        </View>
      </Aparecer>

      <Aparecer atraso={80}>
        {lista.length === 0 ? (
          <View style={st.caixa}>
            <Text style={st.vazio}>Quando você fizer algo com a Lia, aparece aqui. A cada vez, ela ajuda um pouco menos.</Text>
          </View>
        ) : (
          <View style={st.caixa}>
            {lista.map(([chave, vezes], i) => {
              const e = ETAPAS[nivelDe(vezes)];
              return (
                <View key={chave} style={[st.item, i === lista.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={st.itemTopo}>
                    <Text style={st.itemNome}>{NOMES[chave]}</Text>
                    <Text style={[st.itemEtapa, { color: e.cor }]}>{e.texto}</Text>
                  </View>
                  <BarraAnimada fracao={e.fracao} cor={e.cor} fundo={cores.borda} altura={10} />
                </View>
              );
            })}
          </View>
        )}
      </Aparecer>

      {conquistado && (
        <Aparecer atraso={140}>
          <Botao texto="Meu certificado" icone="ribbon-outline" onPress={() => setCertificado(NOMES[conquistado[0]])} estilo={{ marginTop: espaco.lg }} />
        </Aparecer>
      )}

      {/* Ajustes: só abre segurando, para quem usa não entrar sem querer. */}
      <Pressable
        onPress={() => falar('Os ajustes são para quem ajuda a configurar a Lia. Para abrir, segure este botão.')}
        onLongPress={abrirAjustes}
        delayLongPress={3000}
        style={({ pressed }) => [st.ajustes, pressed && { opacity: 0.6 }]}
        accessibilityRole="button" accessibilityLabel="Ajustes para a família. Segure para abrir."
      >
        <Ionicons name="settings-outline" size={20} color={cores.textoSuave} />
        <Text style={st.ajustesTexto}>Ajustes para a família</Text>
      </Pressable>

      <Certificado tema={certificado} aberto={certificado !== null} fechar={() => setCertificado(null)} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  tela: { flexGrow: 1, paddingHorizontal: espaco.lg, paddingTop: espaco.xl, paddingBottom: espaco.lg },
  perfil: { alignItems: 'center', gap: espaco.sm, marginBottom: espaco.lg },
  foto: { width: 84, height: 84, borderRadius: 42, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center' },
  fotoTexto: { fontSize: 34, fontWeight: '600', color: cores.branco },
  caixa: { backgroundColor: cores.superficie, borderRadius: raio.md, paddingHorizontal: espaco.md + 2, paddingVertical: espaco.xs },
  vazio: { fontSize: tamanho.pequeno, color: cores.textoSuave, textAlign: 'center', lineHeight: 26, paddingVertical: espaco.lg },
  item: { paddingVertical: espaco.md, borderBottomWidth: 1, borderBottomColor: cores.borda, gap: 10 },
  itemTopo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: espaco.sm },
  itemNome: { flex: 1, fontSize: tamanho.pequeno, fontWeight: '600', color: cores.tinta },
  itemEtapa: { fontSize: tamanho.mini, fontWeight: '600' },
  ajustes: { marginTop: 'auto', paddingTop: espaco.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56 },
  ajustesTexto: { fontSize: tamanho.mini, fontWeight: '500', color: cores.textoSuave },
});
