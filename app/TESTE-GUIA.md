# Teste de 1 dia do Guia (backlog #4)

Pergunta do teste: a Lia consegue ler a tela de outro app, achar o botão certo e apontar para ele, com a pessoa tocando?
Se sim, o Guia entra na demo. Se não, a Lia fica com Entende + Age e o Guia vira visão futura.

## Como rodar
1. `npm install` e depois `npm run android`, com o celular no cabo USB e a depuração USB ligada.
2. No app, toque em **Ativar a Lia na acessibilidade** e ligue "Lia — Guia na tela".
3. Rode cada teste pronto. Siga o anel laranja e a voz. Quem toca é você.
4. Se um passo não for achado, o registro mostra o que a Lia viu na tela. Use o nome exato no **Teste livre**.
5. Toque em **Compartilhar registro** e salve o texto em `agile/` como evidência.

## O que anotar
| Teste | Achou todos os passos? | Anel no lugar certo? | Avançou sozinho após o toque? | Observação |
| --- | --- | --- | --- | --- |
| Ligar o Wi-Fi | | | | |
| Aumentar a letra | | | | |
| Ver a versão do Android | | | | |
| WhatsApp: conversa nova | | | | |

## Atenção
- Os nomes dos passos foram escritos para o One UI (Samsung) em português e podem mudar em outro celular.
- APK instalado por arquivo (fora do cabo) no Android 13 ou mais novo: o Android bloqueia a acessibilidade.
  Para liberar: Configurações → Apps → Lia → ⋮ → **Permitir configurações restritas**. Isso vale para o celular da banca.
- Aqui os passos estão escritos à mão e fazem o papel da IA. Depois, a IA recebe a lista da tela (`readScreen`) e decide qual é o próximo toque.
