# voxel

**O estilo.** Um diorama de cubinhos: tudo (árvore, colmeia, tumba, pote, bichos) é feito de cubos
grossos em cima de ilhas quadradas que flutuam num fundo escuro, vistas de cima e de lado, como maquete.
Luz quente no que tem luz própria (mel, tocha, faísca) e o alto e o pé do quadro borrados, como foto de miniatura.

**Como funciona.** Cada maquete é uma lista de cubos (`voxels.js`) que vira UMA malha repetida por
instância: um cubo só, desenhado centenas de vezes, cada um com a sua cor. Os cubos que andam (mel
caindo, água saindo, brilhos, faíscas) são outra malha, com a posição calculada pelo tempo.
Cada cenário fica num lugar do mundo e só aparece no plano dele; a câmera de três quartos gira em volta
do centro de cada plano. O filme é narrado na fonte: aqui a fala vira legenda, 2 a 5 palavras por vez,
em letras grossas brancas de ponta quadrada com contorno preto, a palavra "falada" em amarelo. Sem voz.
Ao montar, o motor dá erro se a legenda tiver letra que não existe em `letras.js`, se uma legenda ficar
inteira menos de 0,5 s antes de sumir (ou antes do escuro do fim) ou se começar antes da anterior acabar.
Arquivos: `motor.js` (cena, câmera, legenda e som), `voxels.js` (as maquetes em cubos), `lente.js`
(desfoque de miniatura, brilho, cor, grão e a legenda por cima), `letras.js` (letras em traços, sem fonte instalada).

**O filme.** "O mel quase nunca estraga", 15 s, em pé (1080x1920), 6 planos:
uma ilha de grama com árvore, colmeia dourada e abelhas (pinga uma gota de mel em "mel");
dentro de uma tumba egípcia, um arqueólogo de chapéu tira a tampa de um pote de barro e o brilho do mel
sobe (em "doce"); a câmera se afasta e a tumba vira uma caixa acesa no escuro; num pote de vidro, o mel
cai em cubos e empurra a água (cubos azuis) para fora, e três germes preocupados tremem em "ácido";
uma abelha solta uma faísca branca de enzima no mel e os germes fogem aos pulinhos; a tampa amarela cai e fecha o pote em "fechado".
Som feito em código: caixinha de música e acordes macios, zumbido das abelhas, "plic" da gota,
tochas estalando, a tampa de barro raspando e os brilhos tilintando, "plic" do mel caindo, "ploc" da
água saindo, tremor nervoso e gritinho dos germes, assobio e estouro mágico da faísca, e a batida da tampa (o ponto mais alto do som).

**Trocar a história.** Tudo o que muda fica em `historia.json`:

- `cenarios`: nome e lugar no mundo de cada maquete, e os cubinhos que flutuam em volta (`flutuantes`).
- `planos`: de quando até quando, qual cenário, a `camera` (`centro`, `dist`, `elev` = altura em graus,
  `giro` = volta em graus, cada um como `[começo, fim]`; `anda: "sai"` freia no fim; `desfoque` e `tilt`)
  e a `luz` (cor do fundo, do céu, do sol, força). `"entrada": "clarao"` dá um clarão no corte.
- `pecas`: lista de peças com lugar e tempo — `ilha`, `arvore` (com `galho`), `colmeia` (`pinga` = hora da
  gota), `flores`, `abelhas` (`de` = quando entram voando), `tumba`, `tocha`, `poteBarro` (`abre` = a tampa
  sai), `arqueologo`, `tesouro`, `bau`, `tabua`, `poteVidro` (`enche`, `agua.sai`, `enzima`, `tampaCai`) e `germe`.
- `germes`: quando tremem e quando recuam; `abelha`: as cores da abelha.
- `legenda` (tamanho, altura, cores) e `legendas`: texto com `de` e `ate`.
- `musica`: acordes com a hora de cada um, e as notas dos brilhos, da faísca e do fim.

```bash
node ferramentas/render.mjs exemplos/biblioteca/voxel --historia minha-historia.json
```

**De onde saiu.** Do filme "Honey Almost Never Spoils" (estilo voxel diorama) da biblioteca de estilos
da fonte. Narração traduzida pelo tradutor central e encurtada à mão para a legenda; o filme da fonte tem
20 s e aqui foi cortado para 15 s (sem o mergulho pelo espaço). Arqueólogo, abelhas e germes são desenho novo.

**Tempo de render medido** (`medida.json`): 198 s para 15 s de filme (450 quadros, cerca de 390 ms por
quadro, 3 navegadores, sem GPU). O MP4 sai com cerca de 23 MB. Os quadros dão o mesmo resultado com 1 e com 3 navegadores (conferido no filme inteiro em 360x640).

**Falta polir**
- O rosto do arqueólogo fica escuro e meio escondido sob a aba do chapéu (as tochas estão atrás dele); na fonte ele aparece de frente e bem iluminado.
- A fonte troca de plano com transições desenhadas e um mergulho pelo espaço com cubos riscando; aqui são cortes secos (com clarão em dois deles).
- Os cubos não têm a quina arredondada nem o brilho de borda da fonte, e o vidro do pote é uma casca simples de cubos claros.
- Quando os germes fogem, o roxo encosta na borda direita do quadro; no último plano dois germes ficam cortados nas bordas.
