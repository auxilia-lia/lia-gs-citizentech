import { useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { calar as calarTudo, falar as falarComVoz } from './fala';
import { registrar } from './registro';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

// Ouvir (reconhecimento de voz do Android, pt-BR) e falar (texto para voz).
// onOuvido recebe o que a pessoa falou ('' se não falou nada).
export function useVoz(onOuvido: (texto: string) => void) {
  const [ouvindo, setOuvindo] = useState(false);
  const [falando, setFalando] = useState(false);
  const [parcial, setParcial] = useState('');
  const [erro, setErro] = useState('');
  const final = useRef('');
  const ultimoParcial = useRef('');
  const callback = useRef(onOuvido);
  callback.current = onOuvido;

  useSpeechRecognitionEvent('result', (e) => {
    const t = e.results[0]?.transcript ?? '';
    ultimoParcial.current = t;
    setParcial(t);
    if (e.isFinal) final.current = t;
  });
  useSpeechRecognitionEvent('end', () => {
    setOuvindo(false);
    const t = (final.current || ultimoParcial.current).trim();
    registrar('app_ouviu', { texto: t });
    final.current = '';
    ultimoParcial.current = '';
    setParcial('');
    callback.current(t);
  });
  useSpeechRecognitionEvent('error', (e) => {
    registrar('app_erro_escuta', { erro: String(e.error) });
    const silencio = ['no-speech', 'aborted', 'speech-timeout'];
    if (!silencio.includes(String(e.error))) setErro(`Não consegui ouvir (${e.error}).`);
  });

  const ouvir = async () => {
    setErro('');
    calarTudo(); // a voz do Guia também: senão o microfone ouve a própria Lia
    registrar('app_microfone', { acao: 'abrir' });
    setFalando(false);
    const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!p.granted) {
      setErro('Preciso da permissão do microfone para te ouvir.');
      return;
    }
    setOuvindo(true);
    ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true, continuous: false });
  };

  const pararDeOuvir = () => ExpoSpeechRecognitionModule.stop();

  // fila: a resposta chega em partes; cada parte continua a anterior. O "depois" (abrir o Guia, por exemplo)
  // espera o fim previsto de TUDO o que está na fila, e acontece mesmo se a voz travar ou ficar muda.
  const fimPrevisto = useRef(0);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const falar = (texto: string, depois?: () => void, fila = false) => {
    setFalando(true);
    const duracao = Math.min(15000, 1500 + texto.length * 70);
    fimPrevisto.current = (fila ? Math.max(Date.now(), fimPrevisto.current) : Date.now()) + duracao;
    let feito = false;
    let meu: ReturnType<typeof setTimeout> | undefined;
    const seguir = () => { if (feito) return; feito = true; clearTimeout(meu); if (espera.current === meu) setFalando(false); depois?.(); };
    meu = setTimeout(seguir, Math.max(800, fimPrevisto.current - Date.now() + 1000));
    espera.current = meu;
    if (!fila) Speech.stop();
    falarComVoz(texto, {
      fila,
      onDone: seguir,
      onStopped: () => { if (!feito && !fila) { feito = true; clearTimeout(meu); setFalando(false); } },
      onError: seguir,
    });
  };

  const calar = () => { calarTudo(); setFalando(false); };

  return { ouvindo, falando, parcial, erro, setErro, ouvir, pararDeOuvir, falar, calar };
}
