import { useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { falar as falarComVoz } from './fala';
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
    final.current = '';
    ultimoParcial.current = '';
    setParcial('');
    callback.current(t);
  });
  useSpeechRecognitionEvent('error', (e) => {
    const silencio = ['no-speech', 'aborted', 'speech-timeout'];
    if (!silencio.includes(String(e.error))) setErro(`Não consegui ouvir (${e.error}).`);
  });

  const ouvir = async () => {
    setErro('');
    Speech.stop();
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

  const falar = (texto: string, depois?: () => void) => {
    setFalando(true);
    // O que vem depois da fala (abrir o Guia, por exemplo) acontece MESMO se a voz travar ou ficar muda:
    // antes, sem o "terminou de falar", a Lia nem abria o Guia.
    let feito = false;
    const seguir = () => { if (feito) return; feito = true; clearTimeout(t); setFalando(false); depois?.(); };
    const t = setTimeout(seguir, Math.min(15000, 2500 + texto.length * 75));
    Speech.stop();
    falarComVoz(texto, {
      onDone: seguir,
      onStopped: () => { if (!feito) { feito = true; clearTimeout(t); setFalando(false); } },
      onError: seguir,
    });
  };

  const calar = () => { Speech.stop(); setFalando(false); };

  return { ouvindo, falando, parcial, erro, setErro, ouvir, pararDeOuvir, falar, calar };
}
