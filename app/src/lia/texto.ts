// Utilidades de texto: comparar falas com nomes tolerando acento e erro de transcrição.

export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Distância de Levenshtein (programação dinâmica): menor número de edições de a até b.
export function levenshtein(a: string, b: string): number {
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    anterior = atual;
  }
  return anterior[b.length];
}

// 0 = igual; 1 = nada a ver.
export function distanciaRelativa(a: string, b: string): number {
  const x = normalizar(a);
  const y = normalizar(b);
  if (!x || !y) return 1;
  if (x === y) return 0;
  return levenshtein(x, y) / Math.max(x.length, y.length);
}
