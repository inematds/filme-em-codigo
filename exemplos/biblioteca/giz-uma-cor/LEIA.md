# giz-uma-cor

**O estilo.** Parece um desenho de giz de cera de uma cor só (azul) em papel creme, impresso como
uma gravura de uma tinta e fotografado quadro a quadro. Só existem duas marcas: sombra cheia de giz,
com borda seca e quebrada e o risco na direção do traço, e linha fina que engrossa e afina; tudo o
que é luz fica papel em branco.

**Como funciona.** O desenho é "em três": cada pose fica 3 quadros e é desenhada de novo, então a
borda do giz e os contornos brilham um pouco. Toda a tinta vai numa camada à parte, sempre opaca
(giz sobre giz não escurece, não há cinza). O dente do papel é apagado dessa camada (os pontinhos
de papel no meio do azul) e só então ela é colada no papel. A peça da frente (a moça) apaga a tinta
que está atrás dela, então o capim de trás não aparece através da saia. Uma conta só, o `sopro`,
manda no vento: a rajada entra pela esquerda e anda para a direita, e cada touceira, a saia, a faixa,
o cabelo e as folhinhas sentem o vento quando ela chega. O título é escrito em traços (`letras.js`,
cópia das letras do motor quadro-negro), sem depender de fonte instalada. Câmera parada.

**O filme.** "Contra o vento", 6 s em 16:9 (1920x1080), sem fala: na tela só o título no começo.
Uma moça de perfil, mão no bolso, está parada no capim alto. Ela pisca; uma rajada entra pela
esquerda, o capim deita numa onda que atravessa a folha, folhinhas voam pelo papel vazio; a saia
cola na frente das pernas e enfuna para trás, o cabelo e as pontas da faixa voam; ela ergue o rosto
para o vento, respira fundo e fecha os olhos; tudo assenta. O som é todo feito em código: um vento
baixo de fundo, a rajada, o capim chiando, a saia batendo, o fôlego e quatro notas suaves de piano.
(O vento não anda da esquerda para a direita no som: o `vento` do `som.js` não tem lado.)

**Trocar a história.** Tudo o que muda fica em `historia.json`: título, cores (`papel` e `tinta`,
a única cor), grossura e tremor da linha e da borda, quantos quadros cada pose fica (`segurar`), o
`vento` (quando entra, velocidade, força e quando assenta), e a lista de `pecas` com lugar e tempo:
`titulo` (posição, quando escreve e quando sai), `touceira` (onde, largura, altura, quantas folhas
largas, capins e hastes com sementes), `mulher` (onde, tamanho, piscadas, quando ergue o rosto,
quando fecha os olhos, quando respira) e `folhinhas` (quantas, quando entram, em que faixa de altura
e com que velocidade). As notas do piano ficam em `musica`. Copie o arquivo, mude e rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/giz-uma-cor --historia minha-historia.json
```

**De onde saiu.** Do filme "Into the Wind" (estilo "One-colour crayon print") da biblioteca de
estilos da fonte. A moça, o capim e as folhinhas daqui são desenhos novos, feitos do zero.

**Tempo de render medido** (`medida.json`): 15,5 s para 6 s de filme (180 quadros, 57 ms por
quadro, 3 navegadores, sem placa de vídeo). O MP4 tem 7,0 MB. Mesmo filme inteiro em 640x360 com
1 e com 3 navegadores deu o mesmo `quadros.sha256`.

**Falta polir.**
- O cabelo parado parece um capuz: uma massa arredondada atrás do rosto, sem pontas soltas.
- Quando o título sai, as letras somem do começo para o fim e por um instante sobra meia letra.
- A rajada chega na moça perto de 2,7 s; no filme da fonte o cabelo já voa antes da metade.
- O rosto erguido é pequeno (0,2 rad); de longe quase não se vê ela levantar o queixo.
