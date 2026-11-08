import { gravar, ler } from './armazenamento';
import { falar } from './fala';

// Para quem não lê: na primeira vez que uma tela abre, a Lia diz em voz alta onde a pessoa está e o que dá
// para fazer ali. Depois não repete (segurar qualquer botão continua dizendo o que ele faz).
export const APRESENTACOES = {
  inicio: 'Oi, eu sou a Lia. Para falar comigo, toque no círculo branco e fale. Se não souber o que um botão faz, segure ele que eu falo para você.',
  familia: 'Aqui fica a sua família. Toque no botão verde ao lado da pessoa para mandar uma mensagem.',
  eu: 'Aqui você vê o que já aprendeu. Verde quer dizer que você já faz sozinho.',
};

let falando = false;

export async function apresentar(tela: keyof typeof APRESENTACOES) {
  const chave = `lia:apresentou:${tela}`;
  if (falando || (await ler(chave, false))) return;
  falando = true;
  await gravar(chave, true);
  falar(APRESENTACOES[tela], { onDone: () => { falando = false; }, onError: () => { falando = false; } });
  setTimeout(() => { falando = false; }, 12000);
}
