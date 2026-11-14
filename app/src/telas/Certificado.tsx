import { useEffect, useState } from 'react';
import { Modal, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Text } from '../ui/fonte';
import { Ionicons } from '@expo/vector-icons';
import { gravar, ler } from '../lia/armazenamento';
import { Botao, Campo } from '../ui/componentes';
import { cores, espaco, raio, tamanho } from '../ui/tema';

// Certificado de autonomia: quando a pessoa passa a fazer algo sozinha, ganha um certificado simples
// com o nome dela, para mostrar para a família ou imprimir (tirando um print da tela).
export default function Certificado({ tema, aberto, fechar }: { tema: string | null; aberto: boolean; fechar: () => void }) {
  const [nome, setNome] = useState('');
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    ler('lia:nome', '').then((n) => { setNome(n); setEditando(!n); });
  }, [aberto]);

  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const salvar = async () => { await gravar('lia:nome', nome.trim()); setEditando(false); };
  const texto = `Certificado de autonomia digital: ${nome || 'eu'} aprendeu a ${tema?.toLowerCase()} sozinho(a) no celular, com a Lia. ${hoje}.`;

  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={fechar}>
      <ScrollView contentContainerStyle={st.tela}>
        {editando ? (
          <View style={{ gap: espaco.md }}>
            <Text style={st.pergunta}>Qual nome vai no certificado?</Text>
            <Campo rotulo="Seu nome" value={nome} onChangeText={setNome} autoFocus />
            <Botao texto="Pronto" icone="checkmark" onPress={salvar} fala="Pronto: guardar o nome que vai no certificado." />
          </View>
        ) : (
          <View style={st.papel}>
            <View style={st.selo}><Ionicons name="ribbon" size={52} color="#8A5A00" /></View>
            <Text style={st.sobre}>CERTIFICADO DE AUTONOMIA DIGITAL</Text>
            <Text style={st.concedido}>Este certificado é de</Text>
            <Text style={st.nome}>{nome}</Text>
            <Text style={st.motivo}>que aprendeu a</Text>
            <Text style={st.tema}>{tema}</Text>
            <Text style={st.motivo}>sozinho(a), no próprio celular.</Text>
            <View style={st.linha} />
            <Text style={st.data}>{hoje}</Text>
            <Text style={st.lia}>Lia · assistente de autonomia digital</Text>
          </View>
        )}
        {!editando && (
          <View style={{ gap: espaco.sm, marginTop: espaco.lg }}>
            <Botao texto="Mandar para a família" icone="share-social" onPress={() => Share.share({ message: texto })} fala="Mandar o certificado para alguém da família." />
            <Text style={st.dica}>Para imprimir, tire um print desta tela.</Text>
            <Botao texto="Trocar o nome" icone="create" tipo="claro" onPress={() => setEditando(true)} fala="Trocar o nome que aparece no certificado." />
          </View>
        )}
        <Botao texto="Fechar" icone="close" tipo="claro" onPress={fechar} fala="Fechar o certificado." />
      </ScrollView>
    </Modal>
  );
}

const st = StyleSheet.create({
  tela: { padding: espaco.lg, paddingTop: espaco.xl, gap: espaco.md, backgroundColor: cores.fundo, flexGrow: 1 },
  pergunta: { fontSize: tamanho.subtitulo, fontWeight: '600', color: cores.tinta },
  papel: { backgroundColor: '#FFFDF6', borderRadius: raio.lg, borderWidth: 4, borderColor: cores.destaque, padding: espaco.lg, alignItems: 'center', gap: 6 },
  selo: { width: 96, height: 96, borderRadius: 48, backgroundColor: cores.destaqueSuave, alignItems: 'center', justifyContent: 'center', marginBottom: espaco.sm },
  sobre: { fontSize: 14, fontWeight: '600', color: cores.primaria, letterSpacing: 1, textAlign: 'center' },
  concedido: { fontSize: tamanho.mini, color: cores.textoSuave, marginTop: espaco.md },
  nome: { fontSize: 30, fontWeight: '600', color: cores.tinta, textAlign: 'center' },
  motivo: { fontSize: tamanho.mini, color: cores.textoSuave },
  tema: { fontSize: tamanho.subtitulo, fontWeight: '600', color: cores.primaria, textAlign: 'center' },
  linha: { height: 2, alignSelf: 'stretch', backgroundColor: cores.destaque, marginVertical: espaco.md },
  data: { fontSize: tamanho.pequeno, fontWeight: '500', color: cores.texto },
  lia: { fontSize: 13, color: cores.textoSuave },
  dica: { fontSize: 13, color: cores.textoSuave, textAlign: 'center' },
});
