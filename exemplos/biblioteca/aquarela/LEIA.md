# aquarela: curta em aquarela solta

**O estilo.** Tudo parece pintado em aquarela sobre papel de grão grosso. A tinta é molhada e
transparente: cada mancha é passada de 15 a 30 vezes, bem fraquinha, e a borda escurece onde o
pigmento junta. Aparecem flores de pigmento, pontinhos de papel e respingos de carmim, numa paleta
terrosa e apagada. A câmera aproxima devagar (de 1,06 a 1,14), balançando de lado. As camadas andam em
paralaxe e "fervem" de leve 8 vezes por segundo. A cena nova entra numa mancha d'água que se abre do meio,
com uma linha de maré na borda. Os rótulos são em itálico sépia, numa caixinha de papel, com destaque em carmim.

**De onde saiu.** Do filme "Watercolour (Painted watercolour)" da seção "One script, 14 styles" da
biblioteca de estilos da fonte (vídeo `style_watercolor`). Lá, as sete imagens-chave saem de um gerador
de imagem e ganham movimento com um mapa de profundidade. Aqui, TUDO é pintado em código (canvas 2D,
com sorteio de semente fixa), uma vez ao montar.

Lá o filme é narrado e dura 26 s. Aqui não há voz: a fala virou legenda em português, pelo tradutor
central, encurtada à mão para 20 s, com as 6 batidas. O roteiro e a linha do tempo estão em
`longrun/2026-11-19-motores-biblioteca/roteiro-14-estilos.md` e servem aos 14 estilos da série.

**Música e sons.** A música é uma flauta de bambu em lá menor pentatônico, sobre uma cítara grave
dedilhada a cada 1,2 s, e para na virada (14,4 a 15,2 s, inclusive as notas que ainda soavam). Os sons são:

- tique de madeira sob o contador;
- tambores grandes (taiko) no começo, no herói, no "caso encerrado", no "ainda não", em "outra linhagem"
  e em "outra pessoa";
- brilho de vidro no "12";
- galope baixinho sob o exército;
- chiado de água a cada troca de cena.

Tudo é feito em código.

**Vertical:** 1080x1920, 30 quadros por segundo, 20 s.

**O filme.** "A árvore de família mais famosa do mundo":

1. Numa planície, o contador sobe a 20.000.000 sobre 60 pessoas.
2. Fios de tinta ligam todas as pessoas a uma só: Gêngis Khan a cavalo, no alto do morro, com deel carmim
   e gorro de pele, numa flor de pigmento ("GÊNGIS KHAN").
3. No laboratório, com dois cientistas de jaleco, aparece o cartão do estudo de 2003 e 12 tubos; um enche
   de carmim.
4. "1 EM 12" aparece em 12 fichas de papel, sobre a planície desfocada; a oitava acende.
5. O mapa de papel aparece sobre a estepe desfocada, com os cavaleiros. A região carmim varre de leste a
   oeste, o império índigo cresce de um ponto que pulsa e entram as barras.
6. No escritório, com abajur, o carimbo "CASO ENCERRADO?" bate na pasta, treme, apaga e leva um risco
   ("AINDA NÃO").
7. Corte para os túmulos ao pôr do sol: uma hélice sobe e se divide em "esperada" e "outra linhagem".
8. Numa árvore grande, a família aparece em medalhões, com o busto de Gêngis Khan na raiz. O nome é
   riscado e o medalhão vira "?" ("OUTRA PESSOA?").

## Arquivos

- `pinturas.js`: os pintores de aquarela. A base é `aguada`, a mancha molhada com borda, flores e
  grânulos. Os outros são `ceu`, `serra`, `campo`, `respingos`, `placa`, `poligono`, `mancha`, `traco`,
  `luz`, `cavaleiros` e `arvoreGigante`. O motor acrescenta `gente`.
- `motor.js`: pinta as camadas e as figuras ao montar (gente, o cavaleiro e o busto viram figurinhas
  prontas). Também faz o papel (grão e sombra funda nas bordas), a câmera, a fervura, a mancha d'água que
  troca a cena, as peças, as legendas e o som.
- `letras.js`: as letras em traços (cópia do marca-autoral). Letra que falta dá erro ao montar.
- `historia.json`: o filme (paleta, pinturas, cenas, mapa, legendas, música e sons).

## Como trocar a história

Tudo o que muda fica em `historia.json`:

- `pinturas`: cada cenário é uma lista de `camadas`. Cada camada tem:
  - `prof` (0 é longe, 1 é perto);
  - `y0`/`y1`;
  - `deriva` (céu que corre de lado);
  - `balanca`;
  - `opaca` (papel por baixo, para a camada de trás não aparecer através da tinta);
  - `pecas` (os pintores).
- `cenas`: cada cena tem `de`/`ate`, o `fundo` (`pintura`, `desfoque`, `escurece`, `zoom`) e as `pecas`.
  `sangra` (`antes`, `dur`, `centro`) controla a mancha que abre a cena; `"corte": true` troca seco.
- Peças: `texto` (rótulo com caixinha; `risco`), `contador`, `multidao`, `heroi` (cavaleiro ou
  `medalhao`), `janela` (cartão de papel), `pasta`, `tubos`, `fila`, `mapa`, `barras` (`painel`),
  `carimbo`, `tumulos`, `helice` e `arvore`. Com `"naPintura": true`, a peça anda junto com a pintura.
- `paleta`, `mapa`, `camera`, `fervura`, `grao`, `tremores` e `legendas` (cartão com menos de 0,5 s dá
  erro), além de `musica` e `sons`.

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/aquarela --trabalhadores 3
```

## Medida

600 quadros em **85,63 s** de render: 106 ms por quadro, ou 4,28 s de render por segundo de vídeo, com
3 navegadores e sem placa de vídeo. Os detalhes estão em `medida.json`.

O filme inteiro em 360x640 saiu com os mesmos quadros com 1 e com 3 navegadores.

O som do MP4 tem média de -22,1 dB e pico de -2,2 dB. No corte da música (14,9 a 15,2 s), fica em -39 dB.

## Falta polir

- **Diferenças em relação à fonte:**
  - Na fonte, as imagens são geradas por modelo, com pintura densa e detalhada (rostos, multidão cerrada,
    laboratório cheio). Aqui, as aguadas são mais simples e as figuras são pequenas e soltas.
  - A legenda é de 64 px em letra de traço, não 92 px em Lora.
  - O carmim da palavra falada foi clareado só na legenda (`#d8384f`), porque `#a3172b` com borda preta
    quase não se lê. Os rótulos usam `#a3172b`.
- A pessoinha da multidão ainda parece peão.
- Os túmulos são manchas ovais com borda carmim, sem ossadas nem escavadores.
- A xícara e o mapa da mesa do escritório são formas simples.
- Os cientistas do laboratório aparecem só pela metade, nas bordas, e não têm rosto.
- Na troca para a árvore (17,0 s), a mancha abre de baixo (do tronco), para "esperada" e "outra linhagem"
  ficarem 0,5 s inteiros; por isso o "GÊNGIS KHAN" do alto só aparece por volta de 17,2 s.
