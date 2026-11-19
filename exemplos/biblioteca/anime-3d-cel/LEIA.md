# anime-3d-cel — anime desenhado em 3D

**O estilo.** Uma cena 3D (three.js) pintada para parecer anime desenhado à mão: cada superfície tem
só duas cores duras, luz e sombra fria azul-violeta, com a borda da sombra tremida de pincel, e
contorno azul-marinho. Céu pintado em shader (faixas de degradê, nuvens de dois tons, lua, estrelas,
serras de névoa), névoa de distância, raios de luz da lua, brilho macio nas luzes, vinheta e grão.
Os bonecos mexem de 2 em 2 quadros, a água e a névoa de 3 em 3, e a câmera anda lisa.

**De onde saiu.** Do filme "The Night Niagara Falls Stopped" (anime desenhado em código) da
biblioteca de estilos da fonte. Lá o filme é narrado; aqui não há voz: a fala virou legenda em
português (traduzida pelo tradutor central e encurtada para caber em 15 s), com música (pad macio e
caixinha de música) e sons feitos em código. A menina de casaco vermelho e o cachorro são desenho
próprio, de esferas e cápsulas.

**Vertical:** 1080x1920, 30 quadros por segundo, 15 s.

## Como funciona

- **Duas cores por superfície** (`cel.js`): o shader compara a superfície com a direção da luz e
  escolhe luz ou sombra, sem meio-termo; um ruído no lugar (não no tempo) treme a borda.
- **Contorno**: nos bonecos e objetos, uma "casca" um pouco maior, virada do avesso, pintada de
  azul-marinho; no cenário, o passe final acha a borda pela profundidade (`pos.js`).
- **A lanterna** acende um círculo quente de borda dura em tudo o que está perto dela.
- **Transições** desenhadas (`pos.js`): chicote para cima com borrão, cacos de gelo, corte casado na
  lanterna, clarão branco e cortina de água.
- **Legenda**: letras em traços (`letras.js`), brancas com contorno escuro, no terço de baixo; não
  depende de fonte instalada.

Arquivos: `motor.js` (cena, poses, câmera, transições e som), `cel.js` (os materiais em shader),
`pos.js` (o acabamento e as transições), `bonecos.js` (menina, cachorro e mosquete), `letras.js`.

## Trocar a história

Tudo o que muda fica em `historia.json`:

- `cores` e `ceus` (noite, aurora, dia, tarde: céu, luz, sombra, névoa, cor do contorno);
- `planos`: cada plano com começo e fim, cenário (`garganta` ou `mapa`), céu no tempo, lugar da
  lua ou do sol, força dos raios, névoa, e os pontos da câmera (posição, para onde olha, lente).
  A câmera pode olhar para uma peça que anda: `{ "peca": "lanterna", "d": [x, y, z] }`;
- `transicoes` (`chicote`, `estilhaco`, `casamento`, `clarao`, `agua`) e `claroes`;
- `agua`: quanto a cachoeira cai (`fluxo`), o nível do rio e os pingos;
- `pecas`: lista com lugar e tempo — a garganta, pinheiros, névoa, pedras, poças, o mapa, as placas
  de gelo do mapa, o gelo que estoura, a `menina` e o `cachorro` (caminho com tempo e as `acoes`:
  `pula`, `anda`, `recua`, `senta`, `ergue`, `cava`, `puxa`, `abana`) e o `mosquete`;
- `legendas` (texto e tempo), `filme` (grão, vinheta, brilho, contorno) e `musica`.

```bash
node ferramentas/render.mjs exemplos/biblioteca/anime-3d-cel --historia minha-historia.json
```

**Tempo de render medido** (`medida.json`): 86,6 s para 15 s de filme (450 quadros, 155 ms por
quadro, 3 navegadores, sem GPU). O MP4 sai com cerca de 43 MB. Som: média -20,9 dB, pico -2,1 dB.

## Falta polir

- Fonte: 21 s; aqui 15 s, com a narração encurtada em 8 legendas.
- A legenda é em maiúsculas de traço, não na letra redonda da fonte.
- A névoa no pé da cachoeira parece uma fileira de bolhas, não um vapor macio.
- No susto (cerca de 9,8 s), a menina recua e fica meio cortada na beira esquerda do quadro.
- Na cortina de água (13,3 s), a menina some do plano de cima um instante antes do corte.
- O cachorro e a menina não têm sombra projetada, só uma mancha escura no chão.
