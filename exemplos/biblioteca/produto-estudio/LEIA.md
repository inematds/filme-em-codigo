# produto-estudio

**O estilo.** Filme de produto em estúdio, vertical: um objeto inventado de alumínio usinado e vidro
fosco flutua num vazio azul-escuro, com reflexos de softbox no metal escovado, uma luz de verdade
dentro do aro que faz a poça de luz e as sombras andarem, foco curto que passa de uma peça para
outra, brilho macio e vinheta. Títulos finos e bem espaçados no alto e a fala numa pílula translúcida.

**Como funciona.** Cena 3D em three.js, sem placa de vídeo. Cada peça é feita girando um perfil,
como num torno; por isso os riscos de escova (uma textura de linhas) viram círculos em volta do
centro. O aro tem um refletor que aponta para baixo e faz sombra. Depois da foto, a lente
(`lente.js`) faz o brilho (encolhe e borra só o que passa do limiar), o desfoque de profundidade, a
curva de filme e as passagens entre planos: chicote (gira e borra para o lado), mergulho (borra do
centro para fora) e clarão branco. Tudo é conta de `t`: nada guarda o quadro anterior.
Os textos são traços (`letras.js`), sem fonte instalada; `letreiro.js` desenha título, legenda,
rótulos da vista explodida e a marca. Ao montar, o motor dá erro se uma letra de qualquer texto não
existir no `letras.js`, se uma legenda ficar menos de 0,5 s inteira na tela ou se um texto não couber.
Arquivos: `motor.js` (cena, tempos, som), `pecas.js` (textura escovada, estúdio, peças de torno,
mãos de manequim, lápis, traço), `lente.js`, `letreiro.js`, `letras.js`.

**O filme.** "Orla, uma luz que flutua": os LEDs acendem em volta do aro e ele sobe; a câmera passa
rente à borda da base (o ponto amarelo) e sobe o foco até o aro; num chicote, as oito peças se
separam com rótulos e voltam de estalo; um mergulho chega ao metal escovado; noutro chicote, duas
mãos de manequim desenham uma elipse e o aro sobe e segue o lápis enquanto a câmera vira vista de
cima; num clarão, a peça inteira e a marca ORLA com o sublinhado amarelo. 14,5 s, vertical
1080x1920. A fala da fonte (narrada) virou legenda em português (traduzida pelo tradutor central e
encurtada). Som feito em código: pad de vidro, tilintar dos LEDs, peças que deslizam e estalam,
chiados nas passagens, lápis no papel, batida e sino no clarão.

**Trocar a história.** Tudo o que muda fica em `historia.json` (1 unidade = raio da base):

- `pecas`: a `base` (raio, altura, onde fica o ponto amarelo), o `aro` (altura de repouso e de
  flutuar, quando sobe, quantos LEDs e quando acendem), a `explosao` (quando abre, quando fecha e a
  altura e o rótulo de cada uma das oito peças), o `papel`, o `desenho` (elipse, quando começa e
  termina), as mãos e o `segue` (quando o aro sobe e vai para cima do lápis).
- `planos`: cada plano com início, fim, a passagem de entrada (`corte`, `chicote`, `mergulho`,
  `clarao`) e os pontos da câmera (posição, para onde olha, lente, ponto de foco e quanto desfoca;
  `"para": true` faz a câmera parar ali).
- `titulos`, `legenda` (texto e tempos), `rotulos`, `marca` (nome e sublinhado); `cores`, `luz`
  (refletor, ambiente, reflexo), `filme` (brilho, vinheta, grão, força das passagens) e `musica`.

```bash
node ferramentas/render.mjs exemplos/biblioteca/produto-estudio --historia minha-historia.json
```

**De onde saiu.** Do filme "Halo: a product film" (estilo "Studio product film") da biblioteca de
estilos da fonte. O produto, o nome ORLA e as mãos daqui são desenho novo e genérico.

**Tempo de render medido** (`medida.json`): 188,8 s para 14,5 s de filme (435 quadros, 381,7 ms por
quadro, 3 navegadores, sem GPU). O MP4 sai com cerca de 18,77 MB.

**Falta polir**
- A lente do meio estoura em branco nos planos de perto (macro e herói); a fonte mostra mais o vidro fosco.
- O reflexo do metal escovado no topo forma uma cruz de quatro faixas (as softboxes), mais marcada que na fonte.
- No começo da vista de cima, o aro passa muito perto da câmera e sai pelas bordas do quadro.
- As mãos são simples (palma oval e dedos de cápsula); a mão do lápis segura sem dobrar o pulso.
- A lateral da base sai escura no plano final (o metal reflete o vazio azul); na fonte ela brilha mais.
