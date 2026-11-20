# desenho-3d — desenho animado em 3D (vertical)

**O estilo em 2 frases.** Bonecos chapados, desenhados em 2D (contorno ameixa grosso, olhos grandes
brancos que piscam), colados em cartazes que sempre olham para a câmera, dentro de um mundo 3D de
formas simples com luz de duas cores duras. Por cima, um passe de nanquim nas bordas, fundo
desfocado nos planos fechados, sombra fria, luz quente e vinheta; um plano por frase, câmera que
desliza e se aproxima, cortes secos, clarão branco depois do gancho e tranco de câmera nas pancadas.

É o motor com mais filmes: **seis histórias, um motor só**. Nenhuma linha do motor sabe de nenhuma
delas.

## As histórias

| arquivo | filme | duração | render (3 navegadores, sem GPU) |
|---|---|---|---|
| `historia.json` | a árvore de família mais famosa (o roteiro único dos 14 estilos) | 20 s | 55,56 s |
| `historia-torre.json` | a torre salva por ninguém fazer nada | 35,87 s | 30,7 s |
| `historia-receita.json` | a receita que você nunca deve preparar | 18,5 s | 48,23 s |
| `historia-microondas.json` | dois dólares pelo micro-ondas | 38,47 s | 32,4 s |
| `historia-baloes.json` | a soltura de balões que deu errado | 48,16 s | 62,9 s |
| `historia-emus.json` | a guerra perdida para os emus | 45,43 s | 38,9 s |

Tempos medidos, de `medida*.json`. Narração da fonte vira legenda (sem voz): o texto foi traduzido
pelo tradutor central e encurtado à mão para caber em 15 a 20 s.

## Como rodar

```bash
node ferramentas/render.mjs exemplos/biblioteca/desenho-3d                              # árvore de família
node ferramentas/render.mjs exemplos/biblioteca/desenho-3d --historia historia-emus.json # outra história
```

## Como trocar a história

Tudo o que muda fica no `historia-*.json`:

- `modelos` — objetos feitos de formas simples (caixa, cilindro, cone, esfera, toro, cúpula, telhado,
  colunata). Uma casa, um carro, uma ema, uma torre: é só lista de formas com lugar, tamanho e cor.
  Partes podem balançar (`laco`: pata correndo, pescoço bicando, pá de moinho girando).
- `elenco` — o jeito de cada boneco: roupa, chapéu, cabelo, barba, óculos, gravata, faixa.
- `cenarios` — listas de peças que vários planos usam (o pátio, a fazenda, a cidade).
- `planos` — um por frase: céu, luz, câmera (chaves de lugar e alvo), desfoque e as peças. Peças:
  `boneco` (cara e braços mudam por tempo), `grupo` (multidão, bando, fileira; entra em escadinha,
  espalha e volta, linhas que ligam todos a um ponto), `enxame` (centenas de balões, trigo, pipoca,
  chuva, gotas), `junto` (peças que andam juntas: cavaleiro, caminhão com soldados), `helice`,
  `mapa`, `chamas`, `aneis`, `brilho`, `simbolo` ("?", "ZZZ"), `luz`.
- `legendas`, `rotulos` (título, placa, carimbo, contador, risco), `claroes`, `chutes` (tranco de
  câmera), `tremores`, `escurece`.
- `musica` (andamento, compasso, tom, escala, acordes, percussão, onde cala, onde fica menor, onde
  treme) e `sons` (lista de sons com nome e hora: galope, brilho, arranhão, estouro, boing, buzina...).

O motor confere ao montar: letra que não existe em `letras.js` dá erro com o nome da letra; legenda
com menos de 0,5 s na tela dá erro; plano que não começa onde o anterior acaba dá erro.

## De onde saiu

Biblioteca da fonte, estilo "Cartoon 3D": o filme de "One script, 14 styles" (Genghis Khan) e os
cinco da seção "Cartoon 3D stories": "The Tower That Was Saved by Doing Nothing", "The Recipe You
Should Never Make", "Two Dollars for the Microwave", "The Balloon Release That Went Wrong" e
"The War Australia Lost to Emus". Bonecos, objetos e música são desenho e conta próprios.

## O que ficou diferente da fonte

- A fonte é narrada; aqui não há voz: a fala é legenda, e os tempos seguem a legenda.
- A torre: a fonte tem 72 s e 14 cenas; aqui são 19,5 s e 8 planos (sem o praia, a banana, o
  cimento e a perfuração).
- A árvore de família segue o roteiro único dos 14 estilos (contador, tubos, "1 em 12", mapa,
  barras, carimbo, túmulos, hélice), posto dentro do mundo de desenho animado; a fonte conta com
  cenas (multidão, cientistas, cavaleiros, escavação), que aqui viraram o cenário dessas batidas.
- Sem sombra projetada de verdade: cada boneco e objeto tem uma sombra oval no chão.
- Mapa e bonecos ficam pequenos no vertical; letra usa o desenho de `letras.js`, não Poppins.

## Falta polir

- No plano do mapa, a Eurásia deita na estepe e fica estreita no quadro vertical; os cavaleiros
  ficam miúdos.
- O plano dos tubos de ensaio mostra os cientistas de longe; os tubos ficam pequenos.
- Os emus voltam correndo de costas (giram para fugir e não giram de volta).
- Bonecos de apoio às vezes ficam cortados na borda do quadro vertical.
- O boneco é desenhado numa tela de 256x512: nos planos bem fechados ele fica um pouco macio.
- O tradutor central deu "emas" (que em português é outra ave, da América do Sul); na mão virou "emus".
- Na explosão da receita, a nuvem de pólvora é feita de bolas e não de fumaça que se espalha.
