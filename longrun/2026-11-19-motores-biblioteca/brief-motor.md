# Brief para quem faz UM motor da biblioteca

Repo: `/home/nmaldaner/projetos/filme-em-codigo` (kit aberto INEMA, PT-BR, público leigo).
Leia antes: `CLAUDE.md`, `LESSONS.md` (inteiro, é curto), `METODOS.md`, `prompts/01-criar-motor.md`,
`prompts/estilos/<jeito>.md` (o estilo pode já estar descrito lá), e um motor pronto parecido em
`exemplos/` (camadas-planas = canvas 2D; fundo-pintado = pintado; cena-3d = three.js; marionete = SVG).
Fonte do estilo: `~/projetos/output/explica-tPiEPzy2JKU/src/terceiros/biblioteca/biblioteca.md`
(procure o título do filme; leia o "Same style" e o "Exact prompt"). Vídeo de referência:
`.../biblioteca/v/<nome>.mp4` e `.jpg` — olhe a miniatura e 4–6 quadros do vídeo com ffmpeg
(`ffmpeg -ss <s> -i v.mp4 -frames:v 1 -vf scale=640:-1 x.jpg` no seu scratchpad) para pegar o visual.

## O que entregar
Pasta `exemplos/biblioteca/<motor>/` com:
- `index.html` (carrega `../../../comum/filme.js`, `../../../comum/som.js`, e three.js se precisar de
  `../../../vendor/three/three.module.js`, igual ao cena-3d), `motor.js` (e módulos se quiser);
- `historia.json` (o filme principal) e `historia-<filme>.json` para os outros filmes do mesmo estilo
  (ver `mapa.md` nesta pasta). Tudo que muda de filme para filme fica na história (texto, cores,
  tempos, legendas, música), nunca no motor;
- `quadro.jpg` (capa, pequena, ≤ 200 KB) e, por história extra, `quadro-<historia>.jpg`;
- `medida.json` do render completo (use `--medida`), e `medida-<historia>.json` para as extras;
- `LEIA.md` curto em PT simples: o estilo em 2 frases, como trocar a história, de qual filme da
  biblioteca da fonte ele saiu (título do filme), tempo de render medido.

## Regras duras
- `desenhar(t)` é conta pura: sem relógio, sem `Math.random`, sem memória entre quadros. Sorteio só
  com `Filme.sorteio(semente)`. Mesmo código = mesmos quadros.
- Nada de rede (nenhum `http` no código), nenhuma imagem baixada, nenhum modelo, nenhuma API,
  nenhum TTS. Filme narrado na fonte → a fala vira LEGENDA na tela, com música e sons feitos em
  código (`comum/som.js`). Não use voz.
- Estilo "parecido com obra/marca real" → versão genérica: nada de personagem, logotipo ou traço
  reconhecível da obra original. Nunca copie personagens de terceiros.
- Duração 8–12 s (shorts até 15 s). 16:9 = 1920x1080; vertical = 1080x1920 (definido no motor).
- SEMPRE `--saida <scratchpad>/<motor>/<rodada>`: o scratchpad é dividido entre vários agentes e o
  render apaga `<saida>/quadros` antes de gravar. Pasta sem o nome do seu motor = você apaga a tira do outro.
- Antes do render completo, uma tira de 6 quadros DENTRO da duração (ex. 10 s: `--quadros 0.5,2.5,4.5,6.5,8.5,9.5`).
  OLHE cada PNG com Read, corrija, no máximo 3 rodadas. Compare com o vídeo da fonte.
  Confira também em 640x360 (ou 360x640 no vertical), o tamanho usado nos testes.
- Render completo: `node ferramentas/render.mjs exemplos/biblioteca/<motor> --saida <scratchpad>/<motor>/final --trabalhadores 3 --capa <s> --medida exemplos/biblioteca/<motor>/medida.json --apagar-quadros`.
  No máximo 3 navegadores. Não rode renders de outros motores.
- Fala da fonte → PT pelo tradutor central (`echo "<pedido>" | inema-traduz`), depois encurte à mão para caber.
- Letra na tela não pode depender de fonte instalada: use as fontes que outro motor já usa
  (copie `exemplos/biblioteca/xilogravura/letras.js` para a sua pasta — cada motor anda sozinho).
- Defeito achado depois da 3ª rodada: não corrija; anote no `LEIA.md` em "Falta polir" e no relato.
- Na história, descreva a cena como lista de peças com lugar e tempo (veja `exemplos/biblioteca/quadro-negro/historia.json`).
- `--quadros` é em SEGUNDOS. Confira o determinismo: o mesmo trecho com `--trabalhadores 1` e `3`
  dá o mesmo `quadros.sha256` — no FILME INTEIRO em 640x360, não só num trecho.
  Canvas 2D: comece `desenhar(t)` com `c.reset()` (ou zere transform, alpha, composição, traço), senão estado vaza entre quadros. Shader 3D/raymarch: olhe antes uma vista só de profundidade, em cinza.
- Teto: ~1,5 s por quadro por navegador. Som: confira com `ffmpeg -i x.mp4 -af volumedetect -f null -`
  (média entre -24 e -14 dB, pico ≤ -1 dB) e que o som bate com o que se vê.
- Erro de CONTA (não de visual) achado depois da 3ª rodada: corrija sempre, e renderize de novo.
  Conta também: o que a história diz que se vê (o herói, o objeto que alguém olha) saindo do quadro.
  Além da tira fixa, olhe 1 quadro em cada momento-chave da história, e pares de quadros vizinhos
  onde algo entra ou sai (nada pode aparecer do nada no meio do plano).
- As "3 rodadas" contam só as suas correções de visual. O brief está fechado; não haverá mudança no meio.
- Os testes rodam em 640x360 (vertical: 360x640); confira que o motor não quebra nesse tamanho.
- Capa: se o `quadro.jpg` passar de 200 KB, reduza para 960 px de largura (vertical: 540) com ffmpeg `-q:v 5`.
- Filme que na fonte não tem texto: só um título curto em PT no começo, sem legenda. Legenda só onde a fonte era narrada.
- O nome do filme da fonte fica SÓ no `LEIA.md` (a decisão de crédito é do Nei; o LEIA.md é o lugar da ligação). Os testes e o guia são feitos depois, por outra etapa.
- Não commite, não faça push, não mexa fora da sua pasta (exceto anotar lição nova no TOPO de
  `LESSONS.md` e falha no `FALHAS.md`, uma linha). Não mexa em `tests/` nem em `guia/`.
- MP4/PNG/WAV não vão para o git (já estão no `.gitignore`); só `quadro*.jpg` pequeno.

## Resposta final (curta)
Pasta, histórias feitas, tempo de render medido (de `medida.json`), o que ficou diferente do vídeo da
fonte (honesto), e o caminho de UMA tira de quadros que você olhou.
