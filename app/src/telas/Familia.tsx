import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../ui/fonte';
import { Ionicons } from '@expo/vector-icons';
import { abrirWhatsApp, carregarFamilia, Familiar, salvarFamilia } from '../lia/familia';
import { Aviso, Botao, Campo, Cartao, Texto, Titulo } from '../ui/componentes';
import { cores, espaco, raio, tamanho } from '../ui/tema';
import { Aparecer } from '../ui/anim';

const PARENTESCOS = ['filha', 'filho', 'neta', 'neto', 'esposa', 'marido', 'irmã', 'irmão', 'vizinha', 'vizinho'];

const soDigitos = (t: string) => t.replace(/\D/g, '');

// (11) 91234-5678
export function formatarTelefone(t: string) {
  const d = soDigitos(t).replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type Erros = { nome?: string; parentesco?: string; telefone?: string };

export function validar(nome: string, parentesco: string, telefone: string): Erros {
  const e: Erros = {};
  if (!nome.trim()) e.nome = 'Escreva o nome da pessoa.';
  else if (/\d/.test(nome)) e.nome = 'O nome não pode ter números. O número vai no campo do WhatsApp.';
  if (!parentesco.trim()) e.parentesco = 'Escolha ou escreva quem é essa pessoa para você.';
  const d = soDigitos(telefone);
  if (!d) e.telefone = 'Coloque o número do WhatsApp, com DDD.';
  else if (d.length < 10 || d.length > 13) e.telefone = 'Esse número parece incompleto. Use o DDD + o número, ex.: (11) 91234-5678.';
  return e;
}

// Cadastro dos contatos: fica nos Ajustes, feito por quem ajuda a configurar a Lia.
export function FamiliaEditar() {
  const [familia, setFamilia] = useState<Familiar[]>([]);
  const [adicionando, setAdicionando] = useState(false);
  const [nome, setNome] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [salvo, setSalvo] = useState('');

  useEffect(() => { carregarFamilia().then(setFamilia); }, []);

  const adicionar = async () => {
    const e = validar(nome, parentesco, telefone);
    setErros(e);
    if (Object.keys(e).length) return;
    const novo = { id: String(Date.now()), nome: nome.trim(), parentesco: parentesco.trim().toLowerCase(), telefone: soDigitos(telefone) };
    const lista = [...familia, novo];
    await salvarFamilia(lista);
    setFamilia(lista);
    setNome(''); setParentesco(''); setTelefone(''); setErros({});
    setAdicionando(false);
    setSalvo(`Salvei ${novo.nome} na sua família. Agora é só me pedir: "avisa ${novo.nome} que…"`);
  };

  const remover = (f: Familiar) => {
    Alert.alert('Remover da família?', `${f.nome} não vai mais receber avisos da Lia.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        const lista = familia.filter((x) => x.id !== f.id);
        await salvarFamilia(lista);
        setFamilia(lista);
      } },
    ]);
  };

  return (
    <View>
      <Texto suave estilo={{ marginBottom: espaco.md }}>
        A Lia avisa essas pessoas pelo WhatsApp quando pedirem. O número fica só neste celular.
      </Texto>

      {salvo ? <View style={{ marginBottom: espaco.md }}><Aviso tipo="sucesso" titulo="Pronto!" texto={salvo} /></View> : null}

      {familia.length === 0 && !adicionando && (
        <Cartao estilo={st.vazio}>
          <Ionicons name="people-outline" size={48} color={cores.primariaBorda} />
          <Text style={st.vazioTexto}>Ninguém por aqui ainda.</Text>
          <Texto suave estilo={{ textAlign: 'center' }}>Adicione quem costuma te ajudar: um filho, uma neta, um vizinho.</Texto>
        </Cartao>
      )}

      {familia.map((f, i) => (
        <Aparecer key={f.id} atraso={i * 70}>
        <Cartao estilo={st.pessoa}>
          <View style={st.linha}>
            <View style={st.inicial}><Text style={st.inicialTexto}>{f.nome[0]?.toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={st.nome}>{f.nome}</Text>
              <Text style={st.sub}>{f.parentesco} · {formatarTelefone(f.telefone) || 'sem número'}</Text>
            </View>
            <Pressable onPress={() => remover(f)} accessibilityLabel={`Remover ${f.nome}`} style={st.lixo}>
              <Ionicons name="trash-outline" size={24} color={cores.perigo} />
            </Pressable>
          </View>
          {f.telefone ? (
            <Botao texto="Mandar mensagem" icone="chatbox-outline" tipo="secundario" onPress={() => abrirWhatsApp(f.telefone, '')} estilo={{ marginTop: espaco.md }} />
          ) : null}
        </Cartao>
        </Aparecer>
      ))}

      {adicionando ? (
        <Aparecer><Cartao estilo={{ marginTop: espaco.md }}>
          <Text style={st.formTitulo}>Adicionar alguém</Text>
          <Campo rotulo="Nome" placeholder="Ex.: Ana" value={nome} onChangeText={setNome} erro={erros.nome} autoCapitalize="words" />
          <Text style={st.rotulo}>Quem é para você?</Text>
          <View style={st.chips}>
            {PARENTESCOS.map((p) => (
              <Pressable key={p} onPress={() => setParentesco(p)} style={[st.chip, parentesco === p && st.chipAtivo]} accessibilityRole="button" accessibilityState={{ selected: parentesco === p }}>
                <Text style={[st.chipTexto, parentesco === p && { color: cores.branco }]}>{p}</Text>
              </Pressable>
            ))}
          </View>
          <Campo rotulo="Ou escreva" placeholder="Ex.: cuidadora" value={PARENTESCOS.includes(parentesco) ? '' : parentesco} onChangeText={setParentesco} erro={erros.parentesco} />
          <Campo
            rotulo="WhatsApp (com DDD)" placeholder="(11) 91234-5678" keyboardType="phone-pad"
            value={formatarTelefone(telefone)} onChangeText={setTelefone} erro={erros.telefone}
          />
          <Botao texto="Salvar" icone="checkmark" onPress={adicionar} />
          <Botao texto="Cancelar" tipo="claro" onPress={() => { setAdicionando(false); setErros({}); }} estilo={{ marginTop: espaco.sm }} />
        </Cartao></Aparecer>
      ) : (
        <Botao texto="Adicionar alguém" icone="person-add-outline" onPress={() => { setSalvo(''); setAdicionando(true); }} estilo={{ marginTop: espaco.sm }} />
      )}
    </View>
  );
}

// O que quem usa a Lia vê: só as pessoas e um botão verde para mandar mensagem.
export default function Familia() {
  const [familia, setFamilia] = useState<Familiar[]>([]);
  useEffect(() => { carregarFamilia().then(setFamilia); }, []);
  return (
    <ScrollView contentContainerStyle={st.telaSimples} showsVerticalScrollIndicator={false}>
      <Titulo>Sua família</Titulo>
      <Text style={st.guia}>{familia.length ? 'Toque no verde para mandar mensagem' : 'Ainda não tem ninguém aqui'}</Text>
      {familia.length === 0 && (
        <Text style={st.vazioSimples}>Peça para alguém da família abrir os Ajustes, na aba Eu, e colocar os contatos.</Text>
      )}
      {familia.map((f, i) => (
        <Aparecer key={f.id} atraso={i * 60}>
          <View style={st.linhaSimples}>
            <View style={st.inicial}><Text style={st.inicialTexto}>{f.nome[0]?.toUpperCase()}</Text></View>
            <Text style={st.nomeSimples} numberOfLines={2}>{f.nome}, {f.parentesco}</Text>
            {f.telefone ? (
              <Pressable onPress={() => abrirWhatsApp(f.telefone, '')} style={({ pressed }) => [st.msg, pressed && { opacity: 0.8 }]}
                accessibilityRole="button" accessibilityLabel={`Mandar mensagem para ${f.nome}`}>
                <Ionicons name="chatbox-outline" size={26} color={cores.branco} />
              </Pressable>
            ) : null}
          </View>
        </Aparecer>
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  telaSimples: { paddingHorizontal: espaco.lg, paddingTop: espaco.xl, paddingBottom: espaco.xl },
  guia: { fontSize: tamanho.pequeno, color: cores.textoSuave, textAlign: 'center', marginTop: espaco.xs, marginBottom: espaco.lg },
  vazioSimples: { fontSize: tamanho.pequeno, color: cores.texto, textAlign: 'center', lineHeight: 26, backgroundColor: cores.superficie, borderRadius: raio.md, padding: espaco.lg },
  linhaSimples: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, backgroundColor: cores.superficie, borderRadius: raio.md, padding: espaco.md, marginBottom: espaco.sm + 2 },
  nomeSimples: { flex: 1, fontSize: tamanho.corpo, fontWeight: '600', color: cores.tinta },
  msg: { width: 58, height: 54, borderRadius: raio.sm, backgroundColor: cores.sucesso, alignItems: 'center', justifyContent: 'center' },
  vazio: { alignItems: 'center', gap: espaco.sm, paddingVertical: espaco.xl },
  vazioTexto: { fontSize: tamanho.corpo, fontWeight: '600', color: cores.tinta },
  pessoa: { marginBottom: espaco.md },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  inicial: { width: 54, height: 54, borderRadius: raio.md, backgroundColor: cores.primariaSuave, alignItems: 'center', justifyContent: 'center' },
  inicialTexto: { fontSize: 22, fontWeight: '600', color: cores.primaria },
  nome: { fontSize: tamanho.corpo, fontWeight: '600', color: cores.tinta },
  sub: { fontSize: tamanho.mini, color: cores.textoSuave, marginTop: 2 },
  lixo: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  formTitulo: { fontSize: tamanho.subtitulo, fontWeight: '600', color: cores.tinta, marginBottom: espaco.md },
  rotulo: { fontSize: tamanho.pequeno, fontWeight: '500', color: cores.tinta, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: espaco.md },
  chip: { borderRadius: raio.sm, borderWidth: 1, borderColor: cores.primariaBorda, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  chipAtivo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  chipTexto: { fontSize: tamanho.pequeno, fontWeight: '500', color: cores.primaria },
});
