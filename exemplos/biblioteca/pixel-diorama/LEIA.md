# pixel-diorama

**O estilo.** Pixel art de pixels grandes, feito ponto a ponto com uma paleta fixa de 32 cores e
trama de pontos no lugar do degradê, montado como maquete: cada camada fica numa profundidade e a
câmera se afasta de verdade. Por cima vem a luz de cinema: poças de luz dos postes, brilho que vaza
das lâmpadas, névoa da tarde, fundo e frente desfocados (lente de miniatura) e reflexo na água.

**Como funciona.** O motor desenha cada camada uma vez só (casas, árvores, postes, barracas,
montanhas, lago), em duas versões: luz da tarde e luz da noite. A cada quadro ele mistura as duas
conforme a hora, põe a camada na tela com o desfoque da distância e soma o brilho das luzes. Os
bonecos são desenhos de letras (`R` = capa vermelha, `S` = pele…) com 2 a 4 poses que se repetem.
Não é 3D de verdade: luz, sombra e reflexo são desenhados, não calculados.

**O filme.** Uma heroína de capa vermelha corre pela feira de uma vila na montanha ao entardecer,
para na beira do terraço, a noite cai e fogos de artifício estouram sobre o lago. 10 s, 16:9
(1920x1080), sem fala: só o título no começo. Música de videogame antigo, passos, grilos e fogos,
tudo feito em código.

**Trocar a história.** Tudo o que muda fica em `historia.json`:
- `paleta`: as 32 cores, com nome. Peças e bonecos só usam cores daqui. Troque o valor (`#rrggbb`),
  mas mantenha os nomes: o motor usa vários deles (`pedra`, `contorno`, `lanterna`, `madeira`…).
- `camadas`: cada uma com profundidade (`z`), tamanho do pixel (`grao`), lugar (`x`, `y`) e a lista
  de `pecas` (`casa`, `arvore`, `poste`, `barraca`, `bandeirinhas`, `capim`, `chao`, `montanhas`,
  `morro`, `agua`, `luzes`, `nuvem`), cada peça com o seu lugar e tamanho. Duas camadas têm nome
  fixo: `terraco` (onde andam os bonecos e ficam as poças de luz) e `longe` (lago, fogos e reflexo).
- `sprites` e `chaves`: os bonecos, linha por linha; `heroi.caminho` diz onde ela está em cada segundo.
- `camera`: pontos com segundo, distância (`d`), altura, foco e abertura (quanto desfoca); `segue`
  faz a câmera acompanhar a heroína.
- `noite`: quando a tarde vira noite. `fogos`: segundo, lugar, cores e tamanho de cada estouro.
- `vagalumes`: quantos e em que faixa do terraço. `musica`: melodia, baixo e arpejos. `titulo`, `titulo_de` e `titulo_ate`: o título e quando aparece.

```bash
node ferramentas/render.mjs exemplos/biblioteca/pixel-diorama --historia minha-historia.json
```

**De onde saiu.** Do filme "Lantern Village" (estilo "HD-2D pixel art diorama") da biblioteca de
estilos da fonte. A heroína, os aldeões e a vila daqui são desenhos novos e genéricos.

**Tempo de render medido** (`medida.json`): 35,5 s para 10 s de filme (300 quadros, 99,9 ms por
quadro, 3 navegadores, sem placa de vídeo). O MP4 tem 7,8 MB.
