# plano-minimalista

**O estilo.** Ilustração plana e minimalista, com ar de gravura japonesa: um campo de cor enorme,
do verde enevoado em cima ao verde-azulado fundo embaixo, sem linha do horizonte, quase todo vazio.
Poucas formas chapadas, de borda limpa e sem contorno, numa paleta curta (o verde-azulado, um coral,
um creme e um quase-preto), com grão fino de impressão e papel por cima de tudo.

**Como funciona.** O campo, a névoa e o grão são feitos uma vez só, no começo. A cada quadro o motor
desenha por cima: faixas claras e quebradas que deslizam na água, folhas de lírio coral (com o corte,
as nervuras finas e a sombra verde-escura deslocada), a sombra de uma carpa passando, uma mulher
pequena vista de costas, a sombra comprida e o reflexo dela (a mesma figura de cabeça para baixo, em
fatias que tremem), anéis finos que abrem a cada passo, uma libélula vermelha e uma pétala creme.
A mulher, a libélula, a pétala e as folhas trocam de pose de dois em dois quadros; a câmera chega
perto bem devagar, e as folhas da frente andam mais que o resto (paralaxe). O título é desenhado em
traços (`letras.js`, cópia das letras do motor quadro-negro), sem depender de fonte instalada.

**O filme.** Uma mulher de quimono coral, de costas, dá dois passos lentos para a esquerda na água
rasa; cada pé abre anéis na água e uma folha pequena é empurrada. Uma libélula atravessa aos pulos, a
sombra de uma carpa passa perto das folhas. No fim, uma pétala creme cai do alto, ela levanta a
cabeça para a distância vazia, a pétala pousa e um último anel se abre. São 9 s em 16:9 (1920x1080),
sem fala: na tela só o título no começo. O som é todo feito em código: ar, água, passos na água,
algumas cordas dedilhadas e um sino baixinho quando a pétala pousa.

**Trocar a história.** Tudo o que muda fica em `historia.json`: título, cores (`campo` é a lista de
tons do degradê, de cima para baixo), quanto cada camada chega com a câmera (`camadas`), a câmera e a
lista de `pecas`, cada uma com lugar e tempo: névoa, ondas, `folhas` (um aglomerado sorteado abaixo de
uma linha diagonal), `folha` solta (com `empurra` opcional), carpa, mulher (`passos` = início, fim e
quanto anda; `levanta` = quando ergue a cabeça), libélula (`pulos` = tempo, x, y), pétala (`cai`,
`de`, `pousa`) e título. Em `som` ficam o volume do ar e da água e as notas das cordas. Copie o
arquivo, mude e rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/plano-minimalista --historia minha-historia.json
```

**De onde saiu.** Do filme "Shallows" (estilo "Flat minimalist illustration") da biblioteca de
estilos da fonte. A mulher, as folhas, a libélula e a carpa daqui são desenhos novos, feitos em código.

**Tempo de render medido** (`medida.json`): 30,32 s para 9 s de filme (270 quadros, 93,1 ms por quadro,
3 navegadores, sem placa de vídeo). O MP4 tem 5,68 MB. Som: média -16,8 dB, pico -1,3 dB.

**Falta polir.**
- Quando ela levanta a cabeça (de 6,7 s a 7,7 s), o lenço creme encolhe para um gorrinho no alto em
  vez de a cabeça inclinar para trás; lê como "o lenço mudou", não como "ela olhou para cima".
- A sombra da carpa passa quase toda embaixo do aglomerado de folhas e só aparece de verdade perto
  dos 8 s, já saindo.
- O lenço cobre a cabeça como um gorro; na fonte, ele é um pano amarrado mais solto.
- O campo é um pouco mais azulado e a névoa mais manchada que na fonte.
