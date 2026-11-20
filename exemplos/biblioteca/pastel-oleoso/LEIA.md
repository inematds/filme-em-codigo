# pastel-oleoso

**O estilo.** Parece o scan de um livro ilustrado antigo, pintado com pastel oleoso e guache sobre
papel verde-escuro: formas planas e ingênuas, poucas cores, cada forma cheia de riscos curtos na
mesma direção, que passam um pouco da borda e deixam o papel aparecer. A pintura "ferve" (os riscos
são trocados a cada 2 ou 3 quadros), os personagens se mexem de 2 em 2 quadros e deixam um rastro
leve de pigmento.

**Como funciona.** O `pastel.js` é o pincel: enche uma forma de riscos de pastel, faz área chapada
de guache com o arrasto do pincel, risca linhas e raspa riscos claros por cima (sgraffito). No
começo, o motor pinta as camadas paradas (morros, feira com as barracas e os varais, cestos da
frente) três vezes, com riscos diferentes, e tira o "dente do papel" de cada uma. A cada quadro ele
só escolhe a versão (pelo número da pose, sem relógio), move as camadas em velocidades diferentes
(câmera de várias camadas) e desenha ao vivo o céu, os personagens e a lanterna que escapa. O brilho
das lanternas é um esfumado somado por cima. Por último, o grão do papel em relevo, com luz de cima
à esquerda. O título é desenhado em traços (`letras.js`, cópia das letras do motor quadro-negro),
sem depender de fonte instalada.

**O filme.** Uma menina de casaco vermelho de bolinhas e cachecol água atravessa uma feira à noite
com uma lanterna na ponta de uma vara. Passa pelo malabarista de cinco argolas; um cachorro branco
pula, rouba a corrente de salsichas do açougueiro (que levanta os braços) e foge para a esquerda. Uma
lanterna do varal se solta; a menina para e olha para cima. A câmera sobe e recua: a lanterna fica
pequena entre as estrelas e a lua, sobre a feira acesa. 10 s em 16:9 (1920x1080), sem fala: na tela
só o título no começo. Som feito em código: valsa de piano de brinquedo, murmúrio da feira, passos,
argolas, o pulo do cão, o "twang" do barbante e o sino do fim.

**Trocar a história.** Tudo o que muda fica em `historia.json`: título, cores (papel, escuro e as
seis cores do pastel), alturas da feira (toldo, balcão, chão), quanto tempo cada versão dos riscos
fica (`segurar`), a câmera (pontos-chave com `x`, `y`, `zoom` e `curva`) e a lista de `pecas`, cada
uma com lugar e tempo: céu (lua, estrelas, arcos raspados, fator de parallax), morros, chão,
barracas (toldo, barrado, frente, desenho, mercadoria, vendedor), palco do malabarista, varais de
bandeirinhas e de lanternas, lanternas altas, malabarista, açougueiro, salsichas, cão (quando pula,
pega e foge), menina (caminhada, quando olha para cima, tamanho), a lanterna que solta (quando e para
onde sobe), cestos da frente e título. A música (melodia, baixo e acordes da valsa) e os sinos também.
Copie o arquivo, mude e rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/pastel-oleoso --historia minha-historia.json
```

**De onde saiu.** Do filme "The Lantern That Got Away" (estilo "Oil pastel and gouache") da
biblioteca de estilos da fonte. A feira, a menina, o cão e os outros personagens daqui são desenhos
novos e genéricos.

**Tempo de render medido** (`medida.json`): 50,71 s para 10 s de filme (300 quadros, 134,7 ms por
quadro, 3 navegadores, sem placa de vídeo). O MP4 tem 57,03 MB (a fervura dos riscos e o grão pesam
na compressão). Som: média -20,4 dB, pico -1,7 dB.

**Falta polir.**
- O cão correndo parece mais um carneirinho de pernas finas: a cabeça e o focinho não se destacam,
  e a corrente de salsichas por cima das costas confunde a silhueta.
- O cão sentado (antes do pulo) é só um montinho branco.
- O rosto da menina se perde um pouco quando ela passa na frente dos balcões vermelhos e rosa.
- Os riscos em pé dos balcões passam da borda de baixo e fazem uma franja sobre o chão.
- A lanterna que escapa sobe mais rápido do que a câmera: some pela borda de cima logo depois de
  soltar (perto de 5,8 s), passa meio cortada perto de 7 s e só volta inteira quando a câmera sobe.
  A menina olha para uma lanterna que não está na tela.
- No pulo (perto de 3,25 s) o cão passa na frente do açougueiro e vira uma mancha branca.
- No plano final sobra mais chão escuro embaixo da feira do que no filme da fonte.
- A 640x360 os arcos raspados do céu quase somem e as estrelas ficam bem pequenas.
