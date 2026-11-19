# acetato-classico

**O estilo.** Desenho animado clássico feito à mão, como os longas dos anos 1940 e 1950: o cenário é
uma pintura de aquarela e guache em cinco camadas, e a personagem é um "acetato" pintado chapado,
com linha de nanquim por fora, por cima da pintura. A câmera multiplano move as camadas em
velocidades diferentes (as de longe andam menos e são mais macias), e o filme sai com cara de cópia
antiga: grão, tremor do projetor, poeira, vinheta e cor quente.

**Como funciona.** Três arquivos fazem o trabalho:
- `fundo.js` pinta UMA vez as cinco camadas (céu com lua e estrelas, árvores de longe na névoa,
  árvores do meio e moitas, chão da clareira com capim, flores, lago, tronco caído e cogumelos, e a
  frente escura de troncos, folhas e samambaias). Cada mancha é feita em lavagens finas com a borda
  mais escura, pigmento granulado, pincel seco e um resto de lápis.
- `raposa.js` desenha a raposinha (desenho próprio do kit) a partir de uma folha de poses:
  espreitar, agachar, pular, aterrissar, rolar, ficar tonta, espirrar, sentar, olhar maravilhada.
  O corpo estica e encolhe, e a linha "ferve" um pouco a cada pose, como desenho refeito à mão.
  A pose troca de 2 em 2 quadros, e de 1 em 1 na ação rápida (`uns` na história).
- `motor.js` junta tudo: câmera, vaga-lumes (cada um sobe quando a onda do espirro passa por ele),
  reflexo no lago, poeira, estrelinhas da tontura, título, o acabamento de cópia e o som.
O título é desenhado em traços (`letras.js`, cópia das letras do motor quadro-negro), então não
depende de fonte instalada.

**O filme.** Uma raposinha espreita um vaga-lume pousado numa flor de semente, pula, erra, rola e
fica tonta. Espirra, e o espirro levanta centenas de vaga-lumes do capim numa onda que acende a
clareira e brilha no lago. Um vaga-lume pousa no nariz dela e a câmera recua. São 10 s em 16:9
(1920x1080). A fonte não tem fala nem texto: na tela só aparece o título no começo. O som é todo
feito em código: grilos, cordas, pizzicato nos passinhos, harpa subindo com a onda, sininhos e os
efeitos de desenho animado (vuuush, tombo, "ah... ah..." em duas notas e o atchim).

**Trocar a história.** Tudo o que muda fica em `historia.json`: título, cores do cenário e da raposa,
a câmera (pontos com tempo, lugar e zoom), a lista de `pecas` (lua, estrelas, árvores, moitas,
chão, luz da lua, lago, capim, flores, tronco caído, cogumelos, planta, frente, raposa, vaga-lumes,
onda, vaga-lume herói e título), cada uma com lugar e tempo. A raposa tem a lista de `acoes` (tipo,
de, até, para onde vai) e os trechos `uns` desenhados de 1 em 1 quadro. A música (acordes, flauta,
pizzicato, harpa) também está lá. Copie o arquivo, mude e rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/acetato-classico --historia minha-historia.json
```

**De onde saiu.** Do filme "Firefly Glade" (estilo "Classic hand-drawn cel animation") da
biblioteca de estilos da fonte. A raposinha, a clareira e a música daqui são desenhos novos.

**Tempo de render medido** (`medida.json`): 53,9 s para 10 s de filme (300 quadros, 134,6 ms por
quadro, 3 navegadores, sem GPU). O MP4 tem 60,3 MB (o grão de filme pesa na compressão).

## Falta polir
- A cambalhota passa por uma pose de cabeça para baixo que lê meio torta; na fonte o rolamento é
  uma bola mais fechada.
- As moitas do meio formam uma fileira de bolos parecidos, um pouco lisa demais perto da fonte.
- A flor de semente fica como um disco branco ao lado da raposa depois que o vaga-lume sai.
- A nuvem do espirro é pequena; na fonte o espirro é mais "estourado".
- Depois que o vaga-lume pousa no nariz, os olhos não olham para ele (na fonte ficam vesgos).
- No primeiro quadro do pouso (3,07 s) a raposa estica para cima em vez de achatar: em `matrizes`
  (`raposa.js`), com `estica` negativo, `scale(e, 1/e)` deixa o corpo estreito e alto; o certo
  seria `scale(1/e, e)` quando `estica < 0`.
- A onda do espirro não é recortada pelo chão: perto de 7 s os arcos passam por cima das moitas.
- No pulo (2,9 s) o brilho do vaga-lume herói cai em cima do olho da raposa.
