# tijolinhos

**O estilo.** Um filme de tijolinhos de brinquedo em stop-motion, montado e fotografado em 3D: peças
de plástico brilhante (com pinos lisos, quinas arredondadas, frestinha entre as peças, arranhões,
digitais e poeira) numa placa verde sobre uma mesa de madeira, na frente de uma parede de tijolos
azuis. Tudo anda em 12 poses por segundo, com um tremidinho entre uma foto e outra, a luz da lâmpada
oscilando de leve e uma lente de macro que desfoca o fundo e a frente.

**Como funciona.** Cada tipo de peça (tijolo, placa, lisa, rampa, redondo, cone, haste) é uma malha só,
repetida por instância, e cada peça da história diz onde fica e quando chega. As peças da montagem
começam jogadas numa pilha e pulam até o lugar, amassam ao encaixar e assentam. Fogo e fumaça também
são peças que aparecem e somem (nunca partículas). Os dois bonecos são desenho próprio: cabeça de cubo
arredondado com dois pontinhos de olho, corpo de bloco afunilado e mão de pino. O vídeo sai a
30 quadros por segundo, mas cada pose fica parada por 2 ou 3 quadros, como no stop-motion de verdade.
Arquivos: `motor.js` (a cena e o som), `pecas.js` (o catálogo de peças e as texturas feitas em
código), `lente.js` (desfoque de macro, cor quente, grão e título), `letras.js` (as letras do título,
em traços, sem fonte instalada).

**O filme.** A câmera começa rente aos pinos: as peças saltam da pilha e encaixam com um tique,
montando um foguete vermelho e branco e uma torre amarela e preta enquanto a câmera sobe. Um boneco
corre aos pulinhos até a mesa de controle e empurra a alavanca; o poste de luz passa de vermelho a
amarelo e verde. O foguete sobe numa chama de peças translúcidas e numa coluna de fumaça de peças
brancas e cinza, que rolam pela placa e derrubam uma árvore; o outro boneco levanta os braços. A
câmera se afasta até o foguete ficar pequeno na frente da parede azul com sol de pixel e nuvens no
palito. 10 s, 16:9 (1920x1080). O filme da fonte não tem texto: aqui só o título aparece no começo.
Som feito em código: um tique de plástico para cada peça que encaixa (no mesmo instante da pose),
marimba e caixinha de música, bipes do poste, um ronco pequeno e um apito de escorregar na decolagem.

**Trocar a história.** Tudo o que muda fica em `historia.json` (1 unidade = 1 pino):

- `posesPorSegundo`: 12 (stop-motion); 24 deixa liso.
- `camera`: pontos com segundo, posição, para onde olha, lente (`fov`), ponto de `foco` e quanto
  `desfoque`; `"para": true` faz a câmera parar naquele ponto.
- `pecas`: lista de peças com lugar e tempo — `mesa`, `placa`, `parede`, `morro`, `sol`, `nuvem`,
  `plataforma`, o `foguete` (camadas de cor, janela, aletas, bico e o trecho `monta` em que as peças
  chegam), a `torre`, a `pilha` (de onde as peças saem), a `mesaControle` (quando a alavanca desce),
  o `sinal` (quando cada luz acende), as `arvore` (`cai` = quando a fumaça derruba), os `boneco` (cor,
  lugar, para onde olha e as `acoes`: `corre`, `alavanca`, `comemora`) e a `decolagem` (quando, quanto
  sobe, quantas peças de fogo e de fumaça).
- `cores`, `luz` (cor, força e direção da lâmpada, quanto ela treme) e `filme` (exposição, grão,
  vinheta, tom quente, tremor das peças e da câmera).
- `musica`: notas da marimba, da caixinha de música, do baixo e do acorde final.

```bash
node ferramentas/render.mjs exemplos/biblioteca/tijolinhos --historia minha-historia.json
```

**De onde saiu.** Do filme "Liftoff on the Baseplate" (estilo de tijolinhos de brinquedo em
stop-motion) da biblioteca de estilos da fonte. As peças são genéricas (sem marca, sem logotipo) e os
bonecos são desenho novo.

**Tempo de render medido** (`medida.json`): 207,97 s para 10 s de filme (300 quadros, 623,9 ms por
quadro, 3 navegadores, sem GPU). O MP4 sai com cerca de 17,92 MB.

**Falta polir**
- Na abertura, as peças que voam passam muito perto da lente e ficam grandes no alto do quadro.
- Os bonecos aparecem pequenos ou cortados (só a cabeça, desfocada, na frente) e, no plano aberto
  do fim, quase somem; a comemoração de braços para cima mal se vê.
- A chama é pequena perto do foguete, e a coluna de fumaça é mais fina que na fonte; a árvore cai
  devagar no começo e só aparece deitada quando a câmera já está longe.
- As nuvens no palito parecem discos achatados vistos de lado.
- A fonte tem brilho de lâmpada em volta do fogo e das luzes (bloom); aqui não tem.
