# Anexo da fonte

Este anexo guarda, inteira, a biblioteca de prompts de onde saíram os estilos dos motores em
[`exemplos/biblioteca/`](../exemplos/biblioteca/). É uma referência: dá para ler cada prompt, ver cada
filme e comparar com o motor que o kit fez.

## Crédito

A biblioteca é de **AI Samson**. Na própria fonte, o autor escreve:

> "Made by AI Samson. Films and prompts free to use as a starting point for your own work."
>
> Em português: "Feito por AI Samson. Filmes e prompts gratuitos para usar como ponto de partida para o seu próprio trabalho."

O kit usa o material dentro dessa licença: como ponto de partida para motores próprios, com crédito ao autor
aqui e na página da fonte no guia.

## O que tem nesta pasta

| arquivo | o que é |
|---|---|
| `LEIA.md` | este texto |
| [`biblioteca-original.md`](biblioteca-original.md) | índice do texto da fonte em inglês, que está completo em `biblioteca-original/`, em seis partes (uma por seção da fonte), com todos os prompts palavra por palavra. Só saiu o ruído da página (botões "Copy" e o menu) |
| [`biblioteca-pt.md`](biblioteca-pt.md) | índice do mesmo texto em português, em `biblioteca-pt/`, com as mesmas seis partes. Cada prompt vem traduzido e, logo abaixo, no original em inglês (clique em "Prompt original (inglês)"), porque o prompt em inglês costuma funcionar melhor no modelo |
| `miniaturas/` | 55 imagens pequenas, uma por vídeo da fonte |

## Onde estão os vídeos

Os 55 vídeos da fonte não ficam no repositório (o kit não guarda MP4). Eles ficam num GitHub Release com a
tag `fonte-v1`. O endereço de cada um é:

```text
https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/<nome>.mp4
```

Nos dois textos da biblioteca, cada miniatura é um link para o vídeo dela.

## O que o kit fez com o material

O kit segue a regra de sempre: **um motor por estilo**. Cada estilo da fonte virou um motor em
`exemplos/biblioteca/<motor>/`, e cada filme da fonte virou uma história (`historia-*.json`) desse motor.
No total são **43 motores** e **51 filmes**.

Duas mudanças em relação à fonte:

- **Sem voz.** Os filmes narrados viram legenda na tela, com música e sons feitos em código.
- **Sem obra nem marca de outros.** Na fonte, alguns estilos levam o nome de um estúdio, desenho ou canal
  ("…-like"). No kit eles viraram estilos genéricos, sem personagem, logotipo, paleta ou traço que lembre a
  obra. Os nomes continuam nos dois textos da biblioteca só porque o texto é copiado fiel.

Esta tabela mostra de qual vídeo da fonte saiu cada motor:

| vídeo da fonte | motor | estilo | formato |
|---|---|---|---|
| [wide_canyon](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_canyon.mp4) | [`voo-raymarch`](../exemplos/biblioteca/voo-raymarch/) | ficção científica em SDF | 16:9 |
| [wide_woodblock](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_woodblock.mp4) | [`xilogravura`](../exemplos/biblioteca/xilogravura/) | xilogravura animada | 16:9 |
| [wide_neon](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_neon.mp4) | [`neon-chuva`](../exemplos/biblioteca/neon-chuva/) | megacidade néon na chuva | 16:9 |
| [wide_pixel](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_pixel.mp4) | [`pixel-diorama`](../exemplos/biblioteca/pixel-diorama/) | pixel art HD-2D | 16:9 |
| [wide_ink](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_ink.mp4) | [`tinta-na-agua`](../exemplos/biblioteca/tinta-na-agua/) | tinta na água + enxame | 16:9 |
| [wide_collage](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_collage.mp4) | [`colagem-papel`](../exemplos/biblioteca/colagem-papel/) | colagem de papel | 16:9 |
| [wide_cel](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_cel.mp4) | [`acetato-classico`](../exemplos/biblioteca/acetato-classico/) | desenho clássico em acetato | 16:9 |
| [wide_anime](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_anime.mp4) | [`anime-2d`](../exemplos/biblioteca/anime-2d/) | anime 2D de cinema | 16:9 |
| [wide_riso](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_riso.mp4) | [`risografia`](../exemplos/biblioteca/risografia/) | risografia | 16:9 |
| [wide_pastel](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_pastel.mp4) | [`pastel-oleoso`](../exemplos/biblioteca/pastel-oleoso/) | pastel oleoso e guache | 16:9 |
| [wide_lily](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_lily.mp4) | [`plano-minimalista`](../exemplos/biblioteca/plano-minimalista/) | ilustração plana | 16:9 |
| [wide_trees](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_trees.mp4) | [`guache-hachurado`](../exemplos/biblioteca/guache-hachurado/) | guache hachurado | 16:9 |
| [wide_trees2](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_trees2.mp4) | [`guache-hachurado`](../exemplos/biblioteca/guache-hachurado/) | guache hachurado | 16:9 |
| [wide_street](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_street.mp4) | [`arte-conceito`](../exemplos/biblioteca/arte-conceito/) | arte de conceito pintada | 16:9 |
| [wide_bricks](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_bricks.mp4) | [`tijolinhos`](../exemplos/biblioteca/tijolinhos/) | tijolinhos em stop-motion | 16:9 |
| [wide_redhair](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_redhair.mp4) | [`retrato-ilustrado`](../exemplos/biblioteca/retrato-ilustrado/) | retrato ilustrado | 16:9 |
| [wide_redhair2](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_redhair2.mp4) | [`retrato-ilustrado`](../exemplos/biblioteca/retrato-ilustrado/) | retrato ilustrado | 16:9 |
| [wide_sundress](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_sundress.mp4) | [`retrato-ilustrado`](../exemplos/biblioteca/retrato-ilustrado/) | retrato ilustrado | 16:9 |
| [wide_sip](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_sip.mp4) | [`pastel-seco`](../exemplos/biblioteca/pastel-seco/) | personagem de pastel seco | 16:9 |
| [wide_marker](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_marker.mp4) | [`marcador-neon`](../exemplos/biblioteca/marcador-neon/) | marcador e giz neon | 16:9 |
| [wide_bluecrayon](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_bluecrayon.mp4) | [`giz-uma-cor`](../exemplos/biblioteca/giz-uma-cor/) | giz de cera de uma cor | 16:9 |
| [wide_shades](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/wide_shades.mp4) | [`sombra-chapada`](../exemplos/biblioteca/sombra-chapada/) | retrato anime de sombras chapadas | 16:9 |
| [x4_niagara_kokoro](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/x4_niagara_kokoro.mp4) | [`anime-3d-cel`](../exemplos/biblioteca/anime-3d-cel/) | anime desenhado em 3D | 9:16 |
| [x4_jupiter_kokoro](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/x4_jupiter_kokoro.mp4) | [`e-se-3d`](../exemplos/biblioteca/e-se-3d/) | personagem 3D "e se…" | 9:16 |
| [x4_eiffel_kokoro](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/x4_eiffel_kokoro.mp4) | [`massinha`](../exemplos/biblioteca/massinha/) | massinha em maquete | 9:16 |
| [x4_sock_kokoro](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/x4_sock_kokoro.mp4) | [`engenhoca`](../exemplos/biblioteca/engenhoca/) | comédia de engenhoca | 9:16 |
| [x4_venus_kokoro](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/x4_venus_kokoro.mp4) | [`explicativo-luz`](../exemplos/biblioteca/explicativo-luz/) | explicativo 3D luminoso | 9:16 |
| [x4_cleopatra_kokoro](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/x4_cleopatra_kokoro.mp4) | [`papiro-ouro`](../exemplos/biblioteca/papiro-ouro/) | papiro em nanquim e ouro | 9:16 |
| [x4_honey_kokoro](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/x4_honey_kokoro.mp4) | [`voxel`](../exemplos/biblioteca/voxel/) | diorama de cubinhos | 9:16 |
| [x4_wombat_kokoro](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/x4_wombat_kokoro.mp4) | [`quadro-negro`](../exemplos/biblioteca/quadro-negro/) | linha de giz no quadro-negro | 9:16 |
| [x4_octopus_kokoro](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/x4_octopus_kokoro.mp4) | [`caixa-sombra`](../exemplos/biblioteca/caixa-sombra/) | recorte de papel em caixa de sombra | 9:16 |
| [x4_halo_kokoro](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/x4_halo_kokoro.mp4) | [`produto-estudio`](../exemplos/biblioteca/produto-estudio/) | filme de produto em estúdio | 9:16 |
| [genghis_brand_gideon](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/genghis_brand_gideon.mp4) | [`marca-autoral`](../exemplos/biblioteca/marca-autoral/) | estilo de marca do autor da fonte | 9:16 |
| [genghis_data_gideon](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/genghis_data_gideon.mp4) | [`dados-3d`](../exemplos/biblioteca/dados-3d/) | dados em 3D | 9:16 |
| [genghis_ink_gideon](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/genghis_ink_gideon.mp4) | [`rolo-nanquim`](../exemplos/biblioteca/rolo-nanquim/) | rolo de nanquim | 9:16 |
| [genghis_toon_gideon](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/genghis_toon_gideon.mp4) | [`desenho-3d`](../exemplos/biblioteca/desenho-3d/) | cartoon 3D | 9:16 |
| [pisa_gideon](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/pisa_gideon.mp4) | [`desenho-3d`](../exemplos/biblioteca/desenho-3d/) | cartoon 3D | 9:16 |
| [gunpowder_gideon](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/gunpowder_gideon.mp4) | [`desenho-3d`](../exemplos/biblioteca/desenho-3d/) | cartoon 3D | 9:16 |
| [microwave_gideon](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/microwave_gideon.mp4) | [`desenho-3d`](../exemplos/biblioteca/desenho-3d/) | cartoon 3D | 9:16 |
| [new_balloon_julian](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/new_balloon_julian.mp4) | [`desenho-3d`](../exemplos/biblioteca/desenho-3d/) | cartoon 3D | 9:16 |
| [new_emu_julian](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/new_emu_julian.mp4) | [`desenho-3d`](../exemplos/biblioteca/desenho-3d/) | cartoon 3D | 9:16 |
| [style_ghibli_julian](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/style_ghibli_julian.mp4) | [`anime-pintado`](../exemplos/biblioteca/anime-pintado/) | filme anime pintado (genérico) | 9:16 |
| [style_paper_julian](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/style_paper_julian.mp4) | [`papel-cartolina`](../exemplos/biblioteca/papel-cartolina/) | cartoon de cartolina (genérico) | 9:16 |
| [style_sitcom_julian](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/style_sitcom_julian.mp4) | [`cartoon-tv`](../exemplos/biblioteca/cartoon-tv/) | cartoon de TV (genérico) | 9:16 |
| [style_vox_julian](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/style_vox_julian.mp4) | [`recorte-jornal`](../exemplos/biblioteca/recorte-jornal/) | colagem de recortes explicativa | 9:16 |
| [style_mapdoc_julian](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/style_mapdoc_julian.mp4) | [`mesa-de-mapas`](../exemplos/biblioteca/mesa-de-mapas/) | mesa de mapas documental | 9:16 |
| [style_future_julian](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/style_future_julian.mp4) | [`holograma`](../exemplos/biblioteca/holograma/) | 3D futurista holográfico | 9:16 |
| [style_retro_julian](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/style_retro_julian.mp4) | [`retro-futuro`](../exemplos/biblioteca/retro-futuro/) | retrofuturismo anos 50–60 | 9:16 |
| [style_watercolor_julian](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/style_watercolor_julian.mp4) | [`aquarela`](../exemplos/biblioteca/aquarela/) | aquarela | 9:16 |
| [style_quirky_julian](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/style_quirky_julian.mp4) | [`absurdo`](../exemplos/biblioteca/absurdo/) | cartoon absurdo | 9:16 |
| [style_flat_julian](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/style_flat_julian.mp4) | [`vetor-ciencia`](../exemplos/biblioteca/vetor-ciencia/) | vetor plano de ciência (genérico) | 9:16 |

## Os 4 vídeos que não viraram motor

Quatro vídeos da fonte saem de um **modelo de vídeo** (Seedance 2.5), que refaz um filme já pronto
com mais detalhe:

- [`seedance_shades_grain`](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/seedance_shades_grain.mp4)
- [`sd_bricks`](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/sd_bricks.mp4)
- [`sd_cel`](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/sd_cel.mp4)
- [`sd_shades`](https://github.com/inematds/filme-em-codigo/releases/download/fonte-v1/sd_shades.mp4)

O kit não chama modelo nenhum, então esses quatro não viram motor. Ficam aqui só para comparar: é o caminho
híbrido (filme em código + modelo de vídeo por cima), que o kit apenas descreve.

## Como os textos foram feitos

- `biblioteca-original/`: cópia do texto da fonte. Cada `[mídia: …]` virou a miniatura com link para o
  vídeo no Release.
- `biblioteca-pt/`: traduzido seção por seção pelo tradutor central do INEMA (`inema-traduz`). A estrutura
  é a mesma do original: os mesmos títulos, na mesma ordem.
