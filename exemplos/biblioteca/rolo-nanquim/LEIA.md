# rolo-nanquim — rolo de pintura a nanquim

**O estilo.** A história é pintada num rolo comprido de papel de arroz (creme, com manchas, fibras e
grão), a nanquim: pinceladas que engrossam no começo, afinam no fim e se desenham sozinhas, aguadas
transparentes, e o vermelho de carimbo como única cor (sol, carimbos salpicados, o império, o boneco
certo). A câmera desliza de lado, de um painel para o outro, com montanhas lavadas andando a 1/4 da
velocidade atrás.

**De onde saiu.** Do filme "Ink scroll" da seção "One script, 14 styles" da biblioteca de estilos da
fonte (vídeo `genghis_ink`). Lá o filme é narrado e tem 26 s; aqui não há voz: a fala virou legenda em
português (tradutor central, encurtada à mão para 20 s, com as 6 batidas). O roteiro, as legendas e os
sons-chave são os mesmos dos outros estilos da série:
`longrun/2026-11-19-motores-biblioteca/roteiro-14-estilos.md`. Os carimbos não têm escrita de verdade:
são traços retos inventados que lembram letra de selo. Música: flauta de bambu em lá menor pentatônico
sobre cítara grave dedilhada e um bordão; taikô no começo, no herói, no carimbo, na virada, em "outra
linhagem" e em "outra pessoa"; bloco de madeira sob o contador, papel deslizando a cada painel, sinos.
Tudo feito em código.

**Vertical:** 1080x1920, 30 quadros por segundo, 20 s.

**O filme.** "A árvore de família mais famosa do mundo": o contador sobe a 20.000.000 sobre 60 bonecos
de pincel; fios de tinta ligam todos a um só, de chapéu, e o carimbo bate em cima ("GÊNGIS KHAN"); uma
folha entre dois rolos com "2003" e 12 tubos, um enche de vermelho; "1 EM 12" com um boneco que fica
vermelho; o mapa da Eurásia se desenha, a aguada escura varre de leste a oeste, pingos vermelhos, o
império cresce em aguada vermelha de um ponto que pulsa, e o mapa sobe para quatro rolos pendurados que
se desenrolam pelo tamanho (Mongol, Russo, Qing, Romano); o carimbo "CASO ENCERRADO?" bate torto, a
tela treme, ele perde a cor e um golpe de nanquim com respingos o corta ("AINDA NÃO."); quatro túmulos
lavados e uma hélice de contas que se divide em "esperada" e "outra linhagem"; a árvore de família, o
nome riscado, a raiz que vira contorno com "?" e o carimbo da interrogação ("OUTRA PESSOA?").

## Arquivos

- `motor.js` — o papel, as montanhas, o sol, a câmera que desliza, o pincel (fita que afina, com borda
  irregular), aguadas, carimbos salpicados, bonecos de pincel, todas as peças, legendas e som.
- `letras.js` — as letras em traços (cópia do quadro-negro via marca-autoral, com o `²`); o motor passa
  cada traço como pincelada. Letra que falta dá erro ao montar.
- `historia.json` — o filme: cores, sol, montanhas, cenas com as peças (lugar e tempo), mapa, legendas,
  música e sons.

## Como trocar a história

Tudo que muda fica em `historia.json`:

- `paleta`: `papel`, `tinta`, `tinta2` (marrom), `selo` (o vermelho), `montanha`, `vinheta`, `destaque`
  (a palavra falada na legenda).
- `cenas`: cada cena é um painel do rolo (a cena 1 no painel 0, a 2 no painel 1…). A câmera desliza até
  o painel começando 0,4 s antes do `de` (troque com `"desliza": {"de", "dur"}`). Peças de um painel
  continuam pintadas quando ele sai de cena.
- peças (`tipo`): `texto` (`italico`, `italicos` por palavra, `cores`, `sobe`, `some`, `risco`),
  `contador`, `multidao` (`liga` desenha fios até um ponto, `apaga`), `heroi` (`chapeu`, `halo`,
  `contorno`, `interroga`), `selo` (`interroga`, `apaga`), `carimbo` (texto com `|` para quebrar linha,
  `apaga`, `risco`), `cartao` (folha entre rolos), `tubos`, `fila`, `mapa`, `bandeiras` (rolos
  pendurados), `tumulos`, `helice`, `arvore`.
- `sol` (onde e quando some), `montanhas` (camadas), `tremores`, `escurece`.
- `legendas`: `{de, ate, texto}`; cartão com menos de 0,5 s inteiro dá erro ao montar.
- `musica` (`flauta` com `[tempo, nota, duração]`, `citara`, `bordao`, `corta`) e `sons`.

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/rolo-nanquim --trabalhadores 3
```

## Medida

600 quadros em **53,16 s** de render (75,1 ms por quadro; 2,66 s de render por segundo de vídeo),
3 navegadores, sem placa de vídeo. Detalhes em `medida.json`. Mesmo filme com 1 e 3 navegadores
(360x640, 600 quadros): mesmos quadros. Som: média -19,7 dB, pico -2,2 dB.

## Falta polir

- Diferente da fonte: canvas 2D com pincel feito em geometria (não SVG com filtro de turbulência);
  letra a pincel sobre traços simples, não uma serifada; 20 s em vez de 26 s, narração virou legenda.
- Ficaram de fora o microscópio de pincel, os seis cavaleiros que saem da Mongólia (e o galope) e as
  ossadas nos túmulos; os 12 tubos e os 60 bonecos seguem o roteiro da série, não a fonte (3 tubos, 54).
- Os carimbos têm marcas inventadas, sem escrita de verdade.
- Um respingo do golpe da virada cai perto da borda do painel seguinte (fica no papel, como tinta).
