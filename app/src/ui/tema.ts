// Identidade da Lia: visual chapado e calmo, para quem tem pouca prática com celular (e quem não lê).
// Azul claro como cor principal, laranja só para destacar, verde só para "mandar mensagem" e "conseguiu".
// Fonte Poppins, textos grandes, alto contraste, cantos levemente arredondados e nada de enfeite.

export const cores = {
  primaria: '#4F6BED',
  primariaEscura: '#3E57D6',
  tinta: '#1F2A44', // títulos
  primariaSuave: '#EDF1FE',
  primariaBorda: '#D5DDFB',
  fundo: '#F3F5FA',
  superficie: '#FFFFFF',
  texto: '#1F2A44',
  textoSuave: '#6B7590',
  borda: '#E6E9F2',
  destaque: '#F5A524', // laranja
  destaqueTexto: '#8A5B00',
  destaqueSuave: '#FFF5E3',
  sucesso: '#2E9E6A',
  sucessoSuave: '#E6F5EE',
  perigo: '#D64545',
  perigoSuave: '#FDECEC',
  branco: '#FFFFFF',
};

export const tamanho = {
  titulo: 26,
  subtitulo: 21,
  corpo: 19,
  pequeno: 17,
  mini: 15,
};

export const espaco = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30 };

// Cantos discretos: nada de pílula ou bolha.
export const raio = { sm: 10, md: 14, lg: 16, pilula: 12 };

// Área mínima de toque: 56 px (maior que o padrão de 48, para dedos menos precisos).
export const TOQUE_MIN = 56;

// Visual chapado: sem sombra.
export const sombra = {};

export const fontes = {
  regular: 'Poppins-Regular',
  media: 'Poppins-Medium',
  forte: 'Poppins-SemiBold',
};
