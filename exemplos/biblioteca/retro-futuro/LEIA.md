# retro-futuro — cartaz de ficção científica da era atômica

**O estilo.** Cartaz ilustrado dos anos 50 e 60, otimista e "espacial": céu em degradê de aerógrafo
(teal até creme), planeta com anel, foguete e disco voador de cromo, cidade de agulhas e torres com disco
no horizonte, tudo em teal, creme e laranja, com retícula de impressão, grão, linhas de TV, uma franja
vermelha e ciana nas bordas e cantos escuros. A câmera faz um zoom lento (1,02 a 1,12) andando de lado
(o lado troca a cada cena), e cada cena abre num círculo que cresce do meio em 0,45 s, com aro laranja.

**De onde saiu.** Do filme "Retro-futurism (1950s to 60s atomic age)" da seção "One script, 14 styles" da
biblioteca de estilos da fonte (vídeo `style_retro_julian`). Lá cada cena é uma imagem gerada por IA,
animada com mapa de profundidade; aqui não há modelo nenhum: os seis "cartazes" (cidade, laboratório,
estepe com cavaleiros, mesa de detetive, escavação ao entardecer, céu noturno) são pintados em código
ao montar (`fundos.js`), e as pessoas também (`figuras.js`). A narração virou legenda em português
(tradutor central, encurtada à mão para 20 s, com as 6 batidas); o roteiro e a linha do tempo estão em
`longrun/2026-11-19-motores-biblioteca/roteiro-14-estilos.md` e servem aos 14 estilos da seção.
Gêngis Khan aparece com gorro de pele de copa pontuda, deel de gola cruzada com pele, bigode fino e longo.
Música: arpejo escuro em lá menor de serras desafinadas (com um triângulo por baixo) a 116 bpm e baixo a
cada compasso; para inteira na virada (14,4 a 15,2 s, nota que atravessa o corte acaba nele). Sons:
tique-tique do contador, bips de painel, sopro da íris, subidas, brilhos, arranhão de disco, golpe grave
e brilho longo no fim, tudo feito em código.

**Vertical:** 1080x1920 (desenho), 30 quadros por segundo, 20 s.

**O filme.** "A árvore de família mais famosa do mundo": o contador sobe a 20.000.000 sobre uma multidão
de bustos na planície; linhas de luz ligam todos a um ponto, a multidão vira silhueta e Gêngis Khan surge
sobre raios de sol; no laboratório de cromo, a janela "ESTUDO DO CROMOSSOMO Y" com "2003" e 12 tubos, um
enche de laranja; "1 EM 12" em fichas de pílula, a 8ª acende; o mapa (mar teal, terra creme) se desenha,
a região laranja varre de leste a oeste, o império vermelho cresce de um ponto que pulsa e vira barras; a
pasta "ARQUIVO DO CASO" com o carimbo "CASO ENCERRADO?", que treme, apaga e é riscado ("AINDA NÃO"); corte
para a escavação: túmulos com borda, uma hélice de cromo sobe e se divide em "ESPERADA" e "OUTRA
LINHAGEM"; a árvore de medalhões sob Gêngis Khan, o nome riscado e ele vira contorno com "?" ("OUTRA PESSOA?").

## Arquivos

- `motor.js` — câmera, troca em círculo, tremor, as peças, o acabamento de impressão, legendas e som.
- `fundos.js` — os cartazes pintados (pintados uma vez; as versões desfocadas e escuras também).
- `figuras.js` — o homem da multidão, Gêngis Khan, o medalhão, o foguete e o disco.
- `letras.js` — letras em traços (cópia do marca-autoral, com o `²`); letra que falta dá erro ao montar.
- `historia.json` — o filme: cores, cenas (fundo + peças com lugar e tempo), mapa, legendas, música, sons.

## Como trocar a história

Tudo que muda fica em `historia.json`:

- `paleta`: `laranja` é o destaque; `creme`, `areia`, `teal`, `tealClaro`, `tealEscuro`, `vermelho`, `mar`, `terra`.
- `cenas`: cada uma com `de`/`ate`, `fundo` (`cidade`, `laboratorio`, `estepe`, `mesa`, `escavacao`,
  `noite`), `desfoca` e `escurece` (para pôr painel por cima), `corte: true` (troca seca, sem círculo) e `pecas`.
- peças (`tipo`): `texto` (`sobe`, `some`, `risco`, `cores` por palavra), `contador`, `multidao` (`liga`,
  `apaga`), `heroi` (`contorno`, `interroga`), `janela`, `pasta`, `tubos`, `fila`, `mapa`, `barras`,
  `carimbo`, `tumulos`, `helice`, `arvore`, `foguete`, `disco`. `"cam": true` faz a peça andar com a câmera
  (como parte do cartaz); sem isso ela fica parada na tela (rótulo, painel).
- `camera` (`z0`, `z1`, `anda`), `iris` (segundos), `acabamento` (franja, retícula, grão, linhas), `tremores`.
- `legendas`: `{de, ate, texto}`; cartão com menos de 0,5 s dá erro ao montar.
- `musica` (acordes, padrão, `corta`) e `sons` (os tempos dos efeitos).

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/retro-futuro --trabalhadores 3
```

## Medida

Medido em **360x640** (o tamanho pedido para esta rodada; os outros motores da série mediram em
1080x1920, então os números não se comparam direto): 600 quadros em **12,7 s** de render (15,4 ms por
quadro; 0,63 s de render por segundo de vídeo), 3 navegadores, sem placa de vídeo. Detalhes em
`medida.json`. Mesmo filme inteiro com 1 e 3 navegadores (360x640, 600 quadros): mesmos quadros. Som do
MP4: média -18,1 dB, pico -2,1 dB; no corte da música (14,9 a 15,2 s) -47 dB. Capa `quadro.jpg` em 540x960.

## Falta polir

- O primeiro quadro da escavação (corte seco em 15,2 s) mostra só o fundo: os túmulos ainda vão saltar.
- "ESPERADA" e "OUTRA LINHAGEM" ficam pequenos lá no alto, encostando no anel do planeta.
- Diferente da fonte: lá são imagens geradas por IA com profundidade de verdade (paralaxe, primeiro plano
  balançando); aqui o cartaz é uma camada só, pintada em código, e o movimento vem do zoom, do foguete e do
  disco. As pessoas são bustos simples de cartaz, sem rosto detalhado; não há os geneticistas, a coluna de
  cavaleiros nítida nem as ossadas na cova. 20 s em vez de 26 s; legenda de 64 px (não 92) para caber numa
  linha; letra desenhada em traços, não a letra geométrica da fonte.
