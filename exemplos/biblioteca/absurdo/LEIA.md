# absurdo — cartoon absurdo de olhos esbugalhados

**O estilo.** Desenho absurdo e engraçado: a linha parece feita à mão e "ferve" (treme 8 vezes por
segundo), tudo tem olhos esbugalhados (nuvem, sol, montanha, tubo de ensaio, pote, xícara, túmulo,
cavalo, bandeira, até o cromossomo Y), as cores são pastel de bala e os bonecos têm cabeça enorme e
corpo pequenino. Piadas visuais: um peixe nadando no céu, uma lupa com um olho gigante dentro da lente.
A câmera é de mola: a cada troca de cena o zoom quica e assenta, e o quadro balança devagar 1,2 grau;
as cenas trocam por um círculo que abre do meio em 0,35 s. Rótulos rosa com borda branca, tortos
4 graus e balançando; o destaque é violeta.

**De onde saiu.** Do filme "Quirky absurd (Absurdist cartoon)" da seção "One script, 14 styles" da
biblioteca de estilos da fonte (vídeo `style_quirky`). Recriamos o JEITO com bonecos próprios:
nenhum personagem de série. Lá as imagens são geradas por modelo e animadas com mapa de profundidade;
aqui tudo é desenhado em código (canvas 2D), sem modelo. Gêngis Khan usa roupa mongol: gorro de pele
(copa de feltro com ponta, aba de pele virada para cima, borla vermelha) e deel azul com borda dourada
que fecha na diagonal. Lá o filme é narrado e tem 26 s; aqui não há voz: a fala virou legenda em
português (tradutor central, encurtada à mão para 20 s, com as 6 batidas). Roteiro e linha do tempo:
`longrun/2026-11-19-motores-biblioteca/roteiro-14-estilos.md` (o mesmo dos 14 estilos).
Música: cítara dedilhada em lá menor pentatônica a 120 bpm, baixo de cítara e taiko macio, que para na
virada ("AINDA NÃO") e volta no corte dos túmulos. Sons: tique-tique do contador, galope de cascos no
começo e sob o exército, "boing" quando as peças saltam, brilhos, subidas, arranhão de disco, golpe
grave e brilho longo com tambor fundo no fim, tudo feito em código.

**Vertical:** 1080x1920, 30 quadros por segundo, 20 s.

**O filme.** "A árvore de família mais famosa do mundo": o contador sobe a 20.000.000 sobre 60 bonecos
de cabeção; linhas ligam todos a um só, e o Khan surge a cavalo ("GÊNGIS KHAN"); no laboratório, a
janela do estudo de 2003 e 12 tubos de olhos esbugalhados, um enche de violeta; "1 EM 12" com um boneco
aceso; sobre o exército borrado e escurecido, o mapa pastel se desenha, a região varre de leste a oeste,
o império cresce de um ponto que pulsa e vira barras; na mesa do detetive, o carimbo "CASO ENCERRADO?"
bate, treme, apaga e é riscado ("AINDA NÃO"); túmulos de olhos esbugalhados e uma hélice que se divide
em "esperada" e "outra linhagem"; a árvore de família, o nome riscado e a raiz que vira contorno com "?"
("OUTRA PESSOA?").

## Arquivos

- `motor.js` — o tremido da linha, os olhos esbugalhados, os bonecos de cabeção, todas as peças, a
  câmera de mola, o círculo da troca de cena, as legendas e o som.
- `letras.js` — as letras em traços (cópia do marca-autoral, com o `²`). Letra que falta dá erro ao montar.
- `historia.json` — o filme: cores, cenas com as peças (lugar e tempo), o mapa, as legendas, música e sons.

## Como trocar a história

Tudo que muda fica em `historia.json`:

- `paleta`: `destaque` (rosa dos rótulos e da palavra falada), `acento` (violeta), `fio` (o fio escuro
  por fora da borda branca dos rótulos), as cores do mapa (`mar`, `terraMapa`, `linhaMapa`, `regiao`,
  `imperio`) e as do Khan.
- `traco`: `contorno`, `tremido` (quanto a linha treme, em px) e `passos` (trocas por segundo).
- `camera`: `mola` (quanto o zoom quica na troca), `amortece`, `freq`, `giro` (graus do balanço),
  `circulo` (tempo do círculo da troca). Cena com `"corte": true` troca seco, sem círculo.
- `cenas`: cada uma com `de`/`ate` e `pecas`. Peças: `texto` (`cores` por palavra, `sobe`, `some`,
  `risco`), `contador`, `multidao` (`liga`, `apaga`), `heroi` (`cavalo`), `janela`, `cientista`, `tubos`
  (`enche`), `potes`, `fila` (`acende`), `mapa`, `desfoca` + `escurece` (fundo atrás do painel), `barras`
  (`atraso` entre elas), `pasta`, `carimbo`, `xicara`, `lupa`, `luz`, `tumulos`, `helice` (`divide`),
  `arvore`, `raiz`, e o cenário (`ceu`, `sol`, `nuvem`, `peixe`, `montanhas` com `olhos`, `morro`, `ger`,
  `bandeiras`, `cavaleiros`, `faixa`).
- `tremores`, `claroes` (por baixo da legenda), `escurece` (quando o fim escurece).
- `legendas`: `{de, ate, texto}`; cartão com menos de 0,5 s dá erro ao montar. Rótulo largo demais para
  o quadro também dá erro (com a largura medida).
- `musica` (frase, baixos, `corta`: a nota que atravessa o corte acaba nele) e `sons` (tempos dos efeitos).

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/absurdo --trabalhadores 3
```

## Medida

600 quadros em **20,9 s** de render (24,8 ms por quadro; 1,04 s de render por segundo de vídeo),
3 navegadores, sem placa de vídeo, a 1080x1920. Detalhes em `medida.json`. Mesmo filme com 1 e 3
navegadores (360x640, 600 quadros): mesmos quadros. Som: média -21,0 dB, pico -2,4 dB; logo depois do
arranhão a música fica em silêncio (-46,7 dB).

## Falta polir

- Na última cena, o morro de trás mostra um lado reto (mudança de verde vertical) atrás da árvore.
- O cavalo do Khan ficou pequeno perto do cavaleiro (cabeção) e parado; as patas não andam.
- A legenda "COM QUASE O MESMO Y" quebra em duas linhas e deixa o "Y" sozinho embaixo.
- Na primeira cena, o morro da esquerda mostra um lado reto antes da multidão encher o quadro.
- Os rótulos "ESPERADA" e "OUTRA LINHAGEM" ficam pequenos no alto do céu roxo.
- Diferente da fonte: tudo desenhado em código em vez de imagens geradas com profundidade (não há
  parallax de verdade, só a câmera de mola e o borrão no fundo do mapa); 20 s em vez de 26 s, com a
  narração em legenda; letras em traços em vez da fonte da fonte; não há ossada nos túmulos nem
  arqueólogos, e a árvore final é um diagrama de medalhões, não uma árvore gigante com tronco.
