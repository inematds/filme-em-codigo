# cartoon-tv — desenho animado de TV (genérico)

**O estilo.** Desenho animado de TV em horário nobre: toda forma tem o mesmo contorno preto grosso,
as cores são chapadas e fortes (céu azul de sol, grama verde), com uma meia-lua de sombra mais escura
em cabeças, corpos e morros. A animação é "limitada", como na TV: o corpo quase não mexe; quem anda são
os olhos (piscam, olham para o lado certo) e a boca (troca de forma de três em três quadros quando
alguém fala ou se espanta). A câmera dá um soco de zoom de 9% a cada corte, que assenta rápido, depois
avança devagar e balança; cada corte tem um clarão branco de 0,12 s, por baixo da legenda.

**De onde saiu.** Do filme "Prime-time TV cartoon" da seção "One script, 14 styles" da biblioteca de
estilos da fonte (vídeo `style_sitcom`). A fonte cita séries famosas de TV; aqui é a versão genérica:
nada de pele amarela, olho esbugalhado, cabelo, sobremordida ou personagem dessas séries. Os bonecos
são próprios: cabeça oval com queixo, olhos ovais com pupila e brilho, nariz curto, peles naturais
variadas. Do "retro sci-fi" ficou só um fundo de cidade de brinquedo (cúpulas, torres de bola, antenas)
e um disco voador que passa. Gêngis Khan usa roupa mongol: gorro de pele (copa de feltro vermelha com
ponta curta e aba de pele dobrada para cima) e deel azul que fecha na diagonal, com faixa e botas.
Lá o filme é narrado e tem 26 s; aqui não há voz: a fala virou legenda em português (tradutor central,
encurtada à mão para 20 s, com as 6 batidas). O roteiro e a linha do tempo são os mesmos dos 14 estilos
(`longrun/2026-11-19-motores-biblioteca/roteiro-14-estilos.md`).
Música: banjo saltitante na pentatônica de dó maior, a 120 bpm, com baixo saltado e bateria macia,
que para na virada. Sons: galope, "plop" de desenho quando as peças entram, assobio no corte,
tique-tique do contador, brilhos, subidas, arranhão de disco, tambor grave e brilho longo, tudo em código.

**Vertical:** 1080x1920, 30 quadros por segundo, 20 s.

## Arquivos

- `motor.js` — o traço (forma com contorno e sombra de célula), a câmera de TV, os bonecos (olhos e
  boca animados), o cavalo, as peças, as legendas e o som.
- `letras.js` — as letras em traços (cópia do papel-cartolina), para nada depender de fonte instalada.
  Letra que falta dá erro ao montar.
- `historia.json` — o filme: cores, listas de cores dos bonecos, cenas com as peças (lugar e tempo), o
  mapa, as legendas, música e sons.

## Como trocar a história

Tudo que muda fica em `historia.json`:

- `paleta`: `destaque` (amarelo dos rótulos e da palavra falada), `acento` (laranja), `tinta` (o
  contorno), as cores do mapa e das coisas, e as do Khan (`peleKhan`, `deelKhan`, `chapeuKhan`...).
- `bonecos`: listas de pele, roupa, calça, deel, cabelo, faixa, gorro e pele do gorro; o motor sorteia
  com semente.
- `traco`: `contorno` (px) e a cor e a força da sombra de célula.
- `camera`: `soco` (zoom no corte), `assenta`, `avanco`, `balanco`, `giro`, `clarao` (duração do clarão
  branco no corte) e `claraoForca`; `tremores` e `claroes` de batida (ficam por baixo da legenda).
- `cenas`: cada uma com `de` e `pecas`, troca em corte. Cenário: `fundo`, `ceu`, `faixa`, `morro`,
  `montanhas` (`neve`), `cidade`, `disco`, `nuvem`, `sol`, `ger` (tenda), `ret`, `luz`, `escurece`,
  `cavaleiros`. História: `texto` (`sobe`, `some`, `risco`), `contador`, `multidao` (`liga`, `apaga`),
  `heroi` (`fala`, `ergue`), `janela`, `cientista` (`fala`, `olha`), `tubos` (`enche`), `fila`
  (`acende`), `mapa`, `barras`, `pasta`, `carimbo` (`apaga`, `risco`), `tumulos`, `helice` (`divide`),
  `arvore`, `raiz` (`contorno`, `interroga`).
- `fala: [[de, ate]]` faz a boca mexer nesse trecho; fora dele o boneco sorri.
- `legendas`: `{de, ate, texto}`; o cartão aparece inteiro, a palavra falada fica amarela e a última
  acende 0,55 s antes do fim. Cartão com menos de 0,5 s dá erro ao montar.
- `musica` (`frase`, `baixos`, `maciez`, `corta`) e `sons` (os tempos dos efeitos).

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/cartoon-tv --trabalhadores 3
```

## Medida

600 quadros em **17,71 s** de render (19,1 ms por quadro; 0,89 s de render por segundo de vídeo),
3 navegadores, sem placa de vídeo. Detalhes em `medida.json`. Mesmo filme com 1 e 3 navegadores
(360x640, 600 quadros): mesmos quadros. Som: média -21,3 dB, pico -2,4 dB; a música some de 14,4 a 15,2 s.

## Falta polir

- No mapa, os cavaleiros escurecidos do fundo passam por trás dos nomes das barras (ROMANO, QING).
- Os túmulos são montinhos simples (sem ossadas nem escavadores); a borda amarela deles é só um
  contorno largo.
- Diferente da fonte: lá são imagens geradas por modelo, animadas com profundidade (paralaxe); aqui tudo
  é desenho em código (canvas 2D), sem paralaxe. 20 s em vez de 26 s, sem voz, legenda de 68 px (não 92),
  letras desenhadas em traço (não a fonte da fonte); o Khan aparece em pé num morro, não a cavalo; o
  laboratório, o escritório e a escavação são cenários simples, sem detetive e sem arqueólogos.
