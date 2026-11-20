# tinta-na-agua

**O estilo.** Parece foto de bem perto de tinta pingada na água: plumas de tinta preta, azul e uma
dourada (que brilha) descem num papel claro iluminado por trás e se enrolam em "cogumelos" com fios
finos. Da tinta sai um enxame de milhares de pontinhos que voa em bando, forma uma figura, segura um
instante e explode de volta em tinta nova.

**Como funciona.** Não há simulação de água: tudo é conta de `t`. Cada pluma tem uma cabeça que desce
por uma curva, e dois redemoinhos girando ao contrário enrolam a tinta (o shader gira o ponto de
leitura em volta de cada redemoinho). As cores se misturam como pigmento (uma tinta por cima da outra
escurece). O bando são 24 mil partículas: cada uma nasce dentro de uma pluma, segue um caminho comum,
chega no seu lugar dentro da figura e, na explosão, sai voando. Cada uma vira um risquinho do ponto
onde estava até onde está (borrão de movimento). Por cima vêm o foco que passa da tinta para a
figura e volta, a luz da água tremendo no papel, a vinheta quente e o grão. O título é escrito em
traços (`letras.js`, cópia das letras do motor quadro-negro) e não depende de fonte instalada.

**O filme.** Duas plumas, uma preta e uma azul, descem bem de perto. A câmera se afasta e mostra a
dourada. Aparecem pontinhos escuros na tinta, que saem num bando, varrem a parte de baixo do quadro,
sobem pela direita e formam um grou levantando voo. Ele bate as asas, e aos 7,8 s explode em
tinta preta, azul e dourada. São 9,6 s em 16:9 (1920x1080), sem fala. Na tela só aparece o título no
começo. O som é todo feito em código: zumbido grave, cordas dedilhadas, gotas, o vento do bando, um
sino quando a figura se forma, as batidas de asa e o chiado no fim.

**Trocar a história.** Tudo o que muda fica em `historia.json`:
- título, as 3 tintas, o papel (cor do meio, cor da borda, onde fica a luz);
- `camera`: pontos com segundo, x, y, zoom e o desfoque da tinta (`tinta`) e do bando (`bando`), em pixels;
- `pecas`, cada uma com lugar e tempo:
  - `pluma`: cor, de onde cai, quando (`de`), quanto desce, raio, ângulo e giro dos redemoinhos;
  - `mancha`: tinta velha e macia, que aparece entre `de` e `ate`;
  - `bando`: quantas partículas, de quais plumas nascem, quando aparecem e voam, as cores e o `caminho` (pontos);
  - `figura`: onde fica, escala, quando se forma, batida das asas e o segundo da explosão. As `partes`
    são a figura: elipses, polígonos e linhas grossas, cada uma com cor e peso (quantas partículas vão
    para ela); as que têm `pivo` balançam (asas). As `floradas` são as manchas novas da explosão;
  - `titulo`: onde, tamanho, cor e quando aparece;
- `musica`: notas do zumbido, do dedilhado, os segundos das gotas e o sino (segundos depois da figura formada).

Para outra figura (um peixe, uma folha, uma letra), troque as `partes`. Copie o arquivo, mude e rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/tinta-na-agua --historia minha-historia.json
```

**De onde saiu.** Do filme "Ink Crane" da biblioteca de estilos da fonte. O grou daqui é um
desenho novo e genérico, feito de partes simples.

**Tempo de render medido** (`medida.json`): 60,73 s para 9,6 s de filme (288 quadros, 179,7 ms por
quadro, 3 navegadores, sem GPU). O MP4 sai grande (55,26 MB), porque o grão e os milhares de
risquinhos mudam a cada quadro.

**Falta polir** (achado depois da 3ª rodada de correção):
- o bando parece mais uma faixa grossa de pincel do que uma nuvem de pássaros que se dobra;
- o grou é uma silhueta recortada (corpo liso, asas em leque), sem as penas macias do vídeo da fonte;
- as plumas têm todas o mesmo desenho de cogumelo e ficam na metade de cima do quadro;
- as floradas da explosão nascem pequenas e parecem carimbos de cogumelo até crescer (lá pelos 9 s);
- parte das partículas não chega inteira ao seu lugar na figura: com `cauda` 0,35 e o ritmo de cada
  uma começando em 0,9, a conta para em 0,865 do caminho e elas ficam a uns 30% do alvo (a figura
  sai um pouco mais "esfiapada");
- não há reflexo nem bolhas: a "água" é só a luz tremendo e a tinta dobrando.
