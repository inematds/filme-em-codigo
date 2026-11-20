# vetor-ciencia — explicativo de ciência em vetor plano

**O estilo.** Cada cena é uma ilustração feita de formas geométricas de cantos redondos, sem contorno.
Cada objeto tem cor base, um brilho plano e uma sombra longa e macia na diagonal, sobre céu noturno em
degradê e paleta viva. A câmera faz paralaxe (o céu anda pouco e desliza para o lado, o capim da frente
balança) com zoom lento de 1,02 a 1,12, e o pan troca de lado a cada cena. As cenas trocam num círculo
que abre do centro, com borda acesa, em 0,4 s. Painéis, números, mapa e rótulos ficam por cima, na mesma
paleta. Os bonecos são de cápsula, com olhos de ponto.

**De onde saiu.** Do filme "Flat vector science" da seção "One script, 14 styles" da biblioteca de
estilos da fonte (vídeo `style_flat`). Lá o estilo imita um canal famoso de ciência animada. Aqui ficou a
versão genérica: vetor plano, formas geométricas, sombras longas e paleta viva. Não há bichinhos, nem a
paleta-assinatura (não usamos os hex da fonte: base azul-violeta própria, destaque `#ffd23f`, rosa, ciano
e lilás), nem o traço reconhecível. Os bonecos são desenho próprio. Gêngis Khan usa deel (roupão que
abotoa do lado, com faixa na cintura) e gorro mongol de pele (copa em domo, aba de pele e abas nas
orelhas). Lá o filme é narrado e dura 26 s. Aqui não há voz: a fala virou legenda em português, encurtada
para 20 s, com as 6 batidas. O roteiro e a linha do tempo estão em
`longrun/2026-11-19-motores-biblioteca/roteiro-14-estilos.md`, os mesmos dos 14 estilos.
Música: arpejo escuro em lá menor (serras desafinadas mais um triângulo) a 116 bpm, com baixo a cada
compasso, que para de 14,4 a 15,2 s. Sons: tique-tique do contador, "plop" de bolha quando as peças
entram, brilhos, subidas, arranhão de disco, golpe grave e brilho longo no fim. Tudo feito em código.

**Formato:** vertical, 1080x1920, 30 quadros por segundo, 20 s.

**O filme.** "A árvore de família mais famosa do mundo".
- Planície à noite: o contador sobe a 20.000.000 sobre 60 bonecos, linhas ligam todos a um só, e
  Gêngis Khan acende no ponto.
- Laboratório: o painel do estudo de 2003 com 12 tubos, e um deles enche.
- "1 EM 12" em fichas redondas, com uma delas acesa.
- Mapa num painel sobre a estepe borrada (coluna de cavaleiros ao entardecer): a região varre, o
  império cresce de um ponto que pulsa, e entram as barras.
- Escrivaninha de detetive: o carimbo "CASO ENCERRADO?" bate, treme, apaga e é riscado ("AINDA NÃO").
- Escavação ao anoitecer: túmulos que ganham borda e uma hélice que se divide em "esperada" e "outra
  linhagem".
- Árvore enorme à noite: a árvore de família, o nome riscado, e a raiz vira contorno com "?" ("OUTRA
  PESSOA?").

## Arquivos

- `motor.js`: os fundos ilustrados em camadas (planície, laboratório, estepe, escrivaninha, escavação,
  árvore), a câmera, a troca em círculo, os bonecos e o Khan, as peças, as legendas e o som.
- `letras.js`: as letras em traços (cópia do marca-autoral, com o `²`). Letra que falta dá erro ao montar.
- `historia.json`: o filme. Tem as cores, as cenas (fundo e peças com lugar e tempo), o mapa, as
  legendas, a música e os sons.

## Como trocar a história

Tudo o que muda fica em `historia.json`:

- `paleta`: as cores de cada fundo e das peças. `destaque` é a cor que brilha. `vivas`, `pele` e `cabelo`
  são listas sorteadas para os bonecos.
- `khan`: as cores da roupa e do gorro do herói.
- `cenas`: cada uma com `de`/`ate`, `fundo` (`tipo`, `zoom`, `borra`, `escurece`) e `pecas`. A cena entra
  em círculo (`troca`, em segundos) ou com `"corte": true`.
- Peças (`tipo`):
  - `texto`, `contador`, `multidao`, `heroi`
  - `painel` (com `aba` = pasta), `tubos`, `fila`
  - `mapa` (com `painel`), `barras`, `carimbo`
  - `tumulos`, `helice` (`rotulo`: quando os rótulos entram depois da divisão), `arvore`
  - `camada`: `mundo` (anda com a câmera) ou `tela` (parada).
- `terra`: os contornos do mapa em longitude/latitude.
- `tremores`, `legendas` (cartão com menos de 0,5 s dá erro), `musica` (`corta`) e `sons`.

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/vetor-ciencia --trabalhadores 3
```

## Medida

600 quadros em **41,04 s** de render: 54 ms por quadro, ou 2,05 s de render por segundo de vídeo. Usou 3
navegadores, sem placa de vídeo. Os detalhes estão em `medida.json`. O filme inteiro em 360x640 dá os
mesmos quadros com 1 e com 3 navegadores. Som: média de -20,9 dB e pico de -2,3 dB. De 14,4 a 15,2 s a
música para de verdade (-48,6 dB em 14,9 s).

## Falta polir

- A cena dos túmulos abre num corte seco, e o primeiro quadro (15,2 s) fica quase vazio enquanto as
  covas saltam.
- Os bonecos da multidão ficam pequenos e meio iguais. Não há a "planície até o horizonte" da fonte.
- Diferenças da fonte:
  - Lá são 7 ilustrações geradas por modelo de imagem, animadas por mapa de profundidade. Aqui as
    ilustrações são feitas em código, mais simples, e a paralaxe é por camadas.
  - Não há a cena do Khan a cavalo, nem a dos geneticistas. O Khan aparece em pé, no ponto onde as
    linhas se encontram, como pede o roteiro dos 14.
  - O roteiro tem 20 s, não 26, e a legenda tem 64 px, não 92.
