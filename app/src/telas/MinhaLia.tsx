import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { API } from '../lia/api';
import { carregarProgresso, nivelDe, NOMES_NIVEL, Progresso, zerarProgresso } from '../lia/autonomia';
import { carregarFamilia, Familiar, salvarFamilia } from '../lia/familia';

const SERVICOS: Record<string, string> = {
  consulta: 'Marcar consulta',
  beneficio: 'Ver o dinheiro do INSS',
  multas: 'Consultar multas',
};

// Família (para o Age) e o progresso de autonomia. Tudo fica só no celular.
export default function MinhaLia() {
  const [familia, setFamilia] = useState<Familiar[]>([]);
  const [progresso, setProgresso] = useState<Progresso>({});
  const [novo, setNovo] = useState({ nome: '', parentesco: '', telefone: '' });
  const [servidor, setServidor] = useState('verificando…');

  const recarregar = useCallback(async () => {
    setFamilia(await carregarFamilia());
    setProgresso(await carregarProgresso());
  }, []);

  useEffect(() => {
    recarregar();
    fetch(`${API}/saude`)
      .then((r) => r.json())
      .then((j: { provedor: string }) => setServidor(`ligado (IA: ${j.provedor})`))
      .catch(() => setServidor('desligado'));
  }, [recarregar]);

  const adicionar = async () => {
    if (!novo.nome.trim() || !novo.parentesco.trim()) return;
    const lista = [...familia, { id: String(Date.now()), nome: novo.nome.trim(), parentesco: novo.parentesco.trim().toLowerCase(), telefone: novo.telefone.trim() }];
    await salvarFamilia(lista);
    setFamilia(lista);
    setNovo({ nome: '', parentesco: '', telefone: '' });
  };

  const remover = async (id: string) => {
    const lista = familia.filter((f) => f.id !== id);
    await salvarFamilia(lista);
    setFamilia(lista);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.secao}>O que você já sabe fazer</Text>
      {Object.entries(SERVICOS).map(([s, nome]) => {
        const vezes = progresso[s] ?? 0;
        const nivel = nivelDe(vezes);
        return (
          <View key={s} style={styles.cartao}>
            <Text style={styles.cartaoTitulo}>{nome}</Text>
            <View style={styles.barra}>
              {[0, 1, 2].map((n) => (
                <View key={n} style={[styles.degrau, n <= nivel && styles.degrauAtivo]} />
              ))}
            </View>
            <Text style={styles.cartaoTexto}>
              {NOMES_NIVEL[nivel]} · feito {vezes} {vezes === 1 ? 'vez' : 'vezes'}
            </Text>
          </View>
        );
      })}
      <Pressable onPress={async () => { await zerarProgresso(); recarregar(); }}>
        <Text style={styles.link}>Zerar progresso (para a demo)</Text>
      </Pressable>

      <Text style={styles.secao}>Família</Text>
      <Text style={styles.ajuda}>A Lia avisa essas pessoas no WhatsApp quando você pedir. O telefone não vai para a IA.</Text>
      {familia.map((f) => (
        <View key={f.id} style={styles.cartao}>
          <Text style={styles.cartaoTitulo}>{f.nome} · {f.parentesco}</Text>
          <Text style={styles.cartaoTexto}>{f.telefone || 'sem telefone'}</Text>
          <Pressable onPress={() => remover(f.id)}><Text style={styles.link}>Remover</Text></Pressable>
        </View>
      ))}
      <TextInput style={styles.input} placeholder="Nome (ex.: Ana)" value={novo.nome} onChangeText={(nome) => setNovo({ ...novo, nome })} />
      <TextInput style={styles.input} placeholder="Parentesco (ex.: filha)" value={novo.parentesco} onChangeText={(parentesco) => setNovo({ ...novo, parentesco })} />
      <TextInput style={styles.input} placeholder="WhatsApp com DDD (ex.: 11 91234-5678)" keyboardType="phone-pad" value={novo.telefone} onChangeText={(telefone) => setNovo({ ...novo, telefone })} />
      <Pressable style={styles.botao} onPress={adicionar}><Text style={styles.botaoTexto}>Adicionar familiar</Text></Pressable>

      <Text style={styles.secao}>Servidor da Lia</Text>
      <Text style={styles.ajuda}>{API} · {servidor}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  secao: { fontSize: 22, fontWeight: '800', marginTop: 20, marginBottom: 8 },
  ajuda: { fontSize: 16, color: '#555', marginBottom: 8 },
  cartao: { backgroundColor: '#FFF1E6', borderRadius: 16, padding: 14, marginBottom: 10 },
  cartaoTitulo: { fontSize: 19, fontWeight: '700' },
  cartaoTexto: { fontSize: 16, color: '#444', marginTop: 4 },
  barra: { flexDirection: 'row', gap: 6, marginTop: 10 },
  degrau: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#E0E0E0' },
  degrauAtivo: { backgroundColor: '#FF6D00' },
  link: { color: '#FF6D00', fontSize: 16, fontWeight: '600', marginTop: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 14, fontSize: 18, marginTop: 8 },
  botao: { backgroundColor: '#FF6D00', borderRadius: 16, paddingVertical: 16, marginTop: 12 },
  botaoTexto: { color: '#fff', fontSize: 19, fontWeight: '700', textAlign: 'center' },
});
