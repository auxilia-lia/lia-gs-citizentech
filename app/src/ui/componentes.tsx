import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Text } from './fonte';
import { Ionicons } from '@expo/vector-icons';
import { cores, espaco, raio, tamanho, TOQUE_MIN } from './tema';
import { aoSegurar, Toque } from './anim';

export type NomeIcone = keyof typeof Ionicons.glyphMap;

// Pressable comum que fala ao ser segurado (fala > accessibilityHint > accessibilityLabel).
// Use no lugar do Pressable em tudo que a pessoa pode tocar.
export function Tocavel({ fala, ...props }: PressableProps & { fala?: string }) {
  return <Pressable {...props} onLongPress={aoSegurar({ ...props, fala })} />;
}

// Botão grande, com ícone e texto (nunca só ícone, para quem não reconhece símbolos). Segurar: a Lia lê o "fala"
// (ou o texto do botão).
export function Botao({
  texto, onPress, icone, tipo = 'primario', disabled, estilo, fala,
}: {
  texto: string; onPress: () => void; icone?: NomeIcone;
  tipo?: 'primario' | 'secundario' | 'claro' | 'perigo' | 'sucesso'; disabled?: boolean; estilo?: ViewStyle; fala?: string;
}) {
  const fundo = { primario: cores.primaria, secundario: cores.primariaSuave, claro: cores.superficie, perigo: cores.perigo, sucesso: cores.sucesso }[tipo];
  const cor = tipo === 'secundario' || tipo === 'claro' ? cores.primaria : cores.branco;
  return (
    <Toque
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={texto}
      fala={fala ?? texto}
      estilo={[
        s.botao, { backgroundColor: fundo, opacity: disabled ? 0.45 : 1 },
        tipo === 'claro' && { borderWidth: 1, borderColor: cores.primariaBorda }, estilo,
      ]}
    >
      {icone && <Ionicons name={icone} size={24} color={cor} />}
      <Text style={[s.botaoTexto, { color: cor }]}>{texto}</Text>
    </Toque>
  );
}

export function Cartao({ children, estilo, onPress, fala }: { children: ReactNode; estilo?: StyleProp<ViewStyle>; onPress?: () => void; fala?: string }) {
  if (!onPress) return <View style={[s.cartao, estilo]}>{children}</View>;
  return (
    <Toque onPress={onPress} accessibilityRole="button" fala={fala} estilo={[s.cartao, estilo]}>
      {children}
    </Toque>
  );
}

export function IconeCirculo({ nome, cor = cores.primaria, fundo = cores.primariaSuave, tam = 56 }: {
  nome: NomeIcone; cor?: string; fundo?: string; tam?: number;
}) {
  return (
    <View style={{ width: tam, height: tam, borderRadius: raio.sm + 2, backgroundColor: fundo, alignItems: 'center', justifyContent: 'center' }}>
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
    sucesso: [cores.sucessoSuave, cores.sucesso, 'checkmark-circle-outline'],
    atencao: [cores.destaqueSuave, cores.destaqueTexto, 'hand-left-outline'],
    perigo: [cores.perigoSuave, cores.perigo, 'warning-outline'],
    info: [cores.primariaSuave, cores.primaria, 'information-circle-outline'],
  }[tipo] as [string, string, NomeIcone];
  return (
    <View style={[s.aviso, { backgroundColor: c[0], borderColor: c[1] }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
        <Ionicons name={c[2]} size={24} color={c[1]} />
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
  botaoTexto: { fontSize: tamanho.pequeno + 1, fontWeight: '600' },
  cartao: { backgroundColor: cores.superficie, borderRadius: raio.md, padding: espaco.md + 2 },
  titulo: { fontSize: tamanho.titulo, fontWeight: '600', color: cores.tinta, textAlign: 'center' },
  secao: { fontSize: tamanho.corpo, fontWeight: '600', color: cores.tinta, marginTop: espaco.lg, marginBottom: espaco.sm },
  texto: { fontSize: tamanho.pequeno, color: cores.texto, lineHeight: 26 },
  rotulo: { fontSize: tamanho.pequeno, fontWeight: '500', color: cores.tinta, marginBottom: 6 },
  campo: {
    minHeight: TOQUE_MIN, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.sm, fontFamily: 'Poppins-Regular',
    paddingHorizontal: espaco.md, fontSize: tamanho.corpo, color: cores.texto, backgroundColor: cores.superficie,
  },
  erro: { color: cores.perigo, fontSize: tamanho.mini, fontWeight: '500', marginTop: 4 },
  ajuda: { color: cores.textoSuave, fontSize: tamanho.mini, marginTop: 4 },
  aviso: { borderRadius: raio.md, padding: espaco.md, gap: espaco.sm },
  avisoTitulo: { fontSize: tamanho.pequeno + 1, fontWeight: '600', flex: 1 },
  avisoTexto: { fontSize: tamanho.pequeno, color: cores.texto, lineHeight: 24 },
});
