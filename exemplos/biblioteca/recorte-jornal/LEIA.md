# recorte-jornal: colagem de recortes de jornal

**O estilo.** Um explicativo montado como colagem de jornal: tiras de papel rasgado com a borda de
fibra clara e sombra macia, "fotos" de arquivo recortadas e impressas em meio-tom (pontinhos), fita
adesiva, risco de marcador, rótulos em caixinhas de papel creme tortas e grão de risografia por cima,
só em creme, preto e um vermelho vivo. A câmera faz pan e zoom lentos em cada cena (o lado troca a cada
cena), as bordas "fervem" de leve 8 vezes por segundo e cada cena nova entra deslizando da direita,
inclinada, com sombra.

**De onde saiu.** Do filme "Paper cutout collage" da seção "One script, 14 styles" da biblioteca de
estilos da fonte (vídeo `style_vox_julian`). A fonte imita um canal de jornalismo explicativo; aqui é a
versão genérica: sem logotipo, sem a tipografia e sem a paleta desse canal. As "fotos" não são fotos:
são bustos e cavaleiros desenhados em código, em cor, e convertidos em meio-tom ao montar (nada
baixado). Gêngis Khan usa gorro de feltro com ponta curta e aba de pele dobrada para cima, deel
vermelho que fecha na diagonal, bigode longo e fino. Lá o filme é narrado e tem 26 s; aqui não há voz:
a fala virou legenda em português, com o roteiro e a linha do tempo dos 14 estilos
(`longrun/2026-11-19-motores-biblioteca/roteiro-14-estilos.md`), em 20 s.
Música: arpejo escuro de serras desafinadas em lá menor, a 116 bpm, com baixo a cada compasso, que para
na virada (as notas que atravessam o corte acabam nele). Sons: tique-tique do contador, papel colando,
folha deslizando a cada cena, subidas, brilhos, arranhão de disco, golpe grave de sintetizador, risco
de marcador e brilho longo no fim, tudo feito em código.

**Vertical:** 1080x1920, 30 quadros por segundo, 20 s.

**O filme.** "A árvore de família mais famosa do mundo": o contador sobe a 20.000.000 sobre a multidão
em meio-tom; fios de tinta ligam todos a um ponto, a multidão desbota e Gêngis Khan aparece com um
estouro de papel vermelho; a folha do estudo de 2003 presa com fita, 12 tubos e o 8º que enche de
vermelho, dois cientistas; "1 EM 12" em fichas com foto, uma acende; o mapa em painel creme sobre os
cavaleiros desfocados e escurecidos, a região vermelha, o império escuro e as barras; a pasta "ARQUIVO
DO CASO" com o carimbo vermelho que treme, desbota e leva um risco de marcador ("AINDA NÃO"); os túmulos
no céu vermelho, a hélice que se divide em "esperada" e "outra linhagem"; a árvore de medalhões, o nome
riscado de vermelho e o medalhão de cima que vira contorno com "?".

## Arquivos

- `motor.js`: o papel rasgado, o meio-tom das fotos, as duas camadas (colagem com pan e zoom; painéis
  parados na tela), o deslize entre cenas, as peças, as legendas e o som.
- `letras.js`: as letras em traços (cópia do papel-cartolina, com o `²`). Letra que falta dá erro ao montar.
- `historia.json`: o filme (cores, pessoas, cenas com as peças em lugar e tempo, mapa, legendas, música e sons).

## Como trocar a história

Tudo que muda fica em `historia.json`:

- `paleta`: `papel`, `caixa` (rótulos), `fibra` (borda do rasgo), `foto` (papel das fotos), `tinta`,
  `acento` (o vermelho: palavra falada, região, marcador) e as cores das coisas.
- `bonecos`: listas de pele, roupa, cabelo e chapéu; o motor sorteia com semente. Roupa vermelha sai
  em vermelho chapado com pontos; o resto sai em meio-tom preto sobre creme.
- `papel`: `ferve` e `passos` (a borda que mexe), `rasgo`, `celula` (tamanho do ponto do meio-tom) e `sombra`.
- `camera`: `zoom` [de, até] e `pan` de cada cena (a cena pode trocar com `zoom`, `pan` e `deslize`),
  `deslize` (segundos) e `inclina` (graus). `tremores` (mexem colagem, painéis e legenda) e `claroes`
  (o clarão fica por baixo da legenda).
- `cenas`: cada uma com `de`, `ate` e `pecas`. Painéis (parados na tela): `texto` (`risco` de
  marcador), `contador`, `janela`, `tubos`, `fila`, `mapa`, `barras`, `pasta`, `carimbo`. Colagem:
  `fundo`, `rasgo` (tira rasgada; `cima`), `forma`, `sol`, `montanhas`, `nuvem`, `escurece`, `luz`,
  `lupa`, `xicara`, `recado`, `desfocado` (as peças de dentro saem borradas), `cavaleiros`,
  `multidao` (`liga`, `apaga`), `heroi`, `cientista`, `dna`, `tumulos`, `helice` (`divide`),
  `arvore`, `raiz`. Qualquer peça vai para a outra camada com `"sobre": true/false`.
- `legendas`: `{de, ate, texto}`; o cartão aparece inteiro, a palavra falada fica vermelha e a última
  acende 0,55 s antes do fim. Cartão com menos de 0,5 s dá erro ao montar.
- `musica` (`acordes`, `padrao`, `corta`) e `sons` (os tempos dos efeitos).

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/recorte-jornal --trabalhadores 3
```

## Medida

600 quadros em **51,5 s** de render (71 ms por quadro; 2,57 s de render por segundo de vídeo),
3 navegadores, sem placa de vídeo. Detalhes em `medida.json`. Mesmo filme com 1 e 3 navegadores
(360x640, 600 quadros): mesmos quadros. Som: média -18,6 dB, pico -2,3 dB; na pausa da virada
(14,85 a 15,1 s) a média cai para -42 dB.

## Falta polir

- Os bustos têm cara de desenho (olhos de traço, nariz em triângulo); o meio-tom dá o ar de foto, mas
  não chega à foto de arquivo da fonte. Os cavaleiros são silhuetas simples.
- A estatística e a escavação são cenários de papel simples: sem arqueólogos e sem esqueleto.
- Diferente da fonte: lá são imagens geradas por modelo e animadas com profundidade; aqui tudo é
  desenho em código (canvas 2D). 20 s em vez de 26 s, com a narração encurtada em legenda (58 px, não
  92); as letras são traços desenhados, sem serifa; o zoom do mapa, dos túmulos e da árvore vai só até
  1,06 a 1,1 para nada sair do quadro; o rótulo "AINDA NÃO" entra em 0,2 s por cima da lupa.
