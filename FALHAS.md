# Falhas — filme-em-codigo

| data | o que quebrou | menor correção | prompt \| infra |
|---|---|---|---|
| 19/11/2026 | vetor-ciencia: aba de pele do gorro do Khan e contorno final do corpo sumiram (várias formas com `beginPath` próprio pintadas por um só `fill`/`stroke`) | lista de formas, pintar uma por uma | prompt |
| 19/11/2026 | marca-autoral: render completo parou com `IndexSizeError` (raio de `arc` -2e-15 vindo do salto back-ease em x=0) | `Math.max(0, …)` na função `pop` | prompt |
| 19/11/2026 | anime-3d-cel: blocos de gelo do estouro surgiam do nada no fundo do plano anterior (visíveis 0,9 s antes do estouro, mesmo mundo 3D) | campo `aparece` na história = começo do plano do estouro | prompt |
| 19/11/2026 | arte-conceito: ciclista e bando de pássaros apareciam do nada no meio do plano (peça com `de` no meio do filme, nascendo dentro do quadro) | ciclista nasce em t=0 lá no fim da rua; pássaros nascem atrás do muro | prompt |
| 19/11/2026 | guache-hachurado (rio): pico do som no MP4 a -0,6 dB (acima de -1 dB), o AAC subiu o pico das remadas | `pico` na história (0,78) passado ao `s.fim` | prompt |
| 19/11/2026 | pastel-oleoso: rastro dos personagens saiu forte (cópias de anéis e pernas do cão), `globalAlpha` desfeito pelo pincel | rastro numa tela à parte, colada com `globalAlpha` | prompt |
| 19/11/2026 | anime-2d: com 3 navegadores os quadros saíam diferentes de 1 navegador (estado do canvas, como `lineJoin`, vinha do quadro anterior) | `c.reset()` no começo de `desenhar(t)` | prompt |
| 19/11/2026 | acetato-classico: anel solto no pé e na boca da raposa (o `stroke()` do nanquim pegou o caminho pintado dentro do clip: meia, língua) | refazer o contorno antes do `stroke()` | prompt |
| 19/11/2026 | neon-chuva: chuvisco e riscos escuros dentro das janelas acesas (semente da torre interpolada como varying: o sorteio mudava de pixel para pixel) | `flat varying` nos dados da instância | prompt |
| 19/11/2026 | voo-raymarch: céu do deserto cheio de "paredes" e pontos pretos (raio batia na borda das células das mesas) | borda da célula + 0,6 e `p.y - 10` acima das mesas | prompt |
| 19/11/2026 | risografia: a tira de prova mostrou quadros de outro motor (dois agentes gravaram na mesma pasta do scratchpad) | `--saida <scratchpad>/<motor>/tiraN` | infra |
| 19/11/2026 | camadas-planas: árvores da frente saíam pretas (cor `rgb(...)` misturada de novo virava inválida) | `Filme.hex()` devolve `#rrggbb` para cor que será misturada depois | prompt |
| 19/11/2026 | cena-3d: árvores pretas (cor da instância multiplicava a do material) | `setColorAt` com cinza, não com a cor do material | prompt |
| 19/11/2026 | marionete: o lençol sumia (degradê e peça com o mesmo `id="lencol"`) | degradê renomeado para `grad-lencol` | prompt |
| 19/11/2026 | cena-3d: árvores no caminho tapavam a câmera e a luz estourava a neve | corredor livre de 3,5 m, copa mais alta, lampiões mais fracos | prompt |
