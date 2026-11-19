# guache-hachurado

**O estilo.** Parece uma ilustração de guache e lápis de cor feita quase só de hachura, como um
desenho escaneado que se mexe. Formas enormes e simples (árvores, morros, faixas de chão, água e céu)
enchem quase todo o quadro, e figuras pequenas agem numa tira embaixo. Tudo fica numa família de
cor só, do verde-limão da luz ao verde quase preto da sombra.

**Como funciona.** Cada árvore é uma silhueta chapada, sem contorno, coberta por milhares de traços
curtos e um pouco curvos que descem seguindo a forma, como pelo escovado. Os traços são claros do
lado da luz (esquerda), escuros do lado da sombra e mais fundos na base da copa. Os traços são
sorteados uma vez só. A cada quadro o motor calcula a cor, o vento e o tremor de cada um e junta os
traços em 10 tons, um caminho por tom: assim cabem milhares de traços por quadro sem ficar lento. A
hachura é redesenhada de três em três quadros (tremeluz), as figuras mexem de dois em dois, e o vento
passa em ondas pelos traços e balança as copas pelo alto. Longe = mais chapado e mais azulado. Chão,
água e céu são a mesma peça (`faixas`): bandas chapadas com hachura deitada e, se quiser, riscos
soltos de lápis branco. O título é desenhado em traços (`letras.js`, cópia das letras do motor
quadro-negro), sem depender de fonte instalada. Por fim, papel e grão por cima de tudo.

**Os filmes.** Duas histórias, o mesmo motor. Só a história muda:
- `historia.json`, "A alameda" (9 s): duas pessoas de bicicleta passam por uma alameda de árvores
  gigantes. A de trás, de cachecol, alcança a da frente. Toca a campainha, uma revoada sai de uma
  copa, folhas caem, a sombra de uma nuvem passa pelo gramado. A câmera acompanha de lado e depois
  sobe pelas árvores, e a luz do sol chega nos ciclistas pequenos na borda direita.
- `historia-rio.json`, "Rio lento" (8 s): um remador de camisa vermelha e chapéu de palha atravessa
  o rio num barquinho creme, entre choupos altos. Na outra margem há choupos pequenos com reflexo
  quebrado na água, morros claros, um sol creme e dois pássaros cruzando. A câmera quase parada
  chega perto bem devagar.

São 16:9 (1920x1080), sem fala: na tela só o título no começo. O som é todo feito em código: vento
nas folhas, catraca das bicicletas, campainha, asas e pios, piano (alameda); água, remadas e cordas
dedilhadas (rio).

**Trocar a história.** Tudo o que muda fica no arquivo da história: título, cores (pelo nome), vento,
câmera (cada marca pode mexer só em `x`, só em `y` ou só em `zoom`), quantos quadros a hachura e as
figuras seguram (`segurar`), o som e a lista de `pecas`. As peças são desenhadas na ordem da lista,
cada uma na sua `camada` (1 = anda junto com a câmera; 0,5 = anda metade: é a paralaxe). Tipos de
peça: `faixas` (bandas de chão, água ou céu, com `tracos`, `riscos` e `tufos`), `arvores` (uma
fileira: `lista` de [x, altura, largura, base] ou `gera` sorteado; `perto` de 0 a 1, `ponta` = bala
ou chama, `sombra` no chão, `reflexo` na água), `juncos`, `ciclista` (posição por tempo, roupa,
chapéu `bone` ou `palheta`), `barco` (posição por tempo, ritmo da `remada`), `passaros`, `folhas`,
`sol`, `morros`, `sombra-nuvem`, `luz`, `sino` (só som) e `titulo`. Copie um arquivo, mude e rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/guache-hachurado --historia minha-historia.json
```

**De onde saiu.** Dos filmes "The Avenue" (estilo "Hatched gouache illustration") e "Slow River"
(o mesmo motor reaproveitado, "Gouache and hatched brush, reused engine") da biblioteca de estilos da
fonte. As árvores, os ciclistas, o barco e o remador daqui são desenhos novos e genéricos, feitos em
código.

**Tempo de render medido** (`medida.json` e `medida-historia-rio.json`, 3 navegadores, sem placa de
vídeo):
- alameda: 85,2 s para 9 s de filme (270 quadros, 265 ms por quadro). MP4 de 43,2 MB. Som: média
  -16,0 dB, pico -1,5 dB.
- rio: 49,9 s para 8 s de filme (240 quadros, 163 ms por quadro). MP4 de 18,3 MB. Som: média
  -18,8 dB, pico -1,4 dB.

O MP4 é grande porque a hachura muda a cada três quadros: o vídeo não consegue repetir quase nada.

**Falta polir.**
- Na alameda, as copas da frente são mais largas e cheias embaixo do que as "balas" da fonte, e os
  vãos escuros entre as árvores aparecem menos.
- A hachura das copas é mais grossa, mais inclinada e de mais contraste que na fonte, onde os
  traços são finos, longos e quase em pé.
- Os juncos do rio são mais ralos e mais finos que na fonte.
- O rio tem 8 s (a fonte tem 5 s), porque o kit pede de 8 a 12 s.
