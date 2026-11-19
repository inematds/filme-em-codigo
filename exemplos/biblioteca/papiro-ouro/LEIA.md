# papiro-ouro — rolo de papiro em nanquim e ouro

**O estilo.** Tudo é desenhado num papiro comprido (fibras cruzadas, emendas das tiras, manchas de
tom): linhas de nanquim afinadas nas pontas que se desenham sozinhas, cores chapadas (ocre, turquesa,
lápis-lazúli, creme) que entram em pinceladas de vaivém, e ouro em folha manchada para a ideia
principal (a linha do tempo e os colchetes), com uma estrela brilhando na ponta enquanto o ouro corre.

**De onde saiu.** Do filme "Cleopatra Was Closer to the Moon Landing" (rolo de papiro em nanquim e
ouro) da biblioteca de estilos da fonte. Lá o filme é narrado e tem 21 s; aqui não há voz: a fala virou
legenda em português (traduzida pelo tradutor central e encurtada para caber em 15 s), numa faixa creme
com borda de nanquim e a palavra falada em amarelo. Música de alaúde beliscado sobre um bordão grave e
tambor de moldura, com sons de papel, pincel, carimbo, sinos e o pouso, tudo feito em código.

**Vertical:** 1080x1920, 30 quadros por segundo, 15 s.

**O filme.** "Cleópatra estava mais perto da Lua": um rolo desenrola; a rainha (desenho próprio, de
perfil) vira e aponta quando a lua de ouro aparece, vira de novo quando surge uma pirâmide pequena;
corte para três construtores puxando um bloco enquanto a pirâmide é pintada fiada por fiada, e o
carimbo "2560 A.C."; a câmera viaja com o colchete de ouro e o contador até 2.530 anos, chegando na
rainha ("30 A.C."); viaja de novo até 1.998 anos e o módulo lunar pousa numa janela de noite ("1969");
o papiro gira 90 graus e a linha do tempo inteira aparece em pé, na mesma escala (1 ano = 1 ponto),
com os números grandes; volta para a rainha protegendo os olhos e corta para a pegada ao lado de uma
sombra em forma de pirâmide.

## Arquivos

- `pincel.js` — a fita de nanquim, a cor que entra em pinceladas, as letras grossas com contorno e a
  estrelinha de brilho.
- `letras.js` — as letras em traços (cópia do quadro-negro), para nada depender de fonte instalada.
- `motor.js` — o papiro, a câmera (com corte e giro), as peças, os contadores, a legenda e o som.
- `historia.json` — o filme: cores, câmera, linha do tempo, peças com lugar e tempo, legendas e música.

## Como trocar a história

Tudo que muda fica em `historia.json`:

- `camera`: pontos `{t, x, y, z, giro}`; a câmera desliza de um para o outro; `"corte": true` pula
  na hora; `giro: -90` deita o papiro (o futuro fica para cima).
- `linhaDoTempo`: altura (`y`), começo e fim, marcas a cada `marcas` anos, e o trecho que se desenha
  com a estrela na ponta (`desenha`).
- `elementos`: cada peça com `tipo`, lugar (`x`, `y`), `t` (quando começa) e `dur` (quanto leva):
  `rainha` (`acoes`: `vira`, `aponta`, `protege`), `lua`, `piramide` (`fiadas`), `sol`,
  `construtores` (`anda` até `ate`), `carimbo`, `colchete` (de `x0` a `x1`), `rotulo`,
  `painelNoite`, `modulo` (desce de `yDe` a `yAte` entre `de` e `ate`), `pegada`, `sombra`.
- `telas`: o que fica em pé na tela: `contador` (conta até `valor`) e `numerao` (número grande preso
  a um ponto do papiro).
- `legendas`: `{de, ate, texto}`; a última palavra acende `segura` segundos antes do fim do cartão.
- `musica`: notas do alaúde, `bordao`, `tambor` e os `sinos` do fim.

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/papiro-ouro --trabalhadores 3
```

## Medida

450 quadros em **40,76 s** de render (78 ms por quadro; 2,72 s de render por segundo de vídeo),
3 navegadores, sem placa de vídeo. Detalhes em `medida.json`.

## Falta polir

- O contador "1.998 ANOS" fica por cima do topo da janela de noite.
- Os construtores são pequenos e simples (pernas em tubo); o bloco não tem textura de pedra.
- No plano largo (papiro em pé) as figuras ficam miúdas e as manchas do papiro parecem borrões.
- Diferente da fonte: canvas 2D em vez de 3D; sem o borrão das viradas rápidas (viraram viagem lisa ou
  corte seco); 15 s em vez de 21 s, com a narração encurtada.
