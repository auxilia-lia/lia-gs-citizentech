import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useMargens } from './src/ui/margens';
import Inicio from './src/telas/Inicio';
import { pararGuiaIA } from './src/lia/guiaIA';
import { ligarModoRobo } from './src/lia/robo';
import { enderecoTemporario, voltarEndereco } from './src/lia/api';
import Conversa, { Pedido } from './src/telas/Conversa';
import Familia from './src/telas/Familia';
import Voce from './src/telas/Voce';
import Ligacao from './src/telas/Ligacao';
import TesteGuia from './src/telas/TesteGuia';
import BoasVindas from './src/telas/BoasVindas';
import BarraAbas, { Aba } from './src/ui/BarraAbas';
import Cabecalho from './src/ui/Cabecalho';
import { acordarServidor, carregarEnderecoSalvo } from './src/lia/api';
import { prepararVoz } from './src/lia/fala';
import { gravar, ler } from './src/lia/armazenamento';
import { cores } from './src/ui/tema';
import { Aparecer } from './src/ui/anim';

export type Demo = 'ligacao' | 'teste';

export default function App() {
  const [aba, setAba] = useState<Aba>('inicio');
  const [demo, setDemo] = useState<Demo | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [pronto, setPronto] = useState(false);
  const [primeiraVez, setPrimeiraVez] = useState(false);
  const margens = useMargens();

  useEffect(() => {
    Promise.all([carregarEnderecoSalvo().then((b) => { acordarServidor(); return b; }), ler('lia:boas-vindas', false), prepararVoz()]).then(([, viu]) => {
      setPrimeiraVez(!viu);
      setPronto(true);
    });
  }, []);

  // Um atalho do Início vira um pedido para a conversa.
  const pedir = (p: Omit<Pedido, 'id'>) => {
    setPedido({ ...p, id: Date.now() });
    setAba('conversa');
  };

  // lia://pedir?texto=... manda um pedido para a conversa (usado pelo robô de testes, ferramentas/robo-lia).
  useEffect(() => {
    const abrir = (url?: string | null) => {
      if (url === 'lia://parar') { pararGuiaIA(); return; } // robô: encerra o Guia entre um teste e outro
      if (url === 'lia://servidor/cabo') { enderecoTemporario('http://localhost:8000'); return; } // robô: API pelo cabo
      if (url === 'lia://servidor/voltar') { voltarEndereco(); return; }
      const m = url?.match(/^lia:\/\/pedir\?texto=([^&]+)(&robo=1)?$/);
      if (m?.[2]) ligarModoRobo();
      if (m) pedir({ tipo: 'texto', texto: decodeURIComponent(m[1].replace(/\+/g, ' ')) });
    };
    Linking.getInitialURL().then(abrir).catch(() => {});
    const s = Linking.addEventListener('url', (e) => abrir(e.url));
    return () => s.remove();
  }, []);

  if (!pronto) return <View style={{ flex: 1, backgroundColor: cores.primaria }} />;

  if (primeiraVez) {
    return (
      <>
        <StatusBar style="light" />
        <BoasVindas aoTerminar={(irPara) => {
          gravar('lia:boas-vindas', true);
          setPrimeiraVez(false);
          if (irPara) setAba(irPara);
        }} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <View style={[st.app, { paddingTop: margens.top }]}>
        {demo ? (
          <View style={{ flex: 1 }}>
            <Cabecalho titulo={demo === 'ligacao' ? 'Lia por ligação' : 'Teste do Guia'} voltar={() => setDemo(null)} />
            {demo === 'ligacao' ? <Ligacao /> : <TesteGuia />}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {aba === 'inicio' && <Aparecer key='inicio' distancia={10} estilo={{ flex: 1 }}><Inicio pedir={pedir} irPara={setAba} /></Aparecer>}
            {/* A conversa fica sempre montada para não perder o histórico ao trocar de aba. */}
            <View style={{ flex: 1, display: aba === 'conversa' ? 'flex' : 'none' }}>
              <Conversa ativa={aba === 'conversa' && !demo} pedido={pedido} />
            </View>
            {aba === 'familia' && <Aparecer key='familia' distancia={10} estilo={{ flex: 1 }}><Familia /></Aparecer>}
            {aba === 'voce' && <Aparecer key='voce' distancia={10} estilo={{ flex: 1 }}><Voce abrirDemo={setDemo} reverBoasVindas={() => setPrimeiraVez(true)} praticar={(c) => pedir({ tipo: 'praticar', caminho: c })} /></Aparecer>}
            <BarraAbas aba={aba} mudar={setAba} />
          </View>
        )}
      </View>
    </>
  );
}

const st = StyleSheet.create({
  app: { flex: 1, backgroundColor: cores.fundo },
});
