# Robô de testes da Lia

Testa a Lia de ponta a ponta no celular, sem ninguém tocar na tela: manda um pedido para a Lia, segue o Guia
(toca onde o anel aponta, faz os gestos, escreve quando ela pede) e guarda prints, o registro do celular e um resumo.

Precisa: celular no cabo (`adb devices` mostrando `device`), a API ligada e o app rodando (`npm run android`).

```
py ferramentas\robo-lia\robo_lia.py
py ferramentas\robo-lia\robo_lia.py "quero ligar o bluetooth"
py ferramentas\robo-lia\robo_lia.py "procurar a Avenida Paulista no GPS" --escrever "Avenida Paulista"
```

As saídas ficam em `testes-robo/<data>/<cenário>/` (fora do Git). O Guia escreve o que mostra no logcat com a
etiqueta `LIA_ROBO`; é isso que o robô segue.

Atenção: o robô toca de verdade. Os cenários padrão foram escolhidos para não mudar nada importante
(o Bluetooth pode ser ligado).
