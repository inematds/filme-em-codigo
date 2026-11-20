# retrato-ilustrado

**O estilo.** Um retrato ilustrado de meio corpo, de traço fino marrom e cor chapada, na luz quente
do fim da tarde. O desenho fica parado como uma ilustração, e só as coisas pequenas ganham vida:
cabelo e brincos na brisa, respiração, piscada, olhar, sobrancelha e sorriso.

**Como funciona.** A moça é desenhada em código (`moca.js`): contorno fino, cor de base, uma sombra
chapada (o sol vem da direita) e um brilho. A cabeça é um pouco mais larga e o corpo um pouco maior
que a cabeça, como em ilustração. O que mexe é pouco, como numa marionete de imagem: as pontas do
cabelo balançam com uma onda que desce (nada na raiz, quase tudo na ponta), os brincos são
pêndulos presos no gancho, a pálpebra desce entre a curva de cima e a de baixo do olho, a íris
anda de lado, a sobrancelha sobe um pouco e os cantos da boca sobem no sorriso. No fundo só a luz
anda: manchas de folha e um sol quente que escorrega devagar na parede, nunca na pele.
São dois planos: o aberto com um empurrão bem lento (3%) e um corte seco para o close do rosto
(3,4x). O close é a mesma cena com a câmera perto, então nada entra nem some no corte. O traço
nunca fica menor que 1 pixel: abaixo disso ele segura 1 pixel e fica mais claro. O título é
desenhado em traços (`letras.js`, cópia das letras do motor quadro-negro). Por cima, grão de papel
e uma vinheta quente.

**Os filmes.** Três histórias, o mesmo motor. Só a história muda:
- `historia.json`, "Luz da tarde, cabelo ruivo" (9 s): moça ruiva de vestido vermelho de bolinhas
  e brincos de disco dourado, ao lado de uma porta azul, parede creme com luz de janela e sombra de
  folhas. No aberto ela pisca e olha de lado; no close volta o olhar para a câmera, pisca, ergue a
  sobrancelha e sorri.
- `historia-mar.json`, "Luz da tarde, à beira-mar" (9 s): a mesma moça e a mesma atuação num
  calçadão: mureta caiada, mar turquesa com brilhos, morro azulado ao longe, duas nuvens e um galho
  de buganvília que balança no alto à direita.
- `historia-vestido.json`, "Luz da tarde" (9 s): moça loira de coque com mechas soltas e vestido
  claro de bolinhas, ao lado de uma porta azul larga.

São 16:9 (1920x1080), 24 quadros por segundo, sem fala: na tela só o título no começo. O som é
todo feito em código: ar quente, brisa e folhas (ou o mar e gaivotas), uma nota grave em fá por
baixo e duas notas de piano (lá e dó) no sorriso.

**Trocar a história.** Tudo o que muda fica no arquivo da história: título, cores (pelo nome), os
dois `planos` (o close acha o rosto sozinho pelo `foco`, em relação à cabeça), a moça (`moca`:
lugar, tamanho, `penteado` `longo` ou `coque`, cores de pele, cabelo, olhos, boca, brincos e
vestido), a `atuacao` (piscadas, olhar, sobrancelha, sorriso, ritmo da respiração, brisa e
rajadas, brincos), o som (lista de `eventos`, com tempo em segundos ou pelo nome: `corte`,
`sorriso`) e a lista de `pecas` do cenário: `parede`, `recorte` (luz da janela ou sombra, com
caixilhos), `manchas` (sombra de folhas que anda), `sol`, `porta`, `ceu`, `nuvem`, `morro`, `mar`,
`muro`, `buganvilia` e `moca`. Copie um arquivo, mude e rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/retrato-ilustrado --historia minha-historia.json
```

**De onde saiu.** Dos filmes "Afternoon Light, red hair", "Afternoon Light, by the sea" (o mesmo
motor reaproveitado) e "Afternoon Light" da biblioteca de estilos da fonte (estilo "Illustrated
character portrait"). Na fonte, uma ilustração pronta é animada sem ser redesenhada; aqui a
personagem e os cenários são desenhos novos, feitos em código.

**Tempo de render medido** (`medida.json`, `medida-historia-mar.json`, `medida-historia-vestido.json`;
3 navegadores, sem placa de vídeo, 216 quadros cada):
- cabelo ruivo: 24,0 s para 9 s de filme (94 ms por quadro). MP4 de 4,2 MB. Som: média -18,1 dB,
  pico -1,6 dB.
- à beira-mar: 25,26 s (98,2 ms por quadro). MP4 de 3,96 MB. Som: média -16,9 dB, pico -1,7 dB.
- vestido claro: 23,4 s (92 ms por quadro). MP4 de 3,7 MB. Som: média -17,3 dB, pico -1,7 dB.

**Falta polir.**
- O rosto é mais simples que o da fonte e fica quase de frente (na fonte é de três quartos): menos
  sombra macia, olho e cílio menos desenhados, e a moça fica com ar de boneca. O branco do olho sai
  acinzentado no close (a sombra da pálpebra pega o olho todo).
- O cabelo comprido parece um capacete no alto da cabeça, as pontas de baixo saem pontudas como
  chama, e alguns fios soltos na têmpora esquerda parecem riscos no close.
- No close o pescoço fica comprido, e a orelha da moça de coque aparece como uma mancha clara.
- No close do mar, uma lasca da nuvem da esquerda fica na borda do quadro.
- Os três filmes têm 9 s (na fonte são 6, 5 e 6 s), porque o kit pede de 8 a 12 s.
