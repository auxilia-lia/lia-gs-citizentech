# Evidências discursivas de uma iteração

**Iteração analisada:** Sprint 2 (10 a 15/11/2026). É a iteração em que o produto mais mudou, porque juntou a primeira entrevista com uma pessoa real e a primeira gravação da Lia sendo usada de verdade.

## Ponto de partida
A Sprint 1 (05 a 09/11) terminou com a prova principal feita: o Guia consegue mostrar onde tocar na tela de outros apps. O robô de testes passou em 14 de 14 cenários e a Lia já rodava pela nuvem, sem o notebook. A dúvida que ficou para a Sprint 2 era outra: **isso resolve o problema de quem depende da família?** Ainda não tínhamos ouvido ninguém do público.

**Objetivo da sprint:** ouvir uma pessoa real, deixar a Lia pronta para uso real e gravar a demo do vídeo.

## 1. A entrevista mudou o foco (13/11)
O Vinicius entrevistou a dona Rosária, 57 anos, diarista. O que ela contou:
- "Eu não consigo. Eu tenho que pedir pra alguém fazer."
- Quando a nora não está, espera: "tem vez que demora e tem vez que não".
- Quando recebe uma mensagem que parece golpe, manda para a nora conferir.
- O que mais pesa: "tem que esperar a boa vontade deles".

**O que discutimos e decidimos:**
- O centro da Lia passou a ser **ensinar**, e não fazer pela pessoa. Ela não pediu alguém que resolva por ela; ela quer parar de esperar.
- O **antigolpe** subiu de prioridade: é exatamente o que ela leva para a nora hoje.
- **Banco, governo, comunicação e golpe** viraram as quatro dores que a demo precisa mostrar.
- Uma segunda entrevista não cabia no prazo. A validação com 3 a 5 pessoas (item 18) foi adiada para o piloto, e isso ficou registrado.

## 2. Gravar a demo virou a revisão da sprint (14/11)
Usar a Lia de verdade, com câmera e gravação de tela, mostrou problemas que os testes automáticos não pegavam. Cada um virou uma decisão:

| O que apareceu na gravação | Decisão |
| --- | --- |
| No "me ensina", a Lia pegava atalhos (abria o app direto) | Ensinar sempre desde a tela inicial, passo a passo |
| A Lia passava de nível mesmo com erro | Autonomia só avança quando a pessoa faz sem errar |
| Alguns botões não diziam o que faziam | Todos os botões falam ao segurar (para quem não lê) |
| No antigolpe, a pessoa precisava fotografar a mensagem de outro celular, o que não faz sentido | "Lia, isso aqui é golpe?" analisa a tela atual, só quando a pessoa pede |
| A Lia via a tela do banco | A Lia não olha o app do banco; diz isso e sugere alguém de confiança |
| Por ligação, a Lia consultava o benefício sem pedir nenhum dado | A ligação passou a fazer recado para a família, com confirmação |
| A fala às vezes saía como código (JSON) | Corrigido na resposta em partes |

## 3. Decisões de produto e de comunicação
- **Banco:** mostrar que a Lia não olha o banco parecia contradizer o plano de levar a Lia aos bancos. Decidimos manter as duas coisas e explicar: sem parceria, ela não olha; o próximo passo é a integração oficial com governo, estados e bancos.
- **Dado do problema:** em vez de só o analfabetismo de Taiobeiras, o vídeo usa o analfabetismo funcional do Brasil (Inaf 2024), que representa melhor quem tem dificuldade com o celular.
- **Rede (Packet Tracer)** fica fora do vídeo, para não desviar do problema da Rosária.

## Resultado
- Commits de 14/11: `74841f4` (fala em JSON), `1abd159` (ensino do começo, autonomia sem erro, botões que falam, Portal do Cidadão, privacidade visível), `ad0eb14` (banco protegido), `735d140` (antigolpe em qualquer tela e recado pela ligação).
- Vídeo pitch de 4:38 com a entrevista, a demo e o plano de escala: https://youtu.be/Lb78aDGaQFA
- Itens que entraram no backlog durante a sprint: antigolpe em qualquer tela, banco protegido, recado pela ligação e site de golpe simulado.

**O que levamos para a Sprint 3:** validação com mais pessoas no piloto do CRAS, integração do núcleo em Java e revisão final das entregas.
