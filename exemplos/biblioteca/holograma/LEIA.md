# holograma — 3D futurista holográfico

**O estilo.** Ficção científica de luxo em escuridão azul funda: raios de luz que caem do alto, chão de
grade em perspectiva, painéis de dados de vidro flutuando dos lados, figuras e objetos de holograma em
ciano e magenta, vidro e cromo, e tudo com um brilho que vaza. Por cima, a "câmera": cantos de mira,
REC com o tempo, linhas de varredura e uma faixa que desce; os rótulos são letra fina entre colchetes
ciano, e cada troca de cena é uma falha de sinal de 0,25 s (faixas que escorregam de lado e cor girada).

**De onde saiu.** Do filme "Futuristic 3D (Holographic sci-fi)" da seção "One script, 14 styles" da
biblioteca de estilos da fonte (vídeo `style_future`). Lá, cada batida é uma imagem gerada por IA com
parallax por mapa de profundidade; aqui não há imagem nem modelo: o cenário (céu, chão, painéis, raios)
é pintado em código ao montar, e as peças são desenhadas a cada quadro. Sem voz: a fala virou legenda em
português (tradutor central, encurtada à mão para 20 s). O roteiro e a linha do tempo, iguais nos 14
estilos, estão em `longrun/2026-11-19-motores-biblioteca/roteiro-14-estilos.md`.
Música: arpejo escuro de sintetizador a 116 bpm, pad e baixo, que param na virada (14,4 a 15,2 s; nenhuma
nota atravessa o corte). Sons: tique-tique do contador, bipes digitais, chiado de falha nas trocas,
brilhos, subidas, arranhão de disco, golpe grave e brilho longo, tudo feito em código.

**Vertical:** 1080x1920, 30 quadros por segundo, 20 s.

**O filme.** "A árvore de família mais famosa do mundo": o contador sobe a 20.000.000 sobre uma multidão
de hologramas que se perde no horizonte; linhas de luz ligam todos a um ponto, onde nasce num pedestal o
holograma de Gêngis Khan (gorro redondo de pele com abas, bigode fino, deel com gola cruzada e faixa);
a hélice de DNA gira atrás do painel "ESTUDO DO CROMOSSOMO Y" com "2003" e 12 tubos, um enche; "1 EM 12"
com 12 fichas de vidro, uma acende; o mapa de painel azul-marinho com grade (região magenta varrendo de
leste a oeste, império ciano crescendo do ponto que pulsa) e as barras; o carimbo "CASO ENCERRADO?" bate,
treme, apaga e é riscado ("AINDA NÃO"); túmulos de arame no chão e a hélice que se divide em "esperada" e
"outra linhagem"; a árvore de medalhões, o nome riscado e a raiz que vira só contorno com "?".

## Arquivos

- `motor.js` — cenário de cada cena (pintado uma vez), câmera (pan e zoom de 1,02 a 1,12, tremor),
  letras finas e grossas, figuras de holograma, peças, brilho geral, moldura de câmera, falha de sinal,
  legendas e som.
- `letras.js` — as letras em traços (cópia do quadro-negro via marca-autoral), para nada depender de
  fonte instalada. Letra que falta dá erro ao montar.
- `historia.json` — o filme: cores, cenas (com o `fundo` de cada uma e as peças com lugar e tempo), mapa,
  legendas, música e sons.

## Como trocar a história

Tudo que muda fica em `historia.json`:

- `paleta`: `ciano` e `magenta` (as luzes), `gelo` (letra), `fundoAlto`/`fundoBaixo` (céu), `painel`, `vidro`.
- `camera` (`zoomDe`, `zoomAte`, `pan`, `deriva`), `tremores` (`{t, quadros, forca}`), `glitches` (os
  tempos das falhas de sinal) e `hud` (`rec`, `cantos`, `varredura` em segundos).
- `cenas`: cada uma com `de`/`ate`, `fundo` (`raios` {x, cor}, `chao` {horizonte, h, f}, `montanhas`,
  `paineis`, `escurece`) e `pecas`. Peça com `"camada": "mundo"` anda com o pan-e-zoom; as outras (painéis
  e rótulos) só derivam e tremem.
- peças (`tipo`): `rotulo` (`cores` por palavra, `sobe`, `some`, `risco`, `semColchete`), `contador`,
  `multidao` (gente no chão em perspectiva: `palco`, `fileiras` de distância; `liga`, `someLiga`, `apaga`),
  `heroi` (holograma no pedestal; `contorno` e `interroga`), `painel` (`titulo`, `linhas`), `helice3d`,
  `tubos` (`enche`), `fichas` (`acende`), `mapa` (`moldura`, `contorno`, `regiao`, `aneis`, `imperio`,
  `sobe`), `barras`, `carimbo` (`apaga`, `risco`), `tumulos` (caixas no chão: `caixas` {x, z}),
  `helice` (`divide` em `esq` e `dir`), `arvore` (`niveis`).
- `terra`: contornos do mapa em longitude/latitude.
- `legendas`: `{de, ate, texto}`; o cartão aparece inteiro, a palavra falada fica em ciano e a última
  acende 0,55 s antes do fim. Cartão com menos de 0,5 s dá erro ao montar.

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/holograma --trabalhadores 3
```

## Medida

600 quadros em **41,63 s** de render (54,1 ms por quadro; 2,08 s de render por segundo de vídeo),
3 navegadores, sem placa de vídeo. Detalhes em `medida.json`. Mesmo filme com 1 e 3 navegadores
(360x640, 600 quadros): mesmos quadros. Som: média -19,0 dB, pico -1,6 dB, todo segundo entre -21,3 e -16,8 dB; no corte da música
(14,85 a 15,05 s) só sobra o fim do arranhão, a -46 dB.

## Falta polir

- A 360x640 o rosto do Khan (olhos, bigode) quase some; o que fica é o gorro e a túnica.
- Os rótulos "ESPERADA" e "OUTRA LINHAGEM" são pequenos (30 px) para caber com o zoom da câmera, e aparecem
  na ponta dos ramos antes de as contas chegarem lá (a cena acaba 0,8 s depois da divisão).
- As abas de orelha do gorro do Khan quase não se separam do rosto; o gorro se lê pela aba de pele e o botão.
- Diferente da fonte: sem imagens geradas (nada de multidão realista, cavalo, laboratório com cientistas,
  exército, mesa de detetive ou escavação com ossada); os cenários são grade, raios e painéis em código, e
  as figuras são silhuetas de holograma. 20 s em vez de 26 s, legenda em letra de traço (76 px, não 92),
  sem o parallax por profundidade de imagem (o pan-e-zoom anda em três camadas).
