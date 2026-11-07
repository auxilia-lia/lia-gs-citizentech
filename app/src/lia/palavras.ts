import { gravar, ler } from './armazenamento';

// Palavras do celular: na primeira vez que aparecem numa instrução do Guia, a Lia explica em uma frase
// (o servidor manda qual explicou). Depois ela usa sem explicar. A aba "Você" mostra as que a pessoa já sabe.

export const PALAVRAS: Record<string, { nome: string; frase: string }> = {
  tocar: { nome: 'Tocar', frase: 'Encostar a ponta do dedo na tela e tirar logo.' },
  arrastar: { nome: 'Arrastar', frase: 'Encostar o dedo na tela e mover, sem tirar o dedo.' },
  painel: { nome: 'Painel rápido', frase: 'A parte que desce do alto da tela, com Wi-Fi, Bluetooth e lanterna.' },
  icone: { nome: 'Ícone', frase: 'O desenho pequeno que representa um app ou uma função.' },
  notificacao: { nome: 'Notificação', frase: 'Os avisos dos apps, que aparecem no alto da tela.' },
  campo: { nome: 'Campo', frase: 'O espaço da tela onde a gente escreve.' },
  teclado: { nome: 'Teclado', frase: 'Aparece embaixo quando você toca num campo para escrever.' },
  pesquisa: { nome: 'Lupa (pesquisa)', frase: 'Você escreve o que procura e o celular acha.' },
  aba: { nome: 'Aba', frase: 'Cada opção da faixa no alto ou embaixo; ela troca o que aparece.' },
  menu: { nome: 'Menu', frase: 'A lista de opções que abre nos três pontinhos.' },
  voltar: { nome: 'Voltar', frase: 'Leva para a tela anterior, como virar a página para trás.' },
  tela_inicial: { nome: 'Tela inicial', frase: 'Onde ficam os ícones dos seus apps.' },
};

const CHAVE = 'lia:palavras';

export const carregarPalavras = () => ler<string[]>(CHAVE, []);

export async function aprenderPalavra(id: string) {
  const atuais = await carregarPalavras();
  if (!atuais.includes(id)) await gravar(CHAVE, [...atuais, id]);
}
