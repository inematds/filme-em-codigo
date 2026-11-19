# massinha

**O estilo.** Um filme de massinha de modelar numa maquete de mesa, fotografado em stop-motion: tudo
é calombento e fosco, com digitais na massa, luz quente de lâmpada, sombra macia e fundo desfocado.
Cada pose fica parada por 2 ou 3 quadros e a superfície "ferve" de leve de uma foto para a outra.

**Como funciona.** Cada peça nasce de uma forma lisa (`bolo` = caixa de cantos redondos, `tubo` =
rolinho de massa, bola) e é amassada uma vez com ruído, como dedo apertando a massa (`massa.js`).
O material põe digitais em relevo (desenhadas num canvas) e um tremidinho por pose no sombreador.
A torre é uma malha só (pés curvos, arcos, travessas em X, plataformas e a ponta); quem a estica e
entorta é o sombreador, e a mesma conta (`espinha`) põe o pombo e a setinha da régua no lugar certo.
Os bonecos (pintor de boina, padeiro de touca), o pombo e o sol de cara são desenho próprio.
O filme é narrado na fonte: aqui a fala vira legenda, 2 ou 3 palavras por vez, em letras gordas
brancas com contorno escuro, a palavra falada em amarelo. Sem voz.
Arquivos: `motor.js` (cena, câmera, legenda e som), `massa.js` (formas e material de massinha),
`lente.js` (desfoque de lente, cor quente, grão e a legenda por cima), `letras.js` (as letras em
traços, sem fonte instalada).

**O filme.** "A torre que cresce no verão", 15 s, em pé (1080x1920), 6 planos com corte seco:
a torre numa praça com o pintor e o padeiro e um pombo na ponta; o sol desce no fio, inclina de calor
e a torre estica; perto da ponta, uma régua amarela: o pombo sobe de 0 a 15 cm aos pulinhos, um centímetro de cada vez;
o topo entorta para longe do sol e o sol se espanta; à tardinha a torre encolhe e o sol sorri; à noite,
bem de perto, o pombo olha para os lados, pisca e arrulha.
Som feito em código: valsinha de acordeão, sininhos quando o sol desce, chiado de calor, "bóing" e
rangido quando a torre estica, um tique por centímetro e um "plim" no 15, rangido quando o topo entorta,
assobio de espanto, apito que desce quando encolhe, asas batendo, grilos e o arrulho no fim.

**Trocar a história.** Tudo o que muda fica em `historia.json`:

- `cores`, `luz`, `massa` (`boil` = quanto a massa ferve, `digital` = força das digitais,
  `calombo` = quanto a massa foi apertada) e `filme` (exposição, grão, vinheta, tom quente).
- `ceu`: a hora do dia em chaves (cor do céu, cor e força da lâmpada, janelas acesas);
  `"corte": true` troca na hora, sem misturar.
- `camera`: pontos com segundo, posição, para onde olha, lente (`fov`), ponto de `foco` e `desfoque`;
  `"corte": true` começa um plano novo, `"para": true` faz a câmera parar ali.
- `pecas`: lista de peças com lugar e tempo — `mesa`, `praca`, `ceu`, `predio`, `arvore`, `nuvem`,
  a `torre` (altura e as chaves de `estica` e `dobra`; `degraus` faz subir aos pulinhos), a `regua`
  (de quando até quando aparece, onde fica o zero, quantos cm), o `sol` (`caminho`, `inclina`, `cara`:
  `sorri`, `calmo`, `espanto`), o `pombo` (`acoes`: `olha`, `olhaBaixo`, `bate`, `pisca`, `arrulha`; `"som": true` no `olha` faz um tique a cada virada)
  e os `boneco` (`papel` pintor ou padeiro, `cavalete`, `acoes`: `pinta`, `acena`, `olhaCima`,
  `aponta`, `pula`).
- `legenda` (tamanho, altura, cores) e `legendas`: texto com `de` e `ate` (e `y` para mudar a altura).
- `musica`: tempo do compasso, melodia, baixo, acordes da valsa e as notas da noite.

```bash
node ferramentas/render.mjs exemplos/biblioteca/massinha --historia minha-historia.json
```

**De onde saiu.** Do filme "The Eiffel Tower Is Taller in Summer" (estilo massinha em maquete,
claymation diorama) da biblioteca de estilos da fonte. Narração traduzida pelo tradutor central e
encurtada à mão para a legenda. Bonecos, pombo e sol são desenho novo.

**Tempo de render medido** (`medida.json`): 122 s para 15 s de filme (450 quadros, cerca de 240 ms por quadro, 3 navegadores, sem GPU). O MP4 sai com cerca de 27 MB.

**Falta polir**
- As digitais aparecem bem de perto (pombo, régua), mas no plano aberto quase somem; na torre o relevo corre esticado ao longo dos pés. Os calombos são mais leves que na fonte.
- No close da noite, as asas do pombo parecem bracinhos e o colar verde aparece como duas manchas dos lados.
- Os pés do pombo no close são duas bolinhas, e os bonecos têm menos detalhe que na fonte (sem dedos, sem pernas andando).
- A fonte troca de plano com transições desenhadas (o sol passando na frente da lente); aqui são cortes secos.
