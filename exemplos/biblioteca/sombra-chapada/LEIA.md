# sombra-chapada

**O estilo.** Retrato de anime de moda feito só de formas chapadas de borda dura, sem contorno e
sem degradê: fundo lilás vazio, pele em ameixa quase preta com facetas coral onde a luz bate,
cabelo violeta com a luz amarela cortando em labaredas, óculos vermelhos e argola de ouro. A luz
anda durante o plano e as sombras se recortam sozinhas, sempre coerentes com a forma.

**Como funciona.** Por trás do desenho há uma cabeça 3D escondida (`cabeca.js`): um "ovo" com
mandíbula e queixo, feito de poucas faces. Ninguém vê o 3D. Ele só decide, face por face, se a luz
bate (coral) ou não (ameixa). O cabelo é uma casca fina sobre o crânio, com uma grade fina. A
divisa entre luz e sombra leva um ruído preso na própria casca, e por isso as labaredas e as gotas
andam junto com a cabeça. Uma faixa laranja fina fica logo antes da divisa. Óculos, sobrancelhas
e boca são faixas desenhadas sobre a superfície; o pedaço que vira de costas some sozinho. A
personagem anda de 2 em 2 quadros (12 desenhos por segundo) e a câmera empurra lisa, quadro a
quadro. Por cima vão um tiquinho de maciez e um grão de filme leve. O grão é mais fraco quando a
tela é pequena e nunca fica menor que 1 pixel. O título é desenhado em traços (`letras.js`, cópia
das letras do motor xilogravura).

**O filme.** `historia.json`, "Virar para a luz" (6 s, 16:9, 1920x1080, 24 quadros por segundo):
a personagem começa de cabeça baixa, de três quartos, com a luz vindo de trás (o amarelo no alto
do cabelo e uma faixa coral reta descendo pelo pescoço). Ela afunda um pouco, ergue e vira a
cabeça para a câmera enquanto a luz passa por cima e vai para a frente: o amarelo se recorta no
cabelo e um plano coral abre no lado de lá do rosto. Duas barras claras de brilho atravessam os
óculos, a argola balança e para, a gola acompanha com atraso, e no fim uma sobrancelha sobe com
meio sorriso. Sem fala: na tela só o título no começo. O som é todo feito em código: um fundo
calmo e frio (dó menor), um roçar de pano quando a cabeça ergue, tilintar de ouro na argola, um
"pim" de vidro no brilho e uma nota leve no sorriso.

**Trocar a história.** Tudo o que muda fica no arquivo da história: título e onde ele aparece,
cores (pelo nome), a câmera (centro e empurrão), a lista de `pecas` da cena (fundo, personagem,
gola e título, cada uma com seu tempo), a `personagem` (tamanho da cabeça, mandíbula,
nariz, linha do cabelo, pontas da franja, tamanho das labaredas, orelha, brinco, pescoço,
sobrancelhas, boca e o desenho dos óculos, tudo em ângulos sobre a cabeça, e as peças da gola),
a `atuacao` (pose da cabeça a cada momento, o caminho da luz em azimute e altura, a hora do
brilho, da sobrancelha e do sorriso, os balanços do brinco e da gola) e o som (lista de `eventos`,
com tempo em segundos ou pelo nome: `ergue`, `brilho`, `sobrancelha`, `sorriso`). Copie o arquivo,
mude e rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/sombra-chapada --historia minha-historia.json
```

**De onde saiu.** Do filme "Shades" da biblioteca de estilos da fonte (estilo "Flat-shadow anime
portrait"). A personagem e o desenho são novos, feitos do zero em código. Na fonte o filme tem 5 s;
aqui tem 6 s, por causa do título no começo.

**Tempo de render medido** (`medida.json`; 3 navegadores, sem placa de vídeo, 144 quadros):
9,5 s para 6 s de filme (41,6 ms por quadro). MP4 de 4,8 MB. Som: média -16,0 dB, pico -2,1 dB.
O mesmo filme inteiro em 640x360 com 1 e com 3 navegadores dá os mesmos quadros.

**Falta polir.**
- O rosto tem menos planos que o da fonte: no fim ele é quase todo ameixa, com um só plano coral
  do lado de lá, e não tem as linhas finas de dobra na bochecha.
- No fim o pescoço fica comprido demais entre o queixo e a gola.
- Na afundada antes de erguer (perto de 1,9 s), o queixo encosta na gola e a boca fica rente à
  borda dela.
- Plano mais aberto que o close da fonte: a cabeça é menor e a gola ocupa mais do quadro.
- No começo a luz de trás só faz a faixa coral no pescoço; na fonte ela também passa pela nuca e
  acende um triângulo no nariz.
- As labaredas do cabelo saem como ilhas menores que as chamas grandes da fonte, e no redemoinho
  do alto da cabeça sobra um pontinho claro.
- A franja em dentes é mais regular que a da fonte, e a orelha quase não aparece.
