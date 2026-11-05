// Pseudonimização (backlog #9, RNF01): antes de qualquer texto sair do celular para a IA,
// CPF, telefone, e-mail, cartão e CEP viram etiquetas como [CPF_1]. O mapa fica só no
// celular, e a resposta da IA volta com os dados reais no lugar das etiquetas.

export type Mapa = { porValor: Record<string, string>; porEtiqueta: Record<string, string> };

export const novoMapa = (): Mapa => ({ porValor: {}, porEtiqueta: {} });

const soDigitos = (s: string) => s.replace(/\D/g, '');

function cpfValido(d: string): boolean {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

function luhn(d: string): boolean {
  let soma = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    soma += n;
  }
  return soma % 10 === 0;
}

type Regra = { tipo: string; re: RegExp; aceita?: (valor: string) => boolean };

// A ordem importa: o mais específico primeiro.
const REGRAS: Regra[] = [
  { tipo: 'EMAIL', re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  { tipo: 'CPF', re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g },
  { tipo: 'CPF', re: /\b\d{11}\b/g, aceita: (v) => cpfValido(soDigitos(v)) },
  { tipo: 'CARTAO', re: /\b(?:\d[ -]?){12,18}\d\b/g, aceita: (v) => luhn(soDigitos(v)) },
  { tipo: 'CEP', re: /\b\d{5}-\d{3}\b/g },
  { tipo: 'TELEFONE', re: /(?:\+?55[\s-]?)?(?:\(?\d{2}\)?[\s-]?)?9?\d{4}[\s-]?\d{4}\b/g },
];

export function pseudonimizar(texto: string, mapa: Mapa): string {
  let saida = texto;
  for (const { tipo, re, aceita } of REGRAS) {
    saida = saida.replace(re, (valor) => {
      if (valor.startsWith('[')) return valor;
      if (aceita && !aceita(valor)) return valor;
      const chave = `${tipo}:${soDigitos(valor) || valor.toLowerCase()}`;
      let etiqueta = mapa.porValor[chave];
      if (!etiqueta) {
        const n = Object.keys(mapa.porEtiqueta).filter((e) => e.startsWith(`[${tipo}_`)).length + 1;
        etiqueta = `[${tipo}_${n}]`;
        mapa.porValor[chave] = etiqueta;
        mapa.porEtiqueta[etiqueta] = valor.trim();
      }
      return etiqueta;
    });
  }
  return saida;
}

export function restaurar(texto: string, mapa: Mapa): string {
  return texto.replace(/\[[A-Z]+_\d+\]/g, (e) => mapa.porEtiqueta[e] ?? e);
}

export const quantosEscondidos = (mapa: Mapa) => Object.keys(mapa.porEtiqueta).length;
