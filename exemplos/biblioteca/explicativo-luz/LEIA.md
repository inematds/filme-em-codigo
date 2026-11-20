# explicativo-luz

**O estilo.** Explicativo vertical em 3D luminoso: espaço quase preto, um planeta feito de pontos
com nuvens que giram, linhas amarelas que brilham e luz azul na borda. A comparação vira corrida
(dois marcadores e dois contadores lado a lado), cada palavra-chave ganha um chip de letra de
máquina, e o filme termina numa vista do chão com uma pergunta grande.

**Como funciona.** `mundo.js` tem uma câmera de verdade (ponto do mundo vira ponto na tela, com
perspectiva) e as peças: planeta (nuvem calculada ponto a ponto, 2.600 pontos na casca, borda
azul), anel e órbita em 3D (o pedaço que passa atrás do planeta fica fraco), sol, chão de pontos,
montanhas, e caixas com arestas que brilham (o jipe e o bloco de chumbo). O brilho é luz somada
(modo `lighter`) com borrões prontos; tudo em canvas 2D, sem placa de vídeo. `motor.js` lê a
história e desenha a barra do alto, os chips, os contadores, a legenda e o título. As letras são
traços (`letras.js`, cópia do motor xilogravura), sem fonte instalada; ao montar, o motor confere
se toda letra da história existe e se cada legenda fica pelo menos 0,5 s inteira na tela (se não,
dá erro e diz qual).

**O filme.** "Em Vênus, um dia dura mais que um ano." O planeta de pontos acende com o chip VÊNUS;
um marcador azul dá a volta no giro enquanto o contador corre até 243; a câmera recua até o Sol e a
órbita, e dois marcadores correm: o ANO fecha em 225 antes do DIA chegar a 243; num clarão, um jipe
entra no chão quente, olha o bloco de chumbo, que afunda e vira poça, e recua; o planeta gira ao
contrário com setas que mostram o sentido; do chão, o Sol nasce atrás das montanhas pretas com o
chip OESTE, e a pergunta aparece. 15 s, vertical (1080x1920). A fonte é narrada: aqui a fala virou
legenda (traduzida pelo tradutor central e encurtada), palavra por palavra, com a palavra da vez em
amarelo. O som é feito em código: pad e pulso baixinhos, toque leve a cada palavra, bipe nos chips,
tique no contador, sino quando um número fecha, sopro na câmera que recua, estrondo e chiado no
chumbo, motorzinho do jipe, assobio que desce no giro ao contrário e acorde que sobe com o Sol.

**Trocar a história.** Tudo o que muda fica em `historia.json`:

- `planeta`, `sol`, `orbita`, `anel`: lugar e tamanho no mundo 3D (1 unidade = raio do planeta) e cores.
- `planos`: `de`/`ate`, `entrada` (`abre`, `continua`, `clarao`, `escurece`), `camera` (`pos` e
  `alvo` no começo e no fim; `move` limita o movimento a um trecho), `ceu` e a lista de `pecas`, cada
  uma com tipo, lugar e tempo: `estrelas`, `planeta` (`giro` em voltas por segundo; negativo = ao
  contrário), `anel`, `marcador` (caminho `anel` ou `orbita` e `chaves` [tempo, fração da volta]),
  `sol`, `orbita`, `seta`, `chao`, `bloco` (`derrete`), `jipe` (`movimentos`: `anda`, `olha`,
  `recua`), `montanhas`, `solNasce`.
- `chips`, `contadores` (`chaves` [tempo, valor], `feito`), `legendas` (`passo` = segundos por
  palavra) e `titulo`: posição em pixels de um quadro 1080x1920.
- `musica`: acordes de cada trecho, pulso, nota do contador e acordes de "feito" e do fim.
- Letras que existem: maiúsculas com acento, números, `. , : ! ? - + / " '` e também `· • =`.

```bash
node ferramentas/render.mjs exemplos/biblioteca/explicativo-luz --historia minha-historia.json
```

**De onde saiu.** Do filme "On Venus, a Day Is Longer Than a Year" (estilo "Glowing 3D explainer")
da biblioteca de estilos da fonte. Só um filme da fonte usa este estilo, então há uma história só.

**Tempo de render medido** (`medida.json`): 19,35 s para 15 s de filme (450 quadros, 30,5 ms por
quadro, 3 navegadores, sem GPU). O MP4 sai com 6,82 MB. Som: média -21,6 dB, pico -2,2 dB; os
segundos mais altos são o clarão do planeta quente e o chumbo derretendo. Filme inteiro em 360x640
com 1 e com 3 navegadores dá o mesmo `quadros.sha256`.

**Falta polir**
- O chumbo derretido parece mais uma placa baixa do que uma poça; a fonte tem um derretido mais mole.
- A 360x640 os pontos do planeta ficam grossos (tamanho mínimo de 1,3 px) e o planeta parece uma
  peneira; em 1080x1920 fica certo.
- No recuo até o Sol, o planeta fica grande na frente da órbita e cobre parte dela; os contadores e os
  chips "ANO: FEITO" repetem a mesma ideia.
- A fonte usa three.js com sombra e luz de verdade (o jipe é sólido, a cena do chão tem neblina); aqui
  tudo é canvas 2D com perspectiva feita à mão, e o jipe e o bloco são caixas de arestas.
- O Sol que nasce é um disco chapado; na fonte ele tem um clarão que lava o céu inteiro.
- O chip "CHUMBO: DERRETIDO" fica só uns 0,45 s na tela, e o bloco acaba de derreter junto com a
  escurecida do plano seguinte.
- Os segundos 2 a 4 (o primeiro contador correndo até 243) são os mais baixos do filme (-24,5 dB); os
  tiques do contador quase não se ouvem.
