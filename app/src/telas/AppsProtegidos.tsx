import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Text } from '../ui/fonte';
import { Ionicons } from '@expo/vector-icons';
import LiaGuia, { AppDoCelular } from '../../modules/lia-guia';
import { Botao, Campo, Cartao, IconeCirculo, Tocavel } from '../ui/componentes';
import { Aparecer } from '../ui/anim';
import { cores, espaco, raio, tamanho } from '../ui/tema';

// Apps protegidos: neles a Lia não olha a tela (nada sai do celular).
// Bancos, Pix, carteiras e senhas já vêm protegidos; a pessoa (ou o familiar) pode proteger ou liberar qualquer app.
export default function AppsProtegidos() {
  const [apps, setApps] = useState<AppDoCelular[]>([]);
  const [adicionando, setAdicionando] = useState(false);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(() => {
    try { setApps(LiaGuia.apps()); } catch { setApps([]); }
  }, []);

  useEffect(() => {
    carregar();
    const s = AppState.addEventListener('change', (e) => e === 'active' && carregar());
    const v = LiaGuia.addListener('onVoz', (e) => e.protegeu && carregar());
    return () => { s.remove(); v.remove(); };
  }, [carregar]);

  const mudar = (pkg: string, proteger: boolean) => {
    LiaGuia.setProtected(pkg, proteger);
    carregar();
  };

  const protegidos = apps.filter((a) => a.protegido);
  const outros = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return apps.filter((a) => !a.protegido && (!b || a.nome.toLowerCase().includes(b))).slice(0, 30);
  }, [apps, busca]);

  return (
    <Cartao estilo={{ gap: espaco.md }}>
      <View style={st.linha}>
        <IconeCirculo nome="shield-checkmark" tam={48} cor={cores.sucesso} fundo={cores.sucessoSuave} />
        <Text style={[st.sub, { flex: 1 }]}>Nesses apps a Lia não olha a tela. Bancos, Pix e senhas já vêm protegidos.</Text>
      </View>

      {protegidos.length === 0 && <Text style={st.sub}>Nenhum app protegido instalado.</Text>}
      {protegidos.map((a) => (
        <View key={a.pkg} style={st.item}>
          <Ionicons name="lock-closed" size={22} color={cores.sucesso} />
          <View style={{ flex: 1 }}>
            <Text style={st.nome} numberOfLines={1}>{a.nome}</Text>
            <Text style={st.mini}>{a.auto ? 'Protegido automaticamente' : 'Protegido por você'}</Text>
          </View>
          <Tocavel onPress={() => mudar(a.pkg, false)} style={st.acao} accessibilityRole="button" accessibilityLabel={`Liberar ${a.nome}`}
            fala={`Liberar o ${a.nome}: a Lia volta a poder olhar a tela dele.`}>
            <Text style={st.acaoTexto}>Liberar</Text>
          </Tocavel>
        </View>
      ))}

      {!adicionando ? (
        <Botao texto="Proteger outro app" icone="add-circle" tipo="claro" onPress={() => setAdicionando(true)} fala="Escolher outro app em que a Lia não vai olhar a tela." />
      ) : (
        <Aparecer>
          <View style={{ gap: espaco.sm }}>
            <Campo rotulo="Qual app?" value={busca} onChangeText={setBusca} placeholder="Digite o nome" />
            {outros.map((a) => (
              <Tocavel key={a.pkg} onPress={() => mudar(a.pkg, true)} style={st.item} accessibilityRole="button" accessibilityLabel={`Proteger ${a.nome}`}
                fala={`Proteger o ${a.nome}: a Lia não vai olhar a tela dele.`}>
                <Ionicons name="lock-open-outline" size={22} color={cores.textoSuave} />
                <Text style={[st.nome, { flex: 1 }]} numberOfLines={1}>{a.nome}</Text>
                <Text style={st.acaoTexto}>Proteger</Text>
              </Tocavel>
            ))}
            <Botao texto="Pronto" icone="checkmark" tipo="claro" onPress={() => { setAdicionando(false); setBusca(''); }} fala="Pronto: fechar a lista de apps." />
          </View>
        </Aparecer>
      )}
      <Text style={st.mini}>Durante o Guia, você também pode dizer: "Lia, não olha esse app".</Text>
    </Cartao>
  );
}

const st = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, minHeight: 56, borderTopWidth: 1, borderTopColor: cores.borda, paddingTop: espaco.sm },
  nome: { fontSize: tamanho.pequeno, fontWeight: '600', color: cores.tinta },
  sub: { fontSize: tamanho.mini, color: cores.textoSuave, lineHeight: 21 },
  mini: { fontSize: 13, color: cores.textoSuave },
  acao: { paddingHorizontal: espaco.md, minHeight: 44, justifyContent: 'center', borderRadius: raio.md, backgroundColor: cores.primariaSuave },
  acaoTexto: { fontSize: tamanho.mini, fontWeight: '600', color: cores.primaria },
});
