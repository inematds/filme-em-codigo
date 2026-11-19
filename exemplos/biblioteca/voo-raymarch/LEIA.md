# voo-raymarch

**O estilo.** Um voo de ficção científica em que o mundo inteiro (cânion, arco de pedra, mesas do
deserto, nave, planeta com anéis) sai de uma conta só, feita para cada pixel: o raio sai da câmera e
"tateia" as formas até bater (raymarching). Depois o quadro passa por um acabamento de cinema:
brilho, riscos de lente, raios de sol, fundo desfocado, borrão de velocidade, grão e faixas pretas
(2,39:1), com sombra azul-petróleo e luz laranja.

**De onde saiu.** Do filme "Canyon Run" da biblioteca da fonte (estilo "Raymarched sci-fi").
O original não tem texto; aqui entra só um título curto em PT no começo (0,5 a 2,7 s).

**O que acontece (8 s).** A nave desce o cânion de veios azuis brilhantes, inclina forte sob o arco
de pedra (3,6 s), sai no deserto (5 s) e a câmera levanta o olhar para o planeta com anéis ao nascer
do sol. Som feito em código: pulso de sintetizador, ronco do motor, rajada no arco e um acorde que
cresce na saída.

## Como trocar a história

Tudo o que muda fica em `historia.json`; o `motor.js` não muda.

- `pecas`: a cena como lista de peças, cada uma com lugar e tempo: `titulo` (texto, quando entra, quanto
  dura), `canion` (largura, altura das paredes, curva do caminho), `arco` (em que segundo a nave passa,
  raio, grossura), `saida` (segundo em que sai do cânion), `sol` (direção, quanto sobe) e `planeta`
  (direção, tamanho, inclinação dos anéis, estrelas).
- `voo`: velocidade, altura da câmera no cânion e no deserto, distância da nave, quanto ela inclina no
  arco e quanto a câmera olha para o planeta no fim.
- `cores`: céu, sol, rocha (duas camadas), veios, água, areia, planeta, anel, motor e cor da sombra.
- `filme`: força do brilho, dos riscos, dos raios de sol, do borrão, da aberração de cor, do grão e a
  proporção da faixa de cinema.
- `musica`: notas do pulso, acorde da saída e sinos.

Ver no navegador: abra `index.html` por um servidor local (o player tem botão de tocar).
Render: `node ferramentas/render.mjs exemplos/biblioteca/voo-raymarch`

## Tempo de render (medido)

8 s de filme, 240 quadros 1920x1080, sem GPU (WebGL calculado pela CPU), 3 navegadores:
**47 s no total, 156 ms por quadro** (`medida.json`). O mundo é calculado na metade da resolução,
com 80 passos por raio (`ESCALA` e `PASSOS` no topo do `motor.js`); o acabamento é em tela cheia.
