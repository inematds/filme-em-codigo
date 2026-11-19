# anime-pintado — curta com cenários de guache e luz dourada

**O estilo.** Cara de longa de animação pintado à mão: cenários de guache e aquarela com céu dourado,
nuvens cúmulo grandes e fofas, serras azuladas ao longe e campos de capim em pinceladas; gente pequena de
cor chapada com uma sombra só, olhinhos de ponto e contorno fino marrom. A câmera aproxima devagar (1,06 a
1,14) balançando de lado, as camadas andam em paralaxe (o céu de longe corre de lado, o capim de perto
balança), o cenário troca em fusão de 0,6 s, e por cima vão partículas de luz, vinheta e grão de filme.

**De onde saiu.** Do filme "Painted anime film" da seção "One script, 14 styles" da biblioteca de estilos
da fonte. A fonte diz que o estilo é parecido com um estúdio famoso; aqui é a
versão GENÉRICA: só o jeito (guache, nuvens grandes, luz quente, gente simples), sem personagem, traço,
rosto ou composição de filme de estúdio. Lá as sete imagens-chave saem de um gerador de imagem e o
movimento vem de um mapa de profundidade; aqui TUDO é pintado em código (milhares de pinceladas com
semente fixa), em camadas separadas, uma vez ao montar. Lá o filme é narrado e tem 26 s; aqui não há voz: a
fala virou legenda em português (tradutor central, encurtada à mão para 20 s, com as 6 batidas). O roteiro
e a linha do tempo estão em `longrun/2026-11-19-motores-biblioteca/roteiro-14-estilos.md` e servem aos 14
estilos da seção.
Música: frases de flauta de sopro em lá menor pentatônico sobre cítara grave dedilhada a cada 1,2 s, que
para na virada. Sons: tique de madeira sob o contador, tambores grandes (taiko) no começo, no herói, no
"caso encerrado", no "ainda não", em "outra linhagem" e em "outra pessoa", brilho de vidro no "12",
subidas de ar, galope baixinho sob o exército e um brilho longo no fim, tudo feito em código.

**Vertical:** 1080x1920, 30 quadros por segundo, 20 s.

**O filme.** "A árvore de família mais famosa do mundo": numa planície dourada o contador sobe a
20.000.000 sobre 60 pessoas; fios de luz ligam todas a uma só, no alto do morro, que brilha ("GÊNGIS
KHAN"); num laboratório com janela para o campo, o painel do estudo de 2003 e 12 tubos na estante, um
enche de âmbar; "1 EM 12" sobre a planície desfocada; o mapa de pergaminho sobre a estepe desfocada (com
cavaleiros), a região varre de leste a oeste, o império se espalha de um ponto que pulsa e vira barras; no
escritório ao entardecer, o carimbo vermelho "CASO ENCERRADO?" bate na pasta, treme, apaga e leva um risco
dourado ("AINDA NÃO"); corte para os túmulos ao pôr do sol, uma hélice de luz sobe e se divide em
"esperada" e "outra linhagem"; uma árvore gigante com a árvore de família em medalhões, o nome riscado e
a raiz que vira contorno com "?" ("OUTRA PESSOA?").

## Arquivos

- `pinturas.js` — os pintores de cenário: `ceu`, `nuvem`, `serra`, `campo`, `bosque`, `placa`
  (parede com janela, tábua), `poligono`, `elipse`, `traco`, `luz`, `neblina`, `cavaleiros`,
  `arvoreGigante`. Cada um recebe a peça do `historia.json`.
- `motor.js` — pinta as camadas ao montar, a câmera de sonho, a fusão, a gente pequena, as peças, as
  legendas, o acabamento (partículas, vinheta, grão) e o som.
- `letras.js` — as letras em traços (cópia do marca-autoral, com o `²`), para nada depender de fonte
  instalada. Letra que falta dá erro ao montar.
- `historia.json` — o filme: cores, as pinturas (camadas com peças), as cenas, o mapa, as legendas, a
  música e os sons.

## Como trocar a história

Tudo que muda fica em `historia.json`:

- `pinturas`: cada cenário é uma lista de `camadas`; cada camada tem `prof` (0 longe, 1 perto),
  `y0`/`y1` (a faixa da tela que ela ocupa), `extra` e `deriva` (o céu que corre de lado), `balanca`
  (o capim de perto) e `pecas` (os pintores, com lugar e cores).
- `cenas`: cada uma com `de`/`ate`, o `fundo` (`pintura`, `desfoque` e `escurece` para pôr painel por
  cima) e `pecas`; `"corte": true` troca seco em vez da fusão.
- peças: `texto` (`veu` escurece atrás, `risco`), `contador`, `multidao` (filas em perspectiva; `liga`
  e `apaga`), `heroi` (`medalhao`, `contorno`, `interroga`), `janela` (vidro escuro), `pasta`, `tubos`,
  `fila`, `mapa` (com `painel`), `barras`, `carimbo`, `tumulos`, `helice`, `arvore`.
  `"naPintura": true` faz a peça andar junto com a pintura.
- `paleta` (inclui `roupas`, `peles`, `cabelos` da gente), `mapa` (cores do mapa), `camera`, `fusao`,
  `tremores`, `poeira`, `grao`, `legendas` (cartão com menos de 0,5 s dá erro), `musica` (`acordes` da
  cítara, frases da `flauta`, `corta`) e `sons`.

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/anime-pintado --trabalhadores 3
```

## Medida

600 quadros em **89,9 s** de render (114,3 ms por quadro; 4,49 s de render por segundo de vídeo),
3 navegadores, sem placa de vídeo. Detalhes em `medida.json`. Mesmo filme com 1 e 3 navegadores
(360x640, 600 quadros): mesmos quadros. O MP4 sai grande (~71 MB) por causa do grão de filme.

## Falta polir

- A gente pequena parece peão de xadrez (corpo de sino e cabeça redonda); na fonte há rostos desenhados.
- A lupa do escritório é só um aro oval; a lâmpada é um abajur pendurado simples.
- Na fusão de cenário (0,3 s antes da batida), as peças pintadas da cena que sai (a multidão e o herói
  em 5,0 s; os túmulos e a hélice em 17,0 s) ficam inteiras por cima da pintura nova que já entra.
- O rótulo "ESPERADA" nasce em 16,55 s e a pintura da árvore começa a entrar em 16,7 s: fica pouco na tela.
- A cena do mapa e a do "1 em 12" usam as pinturas só desfocadas; o exército nunca aparece nítido.
- Diferente da fonte: tudo pintado em código (não há imagem gerada nem mapa de profundidade), letra em
  traços redondos (não serifada) e a legenda com 64 px (não 92); 20 s em vez de 26 s.
