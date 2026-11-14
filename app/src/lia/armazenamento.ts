import AsyncStorage from '@react-native-async-storage/async-storage';

// Guarda dados só no celular (família e progresso). Nada disso vai para a IA.
export async function ler<T>(chave: string, padrao: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(chave);
    return v ? (JSON.parse(v) as T) : padrao;
  } catch {
    return padrao;
  }
}

export async function gravar<T>(chave: string, valor: T): Promise<void> {
  try {
    await AsyncStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // sem armazenamento, a Lia continua funcionando nesta sessão
  }
}

// Tudo o que a Lia guarda sobre o que a PESSOA já fez. (Família, servidor, nome no certificado, "comemorar com a
// família" e os apps protegidos são ajustes de quem configurou: ficam.)
const DA_PESSOA = [
  'lia:progresso', // nível de autonomia por serviço
  'lia:historico', // cada conclusão
  'lia:caminhos', // caminhos aprendidos ("Meus caminhos")
  'lia:palavras', // palavras do celular que ela já aprendeu
  'lia:nivel-demo', // nível de demonstração
  'lia:boas-vindas', // já viu a apresentação (volta a aparecer ao abrir o app)
];
const PREFIXOS_DA_PESSOA = ['lia:apresentou:']; // telas que já se apresentaram em voz

export async function apagarTudoDaPessoa(): Promise<void> {
  try {
    const todas = await AsyncStorage.getAllKeys();
    const apagar = todas.filter((k) => DA_PESSOA.includes(k) || PREFIXOS_DA_PESSOA.some((p) => k.startsWith(p)));
    await AsyncStorage.multiRemove(apagar);
  } catch {
    // sem armazenamento: nada para apagar
  }
}
