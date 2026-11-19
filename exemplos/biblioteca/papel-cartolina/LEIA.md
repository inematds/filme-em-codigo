# papel-cartolina — desenho animado de recortes de cartolina

**O estilo.** Tudo parece cortado de cartolina colorida com tesoura: cores chapadas, bordas um pouco
tortas, círculos em facetas, sombra dura de papel por baixo de cada peça e uma textura de fibras por
cima. A animação é dura, de recorte: as peças andam de três em três quadros (10 poses por segundo), a
câmera dá um pulinho a cada pose, as bordas "fervem" um fio e as cenas trocam em corte seco.

**De onde saiu.** Do filme "Construction-paper cartoon" da seção "One script, 14 styles" da biblioteca
de estilos da fonte (vídeo `style_paper`). A fonte imita uma série de TV conhecida; aqui é a versão
genérica: nada de personagem, olho, cabeça ou traço dessa série. Os bonecos têm cabeça redonda separada
do corpo, dois olhinhos de ponto (sem o branco do olho), bochecha rosada, braços e mãos redondas.
Gêngis Khan usa roupa mongol: gorro de pele (copa de feltro com ponta curta e aba de pele dobrada para
cima) e deel azul que fecha na diagonal, com faixa na cintura e botas. Lá o filme é narrado e tem 26 s;
aqui não há voz: a fala virou legenda em português (tradutor central, encurtada à mão para 20 s, com as
6 batidas). O roteiro e a linha do tempo são os mesmos dos 14 estilos
(`longrun/2026-11-19-motores-biblioteca/roteiro-14-estilos.md`).
Música: melodia dedilhada de cítara na pentatônica de lá menor, a 120 bpm, com baixo de cítara e tambor
macio, que para na virada. Sons: galope de cascos no começo e sob o mapa, papel batendo quando as peças
entram, tique-tique do contador, brilhos, subidas, arranhão de disco, tambor grave e brilho longo no fim,
tudo feito em código.

**Vertical:** 1080x1920, 30 quadros por segundo, 20 s.

**O filme.** "A árvore de família mais famosa do mundo": o contador sobe a 20.000.000 sobre 60 bonecos
na estepe; linhas pretas ligam todos a um só, que pula num morrinho com uma estrela amarela atrás
("GÊNGIS KHAN"); a folha do estudo de 2003 presa com fita, 12 tubos e um que enche, com dois cientistas
de jaleco; "1 EM 12" com um boneco aceso; o mapa (mar azul, terra verde, linha preta grossa) com a região
amarela, os pontinhos e o império vermelho, sobre a estepe escurecida com cavaleiros; as barras; a pasta
"ARQUIVO DO CASO" com o carimbo vermelho que treme, apaga e leva uma tira amarela por cima ("AINDA NÃO");
os túmulos no fim de tarde, a hélice que se divide em "esperada" e "outra linhagem"; a árvore de
medalhões, o nome riscado e o medalhão de cima que vira "?" ("OUTRA PESSOA?").

## Arquivos

- `motor.js` — o papel (recorte, sombra, borda que ferve, textura), a câmera de stop-motion, os bonecos
  de cartolina, as peças, as legendas e o som.
- `letras.js` — as letras em traços (cópia do marca-autoral, com o `²`), para nada depender de fonte
  instalada. Letra que falta dá erro ao montar.
- `historia.json` — o filme: cores, listas de cores dos bonecos, cenas com as peças (lugar e tempo), o
  mapa, as legendas, música e sons.

## Como trocar a história

Tudo que muda fica em `historia.json`:

- `paleta`: `destaque` (amarelo das palavras e do brilho), `tinta` (preto das bordas), as cores do mapa
  (`mar`, `terraMapa`, `regiao`, `imperio`) e das coisas (pasta, tubos, túmulos, árvore, o Khan).
- `bonecos`: listas de pele, roupa, deel, cabelo, faixa, gorro e pele do gorro; o motor sorteia com semente.
- `papel`: `pose` (segundos por pose), `ferve` (quanto a borda mexe) e a `sombra` do papel.
- `camera` (`pulo`, `giro`, `escala` a cada pose), `tremores` e `claroes` (o clarão fica por baixo da legenda).
- `cenas`: cada uma com `de` e `pecas`, troca em corte seco. Peças de cenário: `fundo`, `faixa`, `morro`,
  `montanhas`, `nuvem`, `sol`, `ger` (tenda), `ret`, `luz`, `escurece`, `cavaleiros`. Peças da história:
  `texto` (`sobe`, `some`, `risco`), `contador`, `multidao` (`liga`, `apaga`), `heroi`, `janela`,
  `cientista`, `tubos` (`enche`), `fila` (`acende`), `mapa`, `barras`, `pasta`, `carimbo` (`apaga`,
  `risco`), `tumulos`, `helice` (`divide`), `arvore`, `raiz` (`contorno`, `interroga`).
- `legendas`: `{de, ate, texto}`; o cartão aparece inteiro, a palavra falada fica amarela e a última
  acende 0,55 s antes do fim. Cartão com menos de 0,5 s dá erro ao montar.
- `musica` (`frase` de notas, `baixos`, `corta`) e `sons` (os tempos dos efeitos).

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/papel-cartolina --trabalhadores 3
```

## Medida

600 quadros em **35,8 s** de render (50 ms por quadro; 1,79 s de render por segundo de vídeo),
3 navegadores, sem placa de vídeo. Detalhes em `medida.json`. Mesmo filme com 1 e 3 navegadores
(360x640, 600 quadros): mesmos quadros. Som: média -21,4 dB, pico -1,8 dB.

## Falta polir

- Os túmulos são montinhos de terra simples (sem ossadas, sem escavadores), e a borda amarela deles parece
  um contorno de desenho, não de papel.
- No primeiro quadro de algumas cenas (5,0 s e 15,2 s) a folha ou o buraco aparecem antes das peças, que
  ainda vão pular.
- Diferente da fonte: lá são imagens geradas por modelo e animadas com profundidade; aqui tudo é desenho
  em código (canvas 2D). 20 s em vez de 26 s, com a narração encurtada em legenda (68 px, não 92); as
  letras são traços desenhados, não a fonte da fonte; o laboratório, o escritório e a escavação são
  cenários simples de papel, sem detetive e sem arqueólogos; o "Mongol Empire" com cavaleiros aparece
  só escurecido atrás do mapa.
