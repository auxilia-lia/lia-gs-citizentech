import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useMargens } from './src/ui/margens';
import Inicio from './src/telas/Inicio';
import Conversa, { Pedido } from './src/telas/Conversa';
import Familia from './src/telas/Familia';
import Voce from './src/telas/Voce';
import Ligacao from './src/telas/Ligacao';
import TesteGuia from './src/telas/TesteGuia';
import BoasVindas from './src/telas/BoasVindas';
import BarraAbas, { Aba } from './src/ui/BarraAbas';
import Cabecalho from './src/ui/Cabecalho';
import { carregarEnderecoSalvo } from './src/lia/api';
import { gravar, ler } from './src/lia/armazenamento';
import { cores } from './src/ui/tema';

export type Demo = 'ligacao' | 'teste';

export default function App() {
  const [aba, setAba] = useState<Aba>('inicio');
  const [demo, setDemo] = useState<Demo | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [pronto, setPronto] = useState(false);
  const [primeiraVez, setPrimeiraVez] = useState(false);
  const margens = useMargens();

  useEffect(() => {
    Promise.all([carregarEnderecoSalvo(), ler('lia:boas-vindas', false)]).then(([, viu]) => {
      setPrimeiraVez(!viu);
      setPronto(true);
    });
  }, []);

  // Um atalho do Início vira um pedido para a conversa.
  const pedir = (p: Omit<Pedido, 'id'>) => {
    setPedido({ ...p, id: Date.now() });
    setAba('conversa');
  };

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
            {aba === 'inicio' && <Inicio pedir={pedir} irPara={setAba} />}
            {/* A conversa fica sempre montada para não perder o histórico ao trocar de aba. */}
            <View style={{ flex: 1, display: aba === 'conversa' ? 'flex' : 'none' }}>
              <Conversa ativa={aba === 'conversa' && !demo} pedido={pedido} />
            </View>
            {aba === 'familia' && <Familia />}
            {aba === 'voce' && <Voce abrirDemo={setDemo} reverBoasVindas={() => setPrimeiraVez(true)} />}
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
