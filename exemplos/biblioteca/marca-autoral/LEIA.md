# marca-autoral — explicativo com cara de marca

**O estilo.** Gráfico plano e limpo sobre preto puro com uma grade fina de pontinhos e um brilho fraco no
meio da tela: UMA cor de destaque (amarelo) que brilha, letra grossa e redonda, branco e cinza para o
resto, bonecos de bloco (cabeça quadrada com dois olhinhos e corpo que afina), janelas de aplicativo com
três bolinhas, contador que sobe, mapa que se pinta, barras, carimbo e risco. Tudo entra com um "salto"
que passa do ponto e volta; o quadro inteiro deriva e respira devagar, as cenas trocam em 0,3 s e a virada
treme 8 quadros.

**De onde saiu.** Do primeiro filme da seção "One script, 14 styles" da biblioteca de estilos da fonte
(o estilo de marca do próprio autor, vídeo `genghis_brand`). Recriamos o JEITO (preto + uma cor, letra
grossa, bonecos de bloco, janelas, saltos), não a marca: sem logotipo, sem nome, sem rosto; o amarelo é o
do INEMA (`#facc15`), os bonecos têm olhinhos em vez da viseira, e as letras são desenhadas em traços. Lá o
filme é narrado e tem 26 s; aqui não há voz: a fala virou legenda em português (tradutor central, encurtada
à mão para 20 s, com as 6 batidas). O roteiro e a linha do tempo estão em
`longrun/2026-11-19-motores-biblioteca/roteiro-14-estilos.md` e servem aos 14 estilos da seção.
Música: arpejo escuro em lá menor de serras desafinadas a 116 bpm com baixo a cada compasso, que para na
virada. Sons: tique-tique do contador, estalinhos dos saltos, brilhos, subidas, arranhão de disco, golpe
grave e brilho longo no fim, tudo feito em código.

**Vertical:** 1080x1920, 30 quadros por segundo, 20 s.

**O filme.** "A árvore de família mais famosa do mundo": o contador sobe a 20.000.000 sobre 60 bonecos;
linhas ligam todos a um só, que acende ("GÊNGIS KHAN"); a janela do estudo de 2003 com 12 tubos, um enche;
"1 EM 12" com um boneco aceso; o mapa da Eurásia se desenha, a região varre de leste a oeste, o império
cresce de um ponto que pulsa e vira barras (Mongol, Russo, Qing, Romano); o carimbo "CASO ENCERRADO?" bate,
treme, apaga e é riscado ("AINDA NÃO"); túmulos e uma hélice que se divide em "esperada" e "outra
linhagem"; a árvore de família, o nome riscado e a raiz que vira contorno com "?" ("OUTRA PESSOA?").

## Arquivos

- `motor.js` — o fundo (grade, brilho, cantos escuros), a câmera (deriva, respiro, tremor), as letras
  grossas, os bonecos e todas as peças, as legendas e o som.
- `letras.js` — as letras em traços (cópia do quadro-negro via xilogravura, com o `²`), para nada depender
  de fonte instalada. Letra que falta dá erro ao montar.
- `historia.json` — o filme: cores, cenas com as peças (lugar e tempo), o mapa, as legendas, música e sons.

## Como trocar a história

Tudo que muda fica em `historia.json`:

- `paleta`: `destaque` é a única cor que brilha; `fundo`, `ponto` (grade), `painel`, `borda`, `cinza`.
- `cenas`: cada uma com `de`/`ate` e `pecas`; entra em 0,3 s (ou `"corte": true`, troca seca).
- peças (`tipo`): `texto` (`cores` por palavra, `sobe`, `some`, `brilho`, `risco`), `contador` (`valor`
  de `de` a `ate`), `multidao` (grade de bonecos; `liga` desenha linhas até um ponto; `apaga`), `heroi`
  (boneco que brilha; `contorno` e `interroga` viram contorno com "?"), `janela` (`titulo`, `linhas`),
  `tubos` (`enche` um deles), `fila` (`acende` um), `mapa` (`contorno`, `regiao`, `aneis`, `imperio`,
  `sobe`), `barras`, `carimbo` (`apaga`, `risco`), `tumulos`, `helice` (`divide` em `esq` e `dir`),
  `arvore` (`niveis`).
- `terra`: os contornos do mapa em longitude/latitude (troque por outro lugar do mundo).
- `tremores`: `{t, quadros, forca}`.
- `legendas`: `{de, ate, texto}`; o cartão aparece inteiro, a palavra falada fica no destaque e a
  última acende 0,55 s antes do fim. Cartão com menos de 0,5 s dá erro ao montar.
- `musica` (acordes, padrão do arpejo, `corta`) e `sons` (os tempos dos efeitos).

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/marca-autoral --trabalhadores 3
```

## Medida

600 quadros em **46,2 s** de render (50,8 ms por quadro; 2,31 s de render por segundo de vídeo),
3 navegadores, sem placa de vídeo. Detalhes em `medida.json`. Mesmo filme com 1 e 3 navegadores
(360x640, 600 quadros): mesmos quadros.

## Falta polir

- A cena dos túmulos abre num corte seco e o primeiro quadro fica quase vazio (as peças ainda vão saltar).
- O rótulo "ESPERADA" (cinza) fica fraco sobre o preto.
- Diferente da fonte: canvas 2D em vez de SVG/React; 20 s em vez de 26 s, com a narração encurtada em
  legenda; a legenda tem 64 px (não 92) para caber numa linha; o amarelo é outro, os bonecos têm olhos em
  vez de viseira; o mapa é um contorno feito à mão, simples; nos túmulos não há as ossadas e o cromossomo Y
  é só um "Y" de traço.
