# Como instalar e testar a Lia

A Lia tem duas partes: o **app** (Android) e a **API** (Python), que conversa com a IA. O app precisa de uma API ligada para funcionar. Siga as partes na ordem.

## 1. Ligar a API

Precisa do Python 3.12 ou mais novo.

```
git clone https://github.com/auxilia-lia/lia-gs-citizentech.git
cd lia-gs-citizentech/api-lia
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --host 0.0.0.0 --port 8000
```

No Linux ou no Mac, use `cp` no lugar de `copy`.

- **Sem chave de IA:** deixe `LIA_PROVEDOR=teste` no `.env`. A Lia responde por regras, o que já basta para conhecer o app.
- **Com IA:** troque para `LIA_PROVEDOR=gemini` e coloque a sua chave em `GEMINI_API_KEY`. Dá para criar uma grátis em [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

Para conferir, abra `http://localhost:8000/saude` no navegador. Tem que aparecer `"ok": true`.

Se o Windows perguntar sobre o firewall para o Python, toque em **Permitir**, senão o celular não alcança a API.

> Quer a API na nuvem, sem o computador ligado? No [Render](https://render.com), crie um **Blueprint** apontando para este repositório (ele usa o `render.yaml`) e preencha `GEMINI_API_KEY` e `LIA_TOKEN` no painel.

## 2. Instalar o app no celular

Precisa de um celular **Android**. O Guia na tela usa o serviço de acessibilidade do Android, que não existe no iPhone.

### Opção A: APK pronto

1. Baixe o `Lia.apk` na página [Releases](https://github.com/auxilia-lia/lia-gs-citizentech/releases) deste repositório.
2. Abra o arquivo no celular e permita instalar apps desta fonte, se o Android pedir.
3. **Android 13 ou mais novo:** vá em **Configurações → Apps → Lia → ⋮ → Permitir configurações restritas**. Sem isso, o Android não deixa ligar a acessibilidade de um app instalado por arquivo.

### Opção B: compilar pelo código

Precisa do Node.js e do Android Studio, e do celular no cabo com a **Depuração USB** ligada. O passo a passo está em [`app/README.md`](app/README.md).

## 3. Conectar o app à sua API

1. Deixe o celular e o computador no **mesmo Wi-Fi**.
2. Descubra o IP do computador: no Windows, rode `ipconfig` e procure o **Endereço IPv4** (algo como `192.168.0.10`).
3. No app, abra a aba **Eu** e **segure por 3 segundos** para abrir os Ajustes.
4. Em **Ajustes avançados → Servidor da Lia**, digite `http://SEU-IP:8000` e salve.
5. Volte ao Início e fale com a Lia.

## 4. Ligar o Guia na tela

Na primeira vez, o app pede para ativar a Lia nos outros apps. Toque em **Ativar a Lia** e, na tela de acessibilidade do Android, ligue **Lia — Guia na tela**. Se pular essa etapa, dá para ativar depois nos Ajustes, em **Ativar o Guia**. É isso que deixa a Lia mostrar onde tocar nos outros apps.

## Núcleo em Java (opcional)

Sem ele, a Lia funciona normalmente. Com ele ligado no mesmo computador da API, as respostas trazem o risco e a confirmação decididos pelo núcleo. Veja [`core-java/README.md`](core-java/README.md).

## Privacidade

- O celular apaga CPF, telefone e senhas antes de mandar qualquer texto para a IA.
- Nos apps de banco, a Lia não olha a tela.
- Os serviços do governo dentro da Lia são **simulados**: nenhum dado vai para o gov.br de verdade.
- Quando terminar de testar, desligue a Lia na acessibilidade ou desinstale o app.
