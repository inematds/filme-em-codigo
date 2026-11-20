# neon-chuva

**O estilo.** Uma megacidade de néon, à noite, na chuva, montada em 3D: milhares de torres com
janelas que parecem salas acesas por dentro, letreiros com símbolos inventados (nenhuma palavra de
verdade), rua molhada que reflete tudo, chuva, vapor e carros voadores. Por cima vem um acabamento
de cinema: brilho forte nas luzes, riscos horizontais de lente, borrão de movimento, leve separação
de cores, gotas na lente, grão e cor puxada para verde-azulado e magenta.

**Como funciona.** As torres são uma malha só, repetida por instância. Cada janela é uma conta no
shader: o raio da câmera "entra" pelo vidro e bate na parede do fundo, no chão ou no teto da sala,
e às vezes num vulto de gente. As torres não usam luz de verdade, só cor que brilha e névoa; é isso
que deixa rodar sem placa de vídeo. O reflexo da rua é a cidade fotografada de cabeça para baixo,
em meia resolução, só enquanto a rua aparece. Chuva, vapor, carros e gotas na lente saem de `t`.
Arquivos: `motor.js` (a cena), `glifos.js` (símbolos inventados), `posproducao.js` (o acabamento).

**O filme.** Começa na rua, num carrinho de comida soltando vapor debaixo da chuva; a câmera sobe
rápido pela fachada de uma torre, passando pelas salas acesas, cruza o telhado e mostra a cidade
até o horizonte. 9 s, 16:9 (1920x1080). O filme da fonte não tem texto: aqui só o título aparece no
começo. Som feito em código: chuva, sintetizadores longos, vapor, carros passando e um grave que
cresce na revelação.

**Trocar a história.** Tudo o que muda fica em `historia.json`:

- `camera`: pontos com segundo, posição, para onde olha e abertura da lente (`fov`).
- `pecas`: o título; a `cidade` (raio, tamanho da quadra, alturas, arranha-céus, quantas janelas
  acesas, uma `clareira` de prédios baixos para a câmera ver longe); a `rua`; a `torre` principal e
  os letreiros dela; o `carrinho`; os `vapor` de bueiro; quantos `letreiros`; os `holograma` no céu;
  o `trafego` de carros voadores; a `chuva`.
- `cores`: céu, névoa, torres, salas, néons, rua, carrinho, chuva.
- `filme`: força do brilho, dos riscos, do borrão, das gotas na lente, do grão, a cor das sombras e
  das luzes.
- `tempos` e `musica`: quando a câmera começa a subir e quando a cidade se revela (o grave cresce
  aí), os acordes, a nota grave e o arpejo.

```bash
node ferramentas/render.mjs exemplos/biblioteca/neon-chuva --historia minha-historia.json
```

**De onde saiu.** Do filme "Neon Rain" (estilo "Rain-soaked neon megacity") da biblioteca de
estilos da fonte. O carrinho, o cozinheiro e os símbolos daqui são desenhos novos e genéricos.

**Tempo de render medido** (`medida.json`): 69,22 s para 9 s de filme (270 quadros, 197,9 ms por
quadro, 3 navegadores, sem GPU). O MP4 sai com cerca de 45,31 MB.
