# colagem-papel

**O estilo.** Parece uma colagem de papel recortado fotografada quadro a quadro: cada coisa na tela
é um pedaço de papel (colorido, pardo, jornal com letras ilegíveis, quadriculado, marmorizado, seda,
retícula, estampado), cortado à tesoura ou rasgado com fiapo branco na borda, com a sua sombra. As
peças tremem um pouquinho a cada pose, de dois em dois quadros, e são trocadas por outra forma em vez
de se mexerem macio.

**Como funciona.** No começo, o motor faz cada pedaço de papel uma vez só: a textura do papel, o
corte e a sombra viram uma "figurinha". A cada quadro ele só cola as figurinhas na folha, da de trás
para a da frente, com tremor e sombra que pisca sorteados pelo número da pose (sem relógio). As
camadas (céu, prédios do fundo, ponte, prédios da frente) andam em velocidades diferentes; no fim
elas se alinham e a câmera mostra a colagem inteira, plana, presa no cartão cinza com fita crepe. O
gato é um boneco de papel com juntas de colchete; cada pose dele é uma troca de peças. Luz de mesa e
grão de filme por cima. O título é desenhado em traços (`letras.js`, cópia das letras do motor
quadro-negro), sem depender de fonte instalada.

**O filme.** Uma cidade de papel acorda: as faixas do céu da noite são trocadas, uma a uma, pelas do
amanhecer, a lua é tirada da folha, o sol rasgado sobe girando os raios, as janelas acendem, um bonde
amarelo cruza a ponte sobre o rio marmorizado. A câmera chega perto de um gato dormindo na janela: ele
acorda, se espreguiça, arqueia, pula para o telhado do lado e espanta os pássaros de jornal. No fim, a
colagem inteira no cartão, e a última fita é colada. São 10 s em 16:9 (1920x1080), sem fala: na tela
só o título no começo. O som é todo feito em código: caixinha de música e barulho de papel.

**Trocar a história.** Tudo o que muda fica em `historia.json`: título, cores da mesa, da folha, da
fita e dos alfinetes, quanto tempo cada pose fica (`segurar`), a câmera (com `plano`, que alinha as
camadas), quanto cada camada fica para trás, as janelas (cores e quando acendem) e a lista de
`pecas`, cada uma com lugar e tempo: céu (faixas com cor da noite, cor do dia e hora da troca), lua,
sol, nuvens, prédios (tamanho, cor, papel, enfeite do topo, janelas, toldo), varal, rio, ponte,
bonde, pássaros, gato (poses e salto), título e fitas. Em `paleta` ficam as cores das peças (lua,
sol, nuvens, enfeites dos prédios, roupas do varal, bonde, pássaros, gato e etiqueta do título). As
notas da caixinha de música também. Copie o
arquivo, mude e rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/colagem-papel --historia minha-historia.json
```

**De onde saiu.** Do filme "Paper Morning" (estilo "Cut-paper collage") da biblioteca de estilos da
fonte. A cidade, o gato e os pássaros daqui são desenhos novos e genéricos.

**Tempo de render medido** (`medida.json`): 70,7 s para 10 s de filme (300 quadros, 186 ms por
quadro, 3 navegadores, sem placa de vídeo, com a máquina dividida com outros renders). Uma rodada
anterior, com os mesmos quadros (mesmo `hash_quadros`), mediu 48,7 s. O MP4 tem 19,2 MB.

**Falta polir.**
- Os pássaros pousados no telhado ficam pequenos e parecem montinhos cinza; só leem como pássaros
  quando voam.
- A ponte fica baixa demais: o rio aparece só dentro dos arcos, cortado pela borda da folha.
- O sol sobe escondido atrás dos prédios e só aparece inteiro na vista final, ainda com a caixa
  d'água de um prédio na frente dele.
- Na pose de espreguiçar (perto de 6,2 s) as patas da frente quase somem embaixo do corpo.
- No começo do recuo final (perto de 8,3 s) a borda direita da folha aparece um instante antes de a
  câmera centralizar.
