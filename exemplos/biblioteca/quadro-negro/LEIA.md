# quadro-negro — linha de giz na lousa

**O estilo.** Tudo é risco de giz numa lousa verde-escura com pó e marcas velhas de apagador: o
giz aparece riscando, com o bastão na ponta, e o traço treme de 3 em 3 quadros, como desenho à mão.
A câmera desliza por uma lousa comprida, o apagador limpa entre as partes, e a legenda é escrita em
letras de giz, com a palavra falada em amarelo.

**De onde saiu.** Do filme "Wombats Poo Cubes" (animação de linha de giz) da biblioteca de estilos
da fonte. Lá o filme é narrado; aqui não há voz: a fala virou legenda em português (traduzida pelo tradutor central e encurtada para caber em 15 s), com música de
cordas beliscadas e sons de giz, batidas e apagador feitos em código.

**Vertical:** 1080x1920, 30 quadros por segundo, 15 s.

## Arquivos

- `giz.js` — o "lápis": traço de giz, preenchimento riscado e as letras de giz (maiúsculas com
  acento, sem fonte instalada).
- `motor.js` — as peças (bicho, cubo, bola, tubo, anel, seta, texto, lua, estrelas, chão, linha),
  a câmera, o apagador, a legenda e o som.
- `historia.json` — o filme: cores, câmera, apagadores, a lista de peças com lugar e tempo, as
  legendas e a música.

## Como trocar a história

Tudo que muda fica em `historia.json`:

- `elementos`: cada peça tem `tipo`, lugar na lousa (`x`, `y`), `t` (quando começa a ser riscada)
  e `dur` (quanto tempo leva riscando). Cubo e bola com `queda` caem com peso, quicam e soltam pó.
  O bicho tem `movimentos`: `anda`, `agacha`, `vira`, `orgulho`, `pula`.
- `camera`: pontos `{t, x, y, z}`; a câmera desliza de um para o outro.
- `apagadores`: `{t, dur}`. Cada um apaga tudo o que foi riscado antes dele (menos peças com `"fica": true`).
- `legendas`: `{de, ate, texto}`, duas ou três palavras por vez. A palavra amarela anda sozinha.
- `musica`: notas da melodia, baixo, `passo` e os `sinos` do final.

Ver no navegador: abra a pasta com um servidor local na raiz do kit e entre em
`exemplos/biblioteca/quadro-negro/`. Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/quadro-negro --trabalhadores 3
```

## Medida

450 quadros em **40,76 s** de render (77,2 ms por quadro; 2,72 s de render por segundo de vídeo),
3 navegadores, sem placa de vídeo. Detalhes em `medida.json`.
