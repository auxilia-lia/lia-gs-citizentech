// Identidade da Lia: azul royal profundo como cor principal, fundo claro e calmo,
// âmbar para destacar (o mesmo do anel do Guia), textos grandes e alto contraste.
// Pensado para quem tem pouca prática com celular: tudo grande, uma coisa por vez.

export const cores = {
  primaria: '#1B3A9E', // azul royal profundo
  primariaEscura: '#0F2466',
  tinta: '#0B1533', // títulos
  primariaSuave: '#E8EEFD',
  primariaBorda: '#C9D6F8',
  fundo: '#F4F6FB',
  superficie: '#FFFFFF',
  texto: '#16203A',
  textoSuave: '#5A6480',
  borda: '#E2E7F2',
  destaque: '#F5B544', // âmbar
  destaqueSuave: '#FFF4DE',
  sucesso: '#16855A',
  sucessoSuave: '#E5F5EC',
  perigo: '#C2362B',
  perigoSuave: '#FDECEA',
  branco: '#FFFFFF',
};

export const tamanho = {
  titulo: 32,
  subtitulo: 24,
  corpo: 20,
  pequeno: 17,
  mini: 15,
};

export const espaco = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 };

export const raio = { sm: 14, md: 20, lg: 28, pilula: 999 };

// Área mínima de toque: 56 px (maior que o padrão de 48, para dedos menos precisos).
export const TOQUE_MIN = 56;

export const sombra = {
  shadowColor: '#0B1533',
  shadowOpacity: 0.1,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};
