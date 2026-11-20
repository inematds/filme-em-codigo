# caixa-sombra — recorte de papel em caixa de sombra

**O estilo.** Folhas de papel de cor chapada (marinho, verde-água, coral e creme, com o amarelo
como único destaque), empilhadas em profundidade. Cada folha joga uma sombra macia na de trás, tem
grão de papel e borda cortada à mão. A luz vem de trás: um astro em anéis lá em cima e lanternas de
papel que brilham. O boneco é um polvo de papel inventado aqui, com braços de tiras com juntas que
enrolam e desenrolam. Ele muda de pose de 2 em 2 quadros, como em stop-motion.

**De onde saiu.** Do filme "An Octopus Has Three Hearts" (recorte de papel em caixa de sombra), da
biblioteca de estilos da fonte. Lá o filme é narrado. Aqui não há voz: a fala virou legenda em
português, traduzida pelo tradutor central e encurtada para caber em 15 s. As letras são de papel
creme, com sombra, duas ou três palavras por vez, e a palavra da vez fica em amarelo. A música
(acordes macios e uma caixinha de música) e os sons também são feitos em código:
- bolhas;
- batidas de coração, nas mesmas marcas que fazem as lanternas pulsar;
- o "zum" de entrar pela janela;
- papel passando;
- o "plop" da gota e os discos chegando;
- o X no ferro;
- a água do nado;
- o coração que para;
- o suspiro;
- o rastejar;
- o coração acendendo de novo.

**Vertical:** 1080x1920, 30 quadros por segundo, 15 s.

## Arquivos

- `papel.js`: o material. Grão do papel, recorte à mão, formas (elipse, coração, gota) e a
  pintura de uma peça (sombra na folha de trás, cor, grão e um fio de luz na borda de cima).
- `polvo.js`: o boneco. Cabeça com janela recortada, três corações-lanterna atrás da janela,
  olhos com pálpebra e oito braços com 14 juntas cada.
- `motor.js`: as três cenas (`mar`, `arco`, `gota`), a câmera com parallax, as duas trocas de
  plano, a legenda e o som.
- `letras.js`: as letras desenhadas em traços (cópia do `giz.js` do quadro-negro), para a
  legenda não depender de fonte instalada.
- `historia.json`: o filme.

## Como trocar a história

Tudo o que muda fica em `historia.json`:

- **`paleta`:** as cores. `gota` são as quatro camadas da gota, da maior para a menor.
- **`planos`:** cada plano tem começo, fim e cena. A câmera é uma lista de pontos
  `{t, x, y, z}`, ou `{ "segue": "polvo", ... }` para ir atrás do boneco. A troca de plano é
  `"sai": {"tipo": "janela", "de": s}` (a câmera entra pela janela da cabeça e a cena seguinte
  aparece lá dentro) ou `"entra": {"tipo": "cortina", "dur": s}` (uma folha rasgada sobe e traz
  a cena nova).
- **`cenas.mar.pecas`:** a lista de peças, com lugar e profundidade (`prof`: 1 anda junto com o
  boneco, menos que 1 é fundo, mais que 1 é frente). Os tipos são `astro`, `raios`, `morro`,
  `alga`, `peixe` (com `de`/`ate`, nasce fora do quadro), `chao`, `bolhas` e `polvo`.
- **`cenas.mar.polvo`:** canais com chaves `[t, valor]`. São eles:
  - `x`, `y`, `esc`, `rot`: posição, tamanho e giro;
  - `nado`, `cansa`, `anda`: as poses, de 0 a 1, misturadas;
  - `luz`: o coração amarelo, de aceso a apagado;
  - `batidas`: os mesmos tempos fazem a lanterna pulsar e o som do coração.
- **`cenas.arco` e `cenas.gota`:** o lugar de cada coração, pente de brânquia e tubo, e a hora em
  que os discos `O2`, `COBRE` e `FERRO` entram.
- **`legendas`:** `{de, ate, texto}`. Ao montar, o motor dá erro se uma letra não existir em
  `letras.js`, ou se a legenda não ficar pelo menos 0,5 s inteira na tela antes de sumir.
- **`musica` e `sons`:** os acordes, as notas da caixinha e os efeitos, com o tempo de cada um.

```bash
node ferramentas/render.mjs exemplos/biblioteca/caixa-sombra --historia minha-historia.json
```

## Medida

450 quadros em **60,73 s** de render (117,6 ms por quadro; 4,05 s de render por segundo de vídeo),
3 navegadores, sem placa de vídeo. MP4 de 19,1 MB (o grão do papel pesa no vídeo).

Som: média -19,5 dB e pico -2,1 dB. Os segundos mais altos são os do nado (9 s e 10 s). Mesmo
filme inteiro em 360x640 com 1 e com 3 navegadores: os 450 quadros são iguais. Detalhes em
`medida.json`.

## Falta polir

- **Duração e planos.** A fonte tem 18 s e sete planos. Aqui são 15 s e quatro planos: a gota
  junta os planos 3 e 4, e o nado, o cansaço e o rastejar viram um plano só, com a câmera
  seguindo o polvo.
- **Letra da legenda.** É em maiúsculas de traço, não na letra redonda e pesada de papel da fonte.
- **Disco do cobre.** Na fonte ele mostra o símbolo químico. Aqui leva a palavra COBRE, e os
  discos de oxigênio levam "O2" sem o 2 pequeno.
- **Entrada pela janela.** No meio da entrada (2,85 s) ainda se vê a borda de baixo da janela.
  No corte para o arco (3,0 s), o arco aparece um pouco maior que a janela.
- **Legenda sobre os corações.** No arco, a legenda passa por cima dos corações de baixo.
- **Rodapé escuro.** O fundo do mar tem uma faixa escura e lisa embaixo, mais pesada que na fonte.
