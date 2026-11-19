# pastel-seco

**O estilo.** Personagem em guache de giz e pastel seco, sem contorno nenhum: cada forma é uma
mancha chapada e fosca, de borda quebrada e pontilhada, coberta de pó de pigmento com pintinhas
claras e escuras. O volume vem de poucas pinceladas secas (as cerdas falham); a lã e as pontas do
cabelo soltam fiapos, e as bochechas têm blush pontilhado e sardas.

**Como funciona.** O `seco.js` é o pincel: mancha de borda quebrada (`forma`), pincelada seca
(`pincel`), fiapos (`fibras`), nuvem de pontinhos (`pontilha`) e o pó de pigmento (`grao`, feito em
pixels da tela, para a pinta nunca ficar menor que 1 pixel). O motor desenha a personagem em busto
sobre um azul chapado e uma faixa creme embaixo. A pose muda de 2 em 2 quadros; a textura (borda,
cerdas, pó) é sorteada de novo a cada 3 quadros, então tudo "ferve" como desenho refeito à mão. As
molas (laço do cabelo, fiapos, óculos que quicam) são contas a partir das horas das ações, nada é
guardado de um quadro para outro. A lata fica presa à boca pelo canudo enquanto ela bebe (a conta
parte da boca, depois da cabeça girar), e só depois desce para o lugar de repouso. Câmera única,
chegando bem devagar. O título é desenhado em traços (`letras.js`, cópia das letras do motor
quadro-negro), sem depender de fonte instalada.

**O filme.** Uma menina de cabelo laranja curto com franja, presilha amarela e óculos redondos de
aro branco, de suéter azul-marinho de gola rulê, toma refrigerante de canudo numa lata vermelha lisa
(sem marca). A bebida sobe pelo canudo, ela dá dois goles, solta o canudo e baixa a lata; acena com
a cabeça, os óculos escorregam no nariz e os olhinhos aparecem por cima do aro; ela pisca e depois
inclina a cabeça de olhos fechados, com um sorriso maior. 6 s em 16:9 (1920x1080), sem fala: na tela
só o título "UM GOLE" no começo. Som feito em código: acordes preguiçosos de piano elétrico com baixo
macio, o chiado do gás, o gole no canudo, as duas engolidas, um respiro, o clique dos óculos, um
tique na piscada e um sininho no sorriso.

**Trocar a história.** Tudo o que muda fica em `historia.json`: título, duração, cores, câmera
(pontos-chave com `x`, `y`, `zoom`), `ferve` (de quantos em quantos quadros a textura muda), as
`acoes` com as horas (gole e engolidas, solta, aceno com o quanto os óculos escorregam, piscadas,
inclina, respiração) e a lista de `pecas`, cada uma com lugar: suéter (pontos e dobras), pescoço,
cabeça (pivô) com cabelo, rosto, bochechas, olhos, boca, franja, presilha, laço, fiapos e óculos;
gola, manga, lata (tamanho, canudo, boca e repouso), faixa e título (texto, lugar, quando entra e
sai). A música (acordes, baixo, melodia, sino) também. Copie o arquivo, mude e rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/pastel-seco --historia minha-historia.json
```

**De onde saiu.** Do filme "Fizz" (estilo "Chalky pastel character illustration") da biblioteca
de estilos da fonte. A menina daqui é desenhada do zero, em código; a lata é lisa, sem a marquinha
do filme da fonte. O filme da fonte tem 5 s; este tem 6 s (o título pede um pouco mais de tempo).

**Tempo de render medido** (`medida.json`): 25,6 s para 6 s de filme (180 quadros, 116 ms por
quadro, 3 navegadores, sem placa de vídeo). O MP4 tem 56,2 MB (o pó de pigmento que ferve pesa na
compressão). Som: média -16,0 dB, pico -4,0 dB. Mesmo `quadros.sha256` com 1 e 3 navegadores
(filme inteiro em 640x360).

**Falta polir.**
- A 640x360 o pó de pigmento fica bem mais pesado que em 1920 (as pintas têm tamanho fixo em
  pixels da tela) e o sorriso aberto vira uma bolinha vermelha.
- O cabelo é mais "capacete" que o da fonte: a franja quase não se separa do resto, e as mechas
  são riscos parecidos, todos abrindo do mesmo ponto.
- A manga do braço se mistura com o corpo do suéter (mesmo azul); só o vinco escuro separa.
- Os olhinhos aparecem de uma vez quando os óculos escorregam (estavam escondidos atrás das lentes);
  na fonte os olhos sobem um pouco junto com a cabeça.
- Com a lata em repouso, a base dela e a mão ficam um pouco atrás da faixa creme; na fonte a lata
  fica toda acima da faixa.
- A 640x360 os olhinhos que espiam por cima do aro parecem duas sobrancelhas bravas.
- Não há o "ahh" da fonte (sem voz): virou um respiro de ruído.
