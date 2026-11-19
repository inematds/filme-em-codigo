# engenhoca — comédia de engenharia desnecessária

**O estilo.** Um quarto 3D claro, de poucos polígonos, com um boneco sem rosto que atua de
verdade (mostra, dá de ombros, bate no botão, olha para cima, desaba). Um problema bobo, quatro
soluções que vão do sensato ao absurdo, cada engenhoca feita de cano amarelo com braçadeira cinza,
montada peça por peça (cada peça pula para o lugar e passa um pouco do ponto), e uma piada final
que torna tudo inútil. Entre uma piada e outra a câmera "chicoteia" (gira rápido, com borrão).

**De onde saiu.** Do filme "The Sock Finder Nobody Needed" (comédia de engenharia desnecessária)
da biblioteca de estilos da fonte. Lá o filme é narrado; aqui não há voz: a fala virou legenda em
português (traduzida pelo tradutor central e encurtada para caber em 15 s), duas ou três palavras
por vez, brancas com contorno preto grosso. Música de comédia (baixo de corda beliscada, marimba)
e os sons (estalo de peça encaixando, farejada, ronco da esteira, tapa no botão, bipe do satélite,
trombone triste) são feitos em código.

**Vertical:** 1080x1920, 30 quadros por segundo, 15 s.

## Arquivos

- `pecas.js` — constrói as peças: o quarto (chão de tábuas, paredes, janela, cama, quadro,
  planta, tapete), o boneco com juntas, o cão-robô, o ímã no barbante, a esteira, o cacto, o botão,
  o espaço (Terra, estrelas, satélite) e o feixe cor-de-rosa.
- `motor.js` — as poses do boneco, o tempo de cada engenhoca, a câmera, o chicote, a legenda e o som.
- `letras.js` — as letras desenhadas em traços (cópia do `giz.js` do quadro-negro), para a
  legenda não depender de fonte instalada.
- `historia.json` — o filme: cores, luz, lugares do quarto, planos com câmera, cortes, peças com
  lugar e tempo, legendas e música.

## Como trocar a história

Tudo que muda fica em `historia.json`:

- `planos`: cada plano tem começo, fim, cena (`quarto` ou `espaco`) e pontos de câmera
  `{t, pos, olha, fov}`. A câmera pode seguir uma peça: `{ "peca": "ima", "d": [x, y, z] }`
  (peças: `cabeca`, `peito`, `quadril`, `peMeia`, `cao`, `caoCabeca`, `ima`, `botao`, `sat`).
- `cortes`: onde a câmera chicoteia e para que lado (`dir`: `[1,0]` direita, `[0,1]` para cima).
  Plano que começa sem estar em `cortes` entra em corte seco.
- `pecas`: o `boneco` (lugar, qual pé tem a meia, qual mão segura a outra, e a `atuacao`:
  lista de `{t, pose}` com as poses `neutro`, `mostra`, `ombros`, `cintura`, `olhaCao`,
  `levanta`, `bate`, `olhaCima`, `olhaPe`, `desaba`), o `ima` (desce, balança), o `cao`
  (`monta`, `fareja`, `encara`), a `esteira` (`monta`, `corre`, `carga` com cacto e botão) e o
  `feixe`. O ímã, o cão e a esteira têm `aparece` (o ímã também `some`) amarrados ao corte do
  plano deles; o feixe nasce no seu `de`, já fora do quadro, lá no alto.
- `legendas`: `{de, ate, texto}`, duas ou três palavras por vez.
- `musica`: compassos (baixo e acorde), melodia, pausas, o trombone triste e o acorde final.

```bash
node ferramentas/render.mjs exemplos/biblioteca/engenhoca --historia minha-historia.json
```

## Medida

450 quadros em **47,5 s** de render (86 ms por quadro; 3,2 s de render por segundo de vídeo),
3 navegadores, sem placa de vídeo. MP4 de 8,3 MB. Som: média -22,9 dB, pico -2,0 dB; o segundo
mais alto é o do tapa no botão (10 s). Detalhes em `medida.json`.

## Falta polir

- Fonte: 17 s com seis planos; aqui 15 s, oito planos, narração encurtada em 17 legendas.
- A legenda é em maiúsculas de traço, não na letra redonda e pesada da fonte.
- O cacto e o botão são mais altos que o furo da parede: entram na esteira "atravessando" a parede.
- O feixe rosa do fim é largo e passa por dentro do corpo do boneco (na fonte ele envolve só a perna).
- No tapa (10 s) a mão chega ao botão com a meia por cima; o tapa se lê mais pelo botão afundando
  e pelo tremor do que pela mão.
- Os estalos da montagem da esteira começam uns 0,2 s antes da primeira peça que se vê (as três
  primeiras montam atrás da parede da direita).
- Na fonte a esteira leva um cone laranja; aqui leva um cacto, como pede o texto do filme.
