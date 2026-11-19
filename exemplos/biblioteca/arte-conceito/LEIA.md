# arte-conceito

**O estilo.** Parece uma página do livro de arte de um filme de animação: tudo feito de recortes de
guache com arestas vivas e sem contorno, e cada forma tem só três tons (a cor de base, uma sombra
chapada e uma luz chapada), com algumas pinceladas secas aparentes e grão de papel por cima. O sol
baixo vem de trás, à esquerda: borda quente no cabelo e no ombro, sombras frias azul-ardósia, e o
fundo pintado mais solto e com menos contraste que a personagem.

**Como funciona.** Jeito fundo-pintado, com câmera multiplano. O `pincel.js` faz o recorte: pega um
contorno liso e o troca por lados retos e cantos vivos, e risca a pincelada seca (cerdas que falham).
O `fundo.js` pinta o cenário UMA vez, em camadas (céu, prédios do fim da rua, rua com fachadas e
carros, muro de terracota); a rua sai de uma perspectiva simples (ponto de fuga na história). A cada
quadro o motor só move as camadas (as de longe andam e crescem menos no empurrão da câmera) e desenha
por cima o que mexe: a mulher (`mulher.js`), as figurinhas da rua, o ciclista, o pombo, os pássaros, o
galho de folhas na frente e a luz que dança no muro. A atuação muda de 2 em 2 quadros; vapor, folhas
e luz, de 3 em 3; a câmera é lisa. O título é desenhado em traços (`letras.js`, cópia das letras do
motor quadro-negro), sem depender de fonte instalada.

**O filme.** Uma moça de cabelo chanel, casaco verde-azulado e cachecol mostarda chega andando com um
café junto a um muro ao sol e para. Um ciclista vem pela rua e toca a campainha, um pombo sai voando
do poste; os olhos dela sobem primeiro, a cabeça abaixa um pouco e vai atrás, com a boca entreaberta.
Ela segura, pisca e começa a sorrir enquanto uma brisa levanta o cabelo e o cachecol. 10 s em 16:9
(1920x1080), sem fala: na tela só o título no começo. Som feito em código: rumor da cidade de manhã,
passos que param, catraca e campainha da bicicleta, asas do pombo, o fôlego curto, a brisa e um
acorde quente que abre junto com o sorriso.

**Trocar a história.** Tudo o que muda fica em `historia.json`:
- `cores` do cenário e `mulher` (pele, cabelo, olhos, boca, casaco, camisa, cachecol, copo), onde ela
  entra e para (`x0`, `x1`, `y`, `escala`);
- `atuacao`: os tempos da caminhada, das piscadas, do olhar que sobe, da cabeça (abaixa, sobe, assenta),
  do fôlego, da boca, do sorriso e da brisa;
- `camera` (pontos-chave com `x`, `y`, `zoom`), `perspectiva` (ponto de fuga) e `camadas` (fator de
  profundidade de cada uma);
- `pecas`, cada uma com lugar e tempo: céu, fios, prédios de longe, rua, faixa, sombras no chão,
  fachadas, carros, poste, pessoas, ciclista (quando passa e quando toca), pombo (quando voa), muro,
  chão, luz no muro, folhas e pássaros;
- `musica`: o acorde, as notas do piano, as notas da campainha e os pios.

```bash
node ferramentas/render.mjs exemplos/biblioteca/arte-conceito --historia minha-historia.json
```

**De onde saiu.** Do filme "Morning, Looking Up" (estilo "Painterly animation concept art") da
biblioteca de estilos da fonte. A moça daqui é um desenho novo e genérico (outro cabelo, outra roupa,
cachecol no lugar da bolsa); a rua, os carros e as pessoas não têm letra nem marca.

**Tempo de render medido** (`medida.json`): 41,2 s para 10 s de filme (300 quadros, 120 ms por
quadro, 3 navegadores, sem placa de vídeo). O MP4 tem 13,1 MB. Som: média -17,7 dB, pico -1,4 dB.
Mesmo filme a 640x360 com 1 e com 3 navegadores: os mesmos quadros (`quadros.sha256` igual).

**Falta polir** (achado depois da 3ª rodada, não corrigido):
- o cabelo chanel ainda parece um capacete: as mechas são blocos grandes, com poucos fios soltos
  comparado ao filme da fonte;
- o rosto fica quase de frente (sem orelha); na fonte ela está em três quartos e vira o rosto para cima;
  aqui a cabeça só inclina 9 graus e os olhos sobem;
- o ciclista vem de frente e vira um bloco azul com boné; a bicicleta quase não aparece; perto do
  fim da passagem (5,0 a 5,5 s) ele fica grande (mais de meia tela de altura) no terço direito e sai
  pela borda, chamando mais atenção que o "passante ao fundo" da fonte;
- os pássaros só saem de trás do muro perto dos 8 s;
- a faixa azul-clara do chão embaixo do muro parece uma listra solta;
- o fundo tem menos detalhe que o da fonte (prédios em blocos, carros simples);
- a fonte tem 5 s; aqui são 10 s, com as pausas mais longas; o "piano" é um sino macio.
