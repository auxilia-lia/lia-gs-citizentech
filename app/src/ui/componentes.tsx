import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores, espaco, raio, sombra, tamanho, TOQUE_MIN } from './tema';
import { Toque } from './anim';

export type NomeIcone = keyof typeof Ionicons.glyphMap;

// Botão grande, com ícone e texto (nunca só ícone, para quem não reconhece símbolos).
export function Botao({
  texto, onPress, icone, tipo = 'primario', disabled, estilo,
}: {
  texto: string; onPress: () => void; icone?: NomeIcone;
  tipo?: 'primario' | 'secundario' | 'claro' | 'perigo' | 'sucesso'; disabled?: boolean; estilo?: ViewStyle;
}) {
  const fundo = { primario: cores.primaria, secundario: cores.primariaSuave, claro: cores.superficie, perigo: cores.perigo, sucesso: cores.sucesso }[tipo];
  const cor = tipo === 'secundario' || tipo === 'claro' ? cores.primaria : cores.branco;
  return (
    <Toque
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={texto}
      estilo={[
        s.botao, { backgroundColor: fundo, opacity: disabled ? 0.45 : 1 },
        tipo === 'claro' && { borderWidth: 2, borderColor: cores.primariaBorda }, estilo,
      ]}
    >
      {icone && <Ionicons name={icone} size={26} color={cor} />}
      <Text style={[s.botaoTexto, { color: cor }]}>{texto}</Text>
    </Toque>
  );
}

export function Cartao({ children, estilo, onPress }: { children: ReactNode; estilo?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (!onPress) return <View style={[s.cartao, estilo]}>{children}</View>;
  return (
    <Toque onPress={onPress} accessibilityRole="button" estilo={[s.cartao, estilo]}>
      {children}
    </Toque>
  );
}

export function IconeCirculo({ nome, cor = cores.primaria, fundo = cores.primariaSuave, tam = 56 }: {
  nome: NomeIcone; cor?: string; fundo?: string; tam?: number;
}) {
  return (
    <View style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: fundo, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={nome} size={tam * 0.5} color={cor} />
    </View>
  );
}

export function Titulo({ children, estilo }: { children: ReactNode; estilo?: object }) {
  return <Text style={[s.titulo, estilo]} accessibilityRole="header">{children}</Text>;
}

export function Secao({ children }: { children: ReactNode }) {
  return <Text style={s.secao} accessibilityRole="header">{children}</Text>;
}

export function Texto({ children, suave, estilo }: { children: ReactNode; suave?: boolean; estilo?: object }) {
  return <Text style={[s.texto, suave && { color: cores.textoSuave }, estilo]}>{children}</Text>;
}

// Campo com o nome em cima (sempre visível) e mensagem de erro embaixo.
export function Campo({ rotulo, erro, ajuda, ...props }: TextInputProps & { rotulo: string; erro?: string; ajuda?: string }) {
  return (
    <View style={{ marginBottom: espaco.md }}>
      <Text style={s.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor="#9AA3B8"
        accessibilityLabel={rotulo}
        style={[s.campo, erro ? { borderColor: cores.perigo } : null]}
        {...props}
      />
      {erro ? <Text style={s.erro}>{erro}</Text> : ajuda ? <Text style={s.ajuda}>{ajuda}</Text> : null}
    </View>
  );
}

// Aviso colorido (sucesso, atenção, perigo) com ícone.
export function Aviso({ tipo, titulo, texto, children }: {
  tipo: 'sucesso' | 'atencao' | 'perigo' | 'info'; titulo: string; texto?: string; children?: ReactNode;
}) {
  const c = {
    sucesso: [cores.sucessoSuave, cores.sucesso, 'checkmark-circle'],
    atencao: [cores.destaqueSuave, '#8A5A00', 'hand-left'],
    perigo: [cores.perigoSuave, cores.perigo, 'warning'],
    info: [cores.primariaSuave, cores.primaria, 'information-circle'],
  }[tipo] as [string, string, NomeIcone];
  return (
    <View style={[s.aviso, { backgroundColor: c[0], borderColor: c[1] }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
        <Ionicons name={c[2]} size={28} color={c[1]} />
        <Text style={[s.avisoTitulo, { color: c[1] }]}>{titulo}</Text>
      </View>
      {texto ? <Text style={s.avisoTexto}>{texto}</Text> : null}
      {children}
    </View>
  );
}

export const s = StyleSheet.create({
  botao: {
    minHeight: TOQUE_MIN + 8, borderRadius: raio.pilula, paddingHorizontal: espaco.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaco.sm,
  },
  botaoTexto: { fontSize: tamanho.corpo, fontWeight: '800' },
  cartao: { backgroundColor: cores.superficie, borderRadius: raio.md, padding: espaco.md + 2, ...sombra },
  titulo: { fontSize: tamanho.titulo, fontWeight: '800', color: cores.tinta, letterSpacing: -0.5 },
  secao: { fontSize: tamanho.subtitulo, fontWeight: '800', color: cores.tinta, marginTop: espaco.lg, marginBottom: espaco.md },
  texto: { fontSize: tamanho.corpo, color: cores.texto, lineHeight: 28 },
  rotulo: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.tinta, marginBottom: 6 },
  campo: {
    minHeight: TOQUE_MIN, borderWidth: 2, borderColor: cores.borda, borderRadius: raio.sm,
    paddingHorizontal: espaco.md, fontSize: tamanho.corpo, color: cores.texto, backgroundColor: cores.superficie,
  },
  erro: { color: cores.perigo, fontSize: tamanho.mini, fontWeight: '700', marginTop: 4 },
  ajuda: { color: cores.textoSuave, fontSize: tamanho.mini, marginTop: 4 },
  aviso: { borderRadius: raio.md, borderWidth: 2, padding: espaco.md, gap: espaco.sm },
  avisoTitulo: { fontSize: tamanho.corpo, fontWeight: '800', flex: 1 },
  avisoTexto: { fontSize: tamanho.pequeno, color: cores.texto, lineHeight: 24 },
});
