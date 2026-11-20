# dados-3d — explicativo de dados em 3D

**O estilo.** Jornalismo de dados em 3D: fundo azul-marinho quase preto, chão escuro com uma grade azul
fraca, milhares de bonequinhos iguais, um mapa feito de colunas quadradas que sobem e mudam de cor, barras
3D com o valor flutuando em cima, uma hélice de contas que gira e um grafo de nós. Três cores que brilham
(ouro, ciano e vermelho), sem traço de nanquim e sem desfoque; números e títulos em letra grossa por cima.

**Como funciona.** É um mundo three.js (sem placa de vídeo). As coisas repetidas (a multidão, as colunas do
mapa, as contas da hélice, os nós da árvore) são UMA peça desenhada muitas vezes (instâncias), e a posição,
o tamanho e a cor de cada uma saem só do tempo `t`. Cada batida é um grupo; só o da vez fica visível, com
corte seco entre as batidas e a câmera deslizando dentro de cada uma. O mapa sai dos contornos de
`historia.json` (Eurásia, região e império em longitude/latitude), virado em quadradinhos de 2,5° ao montar.
Por cima do 3D vai uma folha 2D com os números, os títulos, os rótulos presos às peças (valor das barras,
nome dos ramos, o "?") e a legenda, em letras de traço (`letras.js`), sem depender de fonte instalada.
O filme é narrado na fonte: aqui a fala vira legenda, a palavra "falada" em amarelo. Sem voz.
Ao montar, o motor dá erro se faltar letra em `letras.js` (legendas, títulos, contador, barras, rótulos)
ou se uma legenda ficar menos de 0,5 s inteira na tela.
Arquivos: `motor.js` (mundo, peças, câmera, folha 2D e som), `letras.js`, `historia.json`, `index.html`.

**O filme.** "A árvore de família mais famosa do mundo", 20 s, em pé (1080x1920), o mesmo roteiro dos
14 estilos: contador sobe a 20.000.000 sobre um campo de cerca de 3.600 bonequinhos; cerca de 500 raios dourados ligam a
multidão a um ponto, ela apaga e o herói dourado aparece numa coluna de luz; laboratório com hélice ciano
girando e 12 tubos (o 8º enche de ouro); "1 EM 12" numa roda de 12 bonecos (o 8º acende); o mapa de colunas
se desenha, a região sobe em ouro de leste a oeste, anéis, o ponto pulsa na Mongólia e o império se espalha
em vermelho; o mapa sobe inclinado e entram 4 barras 3D (Mongol 24,0 · Russo 22,8 · Qing 14,7 · Romano 5,0);
"CASO ENCERRADO?" torto sobre o mapa, e em "AINDA NÃO" clarão branco, tremor de 8 quadros, a música corta, as
colunas de ouro desabam em cinza e um risco vermelho atravessa o carimbo; túmulos no mapa escurecido, hélice
ciano que sobe e se divide em "ESPERADA" e "OUTRA LINHAGEM"; árvore de nós sob a raiz dourada, risco no nome,
e a raiz vira um anel ciano com "?" e "OUTRA PESSOA?".
Som feito em código: arpejo escuro de serras a 116 bpm com baixo a cada compasso (some de 14,4 a 15,2 s),
tique-tique do contador, golpe no herói e no carimbo, brilhos, subidas que terminam em "12" e em
"espalhou-se", arranhão de disco na virada, golpe grave em "outra linhagem" e brilho longo em "outra pessoa".

**Trocar a história.** Tudo o que muda fica em `historia.json`:

- `paleta` (cores), `luz` (céu, chão, sol e o `brilho` das colunas), `tremores`, `claroes` e `escuro` (fim).
- `mapa`: tamanho do quadradinho e os tempos do contorno, da região, dos anéis, do ponto que pulsa, do
  império e do desabamento; `terra`: os contornos em longitude/latitude.
- `cenas`: cada batida com `de`/`ate`, `fov`, `neblina`, as chaves da `camera` (`[segundo, [posição], [para onde olha]]`)
  e as `pecas` com lugar e tempo — no 3D `multidao` (com `liga` = os raios), `heroi`, `palco`, `helice`
  (`varre` = plano de varredura, `divide` = os dois ramos), `tubos` (`enche`), `roda` (`acende`), `mapa`
  (`sobe`, `escurece`), `barras`, `tumulos`, `arvore` (`apaga`, `vira`); na folha 2D `texto` (`risco`, `apaga`),
  `contador` e `carimbo`.
- `legenda` e `legendas` (texto com `de` e `ate`); `musica` e `sons` (as horas dos sons-chave).

```bash
node ferramentas/render.mjs exemplos/biblioteca/dados-3d --historia minha-historia.json
```

**De onde saiu.** Do filme "3D data" da seção "One script, 14 styles" da biblioteca de estilos da fonte
(o roteiro de Gêngis Khan). A narração foi traduzida uma vez pelo tradutor central e encurtada à mão para 20 s;
linha do tempo, legendas e sons-chave são os mesmos dos outros 13 estilos.

**Tempo de render medido** (`medida.json`): 51,3 s para 20 s de filme (600 quadros, cerca de 70,5 ms por
quadro, 3 navegadores, sem GPU; numa rodada anterior, com a máquina mais ocupada, deu 82 s). O MP4 sai com cerca de 13,17 MB. Os quadros dão o mesmo resultado com 1 e
com 3 navegadores (conferido no filme inteiro em 360x640). Som: média -19,9 dB, pico -2,1 dB; os segundos
mais altos são o arranhão (14 s), o herói (3 s) e o golpe grave (16 s).

**Diferente da fonte**
- A fonte tem 26 s e corta nos tempos da voz dela; aqui são 20 s com a linha do tempo comum dos 14 estilos.
- A multidão tem cerca de 3.600 bonecos (a fonte fala em 9.900). No laboratório a fonte só tem a hélice com
  o plano de varredura, sem tubos de ensaio, e marca os túmulos com um alfinete — aqui ficam 12 tubos e
  4 túmulos com borda branca, porque o roteiro comum pede.
- Mapa e barras ficam no mesmo plano (o mapa sobe inclinado e as barras entram na frente); na fonte são dois planos.
- As letras são traços grossos de ponta redonda, não a fonte Inter/Poppins da fonte.

**Falta polir**
- No plano dos túmulos a câmera fica perto do mapa e as colunas da frente viram blocos grandes; os
  túmulos escuros quase não se destacam do chão.
- Enquanto o mapa sobe (11,8 a 12,4 s) ele passa por trás de "MAIOR IMPÉRIO EM TERRA".
- No "CASO ENCERRADO?" a batida (de 2x para 1x) corta as pontas do texto nos primeiros quadros.
- A última fileira da árvore encosta nas bordas do quadro.
