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
