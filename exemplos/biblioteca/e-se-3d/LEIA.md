# e-se-3d

**O estilo.** Um curta vertical de "e se…": uma pergunta grande, um personagem 3D pequeno que atua
de verdade e uma viagem que piora a cada plano. No alto, um contador amarelo de letra de máquina
pula a cada plano; logo abaixo, uma legenda se datilografa numa tarja preta.

**Como funciona.** O robô astronauta é desenho próprio (`robo.js`): cabeça redonda com visor escuro e
dois olhos que brilham, antena com bolinha laranja, corpo de cápsula, mochila, luvas e botas
verde-água. Cada plano da história diz qual é a ação dele (`acena`, `entra`, `rodopia`, `aperta`,
`procura`, `dissolve`) e o motor faz a pose como conta do tempo. O céu de cada plano é um shader só
(`fundo.js`): degradê com estrelas, o planeta de faixas (com a mancha e, no fim, dois olhos dentro
dela) e nuvens que sobem enquanto o robô cai. O acabamento (`tela.js`) põe a bola de fogo da
entrada, os riscos de velocidade, vento e detritos, as passagens entre planos (clarão, varrida de
nuvem, escurecida), vinheta, grão e o letreiro. Ao dissolver, um corte sobe dos pés à antena e cada
faísca nasce na linha do corte. As letras são traços (`letras.js`), sem fonte instalada.

**O filme.** "E se você caísse em Júpiter?" O robô acena na frente do planeta; num clarão, bate no
céu dentro de uma bola de fogo; rodopia nas nuvens de amônia com o vento riscando; no escuro marrom
é espremido pela pressão; na neblina cinza procura um chão que não existe; vira faíscas que caem; e
o plano final mostra o planeta com os olhos do robô acesos dentro da mancha. 15 s, vertical
(1080x1920). A fonte é narrada: aqui a fala virou legenda (traduzida pelo tradutor central e
encurtada) e o som é feito em código: pad e caixinha que escurecem com a descida, tique de máquina
de escrever em cada letra, bipe a cada pulo do contador, estrondo e chiado na entrada, vento nas
nuvens, batidas e metal rangendo no aperto, sinos nas faíscas e um acorde no fim.

**Trocar a história.** Tudo o que muda fica em `historia.json`:

- `planos`: lista com `de`/`ate` (segundos) e, em cada um, `entrada` (`abre`, `clarao`, `varrida`,
  `escurece`, `corte`), `fundo` (cores do céu, `estrelas`, `planeta` com posição e tamanho no começo
  e no fim, `nuvem`, `olhos`), `luz`, `camera` (distância e tremor), `robo` (`acao` e posição na
  tela no começo e no fim), `fogo`, `riscos`, `faiscas`, `contador` (valor e pressão do começo e do
  fim; `-1` = "fora de escala"; ou `texto` fixo) e `legendas` (texto e tempo).
- `robo`: as cores do personagem. `planeta`: faixas, mancha e cor dos olhos.
- `contador` e `legenda`: lugar, tamanho, cor e letras por segundo.
- `musica`: o acorde de cada plano, o arpejo, as notas das faíscas e o acorde final.
- Posição na tela: x e y vão de -0,5 a 0,5 na ALTURA do quadro; a largura vai de -0,28 a 0,28.
- Letras que existem: maiúsculas com acento, números e `. , : ! ? - + / " '`.

```bash
node ferramentas/render.mjs exemplos/biblioteca/e-se-3d --historia minha-historia.json
```

**De onde saiu.** Do filme "What If You Fell Into Jupiter?" (estilo "what-if" com personagem 3D)
da biblioteca de estilos da fonte. O robô é desenho novo, não o da fonte.

**Tempo de render medido** (`medida.json`): 65 s para 15 s de filme (450 quadros, 117 ms por
quadro, 3 navegadores, sem GPU). O MP4 sai com cerca de 44 MB. Mesmo filme com 1 e com 3
navegadores (360x640) dá o mesmo `quadros.sha256`.

**Falta polir**
- Na entrada, a luz laranja deixa o robô todo alaranjado e a bola de fogo parece mais um casulo
  comprido do que uma bola; a fonte tem a chama mais redonda e o robô mais legível.
- Ao dissolver, o corte mostra o robô "oco" por um instante (sem tampa na linha do corte); o brilho
  amarelo disfarça só em parte.
- No plano final, as faíscas caem rápido demais e quase somem sobre o planeta claro.
- A fonte tem seis planos com movimento de câmera mais variado; aqui a câmera só se aproxima ou se
  afasta.
- Depois de afinar o visor (3ª rodada), ele ficou enterrado na cabeça: de frente só aparecem os
  dois olhos e um risco fino (a capa mostra). Puxar o visor uns 0,04 para a frente resolve.
- O robô segue a mesma descrição da fonte (cabeça redonda, visor escuro, olhos que brilham,
  antena); muda nas cores, no remendo do peito e na mochila. Vale um traço mais próprio.
