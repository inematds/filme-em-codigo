# mesa-de-mapas — documentário na mesa de mapas

**O estilo.** Um documentário filmado de cima de uma mesa de madeira coberta por um mapa antigo de
papel, sob a luz quente de uma luminária: fotos instantâneas presas com fita, alfinetes com barbante
vermelho, riscos e círculos de caneta vermelha, recortes de jornal, lupa e xícara. Os rótulos são
etiquetas de pergaminho coladas com fita, em letra de máquina de escrever. A câmera deriva devagar
(aproxima de 1,02 a 1,12 e anda de lado, trocando de lado a cada cena), as cenas trocam em fusão de 0,4 s
(ou em corte seco), com vinheta quente e grão fino.

**De onde saiu.** Do filme "Documentary map desk" da seção "One script, 14 styles" da biblioteca de
estilos da fonte (vídeo `style_mapdoc`). Na fonte, o estilo imita um documentarista conhecido. Aqui ficou
só a versão genérica: a mesa, os mapas, os alfinetes, o barbante, a lupa e as fotos, sem rosto, nome
nem marca de ninguém. As pessoas das fotos são figuras simples, sem rosto realista. Gêngis Khan usa
roupa mongol: deel azul fechado na diagonal, faixa na cintura e gorro com aba de pele virada para cima
e copa de feltro com ponta curta. Na fonte o filme é narrado e dura 26 s. Aqui não há voz: a fala virou
legenda em português (pelo tradutor central, encurtada à mão para 20 s, com as 6 batidas). O roteiro e
a linha do tempo são os mesmos dos 14 estilos (`longrun/2026-11-19-motores-biblioteca/roteiro-14-estilos.md`).
Música: frases de flauta soprada na pentatônica de lá menor sobre uma cítara grave e lenta, que
para na virada. Os efeitos são todos feitos em código: tique de máquina de escrever sob o contador, foto
batendo na mesa, alfinete, caneta riscando, carimbo, tambores graves (no gancho, na virada e na
revelação), brilhos, subidas, arranhão de disco e um brilho longo no fim.

**Vertical:** 1080x1920, 30 quadros por segundo, 20 s.

**O filme.** "A árvore de família mais famosa do mundo":
- O contador sobe a 20.000.000 sobre a foto de uma planície, onde 60 pessoas aparecem. O barbante
  vermelho liga todas a um alfinete, e a foto do khan a cavalo bate na mesa com a luz acesa atrás
  ("GÊNGIS KHAN").
- A folha do estudo de 2003 aparece com 12 tubos numa bandeja, e um deles fica vermelho.
- Doze fotos 3x4 entram na mesa. Uma ganha círculo de caneta e alfinete ("1 EM 12").
- O mapa de pergaminho fica sobre a mesa desfocada. A região é hachurada a caneta e o império cresce
  do alfinete, com setas. Depois vêm as barras num cartão.
- Sobre a pasta "ARQUIVO DO CASO", o carimbo "CASO ENCERRADO?" desbota e leva um risco ("AINDA NÃO").
- Na foto da escavação, os túmulos ganham círculos de caneta. A hélice dourada sobe e se divide em
  "ESPERADA" e "OUTRA LINHAGEM".
- Por fim, a árvore de família desenhada a caneta: o nome é riscado e a foto de cima vira contorno com
  "?" ("OUTRA PESSOA?").

## Arquivos

- `motor.js` — a mesa (pronta uma vez), as fotos e seus desenhos, as etiquetas, a caneta, os alfinetes,
  a câmera, a fusão, as legendas e o som.
- `letras.js` — as letras em traços (cópia do papel-cartolina, com o `²`). O motor põe cada letra numa
  célula de largura igual, como na máquina de escrever. Letra que falta dá erro ao montar.
- `historia.json` — o filme: as cores, a mesa (onde ficam as fotos, os alfinetes, o barbante e as rotas),
  as cenas com as peças (lugar e tempo), o mapa, as legendas, a música e os sons.

## Como trocar a história

Tudo o que muda fica em `historia.json`:

- `paleta`: `tinta` (marrom-escuro das letras), `vermelho` (caneta, #c8102e), `pergaminho` (etiqueta),
  `legendaFalada` (palavra falada) e as cores do mapa, da mesa, da pasta e do carimbo.
- `mesa`: o tamanho, o `escuro` (penumbra) e os enfeites fixos (`rotas`, `rodas`, `alfinetes` +
  `barbantes`, `fotos`, `recortes`, `lupas`, `lapis`).
- `cenas`: cada uma tem `de`, `ate`, `luz` (onde fica a luminária), `camera` (`z0`, `z1`, `pan`) e
  `corte: true` para o corte seco (sem ele, a cena entra em fusão de 0,4 s). As peças são:
  - de cenário: `mesa` (`x`, `y` = o ponto da mesa no meio da tela; `borrado`, `escuro`), `xicara`, `lupa`;
  - da história: `foto` (`desenho`: planicie, khan, escavacao, laboratorio, paisagem; `brilho`,
    `tumulos`), `rotulo` (`sobe`, `some`, `risco`, `cor`/`cores`), `contador`, `alfinete`, `multidao`
    (`liga`, `apaga`), `folha`, `tubos` (`enche`), `retratos` (`acende`), `mapa`, `cartao`, `barras`,
    `pasta`, `carimbo` (`apaga`, `risco`), `helice` (`divide`), `arvore` e `raiz` (`contorno`,
    `interroga`).
- `tremores` (a câmera treme, e com ela tudo: fotos, painéis, rótulos) e `claroes` (clarão da
  luminária, por baixo da legenda).
- `legendas`: cada uma é `{de, ate, texto}`. O cartão aparece inteiro, a palavra falada fica vermelha e
  a última acende 0,55 s antes do fim. Cartão com menos de 0,5 s dá erro ao montar.
- `musica`: `flauta` (lista de [nota, tempos]), `baixos`, `quintas` e `corta` (a nota que atravessa o
  corte é encurtada para acabar nele). `sons` guarda os tempos dos efeitos.

Renderizar:

```bash
node ferramentas/render.mjs exemplos/biblioteca/mesa-de-mapas --trabalhadores 3
```

## Medida

600 quadros em **90,65 s** de render (121,8 ms por quadro, 4,53 s de render por segundo de vídeo), com 3
navegadores e sem placa de vídeo. Os detalhes estão em `medida.json`. O filme inteiro a 360x640 com 1 e
com 3 navegadores dá os mesmos quadros. Som: média -22,6 dB, pico -2,6 dB. O corte da música (14,4 a
15,2 s) mede -44 dB a 14,9 s. O MP4 a 1080 sai grande (226,86 MB) por causa do grão, que muda a cada quadro.

## Falta polir

- Diferente da fonte: lá as imagens são geradas por modelo e animadas com profundidade (parallax). Aqui
  tudo é desenho em código (canvas 2D) e as fotos são ilustrações chapadas em tons de foto velha, sem
  parallax dentro delas. O filme tem 20 s em vez de 26 s, com a narração encurtada em legenda (64 px, não
  92). A letra é feita em traços com célula fixa, não uma fonte de máquina de escrever de verdade, e a
  legenda tem até 4 palavras por cartão, não 2 a 3.
- O cavaleiro é simples (corpo reto, perna curta) e a cena do laboratório não tem cientistas: é a folha
  do estudo com os tubos. A escavação não tem arqueólogos.
- O rótulo "ESPERADA" (apagado de propósito) quase some sobre o céu da foto.
