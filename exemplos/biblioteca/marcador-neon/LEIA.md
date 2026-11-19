# marcador-neon

**O estilo.** Parece um desenho à mão fotografado em papel de aquarela (com o dente do papel e a luz
da janela caindo para os cantos): linha de marcador azul grosso, de ponta redonda, um ou dois
preenchimentos grandes de giz de cera laranja neon rabiscados numa diagonal só, pontinhos de
marcador rosa e uns detalhes de caneta preta fina. Quase tudo fica papel em branco.

**Como funciona.** O desenho é "em três": cada pose fica 3 quadros, e a cada pose tudo é desenhado
de novo. A linha treme um pouco (boil), o rabisco do giz muda e o dente do papel também (o motor faz
3 folhas no começo e alterna entre elas). O giz é feito numa camada à parte: rabisco diagonal, depois
os pontos altos do papel são apagados dele (os pontinhos brancos), e a camada é colada no desenho.
Onde uma peça fica na frente de outra, o motor tapa o fundo com o próprio papel antes de desenhar.
O título é escrito em traços (`letras.js`, cópia das letras do motor quadro-negro), sem depender de
fonte instalada. Câmera parada.

**O filme.** "Só mais um gole", 6 s em 16:9 (1920x1080), sem fala: na tela só o título no começo.
Uma moça de cabelo cacheado e faixa azul, de suéter laranja enorme, está largada numa cadeira baixa
de lona, com as pernas esticadas e um cacto ao lado. Ela pisca, leva o copo até a boca, dá dois goles
no canudo, abaixa o copo, joga a cabeça para trás e engole, o pé de cima balança duas vezes (o laço
rosa do tênis chacoalha e assenta), e ela pisca e olha para o lado. O som é todo feito em código:
piano elétrico preguiçoso com baixo, canudinho, gole, duas batidas do pé e um "tic" na olhada.

**Trocar a história.** Tudo o que muda fica em `historia.json`: título, cores (papel, azul,
laranja, rosa, preto), grossura do marcador e da caneta, quanto a linha treme, quantos quadros cada
pose fica (`segurar`), e a lista de `pecas` com lugar e tempo: `titulo` (posição, quando escreve e
quando sai), `vaso`, `cadeira` e `pessoa` (onde fica, quando pisca, quando o copo sobe, os goles,
quando desce, quando a cabeça vai para a frente, para trás e volta, quando engole, os balanços do pé
e quando olha para o lado). As notas do piano e do baixo ficam em `musica`. Copie o arquivo, mude e
rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/marcador-neon --historia minha-historia.json
```

**De onde saiu.** Do filme "Last Sip" (estilo "Marker line and neon crayon") da biblioteca de
estilos da fonte. A moça, a cadeira, o cacto e o copo daqui são desenhos novos e genéricos (sem
marca no copo nem no tênis).

**Tempo de render medido** (`medida.json`): 22,8 s para 6 s de filme (180 quadros, 100 ms por
quadro, 3 navegadores, sem placa de vídeo). O MP4 tem 10,8 MB. Mesmo filme inteiro em 640x360 com
1 e com 3 navegadores deu o mesmo `quadros.sha256`.

**Falta polir.**
- O balanço do pé é pequeno (0,12 rad): na tela inteira quase não se vê o pé subir; o laço rosa é
  o que mais mostra o movimento.
- O braço não aparece separado do suéter: a manga é laranja sobre laranja, só os vincos azuis
  sugerem o braço.
- Os tênis ficaram arredondados demais (parecem um pouco luvas) e a barra da calça quase some.
- Em 640x360 o dente do papel fica mais grosso e marcado que em 1920x1080.
