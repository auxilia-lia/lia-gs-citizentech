import LiaGuia from '../../modules/lia-guia';

// Registro de uso real: cada evento vai para o logcat (LIA_ROBO), junto com os do Guia.
// O .bat ferramentas/uso-real/salvar-registro.bat junta tudo num arquivo para analisar os bugs.
// Nunca registra telefone, CPF ou senha: os textos já passam pela mesma limpeza da IA quando vão para a API.
export function registrar(evento: string, dados: Record<string, unknown> = {}) {
  try { LiaGuia.log(evento, JSON.stringify(dados)); } catch { /* sem módulo: ignora */ }
}
