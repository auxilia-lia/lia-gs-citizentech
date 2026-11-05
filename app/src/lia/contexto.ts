import { Contexto } from './api';
import { niveis } from './autonomia';
import { carregarFamilia } from './familia';

// O que a IA pode saber: nível de autonomia por serviço e só o parentesco da família.
export async function montarContexto(): Promise<Contexto> {
  const [autonomia, familia] = await Promise.all([niveis(), carregarFamilia()]);
  return { autonomia, familia: familia.map((f) => f.parentesco).filter(Boolean) };
}
